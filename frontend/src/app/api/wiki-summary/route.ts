import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const suburb = searchParams.get("suburb");
  const state = searchParams.get("state");

  if (!suburb) {
    return NextResponse.json({ error: "Suburb is required" }, { status: 400 });
  }

  let title = suburb;
  if (state) {
    title = `${suburb}, ${state}`;
  }

  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  try {
    const response = await fetch(wikiUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Wikipedia fetch failed" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
