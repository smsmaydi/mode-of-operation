import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Suppress ResizeObserver errors silently
    if (error?.message?.includes('ResizeObserver')) {
      return null; // Don't update state, just ignore
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log other errors but not ResizeObserver
    if (!error?.message?.includes('ResizeObserver')) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 10, color: 'red' }}>Error rendering component</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
