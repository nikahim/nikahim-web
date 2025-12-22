import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const roundPrice = (price: number): number => {
  return Math.round(price / 10) * 10;
};

export async function GET() {
  try {
    const response = await fetch('https://finans.truncgil.com/v4/today.json', {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error('API error: ' + response.status);
    }
    
    const data = await response.json();
    
    const getPrice = (key: string): number => {
      if (!data[key]) return 0;
      const item = data[key];
      const price = item.Selling || item.selling || 0;
      return roundPrice(Number(price));
    };
    
    const ceyrekPrice = getPrice('CEYREKALTIN');
    const gramPrice = roundPrice(ceyrekPrice / 1.6);
    
    const prices = {
      gram: gramPrice,
      ceyrek: ceyrekPrice,
      yarim: getPrice('YARIMALTIN'),
      tam: getPrice('TAMALTIN') || getPrice('CUMHURIYETALTINI'),
      ata: getPrice('ATAALTIN'),
    };
    
    // Doğru kolon adlarıyla güncelle
    for (const [type, price] of Object.entries(prices)) {
      if (price > 0) {
        await supabase
          .from('gold_prices')
          .update({ 
            price_tl: price,
            fetched_at: new Date().toISOString()
          })
          .eq('gold_type', type);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      prices,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Gold price update error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error)
    }, { status: 500 });
  }
}
