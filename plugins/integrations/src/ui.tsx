import React, { useState, useEffect } from 'react';

export function CalendarSyncSettings() {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [icalUrl, setIcalUrl] = useState('');
  const [platform, setPlatform] = useState('airbnb');

  const fetchCalendars = async () => {
    try {
      const res = await fetch('/api/p/integrations/calendars');
      const data = await res.json();
      if (data.calendars) setCalendars(data.calendars);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCalendars(); }, []);

  const addCalendar = async () => {
    const res = await fetch('/api/p/integrations/calendars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: 'default', platform, ical_url: icalUrl }),
    });
    if (res.ok) {
      setIcalUrl('');
      await fetchCalendars();
    }
  };

  const removeCalendar = async (id: string) => {
    await fetch(`/api/p/integrations/calendars?id=${id}`, { method: 'DELETE' });
    await fetchCalendars();
  };

  if (loading) return <div className="p-4 text-gray-500">Loading integrations...</div>;

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-xl font-bold">Calendar Sync Settings</h3>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
        <h4 className="font-bold text-gray-700">Add External Calendar</h4>
        <div className="flex gap-3">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="airbnb">Airbnb</option>
            <option value="booking_com">Booking.com</option>
            <option value="expedia">Expedia</option>
            <option value="other">Other iCal</option>
          </select>
          <input
            type="text"
            placeholder="iCal URL..."
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={addCalendar}
            disabled={!icalUrl}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {calendars.length === 0 ? (
          <p className="text-gray-400 text-sm">No external calendars configured.</p>
        ) : (
          calendars.map((cal) => (
            <div key={cal.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">{cal.platform}</div>
                <div className="text-xs text-gray-500 truncate max-w-md">{cal.ical_url}</div>
                <div className="text-xs text-gray-400">
                  {cal.last_synced_at ? `Last synced: ${new Date(cal.last_synced_at).toLocaleString()}` : 'Never synced'}
                </div>
              </div>
              <button
                onClick={() => removeCalendar(cal.id)}
                className="text-red-500 text-xs font-bold hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const components = {
  CalendarSyncSettings,
};
