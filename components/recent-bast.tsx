import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RecentBastProps {
  data?: Array<{
    id: string;
    bastNumber: string;
    type: string;
    status: string;
    creatorName: string;
    assetCount: number;
    createdAt: string;
  }>;
}

const statusConfig = {
  APPROVED: { label: "Approved", variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
  PENDING: { label: "Pending", variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
  REJECTED: { label: "Rejected", variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
  DRAFT: { label: "Draft", variant: "outline" as const, icon: FileText, color: "text-gray-600" },
};

const typeLabel = {
  HANDOVER: "Handover",
  RETURN: "Return",
  TRANSFER: "Transfer",
  DISPOSAL: "Disposal",
};

export function RecentBast({ data }: RecentBastProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Recent BAST</CardTitle>
          <CardDescription>No recent transactions</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>Recent BAST Transactions</CardTitle>
        <CardDescription>Latest asset transaction records</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((bast) => {
            const status = statusConfig[bast.status as keyof typeof statusConfig];
            const Icon = status?.icon || FileText;

            return (
              <div key={bast.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-2 rounded-lg bg-muted ${status?.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{bast.bastNumber}</p>
                      <Badge variant={status?.variant || "outline"}>{status?.label || bast.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {typeLabel[bast.type as keyof typeof typeLabel] || bast.type} • {bast.assetCount} asset(s)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {bast.creatorName} •{" "}
                      {new Date(bast.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
