import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { method, path, headers, body } = await request.json();

    if (!method || !path) {
      return Response.json(
        { error: 'method and path are required' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const targetUrl = new URL(path, apiUrl).toString();

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (method !== 'GET' && method !== 'HEAD' && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    let responseBody: unknown;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return Response.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
    });
  } catch (error) {
    return Response.json(
      {
        status: 500,
        statusText: 'Internal Server Error',
        body: { error: error instanceof Error ? error.message : 'Request failed' },
      },
      { status: 500 }
    );
  }
}
