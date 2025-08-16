import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onClearData?: () => Promise<void>;
}

interface State {
  hasError: boolean;
  error?: Error;
  isClearing: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isClearing: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isClearing: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleClearData = async () => {
    if (!this.props.onClearData) return;

    this.setState({ isClearing: true });
    try {
      await this.props.onClearData();
      // Reset error state after clearing data
      this.setState({ hasError: false, error: undefined, isClearing: false });
    } catch (clearError) {
      console.error("Failed to clear data:", clearError);
      this.setState({ isClearing: false });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-700 mb-3">
            An error occurred while loading the recordings. Please try
            refreshing the page.
          </p>
          {this.state.error && (
            <details className="text-sm text-red-600">
              <summary className="cursor-pointer font-medium">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                {this.state.error.message}
                {this.state.error.stack && `\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <div className="mt-3 flex gap-2">
            {this.props.onClearData && (
              <button
                onClick={this.handleClearData}
                disabled={this.state.isClearing}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {this.state.isClearing ? "Clearing..." : "Clear Database"}
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
