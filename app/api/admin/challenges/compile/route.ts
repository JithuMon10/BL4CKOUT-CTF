import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runtimeClient } from '@/lib/runtime/runtime-client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { challengeId, folderName } = body;

    if (!challengeId) {
      return NextResponse.json({ success: false, message: 'Missing challenge ID.' }, { status: 400 });
    }

    const compileResult = await runtimeClient.compileChallenge({
      challengeId,
      folderName,
    });

    return NextResponse.json({
      success: true,
      message: compileResult.message || 'Docker image compiled successfully.',
      data: compileResult.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to compile challenge image.' },
      { status: 500 }
    );
  }
}
