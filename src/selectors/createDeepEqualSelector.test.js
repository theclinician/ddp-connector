/* eslint-env jest */
import createDeepEqualSelector from './createDeepEqualSelector';

const identity = x => x;

let testContext;
beforeEach(() => {
  testContext = {};
  testContext.selector = createDeepEqualSelector(
    identity,
    () => ({}),
  );
});

test('persists value if the same argument was used', () => {
  expect(testContext.selector({})).toBe(testContext.selector({}));
});

test('persists value even if there is a "deep" difference', () => {
  expect(testContext.selector({ a: {} })).toBe(testContext.selector({ a: {} }));
});
