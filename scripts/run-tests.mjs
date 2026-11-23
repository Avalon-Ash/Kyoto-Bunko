// npm test: runs both test commands, streams their output live, and on failure saves the full output to .shots/test-fail/<timestamp>.log.
import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const COMMANDS = [
  ['node', ['--test', '--test-concurrency=1', 'scripts/*.test.mjs']],
  ['tsx', ['--test', 'src/lib/*.test.ts']],
];
const FAIL_DIR = join('.shots', 'test-fail');

let log = '';
const run = (cmd, args) => new Promise(resolve => {
  // shell: true so npm's .bin shims (tsx) resolve on Windows and node expands the globs itself on every platform.
  const child = spawn([cmd, ...args.map(a => `"${a}"`)].join(' '), {shell: true, stdio: ['ignore', 'pipe', 'pipe']});
  child.stdout.on('data', d => {log += d; process.stdout.write(d);});
  child.stderr.on('data', d => {log += d; process.stderr.write(d);});
  child.on('error', e => {log += `${e}\n`; resolve(1);});
  child.on('close', code => resolve(code ?? 1));
});

let exit = 0;
for (const [cmd, args] of COMMANDS) {
  exit = await run(cmd, args);
  if (exit !== 0) break;
}
if (exit !== 0) {
  mkdirSync(FAIL_DIR, {recursive: true});
  const file = join(FAIL_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
  writeFileSync(file, log);
  console.error(`\n[run-tests] failed (exit ${exit}); full output saved to ${file}`);
}
process.exit(exit);
