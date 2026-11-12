import { AppError } from '../errors.js';

export function readJsonBody(req, { maxBytes = 64 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
    if (!contentType.startsWith('application/json')) {
      reject(new AppError('VALIDATION_ERROR', 'Envie o corpo da requisição como application/json.'));
      return;
    }

    const chunks = [];
    let total = 0;
    let settled = false;

    function fail(error) {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    }

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        fail(new AppError('PAYLOAD_TOO_LARGE', `O corpo da requisição excede ${maxBytes} bytes.`));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) {
        return;
      }
      settled = true;
      const text = Buffer.concat(chunks, total).toString('utf8').trim();
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        reject(new AppError('VALIDATION_ERROR', 'O JSON enviado é inválido.', { cause: error }));
      }
    });
    req.on('error', (error) => {
      fail(new AppError('VALIDATION_ERROR', 'Não foi possível ler o corpo da requisição.', { cause: error }));
    });
  });
}
