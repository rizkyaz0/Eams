"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Cpu, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { id } from "date-fns/locale";

export function AIPredictiveAlerts({ predictions }: { predictions: any[] }) {
  const router = useRouter();

  if (!predictions || predictions.length === 0) return null;

  return (
    <Card className="border-indigo-500/30 shadow-indigo-500/5 overflow-hidden">
      <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-md">
              <BrainCircuit className="size-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                Predictive Maintenance AI
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 text-[10px] px-1.5 py-0">
                  BETA
                </Badge>
              </CardTitle>
              <CardDescription className="text-indigo-700/70 dark:text-indigo-300/70 mt-0.5">Estimasi umur berdasarkan _Mean Time Between Failures_ (MTBF) historis.</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {predictions.map((pred) => {
            const predDate = new Date(pred.predictedFailureDate);
            const timeDiff = formatDistanceToNowStrict(predDate, { locale: id, addSuffix: true });

            // Higher confidence or nearer date = red. Far date = yellow
            const isDanger = predDate.getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000; // 30 days

            return (
              <div key={pred.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-full ${isDanger ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>{isDanger ? <AlertTriangle className="size-4" /> : <Cpu className="size-4" />}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{pred.assetName}</p>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {pred.tagNumber}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-col sm:flex-row gap-1 sm:gap-3">
                      <span>Kategori: {pred.categoryName}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>
                        Prediksi Rusak: <strong className={isDanger ? "text-red-500" : "text-yellow-600"}>{timeDiff}</strong>
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>AI Confidence: {Math.round(pred.confidenceScore * 100)}%</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto shrink-0" onClick={() => router.push(`/assets/${pred.assetId}`)}>
                  Tinjau Aset
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
