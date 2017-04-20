
class NoModel {
  constructor(doc) {
    Object.assign(this, doc);
  }
}

export function insert({ collection = {}, entities, Model = NoModel }) {
  const newById = { ...collection };
  Object.keys(entities).forEach((id) => {
    newById[id] = new Model({
      _id: id,
      ...entities[id],
    });
  });
  return newById;
}

export function update({ collection = {}, entities, Model = NoModel }) {
  const newById = { ...collection };
  Object.keys(entities).forEach((id) => {
    newById[id] = new Model({
      ...collection[id],
      ...entities[id],
    });
  });
  return newById;
}

export function remove({ collection = {}, entities }) {
  const newById = { ...collection };
  Object.keys(entities).forEach((id) => {
    delete newById[id];
  });
  return newById;
}
