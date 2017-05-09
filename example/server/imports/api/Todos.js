import Todos from '/imports/collections/Todos';
import * as api from '/imports/common/api/Todos';
import publish from './publish';
import implement from './implement';

implement(api.insert, {
  run({
    name,
    done,
    listId,
  }) {
    Todos.insert({
      name,
      done,
      listId,
    });
  },
});

implement(api.update, {
  run({
    todoId,
    name,
    done,
  }) {
    Todos.update({
      _id: todoId,
    }, {
      $set: {
        name,
        done,
      },
    });
  },
});

implement(api.remove, {
  run({
    todoId,
  }) {
    Todos.remove({ _id: todoId });
  },
});

publish(api.todosInList, {
  run({ listId }) {
    return Todos.find({ listId });
  },
});

