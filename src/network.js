const STATES = require("./states");

class Network {
  constructor() {
    this.nodes = [];
    this.partitions = new Set();
  }

  addNode(node) {
    this.nodes.push(node);
  }

  partition(a, b) {
    this.partitions.add(`${a}-${b}`);
    this.partitions.add(`${b}-${a}`);
    console.log(`🚧 Network Partition Enabled: Node ${a} <-> Node ${b} disconnected.`);
  }

  heal() {
    console.log("\n🔄 Healing Network Partitions...");
    this.partitions.clear();

    const leader = this.nodes.find(n => n.state === STATES.LEADER && n.state !== STATES.DOWN);
    if (!leader) {
      console.log("⚠️ Post-heal discovery: No valid active leader found. Re-elections will trigger.");
      return;
    }

    // Incremental log sync using standard Raft logic rules
    this.nodes.forEach(node => {
      if (node.id === leader.id || node.state === STATES.DOWN) return;

      console.log(`📦 Verification: Syncing logs for Node ${node.id} from Leader ${leader.id}`);
      
      node.log = [];
      node.kvStore.clear();

      leader.log.forEach((entry, idx) => {
        if (entry) {
          node.handleAppendEntries(leader.term, idx - 1, idx - 1 >= 0 ? leader.log[idx - 1].term : 0, entry);
        }
      });
    });

    console.log("🟢 Network Healed & Cluster Synced successfully.\n");
  }

  canCommunicate(a, b) {
    return !this.partitions.has(`${a}-${b}`);
  }

  broadcastHeartbeat(leader) {
    this.nodes.forEach(node => {
      if (node.id === leader.id || node.state === STATES.DOWN) return;

      if (!this.canCommunicate(leader.id, node.id)) {
        return;
      }

      node.receiveHeartbeat(leader.term, leader.id);
    });
  }

  replicate(leader, key, value) {
    const prevLogIndex = leader.log.length - 1;
    const prevLogTerm = prevLogIndex >= 0 ? leader.log[prevLogIndex].term : 0;
    const entry = { term: leader.term, key, value };

    let consensusCount = 1; // Counts leader
    const activeFollowers = this.nodes.filter(n => n.id !== leader.id && n.state !== STATES.DOWN);

    activeFollowers.forEach(node => {
      if (!this.canCommunicate(leader.id, node.id)) {
        console.log(`❌ Replication packet dropped via partition network path: Leader -> Node ${node.id}`);
        return;
      }

      const success = node.handleAppendEntries(leader.term, prevLogIndex, prevLogTerm, entry);
      if (success) {
        consensusCount++;
        console.log(`✅ Log matching success: Node ${node.id} replicated entry`);
      }
    });

    // Write barrier linearizable consistency check (Write Quorum Rule)
    if (consensusCount > Math.floor(this.nodes.length / 2)) {
      leader.log.push(entry);
      leader.kvStore.put(key, value);
      leader.commitIndex++;
      console.log(`👑 Leader ${leader.id} committed State change: [${key} = ${value}]`);
      return true;
    } else {
      console.log(`❌ Write Aborted: Quorum mismatch. Leader isolated in minority partition.`);
      return false;
    }
  }

  printCluster() {
    console.log("\n========== Cluster State Summary ==========");
    this.nodes.forEach(node => {
      console.log(JSON.stringify(node.getState(), null, 2));
    });
    console.log("============================================\n");
  }
}

module.exports = Network;