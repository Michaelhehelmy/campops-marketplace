import { CodeBlock } from './CodeBlock';
import { Callout } from './Callout';

interface MdxRendererProps {
  content: string;
}

function extractCodeBlocks(content: string): string[] {
  const blocks: string[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1] || 'text');
    blocks.push(match[2]);
  }
  return blocks;
}

function renderInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');
}

function renderHeading(line: string, level: number): string {
  const text = line.replace(/^#{1,6}\s+/, '').trim();
  const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  const size = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
  return `<h${level} id="${id}" class="group ${size[level-1] || 'text-lg'} font-bold text-gray-900 dark:text-white mt-8 mb-4 scroll-mt-24">
    <a href="#${id}" class="no-underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">${text}</a>
  </h${level}>`;
}

function renderListBlock(lines: string[], startIdx: number): string {
  let html = '<ul class="list-disc list-inside space-y-1 my-4 text-gray-700 dark:text-gray-300">';
  let i = startIdx;
  while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
    html += `<li>${renderInlineMarkdown(lines[i].slice(2).trim())}</li>`;
    i++;
  }
  html += '</ul>';
  return html;
}

function renderOrderedListBlock(lines: string[], startIdx: number): string {
  let html = '<ol class="list-decimal list-inside space-y-1 my-4 text-gray-700 dark:text-gray-300">';
  let i = startIdx;
  while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
    html += `<li>${renderInlineMarkdown(lines[i].replace(/^\d+\.\s+/, '').trim())}</li>`;
    i++;
  }
  html += '</ol>';
  return html;
}

function renderTable(lines: string[], startIdx: number): string {
  let html = '<div class="overflow-x-auto my-6"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">';
  let i = startIdx;

  // Header row
  if (i < lines.length && lines[i].trim()) {
    html += '<thead><tr>';
    const cells = lines[i].split('|').filter(c => c.trim());
    for (const cell of cells) {
      html += `<th class="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">${cell.trim()}</th>`;
    }
    html += '</tr></thead>';
    i++;
  }

  // Separator row
  i++;

  // Body rows
  html += '<tbody class="divide-y divide-gray-200 dark:divide-gray-700">';
  while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
    html += '<tr>';
    const cells = lines[i].split('|').filter(c => c.trim());
    for (const cell of cells) {
      html += `<td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">${renderInlineMarkdown(cell.trim())}</td>`;
    }
    html += '</tr>';
    i++;
  }
  html += '</tbody></table></div>';

  return html;
}

export function MdxRenderer({ content }: MdxRendererProps) {
  const lines = content.split('\n');
  const elements: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join('\n');
      elements.push(`<div class="not-prose"><div class="relative my-6 rounded-lg overflow-hidden border dark:border-gray-700">
        <div class="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
          <span class="text-xs font-mono text-gray-500 dark:text-gray-400">${lang || 'code'}</span>
        </div>
        <pre class="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 overflow-x-auto text-sm leading-relaxed"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
      </div></div>`);
      i++;
      continue;
    }

    // Callouts
    if (line.startsWith('> **')) {
      const typeMatch = line.match(/^>\s+\*\*(INFO|WARNING|TIP|DANGER)\*\*/);
      const type = typeMatch ? typeMatch[1].toLowerCase() : 'info';
      const textLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        textLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const text = textLines.join('\n');
      const cleaned = text.replace(/^\*\*(INFO|WARNING|TIP|DANGER)\*\*\s*/i, '');
      elements.push(`<div class="not-prose"><div class="callout callout-${type} my-6">${renderInlineMarkdown(cleaned)}</div></div>`);
      continue;
    }

    // Regular callouts (no type prefix)
    if (line.startsWith('> ')) {
      const textLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        textLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(`<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 text-gray-600 dark:text-gray-400 italic">${renderInlineMarkdown(textLines.join('<br/>'))}</blockquote>`);
      continue;
    }

    // Headings
    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length || 1;
      elements.push(renderHeading(line, level));
      i++;
      continue;
    }

    // Tables
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      elements.push(renderTable(lines, i));
      const rows = lines.slice(i).filter(l => l.includes('|'));
      i += rows.length;
      continue;
    }

    // Unordered lists
    if (line.match(/^[-*]\s/)) {
      elements.push(renderListBlock(lines, i));
      const items = lines.slice(i).filter(l => l.match(/^[-*]\s/));
      i += items.length;
      continue;
    }

    // Ordered lists
    if (/^\d+\.\s/.test(line)) {
      elements.push(renderOrderedListBlock(lines, i));
      const items = lines.slice(i).filter(l => /^\d+\.\s/.test(l));
      i += items.length;
      continue;
    }

    // Horizontal rules
    if (/^---$/.test(line.trim())) {
      elements.push('<hr class="my-8 border-gray-200 dark:border-gray-700" />');
      i++;
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular paragraphs
    const paragraphLines: string[] = [];
    while (i < lines.length && line.trim() && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('```') && !line.match(/^[-*]\s/) && !/^\d+\.\s/.test(line) && !line.includes('|') && line.trim()) {
      paragraphLines.push(lines[i]);
      i++;
      if (i >= lines.length || !lines[i].trim() || lines[i].startsWith('#')) break;
    }
    elements.push(`<p class="my-4 text-gray-700 dark:text-gray-300 leading-relaxed">${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
  }

  return (
    <div dangerouslySetInnerHTML={{ __html: elements.join('\n') }} />
  );
}
