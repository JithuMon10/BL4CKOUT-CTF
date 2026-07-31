import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File;

    const filesToUpload = files.length > 0 ? files : singleFile ? [singleFile] : [];

    if (filesToUpload.length === 0) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of filesToUpload) {
      const fileBuffer = await file.arrayBuffer();
      const sanitizedFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // Upload to Supabase Storage 'challenge-files' bucket
      const { error: uploadError } = await supabase.storage
        .from('challenge-files')
        .upload(sanitizedFileName, fileBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase Storage upload error:', uploadError);
        return NextResponse.json({ success: false, message: uploadError.message }, { status: 500 });
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('challenge-files')
        .getPublicUrl(sanitizedFileName);

      uploadedUrls.push(publicUrlData.publicUrl);
    }

    return NextResponse.json({
      success: true,
      file_url: uploadedUrls.join(', '),
      file_urls: uploadedUrls,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server upload error' }, { status: 500 });
  }
}
