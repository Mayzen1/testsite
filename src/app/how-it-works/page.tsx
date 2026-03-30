import Link from "next/link";
import { Header } from "@/components/header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How FakeMyRun Works",
  description: "Learn how FakeMyRun creates realistic fake running routes with GPX files.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 dark:text-white">How FakeMyRun Works</h1>

        <div className="prose dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold dark:text-white">Route Creation</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              FakeMyRun offers three ways to create routes:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Manual Drawing:</strong> Click on the map to place waypoints. Each segment
                is automatically snapped to real roads and paths using mapping APIs for a realistic trace.
              </li>
              <li>
                <strong>Heart Shape:</strong> Click once on the map to set the center, and a
                heart-shaped route is generated and snapped to roads around that location.
              </li>
              <li>
                <strong>Circle Shape:</strong> Same as heart, but generates a circular loop centered
                on your click point.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">GPX Generation Technology</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Once your route is drawn, FakeMyRun generates a complete GPX file with:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Precise coordinates:</strong> Every point on the route includes latitude
                and longitude snapped to real-world roads.
              </li>
              <li>
                <strong>Elevation data:</strong> Elevation is queried from terrain models for each
                point. A realistic fallback is used when terrain data is unavailable.
              </li>
              <li>
                <strong>Realistic timestamps:</strong> Time between each point is calculated based
                on your chosen pace, with natural variations for uphills, downhills, fatigue,
                and micro-jitter.
              </li>
              <li>
                <strong>Optional heart rate:</strong> When enabled, heart rate data is simulated
                with variations based on effort, elevation, and fatigue.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Token System</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Each GPX file download costs <strong>1 token</strong>. You start with
              <strong> 10 free tokens</strong>. You can get more free tokens at any time
              by clicking &ldquo;Get Free Tokens&rdquo; in the header.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Tokens are stored locally in your browser. This means:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <li>No account or login is required.</li>
              <li>
                Clearing your browser data will reset your tokens.
              </li>
              <li>
                Tokens are device-specific &mdash; they don&rsquo;t transfer between browsers automatically.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Email Linking</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              You can optionally link an email to your tokens using the &ldquo;Link Email&rdquo;
              button. This allows you to recover your tokens on a new device or after clearing
              browser data. The email serves as a recovery key &mdash; not a full account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Privacy</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              All route generation and GPX creation happens locally in your browser. No route
              data is stored on our servers. The only external calls are to the mapping service
              for road-snapping and elevation data.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium"
          >
            &larr; Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
