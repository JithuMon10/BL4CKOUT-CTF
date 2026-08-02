import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runtimeClient } from '@/lib/runtime/runtime-client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { challengeId, durationMins } = body;

    if (!challengeId) {
      return NextResponse.json(
        { success: false, message: 'Missing challengeId parameter.' },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .maybeSingle();

    const instance = await runtimeClient.spawnInstance({
      challengeId,
      userId: user.id,
      teamId: profile?.team_id || undefined,
      durationMins: durationMins ? Number(durationMins) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: instance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to spawn instance.' },
      { status: 500 }
    );
  }
}
