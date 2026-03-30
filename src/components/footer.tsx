import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-gray-50 dark:bg-gray-950 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; 2026 FakeMyRun. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="/how-to-upload"
            className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            How To Upload
          </Link>
        </div>
      </div>
    </footer>
  );
}
