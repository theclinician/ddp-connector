/* eslint-env jest */

import shallowEqual from './shallowEqual';

it('should accept empty objects', () => {
  expect(shallowEqual({}, {})).toBe(true);
});

it('should accept empty arrays', () => {
  expect(shallowEqual([], [])).toBe(true);
});

it('should not accept object vs array', () => {
  expect(shallowEqual([], {})).toBe(false);
});

it('should accept arrays with a few elements', () => {
  expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
});

it('should not accept arrays with different elements', () => {
  expect(shallowEqual([1, 2, 4], [1, 2, 3])).toBe(false);
});

it('should not accept arrays with different number of elements', () => {
  expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
});

it('should accept objects with a few elements', () => {
  expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
});

it('should not accept objects with different elements', () => {
  expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
});

it('should not accept objects with different number of elements', () => {
  expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
});
