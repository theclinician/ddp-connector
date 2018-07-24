/* eslint-env jest */

import memoizeMapValues from './memoizeMapValues';

const constant = x => () => x;
const identity = x => x;
const shallowCopy = x => ({ ...x });

describe('Test utility - memoizeMapValues', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.empty = {};
    testContext.identity = memoizeMapValues(identity);
    testContext.constant = memoizeMapValues(constant(testContext.empty));
    testContext.shallowCopy = memoizeMapValues(shallowCopy);
  });

  test('preserves empty array', () => {
    expect(testContext.identity([])).toEqual([]);
  });

  describe('Given an empty object', () => {
    test('persists identity mapping', () => {
      const result1 = testContext.identity({});
      const result2 = testContext.identity({});
      expect(result1).toBe(result2);
    });

    test('persists constant mapping', () => {
      const result1 = testContext.constant({});
      const result2 = testContext.constant({});
      expect(result1).toBe(result2);
    });

    it('persists shallow copy', () => {
      const result1 = testContext.shallowCopy({});
      const result2 = testContext.shallowCopy({});
      expect(result1).toBe(result2);
    });
  });

  describe('Given a non-empty object', () => {
    test('computes identity mapping', () => {
      const a = {};
      const b = {};
      expect(testContext.identity({ a, b })).toEqual({ a, b });
    });

    test('persists identity mapping', () => {
      const a = {};
      const b = {};
      const result1 = testContext.identity({ a, b });
      const result2 = testContext.identity({ a, b });
      expect(result1).toBe(result2);
    });

    test('computes constant mapping', () => {
      const a = {};
      const b = {};
      expect(testContext.identity({ a, b })).toEqual({
        a: testContext.empty,
        b: testContext.empty,
      });
    });

    test('persists constant mapping', () => {
      const a = {};
      const b = {};
      const result1 = testContext.constant({ a, b });
      const result2 = testContext.constant({ a, b });
      expect(result1).toBe(result2);
    });

    test('computes shallow copy mapping', () => {
      const a = { x: 1 };
      const b = { x: 2 };
      expect(testContext.identity({ a, b })).toEqual({ a, b });
    });

    it('persists shallow copy mapping', () => {
      const a = {};
      const b = {};
      const result1 = testContext.shallowCopy({ a, b });
      const result2 = testContext.shallowCopy({ a, b });
      expect(result1).toBe(result2);
    });
  });
});
