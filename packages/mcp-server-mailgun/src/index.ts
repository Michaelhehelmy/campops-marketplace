import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import formData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(formData);
let mg: any = null;
if (process.env.MAILGUN_API_KEY) {
  mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY });
}

const server = new Server(
  {
    name: 'mcp-server-mailgun',
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
        name: 'send_email',
        description: 'Send an email using Mailgun.',
        inputSchema: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            subject: { type: 'string' },
            text: { type: 'string' },
          },
          required: ['from', 'to', 'subject', 'text'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'send_email') {
    if (!mg) {
      return {
        content: [{ type: 'text', text: 'MAILGUN_API_KEY environment variable is missing.' }],
        isError: true,
      };
    }

    const { from, to, subject, text } = request.params.arguments as any;
    const domain = process.env.MAILGUN_DOMAIN;

    if (!domain) {
      return {
        content: [{ type: 'text', text: 'MAILGUN_DOMAIN environment variable is missing.' }],
        isError: true,
      };
    }

    try {
      const msg = await mg.messages.create(domain, {
        from,
        to: [to],
        subject,
        text,
      });

      return {
        content: [{ type: 'text', text: `Email sent successfully. Message ID: ${msg.id}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error sending email: ${error.message}` }],
        isError: true,
      };
    }
  }

  throw new Error('Unknown tool');
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Mailgun MCP server running on stdio');
}

run().catch(console.error);
