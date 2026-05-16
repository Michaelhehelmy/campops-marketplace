import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";

interface Folio {
  id: string;
  guest_name: string;
  room_number: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  total_amount: number;
  created_at: string;
}

const statusVariant: Record<string, any> = {
  open: "default",
  checked_out: "success",
  closed: "secondary",
  cancelled: "destructive",
};

export default function GuestInvoicesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["guest_invoices"],
    queryFn: () => get<{ data: Folio[] }>("/guests/invoices"),
    staleTime: 1000 * 60,
  });

  const folios = data?.data ?? [];

  function downloadInvoice(folioId: string) {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    const link = document.createElement("a");
    link.href = `/api/folios/${folioId}/invoice`;
    link.setAttribute("download", `invoice-${folioId.slice(0, 8)}.pdf`);
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    fetch(link.href, { headers })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        window.open(link.href, "_blank");
      });
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" data-testid="invoices-heading">
        My Invoices
      </h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : folios.length === 0 ? (
        <Card data-testid="no-invoices">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No invoices yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Invoices will appear here after your stay.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="invoices-list">
          {folios.map((f) => (
            <Card key={f.id} data-testid="invoice-item">
              <CardContent className="py-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={16} className="text-muted-foreground shrink-0" />
                      <p className="font-medium text-sm">
                        Invoice #{f.id.slice(0, 8).toUpperCase()}
                        {f.room_number ? ` · Room ${f.room_number}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {f.check_in
                        ? format(new Date(f.check_in), "MMM d, yyyy")
                        : format(new Date(f.created_at), "MMM d, yyyy")}
                      {f.check_out ? ` – ${format(new Date(f.check_out), "MMM d, yyyy")}` : ""}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      ${Number(f.total_amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={statusVariant[f.status] ?? "default"}>
                      {f.status.replace("_", " ")}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={() => downloadInvoice(f.id)}
                      data-testid={`download-invoice-${f.id}`}
                    >
                      <Download size={14} />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
