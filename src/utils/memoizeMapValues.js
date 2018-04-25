import map from 'lodash/map';
import keyBy from 'lodash/keyBy';
import shallowEqual from 'shallowequal';
import stableMapValues from './stableMapValues';
import defaultIsEqual from './defaultIsEqual';

const memoizeMapValues = (mapOneValue, getKey, isEqual = defaultIsEqual) => {
  let lastInput = null;
  let lastResult = null;
  let lastValues = {};
  return (input) => {
    if (!lastResult) {
      lastResult = {};
    }
    const newValues = {};
    const newResult = stableMapValues(input, (value, key) => {
      const cacheKey = getKey ? map([value], getKey)[0] : key;
      const memoizedValue = lastValues && lastValues[cacheKey];
      if (lastInput && lastInput[cacheKey] === value) {
        newValues[cacheKey] = memoizedValue;
        return memoizedValue;
      }
      const newValue = mapOneValue(value, cacheKey);
      newValues[cacheKey] = newValue;
      return newValue;
    }, isEqual);
    if (!shallowEqual(newResult, lastResult)) {
      lastResult = newResult;
      lastValues = newValues;
    }
    if (getKey) {
      lastInput = keyBy(input, getKey);
    } else {
      lastInput = input;
    }
    return lastResult;
  };
};

export default memoizeMapValues;
