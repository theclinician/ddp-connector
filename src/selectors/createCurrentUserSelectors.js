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
} = {}) => {
  const userSelectorCreators = createEntitiesSelectors(collection, { Model, prefix });

  const selectCurrentUserState = state => state[prefix] &&
                                          state[prefix].currentUser;

  const selectCurrentUserId = createSelector(
    selectCurrentUserState,
    state => state && state.userId,
  );

  const selectCurrent = userSelectorCreators
    ? userSelectorCreators.one.id(
      selectCurrentUserId,
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
