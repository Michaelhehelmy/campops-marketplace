/**
 * Conflict Resolution Modal
 * Shows when page save fails due to 409 conflict
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, RefreshCw, Save } from "lucide-react";

interface ConflictResolutionModalProps {
  open: boolean;
  onClose: () => void;
  onReload: () => void;
  onKeepEditing: () => void;
}

export function ConflictResolutionModal({
  open,
  onClose,
  onReload,
  onKeepEditing,
}: ConflictResolutionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Page Conflict Detected
          </DialogTitle>
          <DialogDescription>
            This page has been modified on the server since you started editing. You need to choose
            how to resolve this conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> If you choose to reload, your local changes will be lost and
              replaced with the server version.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={onReload} className="w-full justify-start gap-2">
              <RefreshCw className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Reload from Server</div>
                <div className="text-xs text-muted-foreground">
                  Discard my changes and load the latest version
                </div>
              </div>
            </Button>

            <Button
              onClick={onKeepEditing}
              className="w-full justify-start gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Save className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Keep My Version</div>
                <div className="text-xs text-amber-100">Keep editing and re-queue for sync</div>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
