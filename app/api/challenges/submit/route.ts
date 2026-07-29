import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { challengeId, flag } = body;

    if (!challengeId || !flag) {
      return NextResponse.json(
        { success: false, message: 'Missing challenge ID or flag parameter.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'AUTHENTICATION REQUIRED. Please log in first.' },
        { status: 401 }
      );
    }

    // Fetch user profile & team_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.team_id) {
      return NextResponse.json(
        { success: false, message: 'SQUAD REQUIRED. You must create or join a team to submit flags.' },
        { status: 400 }
      );
    }

    const teamId = profile.team_id;

    // Fetch challenge from Supabase
    const { data: challenge, error: chalError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (chalError || !challenge) {
      return NextResponse.json(
        { success: false, message: 'Target challenge not found in database.' },
        { status: 404 }
      );
    }

    // Check if team already solved this challenge
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
        message: 'YOUR SQUAD HAS ALREADY COMPROMISED THIS TARGET!',
      });
    }

    // Flag Validation
    const cleanSubmitted = flag.trim();
    const cleanTrue = challenge.flag.trim();

    if (cleanSubmitted === cleanTrue) {
      // Record solve in Supabase
      const { error: insertError } = await supabase.from('solves').insert({
        team_id: teamId,
        user_id: user.id,
        challenge_id: challengeId,
        points: challenge.points,
      });

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        points: challenge.points,
        message: '⚡ FLAG ACCEPTED! TARGET COMPROMISED SUCCESSFULLY.',
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '❌ INCORRECT FLAG. ACCESS DENIED.',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Server error processing flag submission.' },
      { status: 500 }
    );
  }
}
