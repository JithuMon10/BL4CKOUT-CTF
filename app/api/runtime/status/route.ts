import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runtimeClient } from '@/lib/runtime/runtime-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get('instanceId');

    if (instanceId) {
      const instance = await runtimeClient.getInstance(instanceId);
      return NextResponse.json({
        success: true,
        data: instance,
      });
    }

    const instances = await runtimeClient.getUserInstances(user.id);

    return NextResponse.json({
      success: true,
      count: instances.length,
      data: instances,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch status.' },
      { status: 500 }
    );
  }
}
