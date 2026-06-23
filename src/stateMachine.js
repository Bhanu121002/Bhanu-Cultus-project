export default class StateMachine {
  constructor() {
  this.kvStore = new Map();
  this.lastApplied = -1;
  this.commitIndex = -1;
}

  // Apply all committed entries up to commitIndex
  applyEntries(log, newCommitIndex) {
    if (newCommitIndex > this.commitIndex) {
      this.commitIndex = Math.min(newCommitIndex, log.length - 1);
      while (this.lastApplied < this.commitIndex) {
        this.lastApplied++;
        const entry = log[this.lastApplied];
        const parts = entry.command.split(' ');
        if (parts[0] === 'set' && parts.length === 3) {
          const [, key, value] = parts;
          this.kvStore.set(key, value);
          console.log(`[state] applied set ${key}=${value} at index ${this.lastApplied}`);
        } else {
          // other commands (like delete) not implemented for simplicity
          console.warn(`[state] unknown command: ${entry.command}`);
        }
      }
    }
  }

  get(key) {
    return this.kvStore.get(key);
  }

  // For debugging, dump all
  dump() {
    return Object.fromEntries(this.kvStore);
  }
}