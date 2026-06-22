const Node = require("./src/node");
const Network = require("./src/network");

const network = new Network();

const node1 = new Node(1);
const node2 = new Node(2);
const node3 = new Node(3);

network.addNode(node1);
network.addNode(node2);
network.addNode(node3);

node1.becomeCandidate();
node1.becomeLeader();

network.partitionNode(3);

network.replicate(
  node1,
  "name",
  "Bhanu"
);

console.log("\nCluster State");

console.log(
  "Node1:",
  node1.kvStore.getAll()
);

console.log(
  "Node2:",
  node2.kvStore.getAll()
);

console.log(
  "Node3:",
  node3.kvStore.getAll()
);