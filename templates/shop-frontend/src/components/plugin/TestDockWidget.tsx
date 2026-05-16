/**
 * TestDockWidget
 * ──────────────
 * Example plugin widget that demonstrates the slot injection system.
 * This component is registered into the DASHBOARD_WIDGETS slot by the
 * test-dock plugin bootstrap (src/plugin-bootstrap/test-dock.tsx).
 *
 * In production, each plugin ships its own React components as a separate
 * chunk loaded via React.lazy. This file demonstrates the pattern.
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Puzzle } from "lucide-react";

export function TestDockWidget({ propertyId }: { propertyId?: string }) {
  return (
    <Card className="p-0 border-none shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
              <Puzzle size={16} className="text-violet-600" />
            </div>
            <CardTitle className="text-base font-bold text-charcoal">Hello from Plugin</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            test-dock
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        <p className="text-sm text-muted-foreground">
          This widget was injected by the <strong>test-dock</strong> plugin into the{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">dashboard.widgets</code> slot.
        </p>
        {propertyId && (
          <p className="text-xs text-muted-foreground mt-2">
            Property context: <code className="bg-muted px-1 rounded">{propertyId}</code>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
