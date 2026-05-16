import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { listingId: string } }) {
  const { listingId } = params;

  try {
    const housekeeping = [
      { id: '101', type: 'Luxury Tent', status: 'dirty', staff: 'Unassigned', priority: 'high' },
      { id: '102', type: 'Luxury Tent', status: 'cleaning', staff: 'Jane Doe', priority: 'normal' },
      { id: '103', type: 'Family Suite', status: 'clean', staff: 'System', priority: 'low' },
      { id: '104', type: 'Luxury Tent', status: 'dirty', staff: 'Unassigned', priority: 'normal' },
    ];

    return NextResponse.json(housekeeping);
  } catch (error) {
    console.error('Failed to fetch housekeeping:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
