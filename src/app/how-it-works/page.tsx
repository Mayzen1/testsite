import Link from "next/link";
import { Header } from "@/components/header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How FakeMyRide Works",
  description: "Learn how FakeMyRide creates realistic fake cycling routes with GPX files.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 dark:text-white">How FakeMyRide Works</h1>

        <div className="prose dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold dark:text-white">Route Creation</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              FakeMyRide offers four ways to create routes:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Manual Drawing:</strong> Click on the map to place waypoints. Each segment
                is automatically snapped to real cycling roads using Mapbox Directions API.
              </li>
              <li>
                <strong>Heart Shape:</strong> Click on the map to generate a heart-shaped route
                snapped to roads around that location.
              </li>
              <li>
                <strong>Circle Shape:</strong> Generate a circular loop centered on your click point.
              </li>
              <li>
                <strong>Random Loop:</strong> Inspired by Garmin suggested routes. Select a start
                point and target distance (5-100 km), and the engine creates a realistic loop
                that returns to the start.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Cycling Data Generation</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              FakeMyRide generates complete GPX files with Garmin-compatible cycling data:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Precise coordinates:</strong> Every point snapped to real-world cycling roads.
              </li>
              <li>
                <strong>Elevation data:</strong> Queried from Mapbox terrain DEM for realistic profiles.
              </li>
              <li>
                <strong>Realistic timestamps:</strong> Speed varies with elevation, fatigue, intersections,
                surges, warmup, and drafting effects.
              </li>
              <li>
                <strong>Power data:</strong> Computed from FTP with gradient-based variation, intersection
                coasting, and surge spikes. Compatible with Strava power analysis.
              </li>
              <li>
                <strong>Cadence data:</strong> Varies with gradient (grinding uphill, spinning downhill),
                with intersection drops and surge bursts.
              </li>
              <li>
                <strong>Heart rate:</strong> Responds to effort with smoothed lag, fatigue progression,
                and natural jitter.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Bike Types</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Choose from four bike types, each with optimized default speed and cadence:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <li><strong>Road Bike:</strong> 28 km/h avg, 90 rpm cadence</li>
              <li><strong>Gravel / CX:</strong> 22 km/h avg, 80 rpm cadence</li>
              <li><strong>Mountain Bike:</strong> 18 km/h avg, 75 rpm cadence</li>
              <li><strong>Time Trial / Triathlon:</strong> 35 km/h avg, 95 rpm cadence</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Token System</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Each GPX download costs <strong>1 token</strong>. You start with
              <strong> 10 free tokens</strong>. Get more anytime via the header button.
              Tokens are stored locally in your browser &mdash; no account required.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Privacy</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              All route generation and GPX creation happens locally in your browser. No route
              data is stored on any server. The only external calls are to Mapbox for road-snapping
              and elevation data.
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
