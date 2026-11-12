import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';
import { AppError } from '../errors.js';
import { isBlockedHostname, isPrivateIp } from '../util/ip.js';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retryAfterMs(value) {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) {
    return Math.max(0, timestamp - Date.now());
  }
  return null;
}

function safeLogUrl(url) {
  try {
    return `${url.origin}${url.pathname}`;
  } catch {
    return String(url);
  }
}

function normaliseHeaders(headers) {
  const result = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (value !== undefined) {
      result[key.toLowerCase()] = value;
    }
  }
  return result;
}

function isIdentityEncoding(encoding) {
  return !encoding || encoding === 'identity';
}

function decompressorFor(encoding) {
  switch (String(encoding ?? '').toLowerCase()) {
    case 'gzip':
    case 'x-gzip':
      return zlib.createGunzip();
    case 'deflate':
      return zlib.createInflate();
    case 'br':
      return zlib.createBrotliDecompress();
    default:
      return null;
  }
}

function collectStream(stream, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    function fail(error) {
      if (settled) {
        return;
      }
      settled = true;
      stream.destroy();
      reject(error);
    }

    stream.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        fail(new AppError('DOWNLOAD_TOO_LARGE', `O conteúdo excede o limite de ${maxBytes} bytes.`));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(Buffer.concat(chunks, total));
    });
    stream.on('error', (error) => {
      if (error instanceof AppError) {
        fail(error);
        return;
      }
      fail(new AppError('FETCH_FAILED', 'Falha ao ler a resposta HTTP.', { cause: error }));
    });
    stream.on('aborted', () => {
      fail(new AppError('FETCH_FAILED', 'A conexão foi interrompida antes do fim da resposta.'));
    });
  });
}

function mapNetworkError(error) {
  if (error instanceof AppError) {
    return error;
  }
  const code = error?.code ? ` (${error.code})` : '';
  return new AppError('FETCH_FAILED', `Não foi possível acessar o servidor remoto${code}.`, { cause: error });
}

export function createHttpClient({
  logger,
  userAgent = 'ConcertLabDatasetCollector/1.0',
  timeoutMs = 20_000,
  maxRedirects = 5,
  maxRetries = 2,
  retryBaseDelayMs = 500,
  maxRetryDelayMs = 5_000,
  minHostIntervalMs = 1_000,
  allowPrivateHosts = false,
  lookup = dns.promises.lookup,
} = {}) {
  const hostLastRequestAt = new Map();

  async function throttleHost(hostname, intervalMs) {
    if (intervalMs <= 0) {
      return;
    }
    const host = hostname.toLowerCase();
    const last = hostLastRequestAt.get(host) ?? 0;
    const wait = last + intervalMs - Date.now();
    if (wait > 0) {
      await sleep(wait);
    }
    hostLastRequestAt.set(host, Date.now());
  }

  async function resolveTarget(url) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new AppError('UNSUPPORTED_PROTOCOL', 'Somente URLs http:// e https:// são aceitas.');
    }
    if (url.username || url.password) {
      throw new AppError('INVALID_URL', 'URLs com credenciais embutidas não são aceitas.');
    }
    if (isBlockedHostname(url.hostname)) {
      throw new AppError('BLOCKED_HOST', 'O domínio informado não é permitido.');
    }

    const port = url.port;
    if (!allowPrivateHosts && port && port !== '80' && port !== '443') {
      throw new AppError('BLOCKED_HOST', 'Portas diferentes de 80 e 443 não são permitidas.');
    }

    if (net.isIP(url.hostname)) {
      if (!allowPrivateHosts && isPrivateIp(url.hostname)) {
        throw new AppError('BLOCKED_HOST', 'Endereços de rede privada ou local não são permitidos.');
      }
      return [{ address: url.hostname, family: net.isIP(url.hostname) }];
    }

    let addresses;
    try {
      addresses = await lookup(url.hostname, { all: true, verbatim: true });
    } catch (error) {
      throw new AppError('FETCH_FAILED', 'Não foi possível resolver o domínio da URL.', { cause: error });
    }
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new AppError('FETCH_FAILED', 'O domínio da URL não retornou endereços válidos.');
    }
    if (!allowPrivateHosts && addresses.some((entry) => isPrivateIp(entry.address))) {
      throw new AppError('BLOCKED_HOST', 'O domínio resolve para uma rede privada ou local.');
    }
    return addresses;
  }

  function requestOnce(url, addresses, { maxBytes, headers, method }) {
    const transport = url.protocol === 'https:' ? https : http;
    const requestHeaders = {
      'user-agent': userAgent,
      accept: 'text/html,application/xhtml+xml,application/json;q=0.9,image/*;q=0.8,*/*;q=0.5',
      'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'accept-encoding': 'gzip, deflate, br',
      ...normaliseHeaders(headers),
    };

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname || '/'}${url.search || ''}`,
      headers: requestHeaders,
      lookup: (hostname, lookupOptions, callback) => {
        if (lookupOptions?.all) {
          callback(null, addresses.map((entry) => ({ address: entry.address, family: entry.family })));
          return;
        }
        callback(null, addresses[0].address, addresses[0].family);
      },
    };
    if (url.protocol === 'https:' && !net.isIP(url.hostname)) {
      options.servername = url.hostname;
    }

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const req = transport.request(options, (res) => {
        const status = res.statusCode ?? 0;
        const responseHeaders = res.headers;

        if (REDIRECT_STATUSES.has(status)) {
          res.resume();
          resolve({ status, headers: responseHeaders, body: Buffer.alloc(0), finalUrl: url.href });
          return;
        }

        const contentLength = Number(responseHeaders['content-length']);
        const encoding = responseHeaders['content-encoding'];
        if (Number.isFinite(contentLength) && contentLength > maxBytes && isIdentityEncoding(encoding)) {
          res.resume();
          reject(new AppError('DOWNLOAD_TOO_LARGE', `O arquivo remoto excede o limite de ${maxBytes} bytes.`));
          return;
        }

        let stream = res;
        const decompressor = decompressorFor(encoding);
        if (decompressor) {
          res.pipe(decompressor);
          stream = decompressor;
        } else if (!isIdentityEncoding(encoding)) {
          res.resume();
          reject(new AppError('FETCH_FAILED', `Codificação de conteúdo não suportada: ${encoding}.`));
          return;
        }

        const rawLimit = Math.max(maxBytes * 10, maxBytes + 1024);
        let rawBytes = 0;
        res.on('data', (chunk) => {
          rawBytes += chunk.length;
          if (rawBytes > rawLimit) {
            res.destroy(new AppError('DOWNLOAD_TOO_LARGE', 'A resposta comprimida excede o limite permitido.'));
          }
        });

        collectStream(stream, maxBytes)
          .then((body) => {
            logger?.debug?.('http_request', {
              url: safeLogUrl(url),
              status,
              bytes: body.length,
              durationMs: Date.now() - startedAt,
            });
            resolve({
              status,
              headers: responseHeaders,
              body,
              finalUrl: url.href,
              contentType: String(responseHeaders['content-type'] ?? '').toLowerCase(),
            });
          })
          .catch(reject);
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy(new AppError('FETCH_FAILED', `Tempo limite de ${timeoutMs}ms excedido ao acessar a URL.`));
      });
      req.on('error', (error) => reject(mapNetworkError(error)));
      req.end();
    });
  }

  async function request(rawUrl, options = {}) {
    const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
    const method = options.method ?? 'GET';
    const headers = options.headers ?? {};
    const retries = method === 'GET' ? options.maxRetries ?? maxRetries : 0;
    let current;
    try {
      current = new URL(rawUrl);
    } catch (error) {
      throw new AppError('INVALID_URL', 'A URL de download não é válida.', { cause: error });
    }

    for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
      const addresses = await resolveTarget(current);
      await throttleHost(current.hostname, options.minHostIntervalMs ?? minHostIntervalMs);
      let response;
      for (let attempt = 0; ; attempt += 1) {
        response = await requestOnce(current, addresses, { maxBytes, headers, method });
        if (attempt >= retries || !RETRYABLE_STATUSES.has(response.status)) {
          break;
        }
        const hintedDelay = retryAfterMs(response.headers['retry-after']);
        const delay = Math.min(
          hintedDelay ?? retryBaseDelayMs * 2 ** attempt,
          maxRetryDelayMs,
        );
        logger?.warn?.('http_retry', {
          url: safeLogUrl(current),
          status: response.status,
          attempt: attempt + 1,
          delayMs: delay,
        });
        await sleep(delay);
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.location;
        if (!location) {
          throw new AppError('HTTP_ERROR', `O servidor retornou ${response.status} sem cabeçalho Location.`);
        }
        let next;
        try {
          next = new URL(location, current);
        } catch (error) {
          throw new AppError('FETCH_FAILED', 'O redirecionamento recebido é inválido.', { cause: error });
        }
        current = next;
        continue;
      }

      if (response.status >= 400) {
        const retryAfter = response.headers['retry-after'];
        const hint =
          response.status === 429
            ? ' Limite de requisições do servidor remoto atingido; aguarde e tente novamente.'
            : '';
        throw new AppError('HTTP_ERROR', `O servidor remoto respondeu com HTTP ${response.status}.${hint}`, {
          details: {
            upstreamStatus: response.status,
            ...(retryAfter ? { retryAfter } : {}),
          },
        });
      }

      return {
        ...response,
        finalUrl: current.href,
        contentType: String(response.headers['content-type'] ?? '').toLowerCase(),
      };
    }

    throw new AppError('FETCH_FAILED', `A URL excedeu o limite de ${maxRedirects} redirecionamentos.`);
  }

  return { request, resolveTarget };
}
