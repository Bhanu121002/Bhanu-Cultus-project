# Design Decisions and Edge Cases

## Leader Election
- Randomized election timeouts (150–300ms) to reduce split votes.
- When a follower times out, it becomes candidate, increments term, and requests votes.
- A candidate wins if it receives a majority of votes.
- If a candidate receives an RPC from a higher term, it steps down.

## Log Replication
- The leader appends client writes to its log.
- AppendEntries RPCs are sent periodically (heartbeats) and also carry new entries.
- Followers accept entries only if consistency checks (prevLogIndex/term) pass.
- If a follower's log diverges, the leader uses the conflictIndex/term to backtrack.

## Commit and Apply
- The leader commits an entry when it has been replicated on a majority.
- Committed entries are applied to the key‑value state machine in order.
- The state machine is a simple Map.

## Handling Network Partitions
- A minority partition will eventually start elections but fail to get quorum.
- When the partition heals, nodes with higher terms will force the old leader to step down.
- The new leader will replicate its log to all nodes, ensuring consistency.

## Safety
- **Election safety**: At most one leader per term.
- **Leader append‑only**: Leader never overwrites its own log.
- **Log matching**: If two logs have the same index/term, they are identical.
- **State machine safety**: Committed entries are applied in the same order.

## Complexity
- Election: O(N) messages.
- Log replication: O(N) per heartbeat.
- Apply: O(1) per entry.