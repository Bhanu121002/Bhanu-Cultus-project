import net from 'net';
import { EventEmitter } from 'events';

export default class NetworkLayer extends EventEmitter {
  constructor(addr) {
    super();
    this.addr = addr;
    this.server = null;
    this.sockets = new Set(); 
    this.latencyMs = 50;
    this.packetLossRate = 0;
    this.blockedPeers = new Set();

  }

  // Start listening for incoming RPCs
  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this._handleSocket(socket);
      });
      const [host, port] = this.addr.split(':');
      this.server.listen(parseInt(port), host, () => {
        console.log(`[network] listening on ${this.addr}`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  // Send an RPC to a peer (with JSON + newline)
  sendRPC(peerAddr, type, args, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
        if (this.blockedPeers.has(peerAddr)) {
  reject(new Error('network partition'));
  return;
}

if (Math.random() < this.packetLossRate) {
  reject(new Error('packet dropped'));
  return;
}
      const socket = net.createConnection(peerAddr.split(':')[1], peerAddr.split(':')[0]);
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('RPC timeout'));
      }, timeoutMs);

      let buffer = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        const idx = buffer.indexOf('\n');
        if (idx !== -1) {
          const full = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          socket.destroy();
          clearTimeout(timer);
          try {
            resolve(JSON.parse(full));
          } catch (e) {
            reject(e);
          }
        }
      });
      socket.on('error', (err) => {
        clearTimeout(timer);
        socket.destroy();
        reject(err);
      });

      const msg = JSON.stringify({ type, args });

setTimeout(() => {
  socket.write(msg + '\n');
}, this.latencyMs);
    });
  }

  // Internal: handle incoming socket
  _handleSocket(socket) {
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let boundary = buffer.indexOf('\n');
      while (boundary !== -1) {
        const msgStr = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 1);
        try {
          const msg = JSON.parse(msgStr);
          // Emit an event for the node to handle
          this.emit('rpc', msg, socket);
        } catch (e) {
          console.error('[network] invalid JSON:', msgStr);
        }
        boundary = buffer.indexOf('\n');
      }
    });
    socket.on('error', () => {});
  }
  setLatency(ms) {
  this.latencyMs = ms;
}

setPacketLoss(rate) {
  this.packetLossRate = rate;
}

blockPeer(addr) {
  this.blockedPeers.add(addr);
}

unblockPeer(addr) {
  this.blockedPeers.delete(addr);
}
}