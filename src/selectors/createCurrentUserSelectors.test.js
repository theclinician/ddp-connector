/* eslint-env jest */
import createCurrentUserSelectors from './createCurrentUserSelectors';

const state = {
  ddp: {
    currentUser: {
      userId: '1',
      user: {
        _id: '1',
      },
      isLoggingIn: false,
    },
    entities: {
      users: {
        1: {
          name: 'Tomek',
        },
      },
    },
  },
};

const selectors = createCurrentUserSelectors('users');

test('selects current userId', () => {
  expect(selectors.userId()(state)).toEqual('1');
});

test('selects current userId with legacy api', () => {
  expect(selectors.getCurrentId(state)).toEqual('1');
});

test('selects current user', () => {
  expect(selectors.user()(state)).toEqual({
    _id: '1',
    name: 'Tomek',
  });
});

test('selects current user even if entity is not present', () => {
  expect(selectors.user()({
    ddp: {
      currentUser: state.ddp.currentUser,
      entities: {},
    },
  })).toEqual({
    _id: '1',
  });
});

test('selects current user with legacy api', () => {
  expect(selectors.getCurrent(state)).toEqual({
    _id: '1',
    name: 'Tomek',
  });
});

test('selects logging in status', () => {
  expect(selectors.isLoggingIn()(state)).toEqual(false);
});

test('selects logging in status with legacy api', () => {
  expect(selectors.getIsLoggingIn(state)).toEqual(false);
});
