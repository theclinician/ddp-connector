# ddp-connector

DDP client bindings for react-redux

## Installation

```
npm install --save @theclinician/ddp-connector
```

## Basic usage

The execute the following examples you will need to install additional npm packages
```
npm install --save redux redux-thunk react-redux babel-preset-es2015 babel-preset-stage-3
```

### Configuration
```javascript
import DDPClient from '@theclinician/ddp-client';
import DDPConnector, { ddpReducer, DDPProvider } from '@theclinician/ddp-connector';
import { combineReducers, applyMiddleware, createStore } from 'redux';
import { Provider } from 'react-redux';
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
  ),
);

// NOTE: This is crucial!
ddpConnector.bindToStore(store);

const RootContainer = () => (
  <Provider store={store}>
    <DDPProvider ddpConnector={ddpConnector}>
      {/* ... */}
    </DDPProvider>
  </Provider>
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
  ...createEntitiesSelectors(User.collection, { Model: User }),
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
  //       and it's expected to return a react node, to be displayed until subscriptions, mutations and queries are all ready.
  //       If you don't want loader to be rendered at all, the easiest way is to pass "null" instead of a function.
  renderLoader: null,
})(({
  subscriptionsReady,
  mitationsReady,
  queriesReady,
  userNames, // when queries are ready this will containe the result of method call
}) => (
  /* ... */
));
```

## API

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

// NOTE: By registering a model you can ensrue that all entities which you receive
//       from store will me instances of the given model rather than pure js objects.
DDPConnector.registerModel(User); // User.collection needs to be set
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
import { createEntitiesSelectors as select } from '@theclinician/ddp-connector';

select('Todos').all()
select('Todos').one()
// find element by id
select('Todos').one.id('currentListId')
select('Todos').one.where(/* selectPredicate */)
select('Todos').all.where()
// prvide a custom sorter object
select('Todos').all.where().sort({
  createdAt: -1,
})
// return a map id -> object rather than a list
select('Todos').all.where().byId()
// transform documents before returing the result
select('Todos').all.where().map('title')
select('TodoLists').all().lookup({
  from: select('Todos').all(),
  foreignKey: 'listId',
  as: 'todos',
})
```
The following selectors are deprecated, please do not use them anymore:
```javascript
select('Todos').findAndMap(predicate, transform, ...selectors);
select('Todos').findOne(predicate, ...selectors);
select('Todos').getOne(idSelector)
select('Todos').getAll
select('Todos').getAllById
```
Please note that `.where()` accepts a predicate selector, not predicate function itself, so:
```javascript
// NOTE: This is not going to work:
// select('Todos').where(todo => !todo.isReady())
const constant = x => () => x;

select('Todos').where(
  constant(todo => !todo.isReady())
);

// or alternatively
select('Todos').all.satisfying(
  todo => !todo.isReady()
);
```
This is important because you may need to do things like:
```javascript
select('Todos').where(
  createSelector(
    selectCurrentListId
    listId => todo => todo.listId === listId,
  ),
)
```
