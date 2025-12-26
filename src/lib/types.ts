export type AnalyzerLabel = "likely_ai" | "unclear" | "likely_real";

export type AnalyzerRequest = {
  mediaType: "image" | "frame";
  dataUrl?: string;
  url?: string;
};

export type AnalyzerSignal = {
  type: string;
  value: string | number;
};

export type AnalyzerResponse = {
  label: AnalyzerLabel;
  confidence: number;
  signals: AnalyzerSignal[];
  sourceDataUrl?: string;
};

export type SampleImage = {
  url: string;
  title: string;
};
