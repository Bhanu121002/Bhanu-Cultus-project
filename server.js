const express = require("express");
const Network = require("./src/network");
const Node = require("./src/node");
const Raft = require("./src/raft");

const app = express();
app.use(express.json());

const network = new Network();
const nodes = [
  new Node(1, network),
  new Node(2, network),
  new Node(3, network)
];

nodes.forEach(n => network.addNode(n));

// Boot cluster with node 1 as leader simulation
const primaryRaft = new Raft(nodes[0]);
primaryRaft.startElection(nodes);

app.get("/", (req, res) => {
  res.send("🚀 Cultus Fault-Tolerant Distributed Raft KV Engine Online.");
});

app.post("/put", (req, res) => {
  const { key, value } = req.body;
  const leader = nodes.find(n => n.state === "LEADER" && n.state !== "DOWN");

  if (!leader) return res.status(500).json({ error: "Cluster unavailable: No leader elected." });

  const committed = leader.appendEntry(key, value);
  if (committed) {
    res.json({ success: true, leader: leader.id, entry: { key, value } });
  } else {
    res.status(400).json({ success: false, message: "Write rejected: Quorum validation failed." });
  }
});

app.get("/state", (req, res) => {
  res.json(nodes.map(n => n.getState()));
});

app.post("/partition", (req, res) => {
  const { a, b } = req.body;
  network.partition(a, b);
  res.json({ status: "success", message: `Partition applied between Node ${a} and Node ${b}` });
});

app.post("/heal", (req, res) => {
  network.heal();
  res.json({ status: "success", message: "Network structural partition healed." });
});

app.post("/crash/:id", (req, res) => {
  const target = nodes.find(n => n.id === parseInt(req.params.id));
  if (target) {
    target.crash();
    res.json({ message: `Node ${target.id} terminated successfully.` });
  } else {
    res.status(404).json({ error: "Node not found." });
  }
});

app.post("/recover/:id", (req, res) => {
  const target = nodes.find(n => n.id === parseInt(req.params.id));
  if (target) {
    target.recover();
    res.json({ message: `Node ${target.id} recovered.` });
  } else {
    res.status(404).json({ error: "Node not found." });
  }
});

app.listen(3000, () => {
  console.log("🚀 Rest API Orchestrator running on port 3000");
});