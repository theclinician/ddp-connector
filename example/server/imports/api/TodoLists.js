import TodoLists from '/imports/collections/TodoLists';
import Todos from '/imports/collections/Todos';
import * as api from '/imports/common/api/TodoLists';
import Count from '/imports/common/models/Count';
import publish from './publish';
import implement from './implement';

implement(api.insert, {
  run({
    title,
  }) {
    return TodoLists.insert({ title });
  },
});

implement(api.update, {
  run({
    listId,
    title,
  }) {
    return TodoLists.update({ _id: listId }, {
      $set: {
        title,
      },
    });
  },
});

implement(api.remove, {
  run({
    listId,
  }) {
    return TodoLists.remove({ _id: listId });
  },
});

publish(api.allLists, {
  run({
    controlId,
  }) {
    if (controlId) {
      let count = 0;
      let isInitialRun = true;
      TodoLists.find({}).observe({
        added: () => {
          count += 1;
          if (!isInitialRun) {
            this.changed(Count.collection, controlId, { count });
          }
        },
        removed: () => {
          count -= 1;
          this.changed(Count.collection, controlId, { count });
        },
      });
      this.added(Count.collection, controlId, { count });
      isInitialRun = false;
    }
    return TodoLists.find({});
  },
});

publish(api.oneList, {
  run({ listId }) {
    return TodoLists.find({ _id: listId });
  },
});

implement(api.getListStats, {
  run({
    listId,
  }) {
    return {
      done: Todos.find({ listId, done: true }).count(),
      notDone: Todos.find({ listId, done: { $ne: true } }).count(),
    };
  },
});
