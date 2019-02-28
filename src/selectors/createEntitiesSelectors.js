import isArray from 'lodash/isArray';
import orderBy from 'lodash/orderBy';
import values from 'lodash/values';
import forEach from 'lodash/forEach';
import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';
import isPlainObject from 'lodash/isPlainObject';
import matches from 'lodash/matches';
import {
  toSelector,
  createGetAtKey,
  createDeepEqualSelector,
  createReconcilingSelector,
  createValuesMappingSelector,
  createHigherOrderSelector,
} from '@theclinician/selectors';
import {
  createSelector,
} from 'reselect';
import pickAnyKey, { pickNumberOfKeys } from '../utils/pickAnyKey';

const identity = x => x;
const constant = x => () => x;

const property = propName => (state, props) => props[propName];

const createEntitiesSelectors = (collection, {
  Model,
  prefix = 'ddp',
} = {}) => {
  const selectEntities = (state) => {
    if (state[prefix].status && state[prefix].status.restoring) {
      return state[prefix].status.entities && state[prefix].status.entities[collection];
    }
    return state[prefix].entities[collection];
  };

  const selectAll = Model
    ? createValuesMappingSelector(
      selectEntities,
      rawObject => new Model(rawObject),
    )
    : selectEntities;

  const createSelectOrderBySettings = (selectSorter = constant(null)) => createDeepEqualSelector(
    typeof selectSorter === 'function' ? selectSorter : toSelector(selectSorter),
    (sorter) => {
      const iteratees = [];
      const orders = [];
      forEach(isArray(sorter) ? sorter : [sorter], (value) => {
        if (typeof value === 'string') {
          iteratees.push(value);
          orders.push('asc');
        } else if (isPlainObject(value)) {
          forEach(value, (order, key) => {
            iteratees.push(key);
            orders.push(order < 0 ? 'desc' : 'asc');
          });
        }
      });
      return {
        iteratees,
        orders,
      };
    },
  );

  const createListSelector = (selectDocs, selectSorter) => createSelector(
    selectDocs,
    createSelectOrderBySettings(selectSorter),
    (docs, { iteratees, orders }) => orderBy(values(docs), iteratees, orders),
  );

  const createItemSelector = (selectDocs, selectSorter) => createSelector(
    createListSelector(selectDocs, selectSorter),
    list => list && list[0],
  );

  const createListSliceSelector = (selectDocs, selectSorter, selectLimit) => createSelector(
    createListSelector(selectDocs, selectSorter),
    selectLimit,
    (list, limit) => (list ? list.slice(0, limit) : []),
  );

  const createCombinedSorterSelector = (selectSorter, selectAnotherSorter = constant(null)) => {
    if (!selectSorter) {
      return selectAnotherSorter;
    }
    return createSelector(
      selectSorter,
      selectAnotherSorter,
      (sorter, newSorter) => {
        if (!sorter) {
          return newSorter;
        }
        if (!newSorter) {
          return sorter;
        }
        return (isArray(sorter) ? sorter : [sorter]).concat(newSorter);
      },
    );
  };

  const createSubsetSelectorCreator = selectLimit => (selectDocs, selectSorter) => {
    if (selectSorter) {
      return createListSliceSelector(selectDocs, selectSorter, toSelector(selectLimit));
    }
    return createSelector(
      selectDocs,
      (docs) => {
        const keys = pickNumberOfKeys(docs);
        const object = {};
        forEach(keys, (key) => {
          object[key] = docs[key];
        });
        return object;
      },
    );
  };

  const createSelectOne = (selectDocs, selectSorter) => (selectId) => {
    let idSelector = selectId;
    if (typeof idSelector === 'string') {
      idSelector = property(idSelector);
    }
    if (!idSelector) {
      if (selectSorter) {
        return createItemSelector(selectDocs, selectSorter);
      }
      idSelector = createSelector(
        selectDocs,
        docs => pickAnyKey(docs),
      );
    }
    return createSelector(
      idSelector,
      selectDocs,
      (id, docs) => (id ? docs && docs[id] : null),
    );
  };

  const filter = (selectDocs, selectPredicate, transform = identity) => {
    if (!selectPredicate) {
      return selectDocs;
    }
    let predicateSelector;
    if (isPlainObject(selectPredicate)) {
      predicateSelector = toSelector(selectPredicate);
    } else if (typeof selectPredicate === 'function') {
      predicateSelector = selectPredicate;
    } else {
      throw new Error(`Expected a plain object or selector, got ${typeof selectPredicate}`);
    }
    const selectPredicateValues = createSelector(
      createSelector(
        predicateSelector,
        (predicate) => {
          let compiled = predicate;
          if (typeof predicate === 'object') {
            compiled = matches(predicate);
          } else if (typeof predicate !== 'function') {
            throw new Error('Selector expects predicate to be an object or a function');
          }
          const selector = createValuesMappingSelector(
            selectDocs,
            (doc, id) => compiled(doc, id),
          );
          return selector;
        },
      ),
      identity,
      (valuesSelector, state) => valuesSelector(state),
    );
    return createValuesMappingSelector(
      createSelector(
        selectDocs,
        selectPredicateValues,
        (docs, predicateValues) => {
          const results = {};
          forEach(predicateValues, (accepted, id) => {
            if (accepted) {
              results[id] = docs[id];
            }
          });
          return results;
        },
      ),
      transform,
    );
  };

  const lookup = (selectDocs, {
    from = selectDocs,
    key,
    foreignKey,
    as,
  } = {}) => {
    let getRelated;
    if (typeof key === 'function') {
      getRelated = key;
    } else if (!key || typeof key === 'string') {
      const getKey = key ? createGetAtKey(key) : (doc, id) => id;
      getRelated = (doc, id, byForeignKey) => byForeignKey[getKey(doc, id)];
    } else {
      getRelated = constant([]);
    }
    const selectJoin = createReconcilingSelector(
      selectDocs,
      createReconcilingSelector(
        from,
        otherDocs => groupBy(otherDocs, foreignKey),
      ),
      (docs, byForeignKey) => mapValues(docs, (doc, id) => ({
        doc,
        related: getRelated(doc, id, byForeignKey) || [],
      })),
    );
    return createValuesMappingSelector(
      selectJoin,
      ({ doc, related }) => Object.create(doc, {
        [as]: {
          enumerable: false,
          value: related,
        },
      }),
    );
  };

  const selectTransformedDocs = (selectDocs, selectTransform) => createHigherOrderSelector(
    toSelector(selectTransform),
    transform => createValuesMappingSelector(
      selectDocs,
      transform,
    ),
  );

  const assignMethods = (createUtility, createSelectAll, selectDocs, selectSorter, object) => Object.assign(object, {
    byId: createSelectAll(selectDocs, selectDocs),
    where: selectPredicate => createUtility(filter(selectDocs, selectPredicate), selectSorter),
    whereIdEquals: selectId => createUtility(filter(selectDocs, createSelector(
      toSelector(selectId),
      id => (doc, docId) => id === docId,
    ))),
    whereIdMatchesProp: prop => createUtility(filter(selectDocs, createSelector(
      property(prop),
      id => (doc, docId) => id === docId,
    ))),
    satisfying: predicate => createUtility(filter(selectDocs, constant(predicate)), selectSorter),
    sort(selectAnotherSorter) {
      const selectCombinedSorters = createCombinedSorterSelector(selectSorter, selectAnotherSorter);
      return createUtility(selectDocs, selectCombinedSorters);
    },
    limit: selectLimit => createUtility(
      createSubsetSelectorCreator(selectLimit)(selectDocs, selectSorter),
      selectSorter,
    ),
    lookup: options => createUtility(lookup(selectDocs, options), selectSorter),
    map: selectTransform => createUtility(
      selectTransformedDocs(selectDocs, selectTransform),
      selectSorter,
    ),
  });

  const createAllUtility = (selectDocs, selectSorter) => assignMethods(
    createAllUtility,
    constant,
    selectDocs,
    selectSorter,
    createListSelector(selectDocs, selectSorter),
  );

  const createOneUtility = (selectDocs, selectSorter) => assignMethods(
    createOneUtility,
    createSubsetSelectorCreator(1),
    selectDocs,
    selectSorter,
    createSelectOne(selectDocs, selectSorter)(),
  );

  const createPredicate = (accept = constant(true), ...selectors) => createSelector(
    ...selectors,
    (...options) => doc => accept(doc, ...options),
  );

  // Example usage:
  //
  // select(Todo).one()
  // select(Todo).one.id()
  // select(Todo).one.where()
  // select(Todo).where()
  // select(Todo).where().byId()
  // select(TodoList).all().lookup({
  //   from: select(Todo).all(),
  //   foreignKey: 'listId',
  //   as: 'todos',
  // })

  const where = selectPredicate => createAllUtility(filter(selectAll, selectPredicate));

  const one = assignMethods(
    createOneUtility,
    createSubsetSelectorCreator(1),
    selectAll,
    null,
    () => createOneUtility(),
  );

  const all = assignMethods(
    createAllUtility,
    constant,
    selectAll,
    null,
    () => createAllUtility(selectAll),
  );

  return {
    one,
    where,
    all,
    // LEGACY
    find(accept, ...selectors) {
      console.warn('.find() is deprecated, use .all.where() instead');
      return createListSelector(filter(selectAll, createPredicate(accept, ...selectors)));
    },
    findOne(accept, ...selectors) {
      console.warn('.findOne() is deprecated, use .one.where() instead');
      return createItemSelector(filter(selectAll, createPredicate(accept, ...selectors)));
    },
    findAndMap(accept, transform = identity, ...selectors) {
      console.warn('.findAndMap() is deprecated, use .all.where().map() instead');
      return createListSelector(filter(selectAll, createPredicate(accept, ...selectors), transform));
    },
    getOne: createSelectOne(selectAll),
    getAll: createListSelector(selectAll),
    getAllById: selectAll,
  };
};

export default createEntitiesSelectors;
