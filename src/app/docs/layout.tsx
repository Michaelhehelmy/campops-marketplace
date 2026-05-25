import { getAllDocs } from '@/lib/docs';
import { DocsSidebar } from './_components/DocsSidebar';
import { DocSearch } from './_components/DocSearch';
import { ThemeToggle } from './_components/ThemeToggle';
import Link from 'next/link';

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allDocs = await getAllDocs();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b dark:border-gray-800">
        <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <Link
              href="/docs"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              SinaiCamps Docs
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/docs/api/authentication" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                API
              </Link>
              <Link href="/docs/architecture/overview" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Architecture
              </Link>
              <Link href="/docs/development/plugins" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Development
              </Link>
              <Link href="/docs/deployment/installation" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Deployment
              </Link>
              <Link href="/docs/plugins" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Plugins
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <DocSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex pt-16 max-w-7xl mx-auto">
        <aside className="w-64 hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <DocsSidebar docs={allDocs} />
        </aside>

        <main className="flex-1 lg:ml-64 p-6 lg:p-8 xl:p-10 min-h-[calc(100vh-4rem)]">
          <div className="max-w-4xl mx-auto prose dark:prose-invert prose-blue max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
