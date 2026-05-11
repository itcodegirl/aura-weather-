import { Component } from "react";
import { CloudOff } from "lucide-react";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Keep crash details visible in development tools without breaking UX.
    console.error("Aura runtime error:", error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="app app--error">
        <div className="error-card" role="alert" aria-live="assertive">
          <CloudOff size={42} className="error-card-icon" aria-hidden="true" />
          <h1>Aura couldn’t render the dashboard.</h1>
          <p>
            A reload usually clears it. Your saved cities and unit
            preferences are kept locally — they’ll be here when you’re back.
          </p>
          <button
            type="button"
            className="error-retry"
            onClick={this.handleReload}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
