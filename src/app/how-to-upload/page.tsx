import Link from "next/link";
import { Header } from "@/components/header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Upload GPX Files",
  description: "Learn how to upload your generated cycling GPX files to Strava, Garmin, and other platforms.",
};

export default function HowToUploadPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 dark:text-white">How to Upload GPX Files</h1>

        <div className="prose dark:prose-invert max-w-none space-y-8">
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            After downloading your GPX file from FakeMyRide, follow these steps to
            import it into your cycling platform.
          </p>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Strava</h2>
            <ol className="list-decimal pl-6 mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <li>Go to strava.com and click the &ldquo;+&rdquo; button</li>
              <li>Select &ldquo;Upload activity&rdquo; &rarr; &ldquo;File&rdquo; tab</li>
              <li>Drag and drop your .gpx file or click &ldquo;Choose file&rdquo;</li>
              <li>Verify the activity type is set to &ldquo;Ride&rdquo;</li>
              <li>Check that speed, power, cadence, and heart rate data appear correctly</li>
              <li>Save the activity</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Garmin Connect</h2>
            <ol className="list-decimal pl-6 mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <li>Go to connect.garmin.com</li>
              <li>Click &ldquo;Import Data&rdquo; &rarr; &ldquo;Import Activities&rdquo;</li>
              <li>Upload your .gpx file</li>
              <li>Verify the activity details and save</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Wahoo / Other Platforms</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Most cycling platforms that support GPX import follow a similar pattern.
              Look for &ldquo;Import&rdquo;, &ldquo;Upload&rdquo;, or &ldquo;Add Activity&rdquo;
              in the app settings or menu. The GPX file uses Garmin-compatible extensions
              for maximum compatibility.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Data Verification</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              After uploading, verify that:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <li>The route trace matches your design</li>
              <li>Distance and elevation are plausible</li>
              <li>Speed profile shows natural variation</li>
              <li>Power and cadence data appear (if enabled)</li>
              <li>Heart rate data appears (if enabled)</li>
            </ul>
          </section>

          <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-400">
              Disclaimer
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 leading-relaxed">
              This service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;.
              FakeMyRide generates synthetic cycling data for personal, educational, and
              entertainment purposes. You are solely responsible for how you use the
              generated files. We are not affiliated with or endorsed by Strava, Garmin,
              Wahoo, or any other cycling platform.
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
