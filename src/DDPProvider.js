import React, { Children } from 'react';
import PropTypes from 'prop-types';
import DDPConnector from './DDPConnector.js';

class DDPProvider extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.ddpConnector = props.ddpConnector;
  }
  getChildContext() {
    return {
      ddpConnector: this.ddpConnector,
    };
  }
  render() {
    return Children.only(this.props.children);
  }
}

DDPProvider.propTypes = {
  children: PropTypes.node.isRequired,
  ddpConnector: PropTypes.instanceOf(DDPConnector).isRequired,
};

DDPProvider.childContextTypes = {
  ddpConnector: PropTypes.instanceOf(DDPConnector).isRequired,
};

DDPProvider.displayName = 'DDPProvider';

export default DDPProvider;
