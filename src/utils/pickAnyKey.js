import has from 'lodash/has';

const pickAnyKey = (object) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const key in object) {
    if (has(object, key)) {
      return key;
    }
  }
  return undefined;
};

export default pickAnyKey;
