import Link from "next/link";
import { Header } from "@/components/header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Upload GPX Files",
  description: "Learn how to upload your generated GPX files to Strava, Garmin, and other fitness platforms.",
};

export default function HowToUploadPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 dark:text-white">How to Upload GPX Files</h1>

        <div className="prose dark:prose-invert max-w-none space-y-8">
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            After downloading your GPX file from FakeMyRun, follow these general steps to
            import it into your favorite fitness platform.
          </p>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">General Upload Steps</h2>
            <ol className="list-decimal pl-6 mt-3 space-y-4 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Find the Upload / Import section:</strong> Log in to your fitness platform
                (Strava, Garmin Connect, Nike Run Club, etc.) and locate the upload or import
                activity feature. On Strava, this is typically found under the &ldquo;+&rdquo; icon
                &rarr; &ldquo;Upload activity&rdquo;.
              </li>
              <li>
                <strong>Select your GPX file:</strong> Click &ldquo;Choose file&rdquo; or drag and
                drop the .gpx file you downloaded from FakeMyRun.
              </li>
              <li>
                <strong>Fill in activity details:</strong> Set the activity name, type
                (Running, Cycling, etc.), description, date/time, and privacy settings as needed.
              </li>
              <li>
                <strong>Save the activity:</strong> Click &ldquo;Save&rdquo; or
                &ldquo;Upload&rdquo; to finalize the import.
              </li>
              <li>
                <strong>Verify the activity:</strong> After uploading, check that:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>The route trace matches what you designed.</li>
                  <li>Distance and elevation look plausible.</li>
                  <li>The activity type is correctly set.</li>
                  <li>Pace and time data appear realistic.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold dark:text-white">Platform-Specific Tips</h2>
            <ul className="list-disc pl-6 mt-3 space-y-3 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Strava:</strong> Go to strava.com &rarr; &ldquo;+&rdquo; button &rarr;
                &ldquo;Upload activity&rdquo; &rarr; &ldquo;File&rdquo; tab. Strava accepts .gpx
                files directly.
              </li>
              <li>
                <strong>Garmin Connect:</strong> Go to connect.garmin.com &rarr;
                &ldquo;Import Data&rdquo; &rarr; &ldquo;Import Activities&rdquo;. Upload your .gpx file.
              </li>
              <li>
                <strong>Other platforms:</strong> Most fitness apps that support GPX import follow
                a similar pattern. Look for &ldquo;Import&rdquo;, &ldquo;Upload&rdquo;, or
                &ldquo;Add Activity&rdquo; in the app settings or menu.
              </li>
            </ul>
          </section>

          <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-400">
              Disclaimer
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 leading-relaxed">
              This service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;.
              FakeMyRun generates synthetic route data for personal, educational, and entertainment
              purposes. You are solely responsible for how you use the generated files.
              Please exercise your own judgment and understand the potential risks when uploading
              synthetic data to third-party services. We are not affiliated with or endorsed by
              Strava, Garmin, Nike, or any other fitness platform.
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
