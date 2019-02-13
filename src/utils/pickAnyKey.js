import has from 'lodash/has';

const pickAnyKey = (object) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const key in object) {
    if (has(object, key)) {
      return key;
    }
  }
  return null;
};

export const pickNumberOfKeys = (object, number = 0) => {
  const keys = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const key in object) {
    if (has(object, key)) {
      keys.push(key);
      if (keys.length === number) {
        return keys;
      }
    }
  }
  return keys;
};

export default pickAnyKey;
