import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, data, eventId } = body;

    if (!template || !data) {
      return NextResponse.json({ error: 'Template ve data gerekli' }, { status: 400 });
    }

    // Query string oluştur
    const params = new URLSearchParams();
    params.set('template', template);
    Object.entries(data).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });

    // Base URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const renderUrl = `${baseUrl}/davetiye/render?${params.toString()}`;

    // Puppeteer ile render
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1080, height: 1920 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 15000 });

    // invitation-render div'ini bul ve screenshot al
    const element = await page.$('#invitation-render');
    let screenshot: Buffer;

    if (element) {
      screenshot = await element.screenshot({ type: 'png' }) as Buffer;
    } else {
      screenshot = await page.screenshot({ type: 'png' }) as Buffer;
    }

    await browser.close();

    // Eğer eventId varsa Supabase'e kaydet
    if (eventId) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://haeifluvvazdealsofle.supabase.co',
        process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      const fileName = `invitation_${eventId}_${template}.png`;
      await supabase.storage.from('invitation-finals').upload(fileName, screenshot, {
        contentType: 'image/png',
        upsert: true,
      });

      const { data: urlData } = supabase.storage.from('invitation-finals').getPublicUrl(fileName);

      // Event tablosunu güncelle
      await supabase.from('events').update({
        invitation_final_url: urlData.publicUrl
      }).eq('id', eventId);

      return NextResponse.json({
        success: true,
        url: urlData.publicUrl
      });
    }

    // EventId yoksa direkt PNG döndür
    return new NextResponse(new Uint8Array(screenshot), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="davetiye.png"',
      },
    });

  } catch (error) {
    console.error('Invitation render error:', error);
    return NextResponse.json({ error: 'Render hatası' }, { status: 500 });
  }
}
