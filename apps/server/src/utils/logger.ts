type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVEL_PRIORITY) {
    return env as LogLevel;
  }
  return "info";
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getConfiguredLevel()];
}

function formatMessage(level: LogLevel, component: string, message: string, data?: unknown): string {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${component}]`;
  if (data !== undefined) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export function createLogger(component: string): Logger {
  return {
    debug(message: string, data?: unknown): void {
      if (shouldLog("debug")) {
        console.debug(formatMessage("debug", component, message, data));
      }
    },
    info(message: string, data?: unknown): void {
      if (shouldLog("info")) {
        console.info(formatMessage("info", component, message, data));
      }
    },
    warn(message: string, data?: unknown): void {
      if (shouldLog("warn")) {
        console.warn(formatMessage("warn", component, message, data));
      }
    },
    error(message: string, data?: unknown): void {
      if (shouldLog("error")) {
        console.error(formatMessage("error", component, message, data));
      }
    },
  };
}
