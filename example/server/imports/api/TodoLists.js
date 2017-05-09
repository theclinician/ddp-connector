import TodoLists from '/imports/collections/TodoLists';
import * as api from '/imports/common/api/TodoLists';
import publish from './publish';
import implement from './implement';

implement(api.insert, {
  run({
    title,
  }) {

  },
});

implement(api.update, {
  run({
    listId,
    title,
  }) {

  },
});

implement(api.remove, {
  run({
    listId,
  }) {

  },
});

publish(api.allLists, {
  run() {
    return TodoLists.find({});
  },
});

