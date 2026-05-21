export default function HomepageTemplate({ listings, categories }: any) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Welcome</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings?.map((listing: any) => (
          <div key={listing.id} className="border rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-semibold">{listing.title}</h2>
            <p className="text-gray-600 mt-2">{listing.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
