import React, { Children, PropTypes } from 'react';
import DDPConnector from './DDPConnector.js';

class Provider extends React.Component {
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

Provider.propTypes = {
  children: PropTypes.node.isRequired,
  ddpConnector: PropTypes.instanceOf(DDPConnector).isRequired,
};

Provider.childContextTypes = {
  ddpConnector: PropTypes.instanceOf(DDPConnector).isRequired,
};

Provider.displayName = 'Provider';

export default Provider;
