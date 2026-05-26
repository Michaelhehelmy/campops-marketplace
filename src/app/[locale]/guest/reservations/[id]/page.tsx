'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Users,
  ShieldCheck,
  Download,
  MessageCircle,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function GuestReservationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { data: session } = authClient.useSession();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReservation = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch(`/api/guest/reservations/${id}`);
        if (response.ok) {
          const data = await response.json();
          setReservation(data);
        }
      } catch (error) {
        console.error('Failed to fetch reservation details:', error);
      } finally {
        setLoading(false);
      }
    };
    if (session) {
      fetchReservation();
    }
  }, [id, session]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-8">
        <div className="h-8 w-64 bg-gray-100 rounded-xl"></div>
        <div className="h-96 bg-gray-100 rounded-[3rem]"></div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black text-gray-900">Trip not found</h2>
        <button
          onClick={() => router.back()}
          className="mt-4 text-brand-600 font-bold hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-brand-600 transition-all font-bold text-sm"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Portal
      </button>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden">
        <div className="h-64 relative">
          <img
            src="https://images.unsplash.com/photo-1493246507139-91e8bef99c17?auto=format&fit=crop&w=1200"
            alt={reservation.property_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-8 left-8 text-white">
            <h1 className="text-4xl font-black tracking-tight">{reservation.property_name}</h1>
            <div className="flex items-center gap-2 text-white/80 mt-2 font-medium">
              <MapPin className="h-4 w-4" /> Maasai Mara, Kenya
            </div>
          </div>
          <div className="absolute top-8 right-8 px-4 py-2 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs">
            {reservation.status}
          </div>
        </div>

        <div className="p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-gray-100 pb-12 mb-12">
            <InfoBlock
              icon={Calendar}
              label="Dates"
              value={`${new Date(reservation.check_in).toLocaleDateString()} - ${new Date(reservation.check_out).toLocaleDateString()}`}
            />
            <InfoBlock icon={Users} label="Guests" value={`${reservation.guest_count} explorers`} />
            <InfoBlock
              icon={DollarSign}
              label="Total Paid"
              value={`$${reservation.total_amount}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-4">Reservation Details</h3>
                <div className="space-y-4">
                  <DetailItem
                    label="Confirmation Code"
                    value={`CP-${reservation.id.slice(0, 8).toUpperCase()}`}
                  />
                  <DetailItem label="Check-in Time" value="2:00 PM" />
                  <DetailItem label="Check-out Time" value="11:00 AM" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-4">Inclusions</h3>
                <ul className="grid grid-cols-2 gap-3">
                  {['Breakfast & Dinner', 'Guided Game Drive', 'Airport Transfer', 'Wi-Fi'].map(
                    (item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-sm text-gray-600 font-medium"
                      >
                        <ShieldCheck className="h-4 w-4 text-green-500" /> {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-brand-50 p-8 rounded-[2.5rem] border border-brand-100">
                <h3 className="text-lg font-black text-brand-900 mb-2">Need help?</h3>
                <p className="text-sm text-brand-700/70 mb-6">
                  Our concierge is available 24/7 to assist with your stay.
                </p>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all">
                    <MessageCircle className="h-5 w-5" /> Chat with Concierge
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 bg-white text-brand-600 border border-brand-100 py-3 rounded-2xl font-bold hover:bg-brand-50 transition-all">
                    <Download className="h-5 w-5" /> Download Itinerary (PDF)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value }: any) {
  return (
    <div className="flex gap-4">
      <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-brand-600">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
          {label}
        </div>
        <div className="font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 font-bold text-sm">{label}</span>
      <span className="text-gray-900 font-black tracking-tight">{value}</span>
    </div>
  );
}
