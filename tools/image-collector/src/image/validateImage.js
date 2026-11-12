import zlib from 'node:zlib';
import { AppError } from '../errors.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function invalid(message, details) {
  return new AppError('INVALID_IMAGE', message, { details });
}

function unsupported(message, details) {
  return new AppError('UNSUPPORTED_FORMAT', message, { details });
}

function crc32(buffer) {
  if (typeof zlib.crc32 === 'function') {
    return zlib.crc32(buffer) >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validatePng(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw invalid('O arquivo não é um PNG válido.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let sawIhdr = false;
  let sawIdat = false;
  let sawIend = false;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;
    if (crcEnd > buffer.length) {
      throw invalid('O PNG está truncado ou possui um bloco com tamanho inválido.');
    }
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    const actualCrc = crc32(buffer.subarray(offset + 4, dataEnd));
    if (expectedCrc !== actualCrc) {
      throw invalid('A verificação CRC de um bloco PNG falhou; o arquivo pode estar corrompido.', {
        block: type,
      });
    }

    if (!sawIhdr) {
      if (type !== 'IHDR' || length !== 13) {
        throw invalid('O primeiro bloco do PNG deveria ser IHDR.');
      }
      sawIhdr = true;
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      const bitDepth = buffer[dataStart + 8];
      const colorType = buffer[dataStart + 9];
      const validDepths = [1, 2, 4, 8, 16];
      const validColorTypes = [0, 2, 3, 4, 6];
      if (!validDepths.includes(bitDepth) || !validColorTypes.includes(colorType)) {
        throw invalid('O cabeçalho IHDR do PNG possui valores inválidos.');
      }
    } else if (type === 'IDAT') {
      sawIdat = true;
    } else if (type === 'IEND') {
      sawIend = true;
      break;
    }

    offset = crcEnd;
  }

  if (!sawIhdr || !sawIdat || !sawIend) {
    throw invalid('O PNG está incompleto: IHDR, IDAT ou IEND ausente.');
  }
  if (width <= 0 || height <= 0) {
    throw invalid('O PNG possui dimensões inválidas.');
  }
  return { format: 'png', mimeType: 'image/png', extension: '.png', width, height };
}

function validateGif(buffer) {
  if (buffer.length < 14) {
    throw invalid('O arquivo GIF está truncado.');
  }
  const signature = buffer.toString('ascii', 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') {
    throw invalid('Assinatura GIF inválida.');
  }
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  if (width <= 0 || height <= 0) {
    throw invalid('O GIF possui dimensões inválidas.');
  }
  const trailerIndex = buffer.lastIndexOf(0x3b);
  if (trailerIndex < 13) {
    throw invalid('O GIF não possui o marcador de término esperado.');
  }
  return { format: 'gif', mimeType: 'image/gif', extension: '.gif', width, height };
}

function isSofMarker(marker) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function validateJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw invalid('O arquivo não é um JPEG válido.');
  }

  let offset = 2;
  let width = 0;
  let height = 0;
  let sawSof = false;
  let sawSos = false;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      throw invalid('Estrutura JPEG inválida: marcador esperado.');
    }
    while (buffer[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buffer.length) {
      break;
    }
    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9) {
      break;
    }
    if (marker === 0xda) {
      sawSos = true;
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      continue;
    }
    if (offset + 2 > buffer.length) {
      throw invalid('O JPEG está truncado.');
    }
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) {
      throw invalid('Segmento JPEG com tamanho inválido.');
    }
    if (isSofMarker(marker)) {
      if (length < 7) {
        throw invalid('Segmento SOF do JPEG é muito curto.');
      }
      height = buffer.readUInt16BE(offset + 3);
      width = buffer.readUInt16BE(offset + 5);
      sawSof = true;
    }
    offset += length;
  }

  if (!sawSof) {
    throw invalid('O JPEG não contém um segmento SOF com as dimensões.');
  }
  if (width <= 0 || height <= 0) {
    throw invalid('O JPEG possui dimensões inválidas.');
  }
  if (!sawSos) {
    throw invalid('O JPEG não contém dados de imagem (SOS ausente).');
  }

  let end = buffer.length - 1;
  while (end >= 0 && (buffer[end] === 0x00 || buffer[end] === 0x0a || buffer[end] === 0x0d || buffer[end] === 0x20)) {
    end -= 1;
  }
  if (end < 1 || buffer[end] !== 0xd9 || buffer[end - 1] !== 0xff) {
    throw invalid('O JPEG está truncado: marcador EOI ausente.');
  }

  return { format: 'jpeg', mimeType: 'image/jpeg', extension: '.jpg', width, height };
}

function validateWebp(buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw invalid('O arquivo não é um WebP válido.');
  }
  const riffSize = buffer.readUInt32LE(4);
  if (riffSize + 8 > buffer.length + 1) {
    throw invalid('O cabeçalho RIFF do WebP não corresponde ao tamanho do arquivo.');
  }

  const chunkType = buffer.toString('ascii', 12, 16);
  const chunkSize = buffer.readUInt32LE(16);
  const dataStart = 20;
  if (dataStart + chunkSize > buffer.length) {
    throw invalid('O bloco WebP está truncado.');
  }

  let width = 0;
  let height = 0;
  if (chunkType === 'VP8 ') {
    if (chunkSize < 10 || buffer[dataStart] !== 0x9d || buffer[dataStart + 1] !== 0x01 || buffer[dataStart + 2] !== 0x2a) {
      throw invalid('Cabeçalho VP8 inválido.');
    }
    width = buffer.readUInt16LE(dataStart + 6) & 0x3fff;
    height = buffer.readUInt16LE(dataStart + 8) & 0x3fff;
  } else if (chunkType === 'VP8L') {
    if (chunkSize < 5 || buffer[dataStart] !== 0x2f) {
      throw invalid('Cabeçalho VP8L inválido.');
    }
    const bits = buffer.readUInt32LE(dataStart + 1);
    width = (bits & 0x3fff) + 1;
    height = ((bits >>> 14) & 0x3fff) + 1;
  } else if (chunkType === 'VP8X') {
    if (chunkSize < 10) {
      throw invalid('Cabeçalho VP8X inválido.');
    }
    width = buffer.readUIntLE(dataStart + 4, 3) + 1;
    height = buffer.readUIntLE(dataStart + 7, 3) + 1;
  } else {
    throw unsupported('Formato WebP não suportado (bloco desconhecido).', { chunkType });
  }

  if (width <= 0 || height <= 0) {
    throw invalid('O WebP possui dimensões inválidas.');
  }
  return { format: 'webp', mimeType: 'image/webp', extension: '.webp', width, height };
}

function detectUnsupported(buffer) {
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (['avif', 'avis', 'heic', 'heix', 'mif1', 'msf1'].includes(brand)) {
      throw unsupported('Formato AVIF/HEIC não suportado. Converta para JPEG, PNG, WebP ou GIF.', { brand });
    }
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    throw unsupported('Formato BMP não suportado. Use JPEG, PNG, WebP ou GIF.');
  }
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a))
  ) {
    throw unsupported('Formato TIFF não suportado. Use JPEG, PNG, WebP ou GIF.');
  }
  const start = buffer.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  if (start.startsWith('<svg') || start.startsWith('<?xml')) {
    throw unsupported('SVG não é aceito como imagem raster do dataset.');
  }
}

export function validateImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw invalid('O conteúdo recebido é pequeno demais para ser uma imagem válida.');
  }

  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return validatePng(buffer);
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return validateJpeg(buffer);
  }
  const gifSignature = buffer.toString('ascii', 0, 6);
  if (gifSignature === 'GIF87a' || gifSignature === 'GIF89a') {
    return validateGif(buffer);
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return validateWebp(buffer);
  }

  detectUnsupported(buffer);
  throw invalid('O arquivo não é uma imagem JPEG, PNG, WebP ou GIF reconhecível.');
}
