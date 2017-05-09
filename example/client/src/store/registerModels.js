import DDPConnector from 'ddp-connector';
import TodoList from '../common/models/TodoList';
import Todo from '../common/models/Todo';

const models = [
  TodoList,
  Todo,
];

models.forEach(Model => DDPConnector.registerModel(Model));
