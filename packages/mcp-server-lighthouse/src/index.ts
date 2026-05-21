import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const server = new Server(
  {
    name: 'mcp-server-lighthouse',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'run_lighthouse_audit',
        description: 'Run a Lighthouse performance audit on a given URL.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The URL to audit.' },
          },
          required: ['url'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'run_lighthouse_audit') {
    const url = request.params.arguments?.url as string;
    if (!url) {
      throw new Error("Missing 'url' parameter");
    }

    try {
      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
      const options = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: ['performance'],
        port: chrome.port,
      };
      const runnerResult = await lighthouse(url, options as any);

      await chrome.kill();

      if (!runnerResult) {
        throw new Error('Failed to get runner result from lighthouse');
      }

      const score = runnerResult.lhr.categories.performance.score;
      const displayScore = score !== null ? score * 100 : 'N/A';

      return {
        content: [
          { type: 'text', text: `Lighthouse performance score for ${url}: ${displayScore}` },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error running lighthouse: ${error.message}` }],
        isError: true,
      };
    }
  }

  throw new Error('Unknown tool');
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Lighthouse MCP server running on stdio');
}

run().catch(console.error);
