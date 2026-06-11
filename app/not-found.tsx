import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center px-8">
      <p className="text-sm font-mono text-zinc-500 mb-4">ERROR 404</p>
      <h1 className="text-4xl font-bold tracking-tight mb-3">Page not found</h1>
      <p className="text-zinc-400 mb-8 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="bg-white text-black text-sm font-bold px-5 py-2 rounded-full hover:bg-zinc-200 transition-all"
      >
        Back to SalesOS
      </Link>
    </div>
  );
}
