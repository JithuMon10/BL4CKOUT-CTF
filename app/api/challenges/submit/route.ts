import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { challengeId, flag } = body;

    if (!challengeId || !flag) {
      return NextResponse.json(
        { success: false, message: 'Missing challenge ID or flag.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.team_id) {
      return NextResponse.json(
        { success: false, message: 'You must join a team before submitting flags.' },
        { status: 400 }
      );
    }

    const teamId = profile.team_id;

    const { data: challenge, error: chalError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (chalError || !challenge) {
      return NextResponse.json(
        { success: false, message: 'Challenge not found.' },
        { status: 404 }
      );
    }

    // Check duplicate solve
    const { data: existingSolve } = await supabase
      .from('solves')
      .select('id')
      .eq('team_id', teamId)
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (existingSolve) {
      return NextResponse.json({
        success: false,
        alreadySolved: true,
        message: 'Your team has already solved this challenge.',
      });
    }

    const cleanSubmitted = flag.trim();
    const cleanTrue = challenge.flag.trim();
    const isCorrect = cleanSubmitted === cleanTrue;

    // Log submission
    await supabase.from('submission_logs').insert({
      user_id: user.id,
      team_id: teamId,
      challenge_id: challengeId,
      submitted_flag: cleanSubmitted,
      is_correct: isCorrect,
    });

    if (isCorrect) {
      const { error: insertError } = await supabase.from('solves').insert({
        team_id: teamId,
        user_id: user.id,
        challenge_id: challengeId,
        points: challenge.points,
      });

      if (insertError) throw insertError;

      return NextResponse.json({
        success: true,
        points: challenge.points,
        message: `Correct! +${challenge.points} points.`,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Incorrect flag. Try again.',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Server error.' },
      { status: 500 }
    );
  }
}
