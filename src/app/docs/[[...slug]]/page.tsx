import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Code2, Server, Users, ExternalLink } from 'lucide-react';
import { getDoc } from '@/lib/docs';
import { MdxRenderer } from '../_components/MdxRenderer';

const categories = [
  {
    title: 'API Reference',
    description: 'Authentication, marketplace, admin, and payments API docs',
    icon: Code2,
    href: '/docs/api/authentication',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    title: 'Architecture',
    description: 'System design, multi-tenancy, plugin lifecycle, security',
    icon: Server,
    href: '/docs/architecture/overview',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    title: 'User Guides',
    description: 'Role-based guides for masters, managers, staff, and guests',
    icon: Users,
    href: '/docs/user-guides/master-admin',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    title: 'Plugin Hub',
    description: 'Documentation for all 24 SinaiCamps plugins',
    icon: BookOpen,
    href: '/docs/plugins',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    title: 'Development',
    description: 'Plugin SDK, testing guide, best practices',
    icon: Code2,
    href: '/docs/development/plugins',
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
  {
    title: 'Deployment',
    description: 'Installation, configuration, production setup',
    icon: Server,
    href: '/docs/deployment/installation',
    color: 'text-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
];

function DocsHome() {
  return (
    <div>
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          SinaiCamps Documentation
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Everything you need to build, deploy, and manage your hospitality marketplace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {categories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="group block p-6 rounded-xl border dark:border-gray-700 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all"
          >
            <div className={`w-12 h-12 rounded-lg ${cat.bg} flex items-center justify-center mb-4`}>
              <cat.icon className={`w-6 h-6 ${cat.color}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {cat.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {cat.description}
            </p>
            <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Browse docs <ExternalLink className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>

      <div className="p-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border dark:border-blue-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Quick Start
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Get up and running in minutes:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
          <li>
            <Link href="/docs/deployment/installation" className="text-blue-600 dark:text-blue-400 hover:underline">Install & configure</Link>
            {' '}your marketplace
          </li>
          <li>
            <Link href="/docs/api/authentication" className="text-blue-600 dark:text-blue-400 hover:underline">Authenticate</Link>
            {' '}and get your API credentials
          </li>
          <li>
            <Link href="/docs/user-guides/property-manager" className="text-blue-600 dark:text-blue-400 hover:underline">Set up properties</Link>
            {' '}and manage listings
          </li>
          <li>
            <Link href="/docs/plugins" className="text-blue-600 dark:text-blue-400 hover:underline">Explore plugins</Link>
            {' '}for additional features
          </li>
        </ol>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return [];
}

export default async function DocPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  if (!params.slug || params.slug.length === 0) {
    return <DocsHome />;
  }

  const slugPath = params.slug.join('/');
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
