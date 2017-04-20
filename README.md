# ddp-connector

DDP client bindings for react-redux

## Basic usage

### Store configuration
```javascript
import DDPClient from '@theclinician/ddp-client';
import DDPConnector, { ddpReducer } from '@theclinician/ddp-connector';
import { combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

const ddpClient = new DDPClient({
  endpoint: 'http://localhost:3000',
  SocketConstructor: WebSocket,
});

const ddpConnector = new DDPConnector({
  ddpClient,
  // defaultLoaderComponent: ...
});

const rootReducer = combineReducers({
  // NOTE: It has to be "ddp"
  ddp: ddpReducer,
});

const store = createStore(
  rootReducer,
  {},
  applyMiddleware(
    thunk.withExtraArgument({ ddpConnector }),
  );
);
```

### Calling a method with dispatch

```javascript
import { connect } from 'react-redux';
const callMethod = (method, ...params) => (dispatch, getState, { ddpConnector }) => ddpConnector.apply(name, params);

connect(
  () => ({}),
  dispatch => ({
    onSubmit: (data) => dispatch(callMethod('api.methods.updateUser', data)),
  }),
)(/* ... */);
```

### Getting entities from store
```javascript
import { connect } from 'react-redux';
import {
  createStructuredSelector,
  createSelector,
} from 'reselect';

class User {
  constructor(doc) {
    Object.assign(this, doc);
  }
  getName() {
    return this.name;
  }
}

User.collection = 'users'; // the Meteor default collection for storing users
User.selectors = {
  ...createEntitiesSelectors(User.collection),
  ...createCurrentUserSelectors(User.collection, { Model: User }),
};

connect(
  createStructuredSelector({
    currentUser: User.selectors.getCurrent,
    users: User.selectors.find(
      // First, we define a predicate
      (user, re) => !re || re.test(user.getName()),
      // Next, we provide selectors for predicate arguments (after "user")
      createSelector(
        (state, props) => props.search,
        search => (search ? new RegExp(search, 'i') : null),
      ),
    )
  }),
)
```

### Connecting components

```javascript
import { ddp } from '@theclinician/ddp-connector';

ddp({
  subscriptions: props => [
    { name: 'api.subscriptions.currentUser', params: [] },
  ],
  queries: props => ({
    userNames: {
      name: 'api.methods.getUserNames',
      params: [],
    },
  }),
  mutations: {
    updateUser: ({ mutate }) => fields => mutate({
      name: 'api.methods.updateUser',
      params: [fields],
    }).then(/* ... */),
  },
}, {
  // NOTE: If a function is provided here it will receive defaultLoaderComponent as the first parameter
  //       and it's expected to return a valid loader component, which will be rendered until all
  //       subscriptions, mutations and queries are ready. If you don't want loader to be displayed at
  //       all and for example you want to apply some custome logic based on the current subscriptions status,
  //       pass "null" instead of a function here.
  getLoaderComponent: null,
})(({
  subscriptionsReady,
  mitationsReady,
  queriesReady,
  userNames, // when queries are ready this will containe the result of method call
}) => (
  /* ... */
));
```

## Api

### `DDPConnector(options)`

```javascript
import DDPConnector from '@theclinician/ddp-connector';

/**
 * @param {Object} options
 * @param {Boolean} options.debug
 * @param {DDPClient} options.ddpClient
 * @param {Number} options.cleanupDelay
 * @param {Number} options.entitiesUpdateDelay
 * @param {Number} options.resourceUpdateDelay
 * @param {Function} options.defaultLoaderComponent
 */
const ddpConnector = new DDPConnector(options);
```

### `ddp(options)`

```javascript
import { ddp } from '@theclinician/ddp-connector';

ddp({
  subscriptions: (state, props) => [/* ... */],
  queries: (state, props) => {/* ... */},
  mutations: {},
});
```

Both `subscriptions` and `queries` are expected to return array or object (respectively) that contains elements of shape
```javascript
{
  name: 'methodOrSubscription',
  params: [],
}
```
The `mutations` object should define handlers, i.e. higher order functions that transform current `props` to an actuall event handlers
(see [recompose/withHandlers](https://github.com/acdlite/recompose/blob/master/docs/API.md#withhandlers)). One of the props is
a `mutate` function that can be used to invoke a meteor method by passing a `{ name, params }` object to it.

### `createCurrentUserSelectors(collection, { Model })`

```javascript
import { createCurrentUserSelectors } from '@theclinician/ddp-connector';

createCurrentUserSelectors('users');
```

Returns a `selectors` object with the following properties
```javascript
selectors.getIsLoggingIn
selectors.getCurrent
selectors.getCurrentId
```

### `createEntitiesSelectors(collection)`

```javascript
import { createEntitiesSelectors } from '@theclinician/ddp-connector';

createCurrentUserSelectors('users');
```

Resturns `selectors` object with the following properties
```javascript
selectors.find(predicate, ...selectors);
selectors.findAndMap(predicate, transform, ...selectors);
selectors.findOne(predicate, ...selectors);
selectors.getOne(idSelector)
selectors.getAll
selectors.getAllById
```
