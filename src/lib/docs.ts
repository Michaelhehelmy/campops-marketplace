import { readFile, readdir } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const DOCS_ROOT = path.join(process.cwd(), 'docs');

export interface DocMeta {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  order?: number;
}

export interface DocContent {
  meta: DocMeta;
  content: string;
  headings: { level: number; text: string; id: string }[];
}

async function getAllMdFiles(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativeName = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('_') && entry.name !== 'node_modules') {
        files.push(...await getAllMdFiles(fullPath, relativeName));
      }
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      files.push(relativeName);
    }
  }

  return files;
}

export async function getAllDocs(): Promise<DocMeta[]> {
  const files = await getAllMdFiles(DOCS_ROOT);
  const docs: DocMeta[] = [];

  for (const file of files) {
    const fullPath = path.join(DOCS_ROOT, file);
    try {
      const content = await readFile(fullPath, 'utf-8');
      const { data } = matter(content);
      const slug = file.replace(/\.(md|mdx)$/, '');

      docs.push({
        slug,
        title: data.title || slug.split('/').pop() || slug,
        description: data.description,
        category: data.category || slug.split('/')[0],
        order: data.order || 999,
      });
    } catch {
      // skip unreadable files
    }
  }

  docs.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return (a.order ?? 999) - (b.order ?? 999);
  });

  return docs;
}

export async function getDoc(slug: string): Promise<DocContent | null> {
  for (const ext of ['.md', '.mdx']) {
    const fullPath = path.join(DOCS_ROOT, `${slug}${ext}`);
    try {
      const raw = await readFile(fullPath, 'utf-8');
      const { data, content } = matter(raw);
      const headingRegex = /^(#{1,6})\s+(.+)$/gm;
      const headings: { level: number; text: string; id: string }[] = [];
      let match;
      while ((match = headingRegex.exec(content)) !== null) {
        const text = match[2].replace(/[`*_~]/g, '');
        headings.push({
          level: match[1].length,
          text,
          id: text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
        });
      }

      return {
        meta: {
          slug,
          title: data.title || slug.split('/').pop() || slug,
          description: data.description,
          category: data.category,
          order: data.order,
        },
        content,
        headings,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    '': 'Overview',
    api: 'API Reference',
    architecture: 'Architecture',
    development: 'Development',
    'user-guides': 'User Guides',
    deployment: 'Deployment',
    plugins: 'Plugins',
  };
  return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
}
