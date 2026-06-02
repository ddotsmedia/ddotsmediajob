export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-bold text-navy-900">You're offline</h1>
      <p className="mt-2 max-w-md text-navy-700/60">
        It looks like you've lost connection. Reconnect to browse the latest jobs on DdotsMediaJobs.
      </p>
    </div>
  );
}
