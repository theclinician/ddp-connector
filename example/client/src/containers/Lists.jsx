import React from 'react';
import { Link } from 'react-router-dom';
import {
  createStructuredSelector, createSelector,
} from 'reselect';
import { ddp } from '@theclinician/ddp-connector';
import { connect } from 'react-redux';
import {
  compose,
  withState,
  withHandlers,
} from 'recompose';
import {
  insert,
  allLists,
} from '../common/api/TodoLists';
import {
  callMethod,
} from '../common/utils/actions.js';
import TodoList from '../common/models/TodoList.js';

const Lists = compose(
  withState('title', 'setTitle', ''),
  ddp({
    subscriptions: {
      lists: allLists.withParams(undefined, {
        controlId: 'controlId',
      }),
    },
    selectors: ({
      subscriptions,
    }) => ({
      subId: createSelector(
        subscriptions,
        subs => subs.lists && subs.lists.id,
      ),
    }),
  }),
  connect(
    createStructuredSelector({
      lists: TodoList.selectors.find(),
    }),
    (dispatch, { title, setTitle }) => ({
      onAddList: () =>
        dispatch(callMethod(insert, { title }))
          .then(() => setTitle(''))
    }),
  ),
  withHandlers({
    onChangeTitle: ({
      setTitle,
    }) => e => setTitle(e.currentTarget.value),
  }),
)(({
  lists,
  title,
  setTitle,
  onAddList,
  onChangeTitle,
}) => (
  <div>
    <ul>
      {lists.map(list => (
        <li key={list._id}>
          <Link to={`/lists/${list._id}`}>
            {list.title}
          </Link>
        </li>
      ))}
      <li>
        <input value={title} onChange={onChangeTitle}/>
        <button onClick={onAddList}>
          Add list
        </button>
      </li>
    </ul>
  </div>
));

export default Lists;
