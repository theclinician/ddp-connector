import BaseModel from './BaseModel.js';

class Todo extends BaseModel {
  isDone() {
    return !!this.done;
  }
  getName() {
    return this.name;
  }
  getListId() {
    return this.listId;
  }
}

Todo.collection = 'Todos';

Todo.selectors.findForList = getListId => Todo.selectors.find(
  (todo, listId) => todo.getListId() === listId,
  getListId || ((state, { listId }) => listId),
);

export default Todo;
