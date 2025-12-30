import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { AnalyzerResponse, AnalyzerSignal } from "@/lib/types";
import { formatConfidence } from "@/lib/utils";
import { CheckCircle2, CircleAlert, Shield, TriangleAlert } from "lucide-react";

type ResultProps = {
  result: AnalyzerResponse | null;
  isCompact?: boolean;
};

function labelDisplay(label: AnalyzerResponse["label"]) {
  switch (label) {
    case "likely_ai":
      return { text: "Likely AI", icon: TriangleAlert, variant: "destructive" as const };
    case "likely_real":
      return { text: "Likely Real", icon: CheckCircle2, variant: "success" as const };
    default:
      return { text: "Unclear", icon: CircleAlert, variant: "warning" as const };
  }
}

function renderSignals(signals: AnalyzerSignal[]) {
  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      {signals.map((signal, index) => (
        <li key={`${signal.type}-${index}`} className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground capitalize">{signal.type}:</span>
          <span>{signal.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnalyzerResult({ result, isCompact }: ResultProps) {
  if (!result) return null;

  const { text, icon: Icon, variant } = labelDisplay(result.label);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
      <div className="flex items-center gap-3">
        <Badge variant={variant} className="gap-2 px-3 py-1.5 text-sm">
          <Icon className="h-4 w-4" />
          {text}
        </Badge>
        <div className="text-sm text-muted-foreground">
          Confidence: <span className="font-semibold text-foreground">{formatConfidence(result.confidence)}</span>
        </div>
      </div>
      {!isCompact && (
        <div className="space-y-2">
          <Progress value={Math.min(100, Math.round(result.confidence * 100))} />
          <Accordion type="single" collapsible className="border border-border rounded-lg px-3">
            <AccordionItem value="why">
              <AccordionTrigger className="py-3 text-sm font-semibold">Why?</AccordionTrigger>
              <AccordionContent>{renderSignals(result.signals)}</AccordionContent>
            </AccordionItem>
          </Accordion>
          <p className="text-xs text-muted-foreground">
            Deterministic placeholder model. Scores are stable for the same image.
          </p>
        </div>
      )}
    </div>
  );
}
