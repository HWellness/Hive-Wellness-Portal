import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hive-light-blue to-hive-white p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-century font-bold text-hive-purple mb-4">
              Something went wrong
            </h1>
            <p className="text-hive-black/70 mb-6">
              The application encountered an unexpected error. Please refresh the page to continue.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-hive-purple hover:bg-hive-purple/90"
            >
              Refresh Page
            </Button>
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left text-xs text-gray-600">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
