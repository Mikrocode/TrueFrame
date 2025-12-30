import { DemoUploader } from "@/components/demo-uploader";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold text-primary">Upload demo</p>
        <h1 className="text-3xl font-bold">Test your own image</h1>
        <p className="text-muted-foreground">
          Drag-and-drop or browse a file. We downscale to 512px and run a deterministic placeholder model.
        </p>
      </div>
      <DemoUploader />
      <p className="text-center text-xs text-muted-foreground">
        Placeholder model for demo purposes only. Do not use for production safety decisions.
      </p>
    </div>
  );
}
