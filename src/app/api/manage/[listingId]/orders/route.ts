import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { listingId: string } }) {
  const { listingId } = params;

  try {
    // Return placeholder data that matches the frontend needs
    const orders = [
      {
        id: 'ORD-101',
        guest: 'Michael Smith',
        item: 'Margherita Pizza x2',
        amount: 45.0,
        status: 'completed',
        time: '10m ago',
      },
      {
        id: 'ORD-102',
        guest: 'Sarah Wilson',
        item: 'Mountain Bike Rental (4h)',
        amount: 60.0,
        status: 'pending',
        time: '25m ago',
      },
      {
        id: 'ORD-103',
        guest: 'John Davis',
        item: 'Firewood Bundle',
        amount: 15.0,
        status: 'completed',
        time: '1h ago',
      },
    ];

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
