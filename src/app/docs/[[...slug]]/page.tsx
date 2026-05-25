import { notFound } from 'next/navigation';
import { getDoc } from '@/lib/docs';
import { MdxRenderer } from '../_components/MdxRenderer';

export async function generateStaticParams() {
  return [];
}

export default async function DocPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  const slugPath = params.slug?.join('/') || 'index';
  const doc = await getDoc(slugPath);

  if (!doc) {
    notFound();
  }

  return (
    <article>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {doc.meta.title}
        </h1>
        {doc.meta.description && (
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            {doc.meta.description}
          </p>
        )}
        {doc.meta.category && (
          <div className="mt-3">
            <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {doc.meta.category}
            </span>
          </div>
        )}
      </header>

      <div className="prose dark:prose-invert prose-blue max-w-none prose-code:before:content-none prose-code:after:content-none">
        <MdxRenderer content={doc.content} />
      </div>

      <footer className="mt-12 pt-6 border-t dark:border-gray-800">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Path: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{slugPath}</code></span>
          <a
            href={`https://github.com/michaelhehelmy/campops-marketplace/edit/main/docs/${slugPath}.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Edit on GitHub
          </a>
        </div>
      </footer>
    </article>
  );
}
