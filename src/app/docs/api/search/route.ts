import { searchDocs } from '@/lib/docs-search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query.trim()) {
    return Response.json({ results: [] });
  }

  try {
    const results = await searchDocs(query);
    return Response.json({ results });
  } catch (error) {
    return Response.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    );
  }
}
