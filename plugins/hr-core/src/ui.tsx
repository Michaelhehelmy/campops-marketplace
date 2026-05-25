import React, { useState, useEffect } from 'react';

export function StaffAttendanceWidget() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/p/hr?section=employees')
      .then((res) => res.json())
      .then((data) => {
        if (data.employees) setEmployees(data.employees);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalHours = employees.length;
  const estPayroll = employees.reduce((sum, e) => sum + (e.hourly_rate || 0) * 160, 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">Staff On-Site</h4>
        <div className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
          {loading ? '...' : `${employees.length} Active`}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        <>
          <div className="flex -space-x-2 overflow-hidden">
            {employees.slice(0, 5).map((emp: any, i: number) => (
              <div key={emp.id || i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200">
                <div className="w-full h-full rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600">
                  {emp.employee_number?.replace('EMP-', '') || `E${i + 1}`}
                </div>
              </div>
            ))}
            {employees.length > 5 && (
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-50 flex items-center justify-center text-[10px] font-medium text-gray-400">
                +{employees.length - 5}
              </div>
            )}
          </div>

          <div className="pt-2 grid grid-cols-2 gap-2">
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Department(s)</div>
              <div className="text-lg font-black text-gray-900">
                {new Set(employees.map((e: any) => e.department).filter(Boolean)).size}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Est. Payroll</div>
              <div className="text-lg font-black text-gray-900">${estPayroll.toLocaleString()}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const components = {
  StaffAttendanceWidget,
};
