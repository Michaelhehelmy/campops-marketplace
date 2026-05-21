export default function PageTemplate({ page }: any) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{page?.title}</h1>
      <div className="prose mt-6" dangerouslySetInnerHTML={{ __html: page?.content || '' }} />
    </div>
  );
}
