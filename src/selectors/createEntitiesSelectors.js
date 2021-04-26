import map from 'lodash/map';
import keyBy from 'lodash/keyBy';
import values from 'lodash/values';
import forEach from 'lodash/forEach';
import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';
import isPlainObject from 'lodash/isPlainObject';
import matches from 'lodash/matches';
import {
  property,
  toSelector,
  createGetAtKey,
  createReconcilingSelector,
  createValuesMappingSelector,
  createHigherOrderSelector,
} from '@theclinician/selectors';
import {
  createSelector,
} from 'reselect';
import pickAnyKey from '../utils/pickAnyKey';
import {
  nilSorter,
  toSorterSelector,
  composeSorterSelector,
} from '../utils/sorting';

const identity = x => x;
const constant = x => () => x;

const createEntitiesSelectors = (collection, {
  Model,
  plugins,
  prefix = 'ddp',
  transform: transformRawObject,
} = {}) => {
  const empty = {};

  const selectEntities = state => (
    state &&
    state[prefix] &&
    state[prefix].entities &&
    state[prefix].entities[collection]
  );

  // NOTE: Values mapping selector returns the unchanged value if it's empty. This
  //       means that if we pass null, then it will return the same null, not empty
  //       object as in the case of lodash.mapValues.
  const selectEntitiesOrEmpty = state => selectEntities(state) || empty;

  let mapOneObject;
  if (Model && transformRawObject) {
    mapOneObject = rawObject => new Model(transformRawObject(rawObject));
  } else if (Model) {
    mapOneObject = rawObject => new Model(rawObject);
  } else if (transformRawObject) {
    mapOneObject = transformRawObject;
  }
  const selectAll = mapOneObject
    ? createValuesMappingSelector(
      selectEntitiesOrEmpty,
      mapOneObject,
    )
    : selectEntitiesOrEmpty;

  const createListSelector = (selectDocs, selectSorter = constant(nilSorter)) => createSelector(
    selectDocs,
    toSorterSelector(selectSorter),
    (docs, compare) => (compare === nilSorter
      ? values(docs)
      : values(docs).sort(compare)
    ),
  );

  const createItemSelector = (selectDocs, selectSorter) => createSelector(
    createListSelector(selectDocs, selectSorter),
    list => list && list[0],
  );

  const createSubsetSelectorCreator = (selectLimit, selectSorter) => selectDocs => createReconcilingSelector(
    toSelector(selectLimit),
    createSelector(
      selectDocs,
      toSorterSelector(selectSorter),
      (docs, compare) => {
        const list = map(docs, (doc, id) => ({ doc, id }));
        if (compare === nilSorter) {
          return list;
        }
        return list.sort((x, y) => compare(x.doc, y.doc));
      },
    ),
    (limit, sortedDocs) => mapValues(
      keyBy(
        sortedDocs.slice(0, limit),
        'id',
      ),
      'doc',
    ),
  );

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
      (id, docs) => (id ? docs && docs[id] : undefined),
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
            if (accepted && docs[id]) {
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

  const assignMethods = (createUtility, createSubsetSelector, selectDocs, selectSorter, slector) => Object.assign(slector, {
    byId: () => createSubsetSelector(selectDocs),
    where: selectPredicate => createUtility(filter(selectDocs, selectPredicate), selectSorter),
    whereIdEquals: selectId => createUtility(filter(selectDocs, createSelector(
      toSelector(selectId),
      id => (doc, docId) => id === docId,
    )), selectSorter),
    whereIdMatchesProp: prop => createUtility(filter(selectDocs, createSelector(
      property(prop),
      id => (doc, docId) => id === docId,
    )), selectSorter),
    satisfying: predicate => createUtility(filter(selectDocs, constant(predicate)), selectSorter),
    sort: selectAnotherSorter => createUtility(
      selectDocs,
      composeSorterSelector(selectSorter, selectAnotherSorter),
    ),
    withCompare(compare) {
      if (typeof compare !== 'function') {
        throw new Error('Expected "compare" to be a function');
      }
      return createUtility(
        selectDocs,
        composeSorterSelector(selectSorter, constant(compare)),
      );
    },
    limit: selectLimit => createUtility(
      createSubsetSelectorCreator(selectLimit, selectSorter)(selectDocs),
      selectSorter,
    ),
    lookup: options => createUtility(lookup(selectDocs, options), selectSorter),
    map: selectTransform => createUtility(
      selectTransformedDocs(selectDocs, selectTransform),
      selectSorter,
    ),
  }, mapValues(plugins, plugin => (...args) => plugin(...args)(createUtility(selectDocs, selectSorter))));

  const createAllUtility = (selectDocs, selectSorter) => assignMethods(
    createAllUtility,
    identity,
    selectDocs,
    selectSorter,
    createListSelector(selectDocs, selectSorter),
  );

  const createOneUtility = (selectDocs, selectSorter) => assignMethods(
    createOneUtility,
    createSubsetSelectorCreator(1, selectSorter),
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
    () => createOneUtility(selectAll),
  );

  const all = assignMethods(
    createAllUtility,
    identity,
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
