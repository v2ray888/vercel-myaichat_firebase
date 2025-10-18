import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Image hosting is not configured.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;

    if (!image) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }
    
    const uploadFormData = new FormData();
    uploadFormData.append('image', image);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: uploadFormData,
    });

    const result = await response.json();

    if (!response.ok || !result.data || !result.data.url) {
      console.error('ImgBB upload failed:', result);
      return NextResponse.json({ error: 'Failed to upload image.', details: result.error?.message || 'Unknown error' }, { status: 500 });
    }

    return NextResponse.json({ imageUrl: result.data.url });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during image upload.' }, { status: 500 });
  }
}
