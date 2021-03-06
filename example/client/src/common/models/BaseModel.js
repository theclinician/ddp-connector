import { createEntitiesSelectors } from '@theclinician/ddp-connector/lib/selectors';

class BaseModel {
  constructor(doc) {
    Object.assign(this, doc);
  }

  static get selectors() {
    if (!this.collection) {
      throw new Error('You must set Model.collection, before accessing Model.selectors');
    }
    Object.defineProperty(this, 'selectors', {
      value: createEntitiesSelectors(this.collection, { prefix: this.store || 'ddp', Model: this }),
      writable: true,
    });
    return this.selectors;
  }
}

BaseModel.store = 'ddp';

export default BaseModel;
