import shallowEqual from 'shallowequal';
import {
  defaultMemoize,
  createSelectorCreator,
} from 'reselect';

const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  shallowEqual,
);

export default createDeepEqualSelector;
