import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info('[my-plugin] Initialising…');

  api.registerHook(
    'payment:success',
    async (data) => {
      api.logger.info(`[my-plugin] payment:success: guest=${data.guestId}`);
      return data;
    },
    50
  );

  api.registerHook(
    'pricing:calculate',
    async (data) => {
      if (data.price > 100) {
        return { ...data, price: data.price - 5 };
      }
      return data;
    },
    50
  );

  api.ui.addMenuItem({
    label: 'My Plugin',
    icon: 'plug',
    path: '/admin/my-plugin',
    permission: 'settings.view',
  });

  api.logger.info('[my-plugin] Ready');
}
