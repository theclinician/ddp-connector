/* eslint-env jest */
import createStructuredSelector from './createStructuredSelector';

const constant = x => () => x;
const identity = x => x;

test('selects an empty object', () => {
  const selector = createStructuredSelector({});
  expect(selector()).toEqual({});
});

test('selects object with constant values', () => {
  const selector = createStructuredSelector({
    a: 1,
    b: 2,
  });
  expect(selector()).toEqual({
    a: 1,
    b: 2,
  });
});

test('selects object with slectors as keys', () => {
  const selector = createStructuredSelector({
    a: constant(1),
    b: constant(2),
  });
  expect(selector()).toEqual({
    a: 1,
    b: 2,
  });
});

test('selects object with nested slectors', () => {
  const selector = createStructuredSelector({
    a: {
      b: identity,
    },
  });
  expect(selector(2)).toEqual({
    a: {
      b: 2,
    },
  });
});
