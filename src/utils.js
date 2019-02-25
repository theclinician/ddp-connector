export const createIdGenerator = (prefix = '') => {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}${counter}`;
  };
};

export const once = (func) => {
  let called = false;
  return (...args) => {
    if (!called) {
      called = true;
      func(...args);
    }
  };
};

export const wrapMapState = (mapToProps) => {
  let compiled;
  // Make sure that the function is only called with the arguments it needs.
  // This is important when the function uses arguments based caching
  // to optimize it's computations.
  const compile = (func) => {
    if (func.length >= 2) {
      return func;
    } else if (func.length === 1) {
      return state => func(state);
    }
    return () => func();
  };
  return (state, ownProps) => {
    if (compiled) {
      return compiled(state, ownProps);
    }
    if (typeof mapToProps !== 'function') {
      compiled = () => mapToProps;
      return compiled();
    }
    const props = mapToProps(state, ownProps);
    if (typeof props === 'function') {
      compiled = compile(props);
      return compiled(state, ownProps);
    }
    return props;
  };
};
