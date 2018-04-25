import {
  defaultMemoize,
} from 'reselect';
import memoizeMapValues from '../utils/memoizeMapValues';

const defaultIsEqual = (a, b) => a === b;

const createValuesMappingSelector = (selectObject, mapOneValue, isEqual = defaultIsEqual) => {
  let recomputations = 0;
  const mapValues = memoizeMapValues((value, key) => {
    recomputations += 1;
    return mapOneValue(value, key);
  }, isEqual);
  const selector = defaultMemoize((...args) => mapValues(selectObject(...args)));
  selector.recomputations = () => recomputations;
  selector.resetRecomputations = () => {
    recomputations = 0;
  };
  return selector;
};

export default createValuesMappingSelector;
