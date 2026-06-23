import RaftNode from './src/node.js';
import readline from 'readline';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node index.js <node-id> <addr:port> [peerId=addr:port ...]');
  console.log('Example: node index.js 1 localhost:8001 2=localhost:8002 3=localhost:8003');
  process.exit(1);
}

const id = parseInt(args[0]);
const addr = args[1];
const peerAddrs = {};
for (let i = 2; i < args.length; i++) {
  const [peerId, peerAddr] = args[i].split('=');
  peerAddrs[parseInt(peerId)] = peerAddr;
}

if (Object.keys(peerAddrs).length === 0) {
  peerAddrs[1] = 'localhost:8001';
  peerAddrs[2] = 'localhost:8002';
  peerAddrs[3] = 'localhost:8003';
}

const node = new RaftNode(id, addr, peerAddrs);

node.start().then(() => {
  console.log(`[Node ${id}] Ready. Type "set key value" or "get key"`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  rl.on('line', (line) => {
    const parts = line.trim().split(' ');
    const cmd = parts[0];
    if (cmd === 'set' && parts.length === 3) {
      node.handleSet(parts[1], parts[2]);
    } else if (cmd === 'get' && parts.length === 2) {
      node.handleGet(parts[1]);
    } else if (cmd === 'dump') {
      console.log(JSON.stringify(Object.fromEntries(node.stateMachine.kvStore)));
    } else if (cmd === 'flush') {
      node._sendHeartbeat(); // manual trigger
    } else if (cmd === 'exit' || cmd === 'quit') {
      console.log('[Node] Shutting down...');
      rl.close();
      node.stop();
      process.exit(0);
    } else {
      console.log(`[Node ${id}] Unknown command. Try: set key value, get key, dump, flush`);
    }
  });

  rl.on('close', () => {
    node.stop();
    process.exit(0);
  });
}).catch((err) => {
  console.error('Failed to start node:', err);
  process.exit(1);
});