import { NextRequest, NextResponse } from 'next/server';

const API_VIDEO_KEY = process.env.API_VIDEO_KEY || 'qQ8VlRltY7bJQX3PEIM5VgbFRNgoAsE8nKwb97LNldv';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://ws.api.video/videos/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${API_VIDEO_KEY}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ ready: false });
    }

    const data = await response.json();
    
    console.log('api.video response:', JSON.stringify(data));
    
    // Video varsa ve mp4 linki varsa hazır demektir
    const ready = !!(data.assets?.mp4 || data.assets?.hls);
    
    return NextResponse.json({ 
      ready,
      status: data.encoding?.status || 'unknown',
      assets: data.assets
    });
  } catch (error) {
    console.error('Video status error:', error);
    return NextResponse.json({ ready: false, error: 'Server error' });
  }
}