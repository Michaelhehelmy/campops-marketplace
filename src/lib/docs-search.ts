import lunr from 'lunr';
import { getAllDocs, getDoc, type DocMeta } from './docs';

let searchIndex: lunr.Index | null = null;
let documents: Map<string, DocMeta & { excerpt: string }> = new Map();
let buildPromise: Promise<void> | null = null;

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~#>`\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function buildIndex(): Promise<void> {
  if (buildPromise) return buildPromise;

  buildPromise = (async () => {
    const docs = await getAllDocs();
    const idx = lunr(function () {
      this.ref('slug');
      this.field('title', { boost: 10 });
      this.field('content');
      this.field('category', { boost: 3 });

      docs.forEach(async (doc) => {
        const fullDoc = await getDoc(doc.slug);
        const content = fullDoc ? stripMarkdown(fullDoc.content).slice(0, 5000) : '';
        const excerpt = content.slice(0, 300);

        documents.set(doc.slug, { ...doc, excerpt });
        this.add({
          slug: doc.slug,
          title: doc.title,
          content,
          category: doc.category || '',
        });
      });
    });

    searchIndex = idx;
  })();

  return buildPromise;
}

export interface SearchResult {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  excerpt: string;
  score: number;
}

export async function searchDocs(query: string): Promise<SearchResult[]> {
  if (!searchIndex) await buildIndex();

  if (!query.trim()) return [];

  const results = searchIndex!.search(query);
  return results.slice(0, 20).map((result) => {
    const doc = documents.get(result.ref);
    return {
      slug: result.ref,
      title: doc?.title || result.ref,
      description: doc?.description,
      category: doc?.category,
      excerpt: doc?.excerpt || '',
      score: result.score || 0,
    };
  });
}

export async function getSearchIndex(): Promise<lunr.Index | null> {
  if (!searchIndex) await buildIndex();
  return searchIndex;
}
