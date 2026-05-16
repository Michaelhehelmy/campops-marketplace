import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { api } from "../../lib/api";
import toast from "react-hot-toast";
import { Bug, Eye, Loader2, CheckCircle, Clock, Search, AlertCircle } from "lucide-react";

interface BugReport {
  id: string;
  title: string;
  user_email: string | null;
  page_url: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  description: string | null;
}

interface BugReportDetails extends BugReport {
  steps: string | null;
  expected_vs_actual: string | null;
  user_agent: string | null;
  screenshot: string | null;
  errors: any[];
}

export default function BugReportsPage() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<BugReportDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/bug-reports?status=${statusFilter}` : "/bug-reports";
      const { data } = await api.get(url);
      setReports(data.reports ?? data);
    } catch (error) {
      toast.error("Failed to fetch bug reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id: string) => {
    try {
      setSelectedReportId(id);
      setDetailsLoading(true);
      const { data } = await api.get(`/bug-reports/${id}`);
      setReportDetails(data);
    } catch (error) {
      toast.error("Failed to fetch report details");
      setSelectedReportId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateStatus = async (status: "open" | "in_progress" | "resolved") => {
    if (!selectedReportId) return;
    try {
      await api.patch(`/bug-reports/${selectedReportId}`, { status });
      toast.success("Status updated successfully");
      if (reportDetails) setReportDetails({ ...reportDetails, status });
      setReports((prev) => prev.map((r) => (r.id === selectedReportId ? { ...r, status } : r)));
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "open":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Open
          </span>
        );
      case "in_progress":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Resolved
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bug className="w-6 h-6" /> Bug Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage user-reported issues.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md shadow-sm text-sm p-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0 overflow-hidden">
        <div className="col-span-1 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-y-auto shadow-sm custom-scrollbar h-full">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No bug reports found.</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => fetchDetails(report.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${selectedReportId === report.id ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500" : "border-l-4 border-transparent"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <StatusBadge status={report.status} />
                    <span
                      className="text-xs text-gray-500"
                      title={new Date(report.created_at).toLocaleString()}
                    >
                      {format(new Date(report.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                    {report.title}
                  </div>
                  <div className="text-xs text-gray-400 truncate mb-1">{report.page_url}</div>
                  <div className="text-xs text-gray-500 truncate mb-2">
                    User: {report.user_email || "Anonymous"}
                  </div>
                  {report.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                      "{report.description}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-1 lg:col-span-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-y-auto shadow-sm custom-scrollbar h-full">
          {!selectedReportId ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
              <Eye className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a report to view details</p>
            </div>
          ) : detailsLoading || !reportDetails ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-6 border-b dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{reportDetails.title}</h2>
                  <p className="text-xs text-gray-400 break-all mb-2">{reportDetails.page_url}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>
                      Reported by:{" "}
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {reportDetails.user_email || "Anonymous"}
                      </span>
                    </p>
                    <p>Date: {new Date(reportDetails.created_at).toLocaleString()}</p>
                    <p className="text-xs break-all">Agent: {reportDetails.user_agent}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status:
                  </span>
                  <select
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm text-sm p-2 font-medium"
                    value={reportDetails.status}
                    onChange={(e) => updateStatus(e.target.value as any)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {reportDetails.steps && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Steps to Reproduce
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-sm whitespace-pre-wrap border dark:border-gray-700">
                    {reportDetails.steps}
                  </div>
                </div>
              )}

              {reportDetails.expected_vs_actual && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Expected vs Actual
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-sm whitespace-pre-wrap border dark:border-gray-700">
                    {reportDetails.expected_vs_actual}
                  </div>
                </div>
              )}

              {reportDetails.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Additional Notes
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-sm whitespace-pre-wrap border dark:border-gray-700">
                    {reportDetails.description}
                  </div>
                </div>
              )}

              {reportDetails.screenshot && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Screenshot
                  </h3>
                  <div className="border dark:border-gray-700 rounded-lg overflow-hidden shadow-inner bg-gray-100 dark:bg-gray-900">
                    <img
                      src={reportDetails.screenshot}
                      alt="Bug screenshot"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Console Errors ({reportDetails.errors?.length || 0})
                </h3>
                {reportDetails.errors && reportDetails.errors.length > 0 ? (
                  <div className="space-y-3">
                    {reportDetails.errors.map((err, i) => (
                      <div
                        key={i}
                        className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-3 rounded-md overflow-x-auto text-sm font-mono custom-scrollbar"
                      >
                        <div className="flex justify-between items-start mb-1 text-xs text-red-400">
                          <span>
                            {err.type} @ {new Date(err.timestamp).toLocaleTimeString()}
                          </span>
                          {err.source && (
                            <span>
                              {err.source}:{err.lineno}:{err.colno}
                            </span>
                          )}
                        </div>
                        <div className="text-red-700 dark:text-red-400 font-bold mb-1 break-words">
                          {err.message}
                        </div>
                        {err.error && (
                          <pre className="text-xs text-red-600 dark:text-red-300 mt-2 p-2 bg-red-100/50 dark:bg-red-900/20 rounded whitespace-pre-wrap">
                            {err.error}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No console errors recorded during session.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
