import { Worker } from 'worker_threads';
import path from 'path';

const PLUGIN_TIMEOUT = 15000;

export async function runPluginInSandbox(pluginId: string, entryPoint: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'plugin-worker.js');
    const worker = new Worker(workerPath, {
      workerData: { pluginId, entryPoint },
      eval: false,
    });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Plugin ${pluginId} timed out after ${PLUGIN_TIMEOUT}ms`));
    }, PLUGIN_TIMEOUT);

    worker.on('message', (msg) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(msg);
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      worker.terminate();
      reject(err);
    });

    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Plugin ${pluginId} exited with code ${code}`));
      }
    });
  });
}
