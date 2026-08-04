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
    const { instanceId, additionalMins } = body;

    if (!instanceId) {
      return NextResponse.json(
        { success: false, message: 'Missing instanceId parameter.' },
        { status: 400 }
      );
    }

    const instance = await runtimeClient.renewInstance({
      instanceId,
      userId: user.id,
      additionalMins: additionalMins ? Number(additionalMins) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: instance,
    });
  } catch (error: any) {
    const status = error.status === 503 || error.isOffline ? 503 : (error.status || 500);
    const message = error.isOffline || status === 503 ? 'Runtime server is currently offline. Please try again later.' : (error.message || 'Failed to renew instance.');
    return NextResponse.json({ success: false, message }, { status });
  }
}
