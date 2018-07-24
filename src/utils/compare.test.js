/* eslint-env jest */

import compare from './compare';

describe('Test utility - compare', () => {
  it('compares null and number', () => {
    expect(compare(null, 1)).toEqual(-1);
    expect(compare(1, null)).toEqual(1);
  });
  it('compares number and string', () => {
    expect(compare(1, 'a')).toEqual(-1);
    expect(compare('a', 1)).toEqual(1);
  });
  it('compares string and object', () => {
    expect(compare('a', {})).toEqual(-1);
    expect(compare({}, 'a')).toEqual(1);
  });
  it('compares object and array', () => {
    expect(compare({}, [])).toEqual(-1);
    expect(compare([], {})).toEqual(1);
  });
  it('compares array and boolean', () => {
    expect(compare([], true)).toEqual(-1);
    expect(compare(true, [])).toEqual(1);
  });
  it('compares boolean and Date', () => {
    expect(compare(true, new Date(0))).toEqual(-1);
    expect(compare(new Date(0), true)).toEqual(1);
  });
  it('compares Date and undefined', () => {
    expect(compare(new Date(0), undefined)).toEqual(-1);
    expect(compare(undefined, new Date(0))).toEqual(1);
  });
  it('compares empty objects', () => {
    expect(compare({}, {})).toEqual(0);
  });
  it('compares empty arrays', () => {
    expect(compare([], [])).toEqual(0);
  });
  it('compares empty and non-empty array', () => {
    expect(compare([], [1])).toEqual(-1);
    expect(compare([1], [])).toEqual(1);
  });
  it('compares arrays lexicographically', () => {
    expect(compare([
      1, 2, 3,
    ], [
      1, 2, 4,
    ])).toEqual(-1);
    expect(compare([
      1, 2, 4,
    ], [
      1, 2, 3,
    ])).toEqual(1);
  });
  it('compares equal arrays', () => {
    expect(compare([
      1, 2, 3,
    ], [
      1, 2, 3,
    ])).toEqual(0);
  });
  it('compares equal nested arrays', () => {
    expect(compare([
      [1], [2], [3],
    ], [
      [1], [2], [3],
    ])).toEqual(0);
  });
  it('compares different objects', () => {
    expect(compare({
      a: 1,
      b: 1,
    }, {
      a: 1,
      c: 1,
    })).toEqual(-1);
    expect(compare({
      a: 1,
      c: 1,
    }, {
      a: 1,
      b: 1,
    })).toEqual(1);
  });
  it('compares equal objects', () => {
    expect(compare({
      a: 1,
      b: 1,
    }, {
      a: 1,
      b: 1,
    })).toEqual(0);
  });
  it('compares equal nested objects', () => {
    expect(compare({
      a: { x: 1 },
      b: { y: 1 },
    }, {
      a: { x: 1 },
      b: { y: 1 },
    })).toEqual(0);
  });
});
