/* eslint-disable @typescript-eslint/no-var-requires */
const { parentPort, workerData } = require('worker_threads');
const path = require('path');

const { pluginId, entryPoint } = workerData;

(async () => {
  try {
    const createJiti = require('jiti');
    const jiti = createJiti(__filename, { cache: false });
    const pluginModule = jiti(entryPoint);
    const initFunc = pluginModule.default || pluginModule;

    if (typeof initFunc !== 'function') {
      throw new Error(`Plugin ${pluginId} does not have a default export function`);
    }

    const publicApi = await initFunc({});
    parentPort.postMessage({ success: true, pluginId });
  } catch (err) {
    parentPort.postMessage({ success: false, pluginId, error: err.message });
  }
})();
