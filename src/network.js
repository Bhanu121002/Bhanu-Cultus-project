class Network {
  constructor() {
    this.nodes = [];
    this.partitionedNodes = new Set();
  }

  addNode(node) {
    this.nodes.push(node);
  }

  partitionNode(nodeId) {
    this.partitionedNodes.add(nodeId);

    console.log(
      `Node ${nodeId} disconnected from network`
    );
  }

  reconnectNode(nodeId) {
    this.partitionedNodes.delete(nodeId);

    console.log(
      `Node ${nodeId} reconnected to network`
    );
  }

  replicate(leader, key, value) {
    const entry = {
      term: leader.currentTerm,
      key,
      value,
    };

    leader.log.push(entry);
    leader.kvStore.put(key, value);

    console.log(
      `Leader ${leader.id} committed ${key}=${value}`
    );

    this.nodes.forEach((node) => {
      if (
        node.id !== leader.id &&
        !this.partitionedNodes.has(node.id)
      ) {
        node.replicateEntry(entry);
      }
    });
  }
}

module.exports = Network;