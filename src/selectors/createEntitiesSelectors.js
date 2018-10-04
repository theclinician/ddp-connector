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
} from '@theclinician/selectors';
import {
  createSelector,
} from 'reselect';
import pickAnyKey from '../utils/pickAnyKey';

const identity = x => x;
const constant = x => () => x;

const property = propName => (state, props) => props[propName];

const createEntitiesSelectors = (collection, {
  Model,
  prefix = 'ddp',
} = {}) => {
  const selectEntities = (state) => {
    if (state[prefix].status &&
        state[prefix].status.restoring) {
      return state[prefix].status.entities &&
             state[prefix].status.entities[collection];
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
    const getValue = key ? createGetAtKey(key) : (doc, id) => id;
    const selectJoin = createReconcilingSelector(
      selectDocs,
      createReconcilingSelector(
        from,
        otherDocs => groupBy(otherDocs, foreignKey),
      ),
      (docs, byForeignKey) => mapValues(docs, (doc, id) => {
        const keyValue = getValue(doc, id);
        return {
          doc,
          related: byForeignKey[keyValue] || [],
        };
      }),
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

  const createList = (selectDocs, selectSorter) => {
    const selector = createListSelector(selectDocs, selectSorter);
    Object.assign(selector, {
      one: () => createSelectOne(selectDocs, selectSorter)(),
      byId: () => selectDocs,
      where: selectPredicate => createList(filter(selectDocs, selectPredicate)),
      sort(selectAnotherSorter) {
        const selectCombinedSorters = createCombinedSorterSelector(selectSorter, selectAnotherSorter);
        return createList(selectDocs, selectCombinedSorters);
      },
      lookup: options => createList(lookup(selectDocs, options), selectSorter),
    });
    return selector;
  };

  const createOne = (selectDocs, selectSorter) => {
    const selectorCreator = createSelectOne(selectDocs, selectSorter);
    const selector = selectorCreator();
    Object.assign(selector, {
      id: selectorCreator,
      where: selectPredicate => createOne(filter(selectDocs, selectPredicate), selectSorter),
      sort(selectAnotherSorter) {
        const selectCombinedSorters = createCombinedSorterSelector(selectSorter, selectAnotherSorter);
        return createOne(selectDocs, selectCombinedSorters);
      },
      lookup: options => createOne(lookup(selectDocs, options), selectSorter),
    });
    return selector;
  };

  const createWhere = selectDocs => selectPredicate =>
    createList(filter(selectDocs, selectPredicate));

  const createPredicate = (accept = constant(true), ...selectors) => createSelector(
    ...selectors,
    (...options) => doc => accept(doc, ...options),
  );

  // Example usage:
  //
  // select(Todo).one
  // select(Todo).one.id()
  // select(Todo).one.where()
  // select(Todo).where()
  // select(Todo).where().byId()
  // select(Todo).where().sort().limit()
  // select(TodoList).all().lookup({
  //   from: select(Todo).all(),
  //   foreignKey: 'listId',
  //   as: 'todos',
  // })

  return {
    one: createOne(selectAll),
    where: createWhere(selectAll),
    all() {
      return this.where();
    },
    // LEGACY
    find(accept, ...selectors) {
      return createListSelector(filter(selectAll, createPredicate(accept, ...selectors)));
    },
    findOne(accept, ...selectors) {
      return createItemSelector(filter(selectAll, createPredicate(accept, ...selectors)));
    },
    findAndMap(accept, transform = identity, ...selectors) {
      return createListSelector(filter(selectAll, createPredicate(accept, ...selectors), transform));
    },
    getOne: createSelectOne(selectAll),
    getAll: createListSelector(selectAll),
    getAllById: selectAll,
  };
};

export default createEntitiesSelectors;
