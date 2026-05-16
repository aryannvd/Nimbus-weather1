import React, { ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { RawIcons } from './WeatherIcons';

export class ErrorBoundary extends React.Component<any, { hasError: boolean, error: Error | null }> {
  state = { hasError: false, error: null };
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
              <RawIcons.ShieldAlert className="w-10 h-10 text-white/40" strokeWidth={1} />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold text-white uppercase tracking-widest">Interface Failed</h1>
              
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 my-2 overflow-hidden max-w-sm mx-auto">
                <p className="text-[#ff6b6b] text-xs font-mono break-words">
                  {this.state.error?.message || String(this.state.error) || "Unknown error"}
                </p>
                {this.state.error?.stack && (
                  <pre className="text-white/20 text-[10px] mt-2 text-left overflow-auto max-h-32 no-scrollbar font-mono leading-tight">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>

              <p className="text-white/40 text-sm max-w-xs mx-auto">
                A rendering error occurred. The application is trying to recover.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 py-4 px-10 bg-white text-black rounded-2xl text-xs font-black tracking-[0.2em] uppercase active:scale-95 transition-all"
              >
                Restart App
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
