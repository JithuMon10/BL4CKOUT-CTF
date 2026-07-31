import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { hintId } = await req.json();

    if (!hintId) {
      return NextResponse.json({ success: false, message: 'Missing hint ID.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    // Fetch the hint
    const { data: hint, error: hintError } = await supabase
      .from('hints')
      .select('id, challenge_id, hint_text, cost')
      .eq('id', hintId)
      .maybeSingle();

    if (hintError || !hint) {
      return NextResponse.json({ success: false, message: 'Hint not found.' }, { status: 404 });
    }

    // Check if already revealed (to avoid double-charging)
    const { data: existing } = await supabase
      .from('hint_reveals')
      .select('id')
      .eq('user_id', user.id)
      .eq('hint_id', hintId)
      .maybeSingle();

    if (existing) {
      // Already revealed — just return the hint text, no charge
      return NextResponse.json({
        success: true,
        hintText: hint.hint_text,
        cost: 0,
        alreadyRevealed: true,
      });
    }

    // Fetch user's team_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .maybeSingle();

    const teamId = profile?.team_id ?? null;

    // Record the reveal
    await supabase.from('hint_reveals').insert({
      user_id: user.id,
      team_id: teamId,
      hint_id: hintId,
      challenge_id: hint.challenge_id,
      cost_paid: hint.cost,
    });

    // Deduct points if there is a cost
    if (hint.cost > 0 && teamId) {
      // Insert a negative solve entry isn't ideal — instead track hint cost deductions
      // We record in hint_reveals so the leaderboard can factor it in
      // For now we just record the cost; the scoring view will subtract hint costs
    }

    return NextResponse.json({
      success: true,
      hintText: hint.hint_text,
      cost: hint.cost,
      alreadyRevealed: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Server error.' },
      { status: 500 }
    );
  }
}

// GET — load all revealed hints for the current user for a given challenge
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const challengeId = searchParams.get('challengeId');

    if (!challengeId) {
      return NextResponse.json({ success: false, message: 'Missing challengeId.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    const { data: reveals } = await supabase
      .from('hint_reveals')
      .select('hint_id')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId);

    return NextResponse.json({
      success: true,
      revealedHintIds: (reveals || []).map((r: any) => r.hint_id),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Server error.' },
      { status: 500 }
    );
  }
}
