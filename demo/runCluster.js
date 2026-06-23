const Network = require("../src/network");
const Node = require("../src/node");
const Raft = require("../src/raft");

console.log("\n==============================");
console.log("   RAFT CLUSTER SIMULATION");
console.log("==============================\n");

// Create Network
const network = new Network();

// Create Nodes
const node1 = new Node(1, network);
const node2 = new Node(2, network);
const node3 = new Node(3, network);

// Register Nodes
network.addNode(node1);
network.addNode(node2);
network.addNode(node3);

console.log("✅ Cluster Created");
console.log("Nodes : 1, 2, 3\n");

// Start Election from Node1
const raft = new Raft(node1);

console.log("🗳️ Starting Election...\n");

raft.startElection(network.nodes);

// Wait for Leader Election
setTimeout(() => {

    console.log("\n==============================");
    console.log("      LOG REPLICATION");
    console.log("==============================");

    node1.appendEntry("name", "Bhanu");
    node1.appendEntry("city", "Hyderabad");
    node1.appendEntry("course", "React");

}, 1000);

// Print Cluster
setTimeout(() => {

    console.log("\n==============================");
    console.log("     FINAL CLUSTER STATE");
    console.log("==============================");

    network.printCluster();

}, 3000);

// Stop Heartbeats after Demo
setTimeout(() => {

    raft.stopHeartbeats();

    console.log("\n✅ Simulation Completed");

    process.exit(0);

}, 5000);