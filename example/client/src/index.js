import DDPClient from '@theclinician/ddp-client';
import DDPConnector, { ddpReducer } from 'ddp-connector';
import { createStore, combineReducers, applyMiddleware } from 'redux';
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
});

const rootReducer = combineReducers({
  ddp: ddpReducer,
});

const store = createStore(
  rootReducer,
  {},
  applyMiddleware(
    thunk.withExtraArgument({ ddpConnector }),
  ),
);

ReactDOM.render(
  <App store={store} ddpConnector={ddpConnector}/>,
  document.getElementById('root')
);
