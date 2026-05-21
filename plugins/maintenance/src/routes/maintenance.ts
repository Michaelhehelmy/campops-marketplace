import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export function maintenanceRouter(_api: PluginAPI) {
  return {
    GET: async (_req: Request) => {
      const tasks = [
        {
          id: 'TKT-201',
          title: 'Tent 101 Zipper Broken',
          location: 'Room 101',
          priority: 'high',
          status: 'open',
          time: '2h ago',
        },
        {
          id: 'TKT-202',
          title: 'Hot Water Heater Leak',
          location: 'Bath House A',
          priority: 'critical',
          status: 'in_progress',
          time: '5h ago',
        },
        {
          id: 'TKT-203',
          title: 'Solar Light Replacement',
          location: 'Path 4',
          priority: 'low',
          status: 'completed',
          time: '1d ago',
        },
      ];
      return new Response(JSON.stringify(tasks), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}
