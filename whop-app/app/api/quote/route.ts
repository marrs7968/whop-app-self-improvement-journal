import { NextRequest, NextResponse } from 'next/server';

interface ZenQuote {
  q?: string;
  a?: string;
}

const FALLBACK_QUOTES: Array<{ quote: string; author: string }> = [
  { quote: 'Small steps every day lead to big results.', author: 'Unknown' },
  { quote: 'Discipline is choosing what you want most over what you want now.', author: 'Abraham Lincoln' },
  { quote: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { quote: 'Progress, not perfection.', author: 'Unknown' },
];

function weekHash(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekStartISO = searchParams.get('weekStartISO') || '';
  const hash = weekHash(weekStartISO || 'default-week');

  try {
    const response = await fetch('https://zenquotes.io/api/quotes', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`ZenQuotes request failed with status ${response.status}`);
    }

    const data = (await response.json()) as ZenQuote[];
    const validQuotes = Array.isArray(data)
      ? data.filter((entry) => entry?.q && entry?.a)
      : [];

    if (validQuotes.length === 0) {
      throw new Error('ZenQuotes returned empty quote list');
    }

    const selected = validQuotes[hash % validQuotes.length];
    return NextResponse.json({
      quote: String(selected.q),
      author: String(selected.a),
    });
  } catch (error) {
    console.error('Failed to fetch ZenQuotes quote:', error);
    const fallback = FALLBACK_QUOTES[hash % FALLBACK_QUOTES.length];
    return NextResponse.json(fallback);
  }
}
