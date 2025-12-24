import { NextRequest, NextResponse } from 'next/server';

const API_VIDEO_KEY = process.env.API_VIDEO_KEY || 'NMThAQAWpVj5ltp4SYbGyFgJKVIrNQdVJ13WsID2JVh';

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
    
    // encoding.playable true ise video hazır
    const ready = data.encoding?.playable === true;
    
    return NextResponse.json({ 
      ready,
      status: data.encoding?.status || 'unknown'
    });
  } catch (error) {
    console.error('Video status error:', error);
    return NextResponse.json({ ready: false, error: 'Server error' });
  }
}