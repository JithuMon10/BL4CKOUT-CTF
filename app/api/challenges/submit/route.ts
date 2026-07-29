import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MOCK_FLAGS, MOCK_CHALLENGES } from '@/lib/mockData';

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

    // Check profile and team membership if user is authenticated
    let teamId: string | null = null;
    let userId: string | null = null;

    if (user) {
      userId = user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();
      
      teamId = profile?.team_id || null;
    }

    // Try fetching challenge from Supabase
    let trueFlag: string | null = null;
    let points = 100;

    const { data: challenge } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (challenge) {
      trueFlag = challenge.flag;
      points = challenge.points;
    } else if (MOCK_FLAGS[challengeId]) {
      trueFlag = MOCK_FLAGS[challengeId];
      const mockChal = MOCK_CHALLENGES.find(c => c.id === challengeId);
      if (mockChal) points = mockChal.points;
    }

    if (!trueFlag) {
      return NextResponse.json(
        { success: false, message: 'Challenge target not found.' },
        { status: 404 }
      );
    }

    // Check if team already solved this challenge
    if (teamId) {
      const { data: existingSolve } = await supabase
        .from('solves')
        .select('id')
        .eq('team_id', teamId)
        .eq('challenge_id', challengeId)
        .single();

      if (existingSolve) {
        return NextResponse.json({
          success: false,
          alreadySolved: true,
          message: 'YOUR TEAM HAS ALREADY COMPROMISED THIS TARGET!',
        });
      }
    }

    // Flag Validation
    const cleanSubmitted = flag.trim();
    const cleanTrue = trueFlag.trim();

    if (cleanSubmitted === cleanTrue) {
      // Record solve in Supabase if user has a team
      if (teamId && userId) {
        await supabase.from('solves').insert({
          team_id: teamId,
          user_id: userId,
          challenge_id: challengeId,
          points: points,
        });
      }

      return NextResponse.json({
        success: true,
        points: points,
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
      { success: false, message: error.message || 'Server error processing flag.' },
      { status: 500 }
    );
  }
}
