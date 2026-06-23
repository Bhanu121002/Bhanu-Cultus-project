const Network = require("./src/network");
const Node = require("./src/node");
const Raft = require("./src/raft");

const network = new Network();

const n1 = new Node(1, network);
const n2 = new Node(2, network);
const n3 = new Node(3, network);

network.addNode(n1);
network.addNode(n2);
network.addNode(n3);

const raft1 = new Raft(n1);
const raft2 = new Raft(n2);
const raft3 = new Raft(n3);

console.log("🚀 Starting Raft Cluster Simulation...");

// 1. Run Election Simulation
raft1.startElection([n1, n2, n3]);

// 2. Perform Normal Safe Quorum Write
setTimeout(() => {
  console.log("\n--- Scenario 1: Normal Client Write ---");
  n1.appendEntry("user", "Bhanu");
}, 1000);

// 3. Inject Network Partition (Isolating Node 3)
setTimeout(() => {
  console.log("\n--- Scenario 2: Inducing Network Partition ---");
  network.partition(1, 3);
  network.partition(2, 3);
}, 2000);

// 4. Client Write Request on Partitioned Active Components
setTimeout(() => {
  console.log("\n--- Scenario 3: Client Write During Partition Loop ---");
  n1.appendEntry("city", "Hyderabad"); // Node 1 and Node 2 form quorum majority (2/3), so it succeeds.
}, 3500);

// 5. Heal Network Partition
setTimeout(() => {
  console.log("\n--- Scenario 4: Healing Partition & Synchronizing State ---");
  network.heal();
}, 5000);

// 6. Print Final Linear Consistent Assertions
setTimeout(() => {
  console.log("\n📊 FINAL LOG CONSISTENCY CHECK:");
  network.printCluster();
  
  // Clean termination for automated runners
  raft1.stopHeartbeats();
  process.exit(0);
}, 7000);