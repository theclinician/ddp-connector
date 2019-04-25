import {
  createSelector,
} from 'reselect';
import createEntitiesSelectors from './createEntitiesSelectors';

const constant = x => () => x;

const noModelSpecified = () => {
  console.warn(`You attempted to "selectCurrent" user but no User model was specified.
This will result with null value being returned even if a user is logged in. To fix this,
please make sure that you pass a valid Model and collection name to createCurrentUserSelectors().`);
};

const createCurrentUserSelectors = (collection, {
  Model,
  prefix = 'ddp',
  transform,
} = {}) => {
  // NOTE: We are intentially not passing Model here, because the actual model
  //       will only be created later on, when entity is merged with ddp.currentUser.user object.
  const userSelectorCreators = createEntitiesSelectors(collection, {
    prefix,
    transform,
  });

  const selectCurrentUserState = state => state[prefix] && state[prefix].currentUser;

  const selectCurrentUserId = createSelector(
    selectCurrentUserState,
    state => state && state.userId,
  );

  const selectCurrentUser = createSelector(
    selectCurrentUserState,
    state => state && state.user,
  );

  const selectCurrent = userSelectorCreators
    ? createSelector(
      userSelectorCreators.one.whereIdEquals(
        selectCurrentUserId,
      ),
      selectCurrentUser,
      (user, rawUser) => {
        if (user || rawUser) {
          if (Model) {
            return new Model({
              ...rawUser,
              ...user,
            });
          }
          return {
            ...rawUser,
            ...user,
          };
        }
        return undefined;
      },
    )
    : noModelSpecified;

  const selectIsLoggingIn = createSelector(
    selectCurrentUserState,
    state => !!(state && state.isLoggingIn),
  );

  // Example usage would be:
  //
  // current(User).user()
  // current(User).userId()
  // current(User).isLoggingIn()

  return {
    user: constant(selectCurrent),
    userId: constant(selectCurrentUserId),
    isLoggingIn: constant(selectIsLoggingIn),

    // LEGACY
    getIsLoggingIn: selectIsLoggingIn,
    getCurrent: selectCurrent,
    getCurrentId: selectCurrentUserId,
  };
};

export default createCurrentUserSelectors;
