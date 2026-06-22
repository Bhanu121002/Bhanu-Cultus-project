const fs = require("fs");

class Persistence {
  static save(node) {
    const data = {
      id: node.id,
      currentTerm: node.currentTerm,
      state: node.state,
      log: node.log,
      store: node.kvStore.getAll(),
    };

    fs.writeFileSync(
      `node_${node.id}.json`,
      JSON.stringify(data, null, 2)
    );

    console.log(
      `Node ${node.id} state saved`
    );
  }

  static load(node) {
    const fileName = `node_${node.id}.json`;

    if (!fs.existsSync(fileName)) {
      console.log("No saved state found");
      return;
    }

    const data = JSON.parse(
      fs.readFileSync(fileName)
    );

    node.currentTerm = data.currentTerm;
    node.log = data.log;

    Object.entries(data.store).forEach(
      ([key, value]) => {
        node.kvStore.put(key, value);
      }
    );

    console.log(
      `Node ${node.id} recovered from disk`
    );
  }
}

module.exports = Persistence;