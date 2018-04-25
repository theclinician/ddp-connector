import forEach from 'lodash/forEach';
import isPlainObject from 'lodash/isPlainObject';
import map from 'lodash/map';
import {
  createSelector,
} from 'reselect';

const constant = x => () => x;

const createStructuredSelector = (selectors) => {
  const keys = Object.keys(selectors);
  return createSelector(
    map(keys, (key) => {
      if (isPlainObject(selectors[key])) {
        return createStructuredSelector(selectors[key]);
      } else if (typeof selectors[key] === 'function') {
        return selectors[key];
      }
      return constant(selectors[key]);
    }),
    (...args) => {
      const object = {};
      forEach(args, (value, i) => {
        object[keys[i]] = value;
      });
      return object;
    },
  );
};

export default createStructuredSelector;
