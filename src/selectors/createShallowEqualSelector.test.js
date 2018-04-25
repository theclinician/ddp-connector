/* eslint-env jest */
import createShallowEqualSelector from './createShallowEqualSelector';

const identity = x => x;

let testContext;
beforeEach(() => {
  testContext = {};
  testContext.selector = createShallowEqualSelector(
    identity,
    () => ({}),
  );
});

test('persists value if the same argument was used', () => {
  expect(testContext.selector({})).toBe(testContext.selector({}));
});

test('does not persist if there is a "deep" difference', () => {
  expect(testContext.selector({ a: {} })).not.toBe(testContext.selector({ a: {} }));
});
