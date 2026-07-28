import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import WorldStartupFallback from './WorldStartupFallback';

interface WorldRuntimeErrorBoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}

interface WorldRuntimeErrorBoundaryState {
  failed: boolean;
}

export default class WorldRuntimeErrorBoundary extends Component<
  WorldRuntimeErrorBoundaryProps,
  WorldRuntimeErrorBoundaryState
> {
  state: WorldRuntimeErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): WorldRuntimeErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Music Universe]: World runtime failed.', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <WorldStartupFallback
          kind="runtime-error"
          onRetry={this.props.onRetry}
        />
      );
    }

    return this.props.children;
  }
}
