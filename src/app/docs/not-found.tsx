import Link from 'next/link';

export default function DocsNotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Page Not Found</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        The documentation page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/docs"
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        Back to Docs Home
      </Link>
    </div>
  );
}
