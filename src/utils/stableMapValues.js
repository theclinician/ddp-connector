import pullAt from 'lodash/pullAt';
import map from 'lodash/map';
import omit from 'lodash/omit';
import mapValues from 'lodash/mapValues';
import isArray from 'lodash/isArray';
import defaultIsEqual from './defaultIsEqual';

/**
 * Like lodash/mapValues, but with more caution, e.g. when new value is the
 * the same as the old one, do not create a new object. Also adds an ability
 * to remove selected fields by returning a special value.
 * @param {object} object to map
 * @param {function} mapValue
 * @param {function} isEqual
 * @returns {object}
 */
const stableMapValues = (objectOrArray, mapValue, isEqual = defaultIsEqual) => {
  let modified = false;

  const toRemove = [];
  const remove = {};
  const array = isArray(objectOrArray);

  const mapOneValue = (v, k) => {
    const newValue = mapValue(v, k, remove);
    if (newValue === remove) {
      toRemove.push(k);
    } else if (isEqual(newValue, v)) {
      return v;
    }
    modified = true;
    return newValue;
  };

  const newObjectOrArray = array
    ? map(objectOrArray, mapOneValue)
    : mapValues(objectOrArray, mapOneValue);

  if (toRemove.length > 0) {
    if (array) {
      pullAt(newObjectOrArray, toRemove);
      return newObjectOrArray;
    }
    return omit(newObjectOrArray, toRemove);
  }
  if (!modified) {
    return objectOrArray;
  }
  return newObjectOrArray;
};

export default stableMapValues;
