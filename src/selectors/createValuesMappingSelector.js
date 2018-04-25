import {
  createSelector,
} from 'reselect';
import memoizeMapValues from '../utils/memoizeMapValues';

const createValuesMappingSelector = (selectObject, mapOneValue, isEqual) => {
  const mapValues = memoizeMapValues(mapOneValue, null, isEqual);
  return createSelector(
    selectObject,
    mapValues,
  );
};

export default createValuesMappingSelector;
