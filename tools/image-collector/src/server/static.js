import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../errors.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

export function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

export async function serveFile(req, res, filePath, { cacheControl = 'no-cache', extraHeaders = {} } = {}) {
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new AppError('NOT_FOUND', 'Arquivo não encontrado.');
    }
    throw new AppError('INTERNAL_ERROR', 'Não foi possível ler o arquivo solicitado.', { cause: error });
  }
  if (!stat.isFile()) {
    throw new AppError('NOT_FOUND', 'Arquivo não encontrado.');
  }

  res.writeHead(200, {
    'content-type': contentTypeFor(filePath),
    'content-length': stat.size,
    'cache-control': cacheControl,
    ...extraHeaders,
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.once('error', reject);
    res.once('finish', resolve);
    res.once('close', resolve);
    stream.pipe(res);
  });
}

export async function servePublicFile({ req, res, publicDir, pathname }) {
  let relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  try {
    relative = decodeURIComponent(relative);
  } catch {
    throw new AppError('NOT_FOUND', 'Arquivo não encontrado.');
  }
  if (relative.includes('\0') || relative.split(/[\\/]/).includes('..')) {
    throw new AppError('NOT_FOUND', 'Arquivo não encontrado.');
  }
  const resolvedRoot = path.resolve(publicDir);
  const filePath = path.resolve(resolvedRoot, relative);
  if (filePath !== resolvedRoot && !filePath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new AppError('NOT_FOUND', 'Arquivo não encontrado.');
  }
  await serveFile(req, res, filePath, { cacheControl: 'no-cache' });
}
