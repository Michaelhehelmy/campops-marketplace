import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'better-auth-mcp',
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
        name: 'get_auth_status',
        description: 'Get the current authentication status or perform a Better Auth check.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'get_auth_status') {
    return {
      content: [
        {
          type: 'text',
          text: 'Better Auth MCP is running and active. Integration with actual auth db required for specific queries.',
        },
      ],
    };
  }
  throw new Error('Unknown tool');
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Better Auth MCP server running on stdio');
}

run().catch(console.error);
