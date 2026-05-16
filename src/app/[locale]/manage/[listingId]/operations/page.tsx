'use client';

import { useState } from 'react';
import {
  Activity,
  Trash2,
  Wrench,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { PluginShell } from '@/app/PluginShell';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'housekeeping' | 'maintenance' | 'staff'>(
    'orders'
  );

  return (
    <PluginRegistryProvider>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Operations</h2>
            <p className="text-gray-500">Manage daily tasks, maintenance, and staff rosters.</p>
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <OpTab
              active={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
              icon={Activity}
              label="Orders"
              role="tab"
            />
            <OpTab
              active={activeTab === 'housekeeping'}
              onClick={() => setActiveTab('housekeeping')}
              icon={Trash2}
              label="Housekeeping"
              role="tab"
            />
            <OpTab
              active={activeTab === 'maintenance'}
              onClick={() => setActiveTab('maintenance')}
              icon={Wrench}
              label="Maintenance"
              role="tab"
            />
            <OpTab
              active={activeTab === 'staff'}
              onClick={() => setActiveTab('staff')}
              icon={Users}
              label="Staff"
              role="tab"
            />
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 min-h-[600px] overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-gray-900 capitalize">{activeTab} Board</h3>
              <p className="text-sm text-gray-500">Real-time operational status</p>
            </div>
            <button className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100">
              + New Task
            </button>
          </div>

          <div className="flex-1 p-8">
            {/* Integrated Plugin Content */}
            <PluginShell name={`manage.operations.${activeTab}`} />

            {/* Fallback/Mock Content if plugin not enabled */}
            <div className="mt-8 space-y-4">
              <div className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-lg hover:shadow-gray-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 capitalize">
                      {activeTab} system idle
                    </div>
                    <div className="text-xs text-gray-500">
                      Enable the {activeTab} plugin to unlock full functionality.
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 text-brand-600 text-xs font-bold hover:underline">
                  Go to Plugin Marketplace <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PluginRegistryProvider>
  );
}

function OpTab({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${active ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-gray-500 hover:bg-gray-50'}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
