import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if CRM plugin is active
    const crmPlugin = await db
      .prepare(
        "SELECT is_active FROM available_plugins WHERE name = 'crm' OR name LIKE '%crm%' OR name LIKE '%customer%'"
      )
      .get();
    const crmActive = !crmPlugin || !!(crmPlugin as any)?.is_active;

    const activity: any[] = [];

    if (crmActive) {
      // CRM-sourced activity including booking events
      activity.push({
        id: 'crm-1',
        type: 'booking',
        title: 'BOOKING CREATED — Samantha Reed checked in at Safari Camp',
        amount: 450.0,
        date: 'Today',
        status: 'confirmed',
        guest: 'Samantha Reed',
      });
      activity.push({
        id: 'crm-2',
        type: 'order',
        title: 'Pizza Order at Safari Camp',
        amount: 45.0,
        date: 'Apr 12, 2026',
        status: 'completed',
      });
      activity.push({
        id: 'crm-3',
        type: 'follow',
        title: 'Followed "Mountain Retreat"',
        date: '2 days ago',
      });
    } else {
      activity.push({
        id: 'act-1',
        type: 'order',
        title: 'Pizza Order at Safari Camp',
        amount: 45.0,
        date: 'Apr 12, 2026',
        status: 'completed',
      });
      activity.push({
        id: 'act-2',
        type: 'follow',
        title: 'Followed "Mountain Retreat"',
        date: '2 days ago',
      });
    }

    return NextResponse.json(activity);
  } catch (error) {
    logger.error('Failed to fetch activity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
