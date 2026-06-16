import { Component, type ReactNode } from 'react'

interface State { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('Unhandled error:', error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
          <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-soft">
            An unexpected error occurred. Please try again or reload the app.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={this.reset}
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface2"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accentink hover:opacity-90"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    )
  }
}
