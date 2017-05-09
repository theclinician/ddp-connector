import BaseModel from './BaseModel.js';

class Todo extends BaseModel {
}

Todo.collection = 'Todos';

Todo.selectors.findForList = getListId => Todo.selectors.find(
  (todo, listId) => todo.getListId() === listId,
  getListId || ((state, { listId }) => listId),
);

export default Todo;
