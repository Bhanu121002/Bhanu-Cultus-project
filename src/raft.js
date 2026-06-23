const STATES = require("./states");

class Raft {
  constructor(node) {
    this.node = node;
    this.electionTimeout = 4000;
    this.heartbeatInterval = 1500;
    this.heartbeatTimer = null;
  }

  startElection(nodes) {
    if (this.node.state === STATES.DOWN) return;

    console.log(`\n🗳️ Node ${this.node.id} started election for Term ${this.node.term + 1}`);
    this.node.becomeCandidate();

    let votes = 1; // Self-vote
    const activeNodes = nodes.filter(n => n.state !== STATES.DOWN);

    activeNodes.forEach((n) => {
      if (n.id === this.node.id) return;

      const myLastLogIndex = this.node.log.length - 1;
      const myLastLogTerm = myLastLogIndex >= 0 ? this.node.log[myLastLogIndex].term : 0;

      // Check communication constraints
      if (!this.node.network.canCommunicate(this.node.id, n.id)) {
        console.log(`📡 Vote request blocked by partition: ${this.node.id} -x-> ${n.id}`);
        return;
      }

      const granted = n.requestVote(
        this.node.term,
        this.node.id,
        myLastLogIndex,
        myLastLogTerm
      );

      if (granted) {
        console.log(`✅ Node ${n.id} voted for Node ${this.node.id}`);
        votes++;
      } else {
        console.log(`❌ Node ${n.id} rejected vote request`);
      }
    });

    console.log(`📊 Election Results: Votes = ${votes}/${nodes.length}`);

    // Dynamic Quorum Condition
    if (votes > Math.floor(nodes.length / 2)) {
      this.node.becomeLeader();
      this.startHeartbeats();
    } else {
      console.log("❌ Election Failed: Majority Quorum not reached.");
      this.node.becomeFollower(this.node.term);
    }
  }

  startHeartbeats() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    console.log(`❤️ Heartbeats broadcast loop initiated by Leader Node ${this.node.id}`);

    this.heartbeatTimer = setInterval(() => {
      if (this.node.state !== STATES.LEADER || this.node.state === STATES.DOWN) {
        clearInterval(this.heartbeatTimer);
        return;
      }
      this.node.sendHeartbeat();
    }, this.heartbeatInterval);
  }

  stopHeartbeats() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  checkElectionTimeout(nodes) {
    if (this.node.state === STATES.LEADER || this.node.state === STATES.DOWN) return;

    const now = Date.now();
    if (now - this.node.lastHeartbeat > this.electionTimeout) {
      console.log(`⏰ Node ${this.node.id} Election Timeout triggered!`);
      this.startElection(nodes);
    }
  }
}

module.exports = Raft;