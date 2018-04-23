import React from 'react';
import { DDPProvider } from '@theclinician/ddp-connector';
import { Provider } from 'react-redux';
import Router from '../routes/Router';

const App = ({
  store,
  ddpConnector,
}) => (
  <Provider store={store}>
    <DDPProvider ddpConnector={ddpConnector}>
      <Router />
    </DDPProvider>
  </Provider>
);

export default App;
