export default function ManageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center" role="status" aria-live="polite">
        <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading property dashboard...</p>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
