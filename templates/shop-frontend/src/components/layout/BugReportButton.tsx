import React, { useState } from "react";
import { Bug, X, Loader2 } from "lucide-react";
import { globalErrorStore } from "./GlobalErrorCapture";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";
import toast from "react-hot-toast";
import { api } from "../../lib/api";

export function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const [expectedVsActual, setExpectedVsActual] = useState("");
  const [screenshotData, setScreenshotData] = useState<string | null>(null);

  const captureScreen = async () => {
    setIsCapturing(true);
    setIsOpen(true);
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        allowTaint: true,
        scale: 0.5,
        ignoreElements: (element) => element.id === "bug-report-container",
      });

      setScreenshotData(canvas.toDataURL("image/jpeg", 0.7));
    } catch (error) {
      console.error("Failed to capture screen", error);
      setScreenshotData(null);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!steps.trim()) {
      toast.error("Steps to reproduce are required");
      return;
    }
    try {
      setIsSubmitting(true);
      await api.post("/bug-reports", {
        title: title.trim(),
        steps: steps.trim(),
        expected_vs_actual: expectedVsActual.trim() || null,
        pageUrl: window.location.href,
        screenshot: screenshotData,
        errors: globalErrorStore,
      });
      toast.success("Bug report submitted — thank you!");
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to submit bug report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTitle("");
    setSteps("");
    setExpectedVsActual("");
    setScreenshotData(null);
  };

  return (
    <div id="bug-report-container" className="fixed bottom-6 right-6 z-[9999]">
      {!isOpen ? (
        <Button
          onClick={captureScreen}
          title="Report a Bug"
          data-testid="bug-report-fab"
          className="h-12 w-12 rounded-full shadow-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center p-0"
        >
          <Bug className="h-6 w-6" />
        </Button>
      ) : (
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 w-96 space-y-4 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-charcoal dark:text-stone-100">
              Report a Bug
            </h3>
            <button
              onClick={handleClose}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isCapturing ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
              <p className="text-sm text-gray-500">Capturing screenshot…</p>
            </div>
          ) : (
            <>
              {screenshotData && (
                <div className="rounded border overflow-hidden bg-gray-100 dark:bg-gray-900 h-28 relative">
                  <img
                    src={screenshotData}
                    alt="Screenshot preview"
                    className="object-cover w-full h-full opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                      Screenshot captured
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short description of the bug"
                  className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Steps to reproduce <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="1. Go to…&#10;2. Click on…&#10;3. See error"
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Expected vs actual behavior
                  <span className="text-stone-400 ml-1 font-normal">(optional)</span>
                </label>
                <Textarea
                  value={expectedVsActual}
                  onChange={(e) => setExpectedVsActual(e.target.value)}
                  placeholder="Expected: …&#10;Actual: …"
                  className="resize-none"
                  rows={2}
                />
              </div>

              <p className="text-xs text-gray-400">
                Screenshot and console errors are attached automatically.
              </p>

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Report
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
