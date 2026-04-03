import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MapPin, FileDown, Route } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Header />

      {/* Hero */}
      <section className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight dark:text-white">
                Create{" "}
                <span className="text-orange-500">Fake Cycling Routes</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Design custom, realistic cycling routes anywhere in the world.
                Generate GPX files with accurate elevation, speed, power, cadence,
                and heart rate data. Import them into Strava, Garmin Connect, or any fitness app.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-md font-medium hover:bg-orange-600 transition-colors"
                >
                  Create Your Route
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl bg-gray-100 dark:bg-gray-800">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1&controls=0"
                title="FakeMyRide Demo"
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              icon={<Route className="h-8 w-8 text-orange-500" />}
              title="Design Your Route"
              description="Draw a route manually, generate shapes, or create random loop routes. All paths snap to real roads for authenticity."
            />
            <StepCard
              step={2}
              icon={<MapPin className="h-8 w-8 text-orange-500" />}
              title="Configure Your Ride"
              description="Set speed, power, cadence, heart rate, and bike type. Our engine creates realistic, plausible cycling data."
            />
            <StepCard
              step={3}
              icon={<FileDown className="h-8 w-8 text-orange-500" />}
              title="Download & Import"
              description="Download your GPX file and import it into Strava, Garmin Connect, Wahoo, or any cycling platform."
            />
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            Starting with 10 free tokens. Each download costs 1 token.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 dark:text-white">
            Ready to Create Your Ride?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Start designing your custom cycling route now. No account needed.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white px-8 py-3 rounded-md font-medium text-lg hover:bg-orange-600 transition-colors"
          >
            Create Your Route
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-500 text-sm font-bold">
          {step}
        </span>
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
