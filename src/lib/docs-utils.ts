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
