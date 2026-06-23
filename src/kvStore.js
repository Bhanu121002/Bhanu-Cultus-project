class KeyValueStore {
  constructor() {
    this.store = new Map();
  }

  put(key, value) {
    this.store.set(key, value);
  }

  get(key) {
    return this.store.get(key);
  }

  getAll() {
    return Object.fromEntries(this.store);
  }

  clear() {
    this.store.clear();
  }
}

module.exports = KeyValueStore;