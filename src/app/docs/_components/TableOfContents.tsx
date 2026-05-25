interface TableOfContentsProps {
  headings: { level: number; text: string; id: string }[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length === 0) return null;

  return (
    <nav className="py-4 px-3" aria-label="On this page">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-2">
        On this page
      </h3>
      <ul className="space-y-1">
        {headings
          .filter((h) => h.level <= 3)
          .map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={`block px-2 py-1 text-sm rounded-md transition-colors hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  heading.level === 2
                    ? 'text-gray-700 dark:text-gray-300 font-medium'
                    : heading.level === 3
                    ? 'text-gray-500 dark:text-gray-400 ml-4'
                    : ''
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
      </ul>
    </nav>
  );
}
