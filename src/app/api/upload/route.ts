import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return NextResponse.json({ error: 'No filename or image body provided.' }, { status: 400 });
  }

  // ⚠️ The below code is for App Router Route Handlers only
  const blob = await put(filename, request.body, {
    access: 'public',
  });

  // Here's the returned object from Vercel Blob:
  // {
  //   url: 'https://pfhdkimscj5vrp4i.public.blob.vercel-storage.com/foo-DsB5V2yX2gJBEB1k3a3pT8wBGA9bfa.txt',
  //   pathname: 'foo.txt',
  //   contentType: 'text/plain',
  //   contentDisposition: 'attachment; filename="foo.txt"'
  // }

  return NextResponse.json(blob);
}
