'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, CreditCard, Bell, Shield, Save, Camera, Eye, EyeOff, Lock, KeyRound } from 'lucide-react';

export default function GuestProfilePage() {
  const [activeTab, setActiveTab] = useState('personal');
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    bio: '',
    location: 'San Francisco, CA', // Mock for now
  });
  // Security tab state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  // Notifications tab state
  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailPromotions: false,
    smsBookings: true,
    smsMarketing: false,
    marketing: false,
  });

  useEffect(() => {
    fetch('/api/guest/profile')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then((data) => {
        setForm({
          fullName: data.profile.fullName || data.user.name || '',
          email: data.user.email || '',
          phone: data.profile.phone || '',
          bio: data.profile.bio || '',
          location: 'San Francisco, CA',
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const getCsrfToken = () => {
    const match = document.cookie.match(/(?:^|;\s*)x-csrf-token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const handleSave = async () => {
    setError(null);
    try {
      const res = await fetch('/api/guest/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Failed to save profile');

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    try {
      const res = await fetch('/api/guest/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-12">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
            Profile Settings
          </p>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Your Profile</h1>
          <p className="text-gray-500 mt-2">Manage your preferences and secure your account.</p>
        </div>
        <button
          onClick={handleSave}
          className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
        >
          <Save className="h-4 w-4" /> Save Changes
        </button>
      </div>

      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          Profile updated successfully
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 font-bold animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      <div className="flex gap-12">
        {/* Navigation Sidebar */}
        <div className="w-64 shrink-0 space-y-2">
          <ProfileNavItem
            icon={User}
            label="Personal Info"
            active={activeTab === 'personal'}
            onClick={() => setActiveTab('personal')}
          />
          <ProfileNavItem
            icon={CreditCard}
            label="Payment Methods"
            active={activeTab === 'payments'}
            onClick={() => setActiveTab('payments')}
          />
          <ProfileNavItem
            icon={Bell}
            label="Notifications"
            active={activeTab === 'notifications'}
            onClick={() => setActiveTab('notifications')}
          />
          <ProfileNavItem
            icon={Shield}
            label="Privacy & Security"
            active={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-10">
          {activeTab === 'personal' && (
            <div className="space-y-10">
              <div className="flex items-center gap-8">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-[2rem] bg-brand-100 flex items-center justify-center text-brand-600 font-bold overflow-hidden border-4 border-white shadow-lg">
                    <User className="h-12 w-12" />
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-2 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-110 transition-all">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">{form.fullName}</h3>
                  <p className="text-sm text-gray-500">Member since 2026</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <InputGroup
                  icon={User}
                  label="Full Name"
                  value={form.fullName}
                  onChange={(val: string) => setForm({ ...form, fullName: val })}
                />
                <InputGroup icon={Mail} label="Email Address" value={form.email} disabled />
                <InputGroup
                  icon={Phone}
                  label="Phone Number"
                  value={form.phone}
                  onChange={(val: string) => setForm({ ...form, phone: val })}
                />
                <InputGroup icon={MapPin} label="Location" value={form.location} disabled />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-50 transition-all outline-none text-sm font-bold text-gray-900 min-h-[100px]"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="pt-6 border-t border-gray-50">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">
                  Travel Preferences
                </h4>
                <div className="flex flex-wrap gap-3">
                  {['Eco-friendly', 'Luxury', 'Adventure', 'Family Focus'].map((tag) => (
                    <button
                      key={tag}
                      className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-600 hover:border-brand-200 hover:text-brand-600 transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                  <button className="px-4 py-2 rounded-xl border-2 border-dashed border-gray-100 text-xs font-bold text-gray-400 hover:border-brand-200 hover:text-brand-600 transition-all">
                    + Add Interest
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Change Password</h3>
                <p className="text-sm text-gray-500 mb-6">Update your account password.</p>
              </div>

              {passwordSuccess && (
                <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <KeyRound className="h-4 w-4" /> Password updated successfully
                </div>
              )}

              {passwordError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 font-bold animate-in fade-in slide-in-from-top-2">
                  {passwordError}
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      className="w-full pl-12 pr-12 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-50 transition-all outline-none text-sm font-bold text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="At least 8 characters"
                      className="w-full pl-12 pr-12 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-50 transition-all outline-none text-sm font-bold text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600">Confirm New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-50 transition-all outline-none text-sm font-bold text-gray-900"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePasswordChange}
                  className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" /> Update Password
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Notification Preferences</h3>
                <p className="text-sm text-gray-500 mb-6">Choose how and when we contact you.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Email Notifications</h4>
                  <div className="space-y-4">
                    <ToggleRow
                      label="Booking confirmations & updates"
                      description="Receive email confirmations for new bookings and changes"
                      checked={notifications.emailBookings}
                      onChange={(v) => setNotifications({ ...notifications, emailBookings: v })}
                    />
                    <ToggleRow
                      label="Promotions & special offers"
                      description="Get notified about deals and exclusive offers"
                      checked={notifications.emailPromotions}
                      onChange={(v) => setNotifications({ ...notifications, emailPromotions: v })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">SMS Notifications</h4>
                  <div className="space-y-4">
                    <ToggleRow
                      label="Booking updates via SMS"
                      description="Receive text messages about upcoming check-ins and changes"
                      checked={notifications.smsBookings}
                      onChange={(v) => setNotifications({ ...notifications, smsBookings: v })}
                    />
                    <ToggleRow
                      label="Marketing SMS"
                      description="Receive promotional text messages"
                      checked={notifications.smsMarketing}
                      onChange={(v) => setNotifications({ ...notifications, smsMarketing: v })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Other</h4>
                  <ToggleRow
                    label="Marketing & product updates"
                    description="Tips, product announcements, and survey invitations"
                    checked={notifications.marketing}
                    onChange={(v) => setNotifications({ ...notifications, marketing: v })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-8">
              <div className="p-8 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden group cursor-pointer">
                <CreditCard className="absolute top-[-20px] right-[-20px] h-32 w-32 text-white/10 rotate-12 group-hover:rotate-[20deg] transition-all" />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-8">
                      Primary Card
                    </div>
                    <div className="text-2xl font-black mb-1">•••• •••• •••• 4242</div>
                    <div className="text-sm opacity-60">Expires 12/28</div>
                  </div>
                  <div className="h-8 w-12 bg-white/20 rounded-md backdrop-blur-sm"></div>
                </div>
              </div>

              <button className="w-full py-4 rounded-[2rem] border-2 border-dashed border-gray-100 text-gray-400 font-black text-sm uppercase tracking-widest hover:border-brand-200 hover:text-brand-600 transition-all">
                + Add New Payment Method
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileNavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
        active
          ? 'bg-brand-50 text-brand-600 shadow-sm'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-bold text-gray-900">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-all ${
          checked ? 'bg-brand-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function InputGroup({ icon: Icon, label, value, onChange, disabled }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.value)}
          className={`w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-50 transition-all outline-none text-sm font-bold text-gray-900 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
    </div>
  );
}
