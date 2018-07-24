import shallowEqual from 'shallowequal';
import {
  defaultMemoize,
  createSelectorCreator,
} from 'reselect';

const createShallowEqualSelector = createSelectorCreator(
  defaultMemoize,
  shallowEqual,
);

export default createShallowEqualSelector;
