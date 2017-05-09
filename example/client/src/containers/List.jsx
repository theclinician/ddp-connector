import React from 'react';
import { Link } from 'react-router-dom';
import {
  createStructuredSelector,
} from 'reselect';
import { ddp } from 'ddp-connector';
import { connect } from 'react-redux';
import {
  compose,
  withState,
  withProps,
  withHandlers,
} from 'recompose';
import {
  insert,
  update,
  remove,
  todosInList,
} from '../common/api/Todos';
import {
  oneList,
} from '../common/api/TodoLists';
import {
  callMethod,
} from '../common/utils/actions.js';
import Todo from '../common/models/Todo.js';
import TodoList from '../common/models/TodoList.js';

const ListItem = withHandlers({
  onUpdate: ({
    todo,
    onUpdate,
  }) => () => onUpdate({
    todoId: todo._id,
    done: !todo.isDone(),
    name: todo.getName(),
  }),
})(({
  todo,
  onUpdate,
}) => (
  <li key={todo._id} onClick={onUpdate} style={{
    ...todo.isDone() && { textDecoration: 'line-through' },
  }}>
    {todo.name}
  </li>
));

const getListId = (state, { listId }) => listId;
const Lists = compose(
  withState('name', 'setName', ''),
  withProps(({ match: { params: { listId } } }) => ({
    listId
  })),
  ddp({
    subscriptions: (state, { listId }) => [
      oneList.withParams({ listId }),
      todosInList.withParams({ listId }),
    ],
  }),
  connect(
    createStructuredSelector({
      list: TodoList.selectors.getOne(getListId),
      todos: Todo.selectors.findForList(getListId),
    }),
    (dispatch, {
      name,
      setName,
      listId,
    }) => ({
      onAddTodo: () =>
        dispatch(callMethod(insert, { listId, name }))
          .then(() => setName('')),

      onUpdateTodo: ({ todoId, name, done }) =>
        dispatch(callMethod(update, { todoId, done, name })),
    }),
  ),
  withHandlers({
    onChangeName: ({
      setName,
    }) => e => setName(e.currentTarget.value),
  }),
)(({
  list,
  todos,
  name,
  setName,
  onAddTodo,
  onChangeName,
  onUpdateTodo,
}) => (
  <div>
    <Link to="/lists/">Back</Link>
    <h1>{list && list.getTitle()}</h1>
    <ul>
      {todos.map(todo => (
        <ListItem key={todo._id} todo={todo} onUpdate={onUpdateTodo} />
      ))}
      <li>
        <input value={name} onChange={onChangeName}/>
        <button onClick={onAddTodo}>
          Add
        </button>
      </li>
    </ul>
  </div>
));

export default Lists;
