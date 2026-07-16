import { describe, expect, it } from 'vitest';

import { parseXyz } from './xyz-parser';

describe('parseXyz', () => {
  it('skips the two header lines and parses element + coordinates', () => {
    const contents = [
      '3',
      'water',
      'O 0.0 0.0 0.0',
      'H 0.757 0.586 0.0',
      'H -0.757 0.586 0.0',
    ].join('\n');

    const { elements, xyz } = parseXyz(contents);

    expect(elements).toEqual(['O', 'H', 'H']);
    expect(xyz).toEqual([
      [0.0, 0.0, 0.0],
      [0.757, 0.586, 0.0],
      [-0.757, 0.586, 0.0],
    ]);
  });

  it('tolerates arbitrary whitespace, trailing blank lines, and CRLF', () => {
    const contents = '2\r\ncomment\r\nC\t1.0   2.0\t3.0\r\nO 4 5 6\r\n\r\n';

    const { elements, xyz } = parseXyz(contents);

    expect(elements).toEqual(['C', 'O']);
    expect(xyz).toEqual([
      [1.0, 2.0, 3.0],
      [4, 5, 6],
    ]);
  });

  it('throws when a data line does not have exactly four fields', () => {
    const contents = '1\ncomment\nC 1.0 2.0';
    expect(() => parseXyz(contents)).toThrow(/4 fields/);
  });

  it('throws when a coordinate is not numeric', () => {
    const contents = '1\ncomment\nC 1.0 x 3.0';
    expect(() => parseXyz(contents)).toThrow(/Non-numeric/);
  });
});
