import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl font-bold text-brand-500">404</div>
        <h2 className="text-xl font-semibold">Page Not Found</h2>
        <p className="text-sm text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-brand-600 hover:bg-brand-700 rounded-xl text-sm font-medium transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
