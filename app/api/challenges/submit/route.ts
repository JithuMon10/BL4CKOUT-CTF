import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

// Constant-time string comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  try {
    // Pad both to same length using SHA-256 hashes so length never leaks
    const hashA = createHash('sha256').update(a).digest();
    const hashB = createHash('sha256').update(b).digest();
    return timingSafeEqual(hashA, hashB);
  } catch {
    return false;
  }
}

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

    // Fetch profile — team_id may be null (solo practice mode)
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .maybeSingle();

    // Check platform mode setting
    const { data: modeSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'platform_mode')
      .maybeSingle();

    const isCompetitionMode = modeSetting?.value === 'competition';

    // In competition mode, team is required
    if (isCompetitionMode && !profile?.team_id) {
      return NextResponse.json(
        { success: false, message: 'You must join a team before submitting flags in competition mode.' },
        { status: 400 }
      );
    }

    const teamId = profile?.team_id ?? null;

    // --- RATE LIMITING: 10-second cooldown per user per challenge ---
    const { data: recentAttempt } = await supabase
      .from('submission_logs')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .eq('is_correct', false)
      .gte('created_at', new Date(Date.now() - 10_000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recentAttempt) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please wait 10 seconds before trying again.' },
        { status: 429 }
      );
    }

    // Fetch challenge (flag column is accessible server-side via service role)
    const { data: challenge, error: chalError } = await supabase
      .from('challenges')
      .select('id, title, points, is_visible, flag')
      .eq('id', challengeId)
      .maybeSingle();

    if (chalError || !challenge) {
      return NextResponse.json(
        { success: false, message: 'Challenge not found.' },
        { status: 404 }
      );
    }

    if (!challenge.is_visible) {
      return NextResponse.json(
        { success: false, message: 'This challenge is not currently available.' },
        { status: 403 }
      );
    }

    // Check duplicate solve (team-level in competition, user-level in practice)
    if (teamId) {
      const { data: existingTeamSolve } = await supabase
        .from('solves')
        .select('id')
        .eq('team_id', teamId)
        .eq('challenge_id', challengeId)
        .maybeSingle();

      if (existingTeamSolve) {
        return NextResponse.json({
          success: false,
          alreadySolved: true,
          message: 'Your team has already solved this challenge.',
        });
      }
    } else {
      // Solo mode: check per-user solve
      const { data: existingUserSolve } = await supabase
        .from('solves')
        .select('id')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .maybeSingle();

      if (existingUserSolve) {
        return NextResponse.json({
          success: false,
          alreadySolved: true,
          message: 'You have already solved this challenge.',
        });
      }
    }

    const cleanSubmitted = flag.trim();
    const cleanTrue = challenge.flag.trim();
    const isCorrect = safeCompare(cleanSubmitted, cleanTrue);

    // Log every submission attempt
    await supabase.from('submission_logs').insert({
      user_id: user.id,
      team_id: teamId,
      challenge_id: challengeId,
      submitted_flag: cleanSubmitted,
      is_correct: isCorrect,
    });

    if (isCorrect) {
      // Check if this is the first solve (First Blood)
      const { count: priorSolves } = await supabase
        .from('solves')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId);

      const isFirstBlood = (priorSolves ?? 0) === 0;

      // Insert solve record
      const { error: insertError } = await supabase.from('solves').insert({
        team_id: teamId,
        user_id: user.id,
        challenge_id: challengeId,
        points: challenge.points,
      });

      if (insertError) throw insertError;

      // If first blood, update challenge record
      if (isFirstBlood) {
        await supabase
          .from('challenges')
          .update({
            first_blood_user_id: user.id,
            first_blood_team_id: teamId,
            first_blood_at: new Date().toISOString(),
          })
          .eq('id', challengeId);
      }

      return NextResponse.json({
        success: true,
        points: challenge.points,
        isFirstBlood,
        message: isFirstBlood
          ? `🩸 First Blood! +${challenge.points} points!`
          : `Correct! +${challenge.points} points.`,
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
