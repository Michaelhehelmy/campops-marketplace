import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { listingId: string } }) {
  const { listingId } = params;

  try {
    const maintenance = [
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

    return NextResponse.json(maintenance);
  } catch (error) {
    console.error('Failed to fetch maintenance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
