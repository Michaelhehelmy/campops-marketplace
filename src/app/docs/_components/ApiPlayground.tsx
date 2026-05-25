'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Endpoint {
  path: string;
  methods: string[];
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  exampleRequest?: any;
  exampleResponse?: any;
}

export function ApiPlayground({ endpoint }: { endpoint: Endpoint }) {
  const [method, setMethod] = useState(endpoint.methods[0] || 'GET');
  const [path, setPath] = useState(endpoint.path);
  const [body, setBody] = useState(
    JSON.stringify(endpoint.exampleRequest || {}, null, 2)
  );
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParams, setShowParams] = useState(false);
  const [copied, setCopied] = useState(false);

  const [headers, setHeaders] = useState<Record<string, string>>({
    'Content-Type': 'application/json',
    Authorization: 'Bearer YOUR_TOKEN_HERE',
  });

  const copyCurl = useCallback(() => {
    let curl = `curl -X ${method} '${process.env.NEXT_PUBLIC_API_URL || 'https://sinaicamps.com'}${path}'`;
    curl += ` \\\n  -H 'Content-Type: application/json'`;
    if (headers.Authorization && headers.Authorization !== 'Bearer YOUR_TOKEN_HERE') {
      curl += ` \\\n  -H 'Authorization: ${headers.Authorization}'`;
    }
    if (method !== 'GET' && body) {
      curl += ` \\\n  -d '${body}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [method, path, headers, body]);

  async function sendRequest() {
    setLoading(true);
    setResponse('');
    setError(null);

    try {
      const res = await fetch('/docs/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          path,
          headers: Object.fromEntries(
            Object.entries(headers).filter(([_, v]) => v)
          ),
          body: method !== 'GET' ? JSON.parse(body) : undefined,
        }),
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden my-8 bg-gray-50 dark:bg-gray-800/50">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700 flex items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-2 py-1 rounded border text-xs font-mono font-semibold bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <code className="flex-1 text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
          {path}
        </code>
        <span className="text-xs text-gray-400 hidden sm:inline">{endpoint.description}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="p-4 border-r dark:border-gray-700 space-y-4">
          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div>
              <button
                onClick={() => setShowParams(!showParams)}
                className="flex items-center gap-1 text-xs font-semibold uppercase text-gray-500 mb-2"
              >
                Parameters
                {showParams ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showParams && (
                <div className="space-y-1 mb-3">
                  {endpoint.parameters.map((param) => (
                    <div key={param.name} className="flex items-center gap-2 text-xs">
                      <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {param.name}
                      </code>
                      <span className="text-gray-500">{param.type}</span>
                      {param.required && (
                        <span className="text-red-500 font-medium">required</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">
            Request Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={method === 'GET'}
            className="w-full h-48 p-3 text-xs font-mono bg-white dark:bg-gray-900 dark:text-gray-200 border dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase text-gray-500">
              Response
            </label>
            <div className="flex gap-2">
              <button
                onClick={copyCurl}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'cURL'}
              </button>
              <button
                onClick={sendRequest}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <pre className="w-full h-48 p-3 text-xs font-mono bg-white dark:bg-gray-900 dark:text-gray-200 border dark:border-gray-600 rounded overflow-auto focus:outline-none">
            {response || '// Click "Send" to test this endpoint'}
          </pre>
        </div>
      </div>
    </div>
  );
}
