const STATES = require("./states");
const Persistence = require("./persistence");
const KeyValueStore = require("./kvStore");

class Node {
  constructor(id, network) {
    this.id = id;
    this.network = network;

    this.state = STATES.FOLLOWER;
    this.term = 0;
    this.votedFor = null;
    this.commitIndex = -1; 
    this.log = [];
    this.lastHeartbeat = Date.now();
    this.kvStore = new KeyValueStore();

    Persistence.load(this);
  }

  becomeFollower(term = this.term) {
    this.state = STATES.FOLLOWER;
    this.term = term;
    this.votedFor = null;
    console.log(`Node ${this.id} -> FOLLOWER (Term ${this.term})`);
    Persistence.save(this);
  }

  becomeCandidate() {
    this.state = STATES.CANDIDATE;
    this.term++;
    this.votedFor = this.id;
    console.log(`Node ${this.id} -> CANDIDATE (Term ${this.term})`);
    Persistence.save(this);
  }

  becomeLeader() {
    this.state = STATES.LEADER;
    console.log(`👑 Node ${this.id} -> LEADER (Term ${this.term})`);
    Persistence.save(this);
  }

  sendHeartbeat() {
    if (this.state !== STATES.LEADER) return;
    this.network.broadcastHeartbeat(this);
  }

  receiveHeartbeat(term, leaderId) {
    if (this.state === STATES.DOWN) return false;

    if (term >= this.term) {
      if (term > this.term || this.state !== STATES.FOLLOWER) {
        this.becomeFollower(term);
      }
      this.lastHeartbeat = Date.now();
      Persistence.save(this);
      return true;
    }
    return false;
  }

  requestVote(term, candidateId, lastLogIndex, lastLogTerm) {
    if (this.state === STATES.DOWN) return false;

    if (term > this.term) {
      this.becomeFollower(term);
    }

    if (term < this.term) return false;

    const myLastLogIndex = this.log.length - 1;
    const myLastLogTerm = myLastLogIndex >= 0 ? this.log[myLastLogIndex].term : 0;

    // Raft Election Safety Rules (Log matching confirmation)
    if (lastLogTerm < myLastLogTerm || (lastLogTerm === myLastLogTerm && lastLogIndex < myLastLogIndex)) {
      return false;
    }

    if (this.votedFor === null || this.votedFor === candidateId) {
      this.votedFor = candidateId;
      Persistence.save(this);
      return true;
    }

    return false;
  }

  appendEntry(key, value) {
    if (this.state !== STATES.LEADER || this.state === STATES.DOWN) {
      console.log(`❌ Write rejected: Node ${this.id} is not an active Leader`);
      return false;
    }
    return this.network.replicate(this, key, value);
  }

  // Raft Log Consistency Check Validation
  handleAppendEntries(term, prevLogIndex, prevLogTerm, entry) {
    if (this.state === STATES.DOWN) return false;

    if (term > this.term) {
      this.becomeFollower(term);
    }

    if (term < this.term) return false;

    this.lastHeartbeat = Date.now();

    if (prevLogIndex >= 0) {
      if (this.log.length <= prevLogIndex || this.log[prevLogIndex].term !== prevLogTerm) {
        return false; 
      }
    }

    if (entry) {
      const index = prevLogIndex + 1;
      
      // Overwrite inconsistencies matching state machine indexes
      if (this.log[index] && this.log[index].term !== entry.term) {
        this.log = this.log.slice(0, index);
      }
      
      this.log[index] = entry;
      this.kvStore.put(entry.key, entry.value);
      this.commitIndex = index;
    }

    Persistence.save(this);
    return true;
  }

  crash() {
    this.state = STATES.DOWN;
    console.log(`💥 Node ${this.id} Crashed`);
    Persistence.save(this);
  }

  recover() {
    console.log(`🔄 Node ${this.id} Recovering...`);
    Persistence.load(this);
    this.state = STATES.FOLLOWER;
    this.lastHeartbeat = Date.now();
    console.log(`✅ Node ${this.id} Recovered as FOLLOWER`);
    Persistence.save(this);
  }

  getState() {
    return {
      id: this.id,
      state: this.state,
      term: this.term,
      commitIndex: this.commitIndex,
      log: this.log.filter(Boolean),
      data: this.kvStore.getAll()
    };
  }
}

module.exports = Node;