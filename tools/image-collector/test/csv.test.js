import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeCsvCell, parseCsv, rowsToObjects, stringifyCsv } from '../src/util/csv.js';

test('parseCsv handles quoted commas, escaped quotes, BOM and CRLF', () => {
  const text = '\uFEFFa,b,c\r\n1,"two, three","say ""hi"""\r\n';
  assert.deepEqual(parseCsv(text), [
    ['a', 'b', 'c'],
    ['1', 'two, three', 'say "hi"'],
  ]);
});

test('parseCsv skips fully empty rows and rejects unclosed quotes', () => {
  assert.deepEqual(parseCsv('a,b\n\n1,2\n'), [
    ['a', 'b'],
    ['1', '2'],
  ]);
  assert.throws(() => parseCsv('a,b\n"unclosed,2'), /não foi fechado/);
});

test('rowsToObjects maps header names to values', () => {
  const parsed = rowsToObjects([
    ['name', 'value'],
    ['a', '1'],
  ]);
  assert.deepEqual(parsed.header, ['name', 'value']);
  assert.deepEqual(parsed.records, [{ name: 'a', value: '1' }]);
});

test('escapeCsvCell quotes separators and neutralises formulas', () => {
  assert.equal(escapeCsvCell('plain'), 'plain');
  assert.equal(escapeCsvCell('a,b'), '"a,b"');
  assert.equal(escapeCsvCell('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCsvCell('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(escapeCsvCell('=SUM(A1:A2)', { formulaSafe: false }), '=SUM(A1:A2)');
});

test('stringifyCsv produces a stable header and rows', () => {
  const text = stringifyCsv(['a', 'b'], [{ a: '1', b: 'x,y' }]);
  assert.equal(text, 'a,b\n1,"x,y"\n');
});
