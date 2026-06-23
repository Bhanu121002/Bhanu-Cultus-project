import NetworkLayer from './network.js';
import StateMachine from './stateMachine.js';
import { ElectionTimer, HeartbeatTicker } from './timers.js';

export default class RaftNode {
  constructor(id, addr, peerAddrs) {
    this.id = id;
    this.addr = addr;
    this.peerAddrs = peerAddrs;
    this.peerIds = Object.keys(peerAddrs).map(Number).filter(p => p !== id);

    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
    this.commitIndex = -1;
    this.lastApplied = -1;
    this.nextIndex = {};
    this.matchIndex = {};
    this.state = 'follower';
    this.active = true;

    this.network = new NetworkLayer(addr);
    this.stateMachine = new StateMachine();

    this.electionTimer = new ElectionTimer(() => this._startElection());
    this.heartbeatTicker = new HeartbeatTicker(
  () => this._sendHeartbeat(),300); // slower

    this.network.on('rpc', (msg, socket) => {
      this._handleRPC(msg, socket);
    });
  }

  start() {
    return this.network.start().then(() => {
      this.electionTimer.reset();
      console.log(`[Node ${this.id}] Ready. Type "set key value" or "get key"`);
    });
  }

  stop() {
    this.network.stop();
    this.electionTimer.clear();
    this.heartbeatTicker.stop();
  }
  crash() {
  if (!this.active) return;

  this.active = false;
  this.state = 'follower';

  this.electionTimer.clear();
  this.heartbeatTicker.stop();

  console.log(`[Node ${this.id}] crashed`);
}

recover() {
  if (this.active) return;

  this.active = true;
  this.state = 'follower';
  this.votedFor = null;

  this.electionTimer.reset();

  console.log(`[Node ${this.id}] recovered`);
}
  handleSet(key, value) {
    if (this.state !== 'leader') {
      console.log(`[Node ${this.id}] not leader, cannot accept write`);
      return;
    }
    const entry = { term: this.currentTerm, command: `set ${key} ${value}` };
    this.log.push(entry);
    this._sendHeartbeat();
    console.log(`[Node ${this.id}] accepted write ${key}=${value}`);
  }

  handleGet(key) {
    const val = this.stateMachine.get(key);
    console.log(`[Node ${this.id}] get ${key} = ${val !== undefined ? val : '(not found)'}`);
  }

  _handleRPC(msg, socket) {
    if (!this.active) {
     return;
        }
    const { type, args } = msg;
    let reply = null;
    if (type === 'RequestVote') {
      reply = this._handleRequestVote(args);
    } else if (type === 'AppendEntries') {
      reply = this._handleAppendEntries(args);
    } else {
      console.warn(`[Node ${this.id}] unknown RPC type ${type}`);
      return;
    }
    socket.write(JSON.stringify(reply) + '\n');
  }

  _handleRequestVote(args) {
    const { term, candidateId, lastLogIndex, lastLogTerm } = args;
    let reply = { term: this.currentTerm, voteGranted: false };

    if (term < this.currentTerm) return reply;

    if (term > this.currentTerm) {
      this.currentTerm = term;
      this.state = 'follower';
      this.votedFor = null;
      this.electionTimer.reset();
      if (this.heartbeatTicker.running) this.heartbeatTicker.stop();
    }

    if (this.votedFor !== null && this.votedFor !== candidateId) return reply;

    const lastIdx = this.log.length - 1;
    const lastTerm = lastIdx >= 0 ? this.log[lastIdx].term : 0;
    if (lastLogTerm < lastTerm) return reply;
    if (lastLogTerm === lastTerm && lastLogIndex < lastIdx) return reply;

    this.votedFor = candidateId;
    reply.voteGranted = true;
    this.electionTimer.reset();
    return reply;
  }

  _handleAppendEntries(args) {
    const { term, leaderId, prevLogIndex, prevLogTerm, entries, leaderCommit } = args;
    let reply = { term: this.currentTerm, success: false, conflictIndex: 0, conflictTerm: 0 };

    // Only log if we actually receive data (not heartbeat)
    if (entries.length > 0) {
      console.log(`[Node ${this.id}] received ${entries.length} entries from ${leaderId}`);
    }

    if (term < this.currentTerm) return reply;

    if (term > this.currentTerm) {
      this.currentTerm = term;
      this.state = 'follower';
      this.votedFor = null;
      this.electionTimer.reset();
      if (this.heartbeatTicker.running) this.heartbeatTicker.stop();
    }

    if (this.state === 'candidate' || this.state === 'leader') {
      this.state = 'follower';
      this.electionTimer.reset();
      if (this.heartbeatTicker.running) this.heartbeatTicker.stop();
    }

    this.electionTimer.reset();

    if (prevLogIndex > this.log.length - 1) {
      reply.conflictIndex = this.log.length;
      reply.conflictTerm = -1;
      return reply;
    }
    if (prevLogIndex >= 0) {
      if (this.log[prevLogIndex].term !== prevLogTerm) {
        const termAt = this.log[prevLogIndex].term;
        let idx = prevLogIndex;
        while (idx > 0 && this.log[idx - 1].term === termAt) idx--;
        reply.conflictIndex = idx;
        reply.conflictTerm = termAt;
        return reply;
      }
    }

    let appendIdx = prevLogIndex + 1;
    for (let i = 0; i < entries.length; i++) {
      const idx = prevLogIndex + 1 + i;
      if (idx < this.log.length) {
        if (this.log[idx].term !== entries[i].term) {
          this.log = this.log.slice(0, idx);
        } else {
          continue;
        }
      }
      this.log.push({ term: entries[i].term, command: entries[i].command });
    }

    if (leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(leaderCommit, this.log.length - 1);
      this.stateMachine.applyEntries(this.log, this.commitIndex);
    }

    reply.success = true;
    return reply;
  }

 _startElection() {
  if (!this.active) return;
  if (this.state === 'leader') return;
  if (this.state === 'candidate') return;
  this.electionTimer.clear();

  this.currentTerm++;
  this.state = 'candidate';
  this.votedFor = this.id;

  this.electionTimer.reset();

  console.log(`[Node ${this.id}] starting election for term ${this.currentTerm}`);

    let votes = 1;
    const requests = [];

    for (const peerId of this.peerIds) {
      const args = {
        term: this.currentTerm,
        candidateId: this.id,
        lastLogIndex: this.log.length - 1,
        lastLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0,
      };
      const p = this.network.sendRPC(this.peerAddrs[peerId], 'RequestVote', args)
        .then(reply => {
          if (reply.term > this.currentTerm) {
            this.currentTerm = reply.term;
            this.state = 'follower';
            this.votedFor = null;
            this.electionTimer.reset();
            if (this.heartbeatTicker.running) this.heartbeatTicker.stop();
            return;
          }
          if (reply.voteGranted) votes++;
        })
        .catch(() => {});
      requests.push(p);
    }

    Promise.all(requests).then(() => {
      if (this.state !== 'candidate') return;
      const clusterSize = this.peerIds.length + 1;
const majority = Math.floor(clusterSize / 2) + 1;
      if (votes >= majority) {
        console.log(`[Node ${this.id}] won election for term ${this.currentTerm}`);
        this.electionTimer.clear();
        this.state = 'leader';
        for (const p of this.peerIds) {
          this.nextIndex[p] = this.log.length;
          this.matchIndex[p] = 0;
        }
        this.heartbeatTicker.start();
        this._sendHeartbeat();
      } else {
        this.state = 'follower';
        this.electionTimer.reset();
      }
    });
  }

 _sendHeartbeat() {
  if (!this.active || this.state !== 'leader') {
    return;
  }
    // NO LOGGING HERE – silent
    for (const peerId of this.peerIds) {
      const args = this._buildAppendEntriesArgs(peerId);
      this.network.sendRPC(this.peerAddrs[peerId], 'AppendEntries', args)
        .then(reply => this._handleAppendEntriesReply(peerId, args, reply))
        .catch(() => {});
    }
  }

  _buildAppendEntriesArgs(peerId) {
    const prevLogIndex = (this.nextIndex[peerId] || 0) - 1;
    const prevLogTerm = prevLogIndex >= 0 ? this.log[prevLogIndex].term : 0;
    let entries = [];
    if (this.nextIndex[peerId] < this.log.length) {
      entries = this.log.slice(this.nextIndex[peerId]).map(e => ({ term: e.term, command: e.command }));
    }
    return {
      term: this.currentTerm,
      leaderId: this.id,
      prevLogIndex,
      prevLogTerm,
      entries,
      leaderCommit: this.commitIndex,
    };
  }

  _handleAppendEntriesReply(peerId, args, reply) {
    if (this.state !== 'leader') return;
    if (reply.term > this.currentTerm) {
      this.currentTerm = reply.term;
      this.state = 'follower';
      this.votedFor = null;
      this.electionTimer.reset();
      if (this.heartbeatTicker.running) this.heartbeatTicker.stop();
      return;
    }
    if (reply.success) {
      if (args.entries.length > 0) {
        this.matchIndex[peerId] = args.prevLogIndex + args.entries.length;
        this.nextIndex[peerId] = this.matchIndex[peerId] + 1;
      } else {
        this.nextIndex[peerId] = this.log.length;
        this.matchIndex[peerId] = this.log.length - 1;
      }
      for (let idx = this.commitIndex + 1; idx < this.log.length; idx++) {
        if (this.log[idx].term !== this.currentTerm) continue;
        let count = 1;
        for (const p of this.peerIds) {
          if ((this.matchIndex[p] || 0) >= idx) count++;
        }
        if (count > this.peerIds.length / 2) {
          this.commitIndex = idx;
        } else {
          break;
        }
      }
      this.stateMachine.applyEntries(this.log, this.commitIndex);
    } else {
      if (reply.conflictIndex > 0) {
        this.nextIndex[peerId] = reply.conflictIndex;
      } else {
        this.nextIndex[peerId] = (this.nextIndex[peerId] || 0) - 1;
        if (this.nextIndex[peerId] < 0) this.nextIndex[peerId] = 0;
      }
    }
  }
}