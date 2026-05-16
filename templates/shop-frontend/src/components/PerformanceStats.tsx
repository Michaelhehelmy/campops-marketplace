/**
 * Performance Stats Component (Dev Only)
 * Shows React Query cache size, render counts, WebSocket status
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocketStatus } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { X, Activity, Database, Wifi, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceStatsProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export function PerformanceStats({ position = "bottom-right" }: PerformanceStatsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const queryClient = useQueryClient();
  const { isConnected } = useSocketStatus();
  const [cacheStats, setCacheStats] = useState({ queries: 0, mutations: 0 });

  // Check if debug mode is enabled
  useEffect(() => {
    const checkDebugMode = () => {
      const isDebug = localStorage.getItem("debug") === "true";
      setIsVisible(isDebug);
    };

    checkDebugMode();
    window.addEventListener("storage", checkDebugMode);

    // Also check on interval for changes
    const interval = setInterval(checkDebugMode, 1000);

    return () => {
      window.removeEventListener("storage", checkDebugMode);
      clearInterval(interval);
    };
  }, []);

  // Track render count
  useEffect(() => {
    setRenderCount((c) => c + 1);
  });

  // Update cache stats periodically
  useEffect(() => {
    if (!isVisible) return;

    const updateStats = () => {
      const queryCache = queryClient.getQueryCache();
      const mutationCache = queryClient.getMutationCache();

      setCacheStats({
        queries: queryCache.getAll().length,
        mutations: mutationCache.getAll().length,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [isVisible, queryClient]);

  if (!isVisible || !import.meta.env.DEV) {
    return null;
  }

  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

  return (
    <Card
      className={cn(
        "fixed z-50 w-72 shadow-xl border-2 border-primary/20",
        positionClasses[position]
      )}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Performance Stats
        </CardTitle>
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* React Query Cache */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4" />
            <span>Query Cache</span>
          </div>
          <Badge variant="secondary">{cacheStats.queries}</Badge>
        </div>

        {/* Mutation Cache */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>Mutations</span>
          </div>
          <Badge variant="secondary">{cacheStats.mutations}</Badge>
        </div>

        {/* WebSocket Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wifi className="h-4 w-4" />
            <span>WebSocket</span>
          </div>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        {/* Render Count */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-muted-foreground">Component Renders</span>
          <span className="font-mono">{renderCount}</span>
        </div>

        {/* Online Status */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Network</span>
          <Badge variant={navigator.onLine ? "default" : "destructive"}>
            {navigator.onLine ? "Online" : "Offline"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Debug Toggle Button
 * Enables/disables debug mode
 */
export function DebugToggle() {
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    setIsDebug(localStorage.getItem("debug") === "true");
  }, []);

  const toggleDebug = () => {
    const newValue = !isDebug;
    localStorage.setItem("debug", String(newValue));
    setIsDebug(newValue);
    window.dispatchEvent(new StorageEvent("storage"));
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <button
      onClick={toggleDebug}
      className={cn(
        "fixed bottom-4 left-4 z-50 p-2 rounded-full shadow-lg transition-all",
        isDebug ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}
      title={isDebug ? "Disable Debug Mode" : "Enable Debug Mode"}
    >
      <Activity className="h-5 w-5" />
    </button>
  );
}
