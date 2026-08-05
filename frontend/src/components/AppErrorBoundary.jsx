import React from "react";
import { Link } from "react-router-dom";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ibm-canvas">
          <div className="slds-page-shell max-w-3xl p-8">
            <h1 className="ibm-title">Application error</h1>
            <p className="mt-3 text-sm text-[#525252]">
              The portal encountered a runtime error. Use the navigation rail to return to a stable area while the page tree is restored.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/" className="ibm-button-primary">
                Home
              </Link>
              <Link to="/map" className="ibm-button-ghost">
                Map
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
