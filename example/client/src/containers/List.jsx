import React from 'react';
import { Link } from 'react-router-dom';
import {
  createStructuredSelector,
} from 'reselect';
import { ddp, useDDPQuery, useDDPSubscription } from '@theclinician/ddp-connector';
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
  getListStats,
} from '../common/api/TodoLists';
import {
  callMethod,
  refreshQuery,
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
      undefined,
      oneList.withParams({ listId }),
      todosInList.withParams({ listId }),
      undefined, // should be treated as always ready
    ],
    queries: (state, { listId }) => ({
      a: undefined,
      pleaseIgnoreThisOne: null, // should be treated as always ready
    }),
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
          .then(() => setName(''))
          .then(() => dispatch(refreshQuery(getListStats, { listId }))),

      onUpdateTodo: ({ todoId, name, done }) =>
        dispatch(callMethod(update, { todoId, done, name }))
          .then(() => dispatch(refreshQuery(getListStats, { listId }))),
    }),
  ),
  withHandlers({
    onChangeName: ({
      setName,
    }) => e => setName(e.currentTarget.value),
  }),
)(({
  list,
  listId,
  todos,
  name,
  setName,
  onAddTodo,
  onChangeName,
  onUpdateTodo,
}) => {
  const {
    value: stats,
  } = useDDPQuery(
    getListStats.withParams({ listId }),
  );
  const {
    ready: queryReady,
  } = useDDPQuery(undefined);
  const {
    ready: subscriptionReady,
  } = useDDPSubscription(undefined);
  if (!subscriptionReady || !queryReady) {
    return null;
  }
  return (
    <div>
      <Link to="/lists/">Back</Link>
      <h1>
        {list && list.getTitle()}
        {stats && <span>
          &nbsp;({stats.done}/{stats.done + stats.notDone})
        </span>}
      </h1>
      
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
  )
});

export default Lists;
