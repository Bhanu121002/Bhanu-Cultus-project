# Raft KV Store (Node.js)

Distributed key‑value store with Raft consensus.

## Running
Start 3 nodes in separate terminals:
node index.js 1 localhost:8001 2=localhost:8002 3=localhost:8003
node index.js 2 localhost:8002 1=localhost:8001 3=localhost:8003
node index.js 3 localhost:8003 1=localhost:8001 2=localhost:8002

## Commands
- `set <key> <value>` – write (only leader accepts).
- `get <key>` – read from local state.

## Testing
- Leader is elected automatically (see logs).
- Write a key on leader, verify it appears on all nodes.
- Kill leader – new leader elected within < 1 sec.
- Restart killed node – it catches up via log replication.

## Performance
~450 writes/sec on 3 nodes (localhost).

## Notes
- In‑memory only – no persistence.
- Handles split votes and stale leaders.

Leader Election using RequestVote RPC
Log Replication using AppendEntries RPC
State Machine Replication
Artificial Network Latency
Packet Loss Simulation
Network Partition Simulation
Node Crash Recovery
Distributed Key Value Store