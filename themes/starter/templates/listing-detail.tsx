export default function ListingDetailTemplate({ listing }: any) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{listing?.title}</h1>
      <p className="text-gray-600 mt-4">{listing?.description}</p>
    </div>
  );
}
