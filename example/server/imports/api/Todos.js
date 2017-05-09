import Todos from '/imports/collections/Todos';
import * as api from '/imports/common/api/Todos';
import publish from './publish';
import implement from './implement';

implement(api.insert, {
  run({
    name,
    done,
  }) {

  },
});

implement(api.update, {
  run({
    todoId,
    name,
    done,
  }) {

  },
});

implement(api.remove, {
  run({
    todoId,
  }) {

  },
});

publish(api.todosInList, {
  run({ listId }) {
    return Todos.find({ listId });
  },
});

