import { SampleImage } from "@/lib/types";

const SEARCH_TERMS = [
  "portrait",
  "street photo",
  "nature landscape",
  "product photo",
  "event photo"
];

const FALLBACK_IMAGES: SampleImage[] = [
  {
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    title: "Portrait sample"
  },
  {
    url: "https://images.unsplash.com/photo-1433838552652-f9a46b332c40?auto=format&fit=crop&w=900&q=80",
    title: "City street sample"
  },
  {
    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=80",
    title: "Nature sample"
  }
];

export async function getSampleImages(): Promise<SampleImage[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;

  if (!apiKey || !cx) {
    return FALLBACK_IMAGES;
  }

  try {
    const query =
      SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)] ?? "photo";
    const start = Math.max(1, Math.floor(Math.random() * 30));
    const endpoint = new URL("https://www.googleapis.com/customsearch/v1");
    endpoint.searchParams.set("key", apiKey);
    endpoint.searchParams.set("cx", cx);
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("searchType", "image");
    endpoint.searchParams.set("num", "3");
    endpoint.searchParams.set("safe", "active");
    endpoint.searchParams.set("start", start.toString());

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const items = (data.items ?? []).slice(0, 3);

    if (items.length === 0) return FALLBACK_IMAGES;

    return items.map((item: any, index: number) => ({
      url: item.link,
      title: item.title ?? `Sample image ${index + 1}`
    }));
  } catch (error) {
    console.error("Failed to fetch Google images", error);
    return FALLBACK_IMAGES;
  }
}
