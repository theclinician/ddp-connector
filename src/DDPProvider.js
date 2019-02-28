import React from 'react';
import PropTypes from 'prop-types';
import DDPConnector from './DDPConnector.js';

export const DDPContext = React.createContext();

class DDPProvider extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.ddpConnector = props.ddpConnector;
  }

  render() {
    const {
      children,
      ddpConnector,
    } = this.props;
    return (
      <DDPContext.Provider value={ddpConnector}>
        {children}
      </DDPContext.Provider>
    );
  }
}

DDPProvider.propTypes = {
  children: PropTypes.node.isRequired,
  ddpConnector: PropTypes.instanceOf(DDPConnector).isRequired,
};

DDPProvider.displayName = 'DDPProvider';

export default DDPProvider;
