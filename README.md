# Distributed Key-Value Store with Raft Consensus - Implementation & Analysis

## 1. Design Document & Edge Case Handling
This system implements a production-grade asynchronous state machine tracking the Raft Consensus Protocol using a cluster of 3 nodes.

### State Transitions
* **Follower to Candidate:** Triggered upon election timeout via asynchronous interval check loops.
* **Candidate to Leader:** Achieved when a strict majority vote quorum ($\lfloor N/2 \rfloor + 1$) is acquired.
* **Leader to Follower:** Automated step-down mechanism triggered instantly if a higher term configuration is discovered in incoming network packets.

### Edge Case Management
* **Log Up-to-Date Rule:** Inside the `requestVote` RPC, validation assertions strictly enforce that a candidate's log must be at least as up-to-date as the receiver's log, preventing stale state overwrites and ensuring data safety.
* **Mismatched Log Cleanup:** The `appendEntries` module validates indices using a strict `prevLogIndex` barrier framework to automatically overwrite uncommitted mismatched logs across follower clusters.

---

## 2. Test Harness Raw Log Output
```text
🚀 Starting Raft Cluster Simulation...

🗳️ Node 1 started election for Term 1
Node 1 -> CANDIDATE (Term 1)
Node 2 -> FOLLOWER (Term 1)
✅ Node 2 voted for Node 1
Node 3 -> FOLLOWER (Term 1)
✅ Node 3 voted for Node 1
📊 Election Results: Votes = 3/3
👑 Node 1 -> LEADER (Term 1)
❤️ Heartbeats broadcast loop initiated by Leader Node 1

--- Scenario 1: Normal Client Write ---
✅ Log matching success: Node 2 replicated entry
✅ Log matching success: Node 3 replicated entry
👑 Leader 1 committed State change: [user = Bhanu]

--- Scenario 2: Inducing Network Partition ---
🚧 Network Partition Enabled: Node 1 <-> Node 3 disconnected.
🚧 Network Partition Enabled: Node 2 <-> Node 3 disconnected.

--- Scenario 3: Client Write During Partition Loop ---
✅ Log matching success: Node 2 replicated entry
❌ Replication packet dropped via partition network path: Leader -> Node 3
👑 Leader 1 committed State change: [city = Hyderabad]

--- Scenario 4: Healing Partition & Synchronizing State ---
🔄 Healing Network Partitions...
📦 Verification: Syncing logs for Node 2 from Leader 1
📦 Verification: Syncing logs for Node 3 from Leader 1
🟢 Network Healed & Cluster Synced successfully.