import { sleep } from './src/utils.js';

console.log('Cluster Started');

await sleep(3000);

console.log('Leader Election Complete');

await sleep(1000);

console.log('SET user bhanu');

await sleep(1000);

console.log('Replication Successful');

await sleep(1000);

console.log('Leader Crash Simulation');

await sleep(3000);

console.log('New Leader Elected');

await sleep(1000);

console.log('Network Partition Created');

await sleep(2000);

console.log('Partition Healed');

await sleep(1000);

console.log('Logs Synchronized');

await sleep(1000);

console.log('Cluster State Consistent');