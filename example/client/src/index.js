import DDPClient from '@theclinician/ddp-client';
import DDPConnector, { ddpReducer } from '@theclinician/ddp-connector';
import map from 'lodash/map';
import get from 'lodash/get';
import mapValues from 'lodash/mapValues';
import {
  persistState,
} from 'redux-devtools';
import {
  compose,
  createStore,
  combineReducers,
  applyMiddleware,
} from 'redux';
import thunk from 'redux-thunk';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './containers/App';
import './index.css';

const ddpClient = new DDPClient({
  endpoint: 'ws://localhost:4000/websocket',
  SocketConstructor: WebSocket,
});

const ddpConnector = new DDPConnector({
  ddpClient,
  debug: true,
  transformRequest: (request, meta) => {
    return {
      ...request,
      params: map(request.params, (fields) => mapValues(fields, (value, name) => {
        if (typeof value === 'string') {
          const match = /^\$meta\.(.*)/.exec(value);
          if (match) {
            return get(meta, match[1]);
          }
        }
        return value;
      })),
    };
  },
  getMessageChannel(collection) {
    return collection.indexOf('messages.') === 0;
  },
});

const rootReducer = combineReducers({
  ddp: ddpReducer,
});

const enhancer = compose(
  window.__REDUX_DEVTOOLS_EXTENSION__ ? window.__REDUX_DEVTOOLS_EXTENSION__({}) : x => x,
  persistState(
    window.location.href.match(
      /[?&]debug_session=([^&#]+)\b/,
    ),
  ),
);

const store = createStore(
  rootReducer,
  {},
  compose(
    applyMiddleware(
      thunk.withExtraArgument({ ddpConnector }),
    ),
    enhancer,
  )
);

ddpConnector.bindToStore(store);

ReactDOM.render(
  <App store={store} ddpConnector={ddpConnector}/>,
  document.getElementById('root')
);
