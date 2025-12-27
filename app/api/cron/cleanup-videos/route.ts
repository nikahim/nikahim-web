import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_VIDEO_KEY = process.env.API_VIDEO_KEY || 'qQ8VlRltY7bJQX3PEIM5VgbFRNgoAsE8nKwb97LNldv';

// Service role client (RLS bypass)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  // Vercel Cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Development'ta veya CRON_SECRET yoksa devam et
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    const deletedVideos: string[] = [];
    const errors: string[] = [];

    // 1. Nikah tarihi + 7 gün geçmiş eventleri bul
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

    // Event date'i cutoff'tan önce olan eventleri bul
    const { data: expiredEvents, error: eventsError } = await supabase
      .from('events')
      .select('id, event_date')
      .lt('event_date', cutoffDate);

    if (eventsError) {
      console.error('Events fetch error:', eventsError);
      return NextResponse.json({ error: 'Events fetch failed', details: eventsError }, { status: 500 });
    }

    if (!expiredEvents || expiredEvents.length === 0) {
      return NextResponse.json({ 
        message: 'No expired events found',
        cutoffDate,
        deletedCount: 0 
      });
    }

    // 2. Bu eventlere ait videoları bul
    const expiredEventIds = expiredEvents.map(e => e.id);
    
    const { data: videosToDelete, error: videosError } = await supabase
      .from('video_messages')
      .select('id, video_id, event_id')
      .in('event_id', expiredEventIds);

    if (videosError) {
      console.error('Videos fetch error:', videosError);
      return NextResponse.json({ error: 'Videos fetch failed', details: videosError }, { status: 500 });
    }

    if (!videosToDelete || videosToDelete.length === 0) {
      return NextResponse.json({ 
        message: 'No videos to delete',
        expiredEventsCount: expiredEvents.length,
        cutoffDate,
        deletedCount: 0 
      });
    }

    // 3. Her videoyu api.video'dan sil
    for (const video of videosToDelete) {
      try {
        const deleteResponse = await fetch(`https://ws.api.video/videos/${video.video_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${API_VIDEO_KEY}`,
          },
        });

        if (deleteResponse.ok || deleteResponse.status === 404) {
          // 404 = zaten silinmiş, OK sayılır
          deletedVideos.push(video.video_id);
        } else {
          const errorText = await deleteResponse.text();
          errors.push(`Failed to delete ${video.video_id}: ${errorText}`);
        }
      } catch (err) {
        errors.push(`Error deleting ${video.video_id}: ${err}`);
      }
    }

    // 4. Supabase'den sil
    const { error: dbDeleteError } = await supabase
      .from('video_messages')
      .delete()
      .in('event_id', expiredEventIds);

    if (dbDeleteError) {
      console.error('DB delete error:', dbDeleteError);
      errors.push(`DB delete error: ${dbDeleteError.message}`);
    }

    // 5. Log sonuçları
    console.log(`Cleanup completed: ${deletedVideos.length} videos deleted from ${expiredEvents.length} events`);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      cutoffDate,
      expiredEventsCount: expiredEvents.length,
      deletedCount: deletedVideos.length,
      deletedVideos,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    });

  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json({ 
      error: 'Cleanup failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}