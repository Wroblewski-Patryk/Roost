// Disposable native proof: run the shipped Worker with a test-owned Writer
// directory. The provider and process launcher remain the installed ones.
import { runHost } from './roost-codex-agent-host.mjs';
import { acquireWriterLock } from './lib/agent-host-writer-lock.mjs';

const directory = process.env.ROOST_G6_NATIVE_WRITER_DIR;
if (!directory) throw Error('native_writer_directory_required');
await runHost({ acquireLock: options => acquireWriterLock(directory, options) });
