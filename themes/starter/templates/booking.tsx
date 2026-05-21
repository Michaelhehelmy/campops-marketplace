export default function BookingTemplate({ listing, availableDates }: any) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Book: {listing?.title}</h1>
      <p className="text-gray-600">Select your dates below.</p>
    </div>
  );
}
