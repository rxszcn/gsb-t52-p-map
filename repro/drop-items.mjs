// Control: same async source, only difference = whether the EOF answer arrives
// *before* the still-pending read (queue-drained case) or after it.
import pMap from '../index.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function makeSource({items, readMs, eofMs}) {
	let handedOut = 0;
	let calls = 0;
	return {
		get calls() {
			return calls;
		},
		[Symbol.asyncIterator]() {
			return {
				next() {
					calls++;
					if (handedOut === items.length) {
						return sleep(eofMs).then(() => ({done: true, value: undefined}));
					}

					const value = items[handedOut++];
					return sleep(readMs).then(() => ({done: false, value}));
				},
			};
		},
	};
}

const mapper = async (element, index) => {
	await sleep(10);
	return `${element}@${index}`;
};

for (const [label, eofMs] of [['EOF answers immediately (drained queue)', 0], ['EOF answers after the pending read', 300]]) {
	const source = makeSource({items: ['a', 'b', 'c', 'd'], readMs: 60, eofMs});
	const out = await pMap(source, mapper, {concurrency: 3});
	console.log(`${label}:`);
	console.log(`   input=4 items -> output.length=${out.length} holes=${out.length - Object.keys(out).length} -> ${JSON.stringify(out)}`);
	console.log(`   source.next() calls=${source.calls}`);
}
