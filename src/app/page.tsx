import Link from "next/link";
import { SampleCard } from "@/components/sample-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSampleImages } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const samples = await getSampleImages();

  return (
    <div className="container mx-auto space-y-16 px-4 pb-16 pt-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
        <div className="space-y-6">
          <Badge className="bg-primary/10 text-primary">Trust &amp; Safety ready</Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              TrueFrame
            </h1>
            <p className="text-lg text-muted-foreground">
              Check whether media is likely AI-generated — with confidence and explainable signals.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="#samples">
              <Button size="lg">Try Demo</Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline">
                Upload Your Own
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Deterministic scoring", copy: "Stable outputs for the same asset." },
              { title: "Explainable signals", copy: "Source, model score, provenance placeholders." },
              { title: "API first", copy: "Simple POST endpoint for rapid integration." }
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-secondary/30 to-white p-8 shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Live samples from Google Images
            </div>
            <p className="text-muted-foreground">
              On each page load we fetch 3 random public images via Google Custom Search. No uploads or downloads are stored.
            </p>
            <div className="rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">How it works</p>
              <ol className="mt-2 space-y-2 list-decimal list-inside">
                <li>Pick random query + start index.</li>
                <li>Render the image inline in the browser.</li>
                <li>Send URL to /api/analyze for deterministic scoring.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section id="samples" className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Sample checks</h2>
          <p className="text-muted-foreground">
            Tap any card below to run the analyzer directly against the live image URL.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {samples.map((sample) => (
            <SampleCard key={sample.url} image={sample} />
          ))}
        </div>
      </section>

      <section id="docs" className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-6">
        <h3 className="text-xl font-semibold">API quick start</h3>
        <p className="text-muted-foreground text-sm">
          POST <code className="rounded bg-white px-2 py-1">/api/analyze</code> with <code>mediaType</code> and
          either a <code>dataUrl</code> or <code>url</code>. The placeholder model hashes inputs and returns stable scores.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">Request</p>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-secondary/70 p-3 text-xs">
{`{
  "mediaType": "image",
  "url": "https://example.com/photo.jpg"
}`}
            </pre>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">Response</p>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-secondary/70 p-3 text-xs">
{`{
  "label": "unclear",
  "confidence": 0.52,
  "signals": [
    {"type":"source","value":"url"},
    {"type":"c2pa","value":"unknown"},
    {"type":"model_score","value":0.52}
  ]
}`}
            </pre>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">Env vars</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><strong>GOOGLE_CSE_API_KEY</strong></li>
              <li><strong>GOOGLE_CSE_CX</strong></li>
              <li>Fallback placeholders used if unset.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
