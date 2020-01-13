/* eslint-env jest */
/* eslint prefer-arrow-callback: "off", no-unused-expressions: "off" */
import ResourcesManager from './ResourcesManager.js';

const resourcesFactory = (request, requestMeta, cb) => cb(null, request);

describe('Test ResourcesManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ResourcesManager({
      resourcesFactory,
    });
  });

  test('accepts listener with no resources', () => {
    expect(manager.updateRequests('1', [])).toEqual([]);
  });

  test('accepts listener with single resources', () => {
    expect(manager.updateRequests('1', [{
      name: 'a',
      params: {
        x: 1,
        y: 1,
      },
    }])).toEqual([
      '1',
    ]);
  });

  test('accepts listener with multiple resources', () => {
    expect(manager.updateRequests('1', [{
      name: 'a',
      params: {
        x: 1,
        y: 1,
      },
    }, {
      name: 'b',
      params: {
        x: 1,
        y: 1,
      },
    }])).toEqual([
      '1',
      '2',
    ]);
  });

  test('accepts requests from multiple clients', () => {
    expect(manager.updateRequests('1', [{
      name: 'a',
      params: {
        x: 1,
        y: 1,
      },
    }])).toEqual([
      '1',
    ]);
    expect(manager.updateRequests('2', [{
      name: 'b',
      params: {
        x: 1,
        y: 1,
      },
    }])).toEqual([
      '2',
    ]);
  });

  test('recognizes similar requests', () => {
    expect(manager.updateRequests('1', [{
      name: 'a',
      params: {
        x: 1,
        y: 1,
      },
    }])).toEqual([
      '1',
    ]);
    expect(manager.updateRequests('2', [{
      name: 'a',
      params: {
        x: 1,
        y: 1,
      },
    }])).toEqual([
      '1',
    ]);
  });
});
