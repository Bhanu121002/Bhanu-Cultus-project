class KeyValueStore {
  constructor() {
    this.store = {};
  }

  put(key, value) {
    this.store[key] = value;
  }

  get(key) {
    return this.store[key] || null;
  }

  delete(key) {
    delete this.store[key];
  }

  getAll() {
    return this.store;
  }
}

module.exports = KeyValueStore;