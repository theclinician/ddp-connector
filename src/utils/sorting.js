import isArray from 'lodash/isArray';
import reduce from 'lodash/reduce';
import map from 'lodash/map';
import isPlainObject from 'lodash/isPlainObject';
import {
  toSelector,
  createGetAtKey,
} from '@theclinician/selectors';
import {
  createSelector,
} from 'reselect';

const constant = x => () => x;

const compose = (f, g) => {
  if (!f) {
    return g;
  }
  if (!g) {
    return f;
  }
  return (a, b) => {
    const value = f(a, b);
    if (value !== 0) {
      return value;
    }
    return g(a, b);
  };
};

const compare = (a, b) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

export const nilSorter = constant(0);

const createSortByKey = (order, key) => {
  const getKey = createGetAtKey(key);
  return (a, b) => order * compare(getKey(a), getKey(b));
};

export const toSorter = (sorter = nilSorter) => {
  if (typeof sorter === 'function') {
    return sorter;
  }
  if (typeof sorter === 'string') {
    return toSorter({ [sorter]: 1 });
  }
  if (isArray(sorter)) {
    return reduce(map(sorter, toSorter), compose, nilSorter);
  }
  if (isPlainObject(sorter)) {
    return toSorter(map(sorter, createSortByKey));
  }
  return nilSorter;
};

export const toSorterSelector = (selector = constant(nilSorter)) => createSelector(
  toSelector(selector),
  toSorter,
);

export const composeSorterSelector = (selectSorter, selectAnotherSorter = nilSorter) => {
  if (!selectSorter) {
    return selectAnotherSorter;
  }
  return createSelector(
    toSorterSelector(selectSorter),
    toSorterSelector(selectAnotherSorter),
    (sorter, newSorter) => compose(sorter, newSorter),
  );
};
