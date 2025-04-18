
import { formatDate } from './utils';

interface ErrorLogEntry {
  timestamp: string;
  error: Error;
  component?: string;
  additionalInfo?: Record<string, any>;
}

class DebugLogger {
  private static instance: DebugLogger;
  private logs: ErrorLogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() {}

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  logError(error: Error, component?: string, additionalInfo?: Record<string, any>) {
    const entry: ErrorLogEntry = {
      timestamp: formatDate(new Date(), true),
      error,
      component,
      additionalInfo
    };

    this.logs.unshift(entry);
    
    // Keep logs under limit
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[${entry.timestamp}] Error in ${component || 'unknown component'}:`,
        error,
        additionalInfo || ''
      );
    }
  }

  getLogs(): ErrorLogEntry[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const debugLogger = DebugLogger.getInstance();
