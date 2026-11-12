export function parseCsv(text) {
  const input = String(text ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = true;
      index += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      index += 1;
      continue;
    }
    if (char === '\r' || char === '\n') {
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      row = [];
      if (char === '\r' && input[index + 1] === '\n') {
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }

    field += char;
    index += 1;
  }

  if (quoted) {
    throw new Error('CSV inválido: campo entre aspas não foi fechado.');
  }
  row.push(field);
  if (row.some((value) => value !== '')) {
    rows.push(row);
  }
  return rows;
}

function isFormula(value) {
  return /^[=+\-@\t\r]/.test(value);
}

export function escapeCsvCell(value, { formulaSafe = true } = {}) {
  let text = value === null || value === undefined ? '' : String(value);
  if (formulaSafe && isFormula(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function stringifyCsv(header, rows) {
  const lines = [header.map((cell) => escapeCsvCell(cell)).join(',')];
  for (const row of rows) {
    lines.push(header.map((column) => escapeCsvCell(row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function rowsToObjects(rows) {
  if (rows.length === 0) {
    return { header: [], records: [] };
  }
  const [header, ...data] = rows;
  const normalizedHeader = header.map((column) => String(column).trim());
  const records = data.map((values) => {
    const record = {};
    normalizedHeader.forEach((column, index) => {
      record[column] = values[index] ?? '';
    });
    return record;
  });
  return { header: normalizedHeader, records };
}
