import crypto from 'node:crypto';
import { AppError, asAppError } from '../errors.js';
import { supportedPlatforms } from '../platforms/index.js';
import { readJsonBody } from './body.js';
import { createRateLimiter } from './rateLimit.js';
import { serveFile, servePublicFile } from './static.js';

const PREVIEW_TOKEN_PATTERN = /^[a-f0-9]{32}$/;

function setSecurityHeaders(res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('permissions-policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('cross-origin-resource-policy', 'same-origin');
  res.setHeader('cross-origin-opener-policy', 'same-origin');
  res.setHeader(
    'content-security-policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
}

function sendJson(req, res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(body);
}

function sendNoContent(res) {
  res.writeHead(204, { 'cache-control': 'no-store' });
  res.end();
}

function sendError(req, res, error) {
  const appError = asAppError(error);
  if (res.headersSent) {
    res.destroy();
    return;
  }
  sendJson(req, res, appError.status, { error: appError.toJSON() });
}

function methodNotAllowed(req, res, allowed) {
  sendJson(req, res, 405, {
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Método HTTP não permitido para este recurso.',
    },
  }, { allow: allowed.join(', ') });
}

function clientIp(req) {
  return req.socket?.remoteAddress ?? 'unknown';
}

function isAllowedHost(hostHeader, config) {
  if (!hostHeader) {
    return false;
  }
  let hostname;
  try {
    hostname = new URL(`http://${hostHeader}`).hostname;
  } catch {
    return false;
  }
  if (config.host === '0.0.0.0' || config.host === '::') {
    return true;
  }
  const allowed = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
  if (config.host) {
    allowed.add(config.host);
  }
  return allowed.has(hostname);
}

function checkOrigin(req) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return;
  }
  const origin = req.headers.origin;
  if (!origin) {
    return;
  }
  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Origem da requisição inválida.');
  }
  const host = req.headers.host ?? '';
  const expectedHttp = `http://${host}`;
  const expectedHttps = `https://${host}`;
  if (origin !== expectedHttp && origin !== expectedHttps) {
    throw new AppError('VALIDATION_ERROR', 'Origem da requisição não permitida.');
  }
  if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') {
    throw new AppError('VALIDATION_ERROR', 'Origem da requisição não permitida.');
  }
}

function decodeFileName(pathname, prefix) {
  const raw = pathname.slice(prefix.length);
  if (!raw || raw.includes('/') || raw.includes('\\')) {
    throw new AppError('NOT_FOUND', 'Registro não encontrado.');
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    throw new AppError('NOT_FOUND', 'Registro não encontrado.');
  }
}

export function createRequestHandler({ config, logger, pipeline, previewStore }) {
  const limiter = createRateLimiter(config.rateLimit);

  return async function handler(req, res) {
    const startedAt = Date.now();
    const requestId = crypto.randomUUID();
    res.setHeader('x-request-id', requestId);
    setSecurityHeaders(res);

    let pathname = '/';
    res.on('finish', () => {
      logger?.info?.('request_completed', {
        requestId,
        method: req.method,
        path: pathname,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    try {
      if (!isAllowedHost(req.headers.host, config)) {
        throw new AppError('VALIDATION_ERROR', 'Host da requisição não permitido.');
      }
      checkOrigin(req);

      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      pathname = url.pathname;

      if (pathname === '/api/health' && req.method === 'GET') {
        sendJson(req, res, 200, {
          ok: true,
          uptimeSeconds: Math.round(process.uptime()),
          previews: previewStore.size(),
        });
        return;
      }

      if (pathname === '/api/config' && req.method === 'GET') {
        sendJson(req, res, 200, {
          supportedPlatforms: supportedPlatforms(),
          api: {
            pexels: Boolean(config.pexelsApiKey),
            unsplash: Boolean(config.unsplashAccessKey),
          },
          limits: {
            maxImageBytes: config.maxImageBytes,
            maxHtmlBytes: config.maxHtmlBytes,
            previewTtlMs: config.previewTtlMs,
          },
        });
        return;
      }

      if (pathname === '/api/extract') {
        if (req.method !== 'POST') {
          methodNotAllowed(req, res, ['POST']);
          return;
        }
        const rate = limiter.check(clientIp(req));
        if (!rate.allowed) {
          res.setHeader('retry-after', String(rate.retryAfterSeconds));
          throw new AppError('RATE_LIMITED', 'Muitas extrações em pouco tempo. Aguarde alguns segundos.');
        }
        const body = await readJsonBody(req);
        if (typeof body.url !== 'string') {
          throw new AppError('VALIDATION_ERROR', 'O campo url é obrigatório.');
        }
        const preview = await pipeline.extract({ url: body.url });
        sendJson(req, res, 200, preview);
        return;
      }

      if (pathname === '/api/confirm') {
        if (req.method !== 'POST') {
          methodNotAllowed(req, res, ['POST']);
          return;
        }
        const rate = limiter.check(clientIp(req));
        if (!rate.allowed) {
          res.setHeader('retry-after', String(rate.retryAfterSeconds));
          throw new AppError('RATE_LIMITED', 'Muitas confirmações em pouco tempo. Aguarde alguns segundos.');
        }
        const body = await readJsonBody(req);
        if (typeof body.token !== 'string' || !PREVIEW_TOKEN_PATTERN.test(body.token)) {
          throw new AppError('VALIDATION_ERROR', 'Token de pré-visualização inválido.');
        }
        const result = await pipeline.confirm({
          token: body.token,
          metadata: body.metadata,
          classification: body.classification,
        });
        sendJson(req, res, 201, {
          record: result.record,
          image: result.image,
        });
        return;
      }

      if (pathname.startsWith('/api/previews/')) {
        const match = pathname.match(/^\/api\/previews\/([a-f0-9]{32})(?:\/image)?$/);
        if (!match) {
          throw new AppError('NOT_FOUND', 'Pré-visualização não encontrada.');
        }
        const token = match[1];
        if (pathname.endsWith('/image')) {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            methodNotAllowed(req, res, ['GET', 'HEAD']);
            return;
          }
          const entry = pipeline.getPreview(token);
          await serveFile(req, res, entry.tempPath, {
            cacheControl: 'no-store',
            extraHeaders: {
              'content-type': entry.image.mimeType,
              'content-disposition': 'inline',
            },
          });
          return;
        }
        if (req.method !== 'DELETE') {
          methodNotAllowed(req, res, ['DELETE']);
          return;
        }
        await pipeline.discardPreview(token);
        sendNoContent(res);
        return;
      }

      if (pathname === '/api/records') {
        if (req.method !== 'GET') {
          methodNotAllowed(req, res, ['GET']);
          return;
        }
        const records = await pipeline.listRecords();
        sendJson(req, res, 200, { records });
        return;
      }

      if (pathname.startsWith('/api/records/')) {
        const fileName = decodeFileName(pathname, '/api/records/');
        if (req.method === 'GET') {
          const records = await pipeline.listRecords();
          const record = records.find((item) => item.file_name === fileName);
          if (!record) {
            throw new AppError('NOT_FOUND', 'Registro não encontrado.');
          }
          sendJson(req, res, 200, { record });
          return;
        }
        if (req.method === 'PATCH') {
          const body = await readJsonBody(req);
          const record = await pipeline.updateRecord(fileName, body);
          sendJson(req, res, 200, { record });
          return;
        }
        methodNotAllowed(req, res, ['GET', 'PATCH']);
        return;
      }

      if (pathname.startsWith('/api/')) {
        throw new AppError('NOT_FOUND', 'Endpoint não encontrado.');
      }

      if (pathname.startsWith('/dataset/images/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          methodNotAllowed(req, res, ['GET', 'HEAD']);
          return;
        }
        const fileName = decodeFileName(pathname, '/dataset/images/');
        const filePath = await pipeline.getImagePath(fileName);
        await serveFile(req, res, filePath, { cacheControl: 'private, max-age=0, must-revalidate' });
        return;
      }

      await servePublicFile({ req, res, publicDir: config.publicDir, pathname });
    } catch (error) {
      const appError = asAppError(error);
      if (appError.code === 'INTERNAL_ERROR') {
        logger?.error?.('request_failed', { requestId, method: req.method, path: pathname, error });
      } else {
        logger?.warn?.('request_rejected', {
          requestId,
          method: req.method,
          path: pathname,
          code: appError.code,
        });
      }
      sendError(req, res, appError);
    }
  };
}
