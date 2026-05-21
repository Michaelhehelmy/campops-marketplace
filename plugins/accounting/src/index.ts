import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info('[accounting] Plugin loaded — UI components registered via plugin.json');
}
