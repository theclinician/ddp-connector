import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import every from 'lodash/every';
import keys from 'lodash/keys';

const shallowEqual = (a, b) => {
  if (!isObject(a) || !isObject(b)) {
    return a === b;
  }
  const aIsArray = isArray(a);
  const bIsArray = isArray(b);
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) {
      return false;
    }
    return every(a, (v, i) => v === b[i]);
  }
  if (!aIsArray && !bIsArray) {
    const keysA = keys(a);
    const keysB = keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    return every(keysA, k => a[k] === b[k]);
  }
  return false;
};

export default shallowEqual;
