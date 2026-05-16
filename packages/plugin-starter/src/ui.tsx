import React from 'react';

/**
 * MyWidget
 * ────────
 * A placeholder widget for your plugin.
 */
export function MyWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-2">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
        ?
      </div>
      <div>
        <div className="text-sm font-bold text-gray-900">Your Widget Here</div>
        <div className="text-xs text-gray-400">Edit src/ui.tsx to get started</div>
      </div>
    </div>
  );
}

export const components = {
  MyWidget,
};
