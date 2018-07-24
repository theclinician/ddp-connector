import {
  defaultMemoize,
  createSelectorCreator,
} from 'reselect';
import shallowEqual from '../utils/shallowEqual';

const createShallowEqualSelector = createSelectorCreator(
  defaultMemoize,
  shallowEqual,
);

export default createShallowEqualSelector;
