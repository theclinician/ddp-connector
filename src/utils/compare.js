import isPlainObject from 'lodash/isPlainObject';
import isArray from 'lodash/isArray';
import isDate from 'lodash/isDate';
import sortBy from 'lodash/sortBy';
import reduce from 'lodash/reduce';
import map from 'lodash/map';
import toPairs from 'lodash/toPairs';

function defaultCompare(x, y) {
  if (x < y) {
    return -1;
  }
  if (x > y) {
    return 1;
  }
  return 0;
}

function conditional(predicate, specialCase) {
  return (x, y) => {
    if (predicate(x)) {
      if (!predicate(y)) {
        return -1;
      }
      return specialCase(x, y);
    } else if (predicate(y)) {
      return 1;
    }
    return 0;
  };
}

const pluginObject = compare => conditional(isPlainObject, (x, y) => compare(sortBy(toPairs(x), '0'), sortBy(toPairs(y), '0')));
const pluginArray = compare => conditional(isArray, (x, y) => {
  if (!isArray(y)) {
    return 1;
  }
  const n = x.length;
  const m = y.length;
  for (let i = 0; i < n && i < m; i += 1) {
    const result = compare(x[i], y[i]);
    if (result !== 0) {
      return result;
    }
  }
  return compare(n, m);
});

const constant = x => () => x;
// eslint-disable-next-line valid-typeof
const createType = type => () => conditional(value => typeof value === type, defaultCompare);
const createLiteral = literal => () => conditional(value => value === literal, constant(0));

const pluginDate = () => conditional(isDate, defaultCompare);

function createCompare(plugins) {
  let compiled;

  const compare = (x, y) => compiled(x, y);

  compiled = reduce(map(plugins, plugin => plugin(compare)), (previousCompare, currentCompare) => (x, y) => {
    const result = previousCompare(x, y);
    if (result !== 0) {
      return result;
    }
    return currentCompare(x, y);
  });
  return compare;
}

const compare = createCompare([
  createLiteral(null),
  createType('number'),
  createType('string'),
  pluginObject,
  pluginArray,
  createType('boolean'),
  pluginDate,
  createType('undefined'),
]);

export default compare;
