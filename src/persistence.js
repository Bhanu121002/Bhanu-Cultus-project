const fs = require("fs");
const path = require("path");

class Persistence {
  static save(node) {
    const dir = path.join(__dirname, "../data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = path.join(dir, `node_${node.id}.json`);
    const data = {
      id: node.id,
      term: node.term,
      state: node.state,
      votedFor: node.votedFor,
      commitIndex: node.commitIndex,
      log: node.log,
      store: node.kvStore.getAll()
    };

    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  static load(node) {
    const file = path.join(__dirname, "../data", `node_${node.id}.json`);
    if (!fs.existsSync(file)) return;

    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      node.term = data.term || 0;
      node.state = data.state || "FOLLOWER";
      node.votedFor = data.votedFor || null;
      node.commitIndex = data.commitIndex !== undefined ? data.commitIndex : -1;
      node.log = data.log || [];

      if (data.store) {
        node.kvStore.clear();
        Object.entries(data.store).forEach(([key, value]) => {
          node.kvStore.put(key, value);
        });
      }
      console.log(`📂 Node ${node.id} persistent state loaded successfully.`);
    } catch (err) {
      console.error(`Error loading state for Node ${node.id}:`, err);
    }
  }
}

module.exports = Persistence;