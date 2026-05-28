'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  UserPlus,
  Mail,
  Lock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'super_admin' | 'listing_admin' | 'support' | 'disabled';
  status: 'active' | 'disabled';
  assignedListings: number;
  lastLogin: string;
}

export default function MasterAdminsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState<any>({ name: '', email: '', role: 'super_admin' });
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/master/admins');
      const data = await res.json();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    try {
      const res = await fetch('/api/master/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        setNewAdmin({ name: '', email: '', role: 'super_admin' });
        fetchAdmins();
      } else {
        setError(data.error || 'Failed to create admin');
      }
    } catch (err: any) {
      console.error('Failed to create admin:', err);
      setError(err.message || 'Failed to create admin');
    }
  };

  const handleDisable = async (id: string) => {
    try {
      // For now, we'll just delete or update role to 'disabled'
      const res = await fetch(`/api/master/admins/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'disabled' }),
      });
      if (res.ok) {
        fetchAdmins();
      }
    } catch (err) {
      console.error('Failed to disable admin:', err);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/master/admins/${newAdmin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewAdmin({ name: '', email: '', role: 'super_admin' });
        fetchAdmins();
      }
    } catch (err) {
      console.error('Failed to update admin:', err);
    }
  };

  return (
    <div className="space-y-8 ">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Accounts</h1>
          <p className="text-gray-500">Manage system-wide administrative access and roles.</p>
        </div>
        <button
          onClick={() => {
            setNewAdmin({ name: '', email: '', role: 'super_admin' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          <UserPlus className="h-5 w-5" /> Add Account
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-gray-900 mb-6">
              {newAdmin.id ? 'Edit Account' : 'Account Details'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:border-purple-200 outline-none transition-all"
                  placeholder="New Admin"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:border-purple-200 outline-none transition-all"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="role"
                  className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                >
                  Role
                </label>
                <select
                  id="role"
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:border-purple-200 outline-none transition-all bg-white"
                >
                  <option value="master">Master</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="listing_admin">Listing Admin</option>
                  <option value="support">Support</option>
                </select>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={newAdmin.id ? handleSaveEdit : handleCreate}
                  className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all"
                >
                  {newAdmin.id ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RoleCard
          role="Super Admin"
          count={admins.filter((a) => a.role === 'super_admin' || a.role === 'master').length}
          icon={Shield}
          color="purple"
        />
        <RoleCard
          role="Listing Admins"
          count={admins.filter((a) => a.role === 'listing_admin').length}
          icon={Users}
          color="blue"
        />
        <RoleCard
          role="Support Staff"
          count={admins.filter((a) => a.role === 'support').length}
          icon={Users}
          color="green"
        />
      </div>

      {/* Search & List */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins by name or email..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 focus:border-purple-200 focus:ring-4 focus:ring-purple-50 transition-all outline-none text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="p-3 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 font-bold animate-pulse">
            Loading admins...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Identity
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Role
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Status
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Last Login
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins
                .filter(
                  (a) =>
                    a.name.toLowerCase().includes(search.toLowerCase()) ||
                    a.email.toLowerCase().includes(search.toLowerCase())
                )
                .map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                          {admin.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{admin.name}</div>
                          <div className="text-xs text-gray-400">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${admin.role === 'super_admin' || admin.role === 'master' ? 'bg-purple-100 text-purple-600' : admin.role === 'support' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}
                      >
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {admin.status === 'active' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`text-xs font-bold ${admin.status === 'active' ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {admin.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-500">{admin.lastLogin}</td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setNewAdmin(admin);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDisable(admin.id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RoleCard({ role, count, icon: Icon, color }: any) {
  const colors: any = {
    purple: 'text-purple-600 bg-purple-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-50 flex items-center gap-6 hover:scale-[1.02] transition-all cursor-pointer">
      <div className={`p-4 rounded-2xl ${colors[color]}`}>
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <div className="text-2xl font-black text-gray-900 tracking-tight">{count}</div>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{role}</div>
      </div>
    </div>
  );
}
