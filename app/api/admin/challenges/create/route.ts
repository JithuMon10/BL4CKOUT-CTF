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
    const {
      challengeId,
      title,
      category,
      difficulty,
      description,
      points,
      flag,
      file_url,
      author,
      is_visible,
      has_runtime,
      runtime_template,
      runtime_folder,
      runtime_timeout,
      runtime_memory,
      runtime_cpu,
      runtime_pids,
      runtime_port,
      runtime_protocol,
      dockerfile_override,
    } = body;

    if (!title || !category || !description || !flag) {
      return NextResponse.json({ success: false, message: 'Missing required challenge fields.' }, { status: 400 });
    }

    let targetId = challengeId;
    let inserted: any = null;

    if (!targetId) {
      // Insert new challenge into Supabase database
      const { data: dbInserted, error: dbError } = await supabase
        .from('challenges')
        .insert({
          title,
          category,
          difficulty: difficulty || 'Medium',
          description,
          points: Number(points) || 100,
          flag,
          file_url: file_url || null,
          author: author || 'Admin',
          is_visible: Boolean(is_visible),
          has_runtime: Boolean(has_runtime),
          runtime_template: runtime_template || 'nc',
          runtime_folder: runtime_folder || null,
          runtime_timeout: Number(runtime_timeout) || 30,
          runtime_memory: Number(runtime_memory) || 64,
          runtime_cpu: Number(runtime_cpu) || 0.1,
          runtime_pids: Number(runtime_pids) || 30,
          runtime_port: Number(runtime_port) || 1337,
          runtime_protocol: runtime_protocol || 'nc',
        })
        .select()
        .single();

      if (dbError || !dbInserted) {
        throw new Error(dbError?.message || 'Failed to insert challenge into database.');
      }
      inserted = dbInserted;
      targetId = dbInserted.id;
    } else {
      // Fetch existing record
      const { data: dbExisting } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();
      inserted = dbExisting || { id: targetId, title, category };
    }

    // If runtime enabled, generate self-contained folder & Docker image on runtime microservice
    if (has_runtime) {
      try {
        await runtimeClient.createChallengeFolder({
          challengeId: targetId,
          folderName: runtime_folder || inserted.id,
          title: inserted.title,
          category: inserted.category.toLowerCase(),
          template: runtime_template || 'nc',
          internalPort: Number(runtime_port) || (runtime_template === 'http' || runtime_template === 'php' ? 80 : runtime_template === 'flask' ? 5000 : 1337),
          protocol: runtime_protocol || (runtime_template === 'http' || runtime_template === 'flask' || runtime_template === 'php' ? 'http' : 'nc'),
          memoryMb: Number(runtime_memory) || 64,
          cpuQuota: Number(runtime_cpu) || 0.1,
          pidsLimit: Number(runtime_pids) || 30,
          timeoutMins: Number(runtime_timeout) || 30,
          dockerfileOverride: dockerfile_override || undefined,
          flag: flag || inserted.flag,
        });
      } catch (runtimeErr: any) {
        console.error('[Admin Create Challenge] Runtime folder generation warning:', runtimeErr.message);
        // Note: Database record is saved, runtime folder error logged cleanly
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Challenge created successfully.',
      data: inserted,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Server error.' }, { status: 500 });
  }
}
