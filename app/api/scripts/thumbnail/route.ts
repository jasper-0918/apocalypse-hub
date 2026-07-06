export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const BUCKET = 'script-thumbnails';
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

// POST: upload a script cover image (multipart form-data, field "file").
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Unsupported type. Use PNG, JPG, WebP, or GIF.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 3 MB).' }, { status: 400 });
  }

  const supabase = createServerClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${user.id}/${randomUUID()}.${ext}`;

  const doUpload = () =>
    supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: false });

  let { error } = await doUpload();

  // Self-heal: if the bucket doesn't exist yet, create it (public) and retry once.
  if (error) {
    await supabase.storage
      .createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: Object.keys(ALLOWED),
      })
      .catch(() => {});
    ({ error } = await doUpload());
  }

  if (error) {
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
