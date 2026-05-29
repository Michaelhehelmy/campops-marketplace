export default function BookLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center" role="status" aria-live="polite">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading...</p>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
