import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class BlockErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Block rendering error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 border-2 border-dashed border-destructive/20 bg-destructive/5 rounded-2xl text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <h4 className="font-bold text-destructive">Block Rendering Error</h4>
            <p className="text-xs text-destructive/60 mt-1 mb-4">
              {this.state.error?.message || "An unexpected error occurred in this block."}
            </p>
            <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false })}>
              <RefreshCw size={14} className="mr-2" /> Try Reloading Block
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
