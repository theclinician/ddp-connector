import React from 'react';
import { Provider as DDPProvider } from 'ddp-connector';
import { Provider } from 'react-redux';
import { allLists } from '../common/api/TodoLists';
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
