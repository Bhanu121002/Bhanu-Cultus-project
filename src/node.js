const STATES = require("./raft");
const KeyValueStore = require("./kvStore");

class Node {
  constructor(id) {
    this.id = id;
    this.state = STATES.FOLLOWER;
    this.currentTerm = 0;
    this.log = [];
    this.kvStore = new KeyValueStore();
  }

  becomeCandidate() {
    this.state = STATES.CANDIDATE;
    this.currentTerm++;

    console.log(
      `Node ${this.id} became CANDIDATE (Term ${this.currentTerm})`
    );
  }

  becomeLeader() {
    this.state = STATES.LEADER;

    console.log(
      `Node ${this.id} became LEADER`
    );
  }

  appendEntry(key, value) {
    if (this.state !== STATES.LEADER) {
      console.log("Only leader can accept writes");
      return;
    }

    const entry = {
      term: this.currentTerm,
      key,
      value,
    };

    this.log.push(entry);
    this.kvStore.put(key, value);

    console.log(
      `Committed: ${key} = ${value}`
    );
  }

  // Log Replication Method
  replicateEntry(entry) {
    this.log.push(entry);

    this.kvStore.put(
      entry.key,
      entry.value
    );

    console.log(
      `Node ${this.id} replicated: ${entry.key}=${entry.value}`
    );
  }

  printLog() {
    console.log(
      `Node ${this.id} Log:`,
      this.log
    );
  }
}

module.exports = Node;