import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

interface TraceContext {
  readonly traceId?: string;
  readonly spanId?: string;
  readonly parentSpanId?: string;
}

interface ContextStore {
  readonly requestId: string;
  readonly traceContext?: TraceContext;
  readonly data: Map<string, unknown>;
}

const storage = new AsyncLocalStorage<ContextStore>();

export const RequestContext = {
  init(): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
      const store: ContextStore = {
        requestId: req.headers['x-request-id']?.toString() ?? randomUUID(),
        data: new Map<string, unknown>()
      };
      storage.run(store, () => next());
    };
  },

  get<T>(key: string): T | undefined {
    return storage.getStore()?.data.get(key) as T | undefined;
  },

  set<T>(key: string, value: T): void {
    storage.getStore()?.data.set(key, value);
  },

  getRequestId(): string {
    return storage.getStore()?.requestId ?? 'unknown';
  },

  getTraceContext(): TraceContext | undefined {
    return storage.getStore()?.traceContext;
  },

  setTraceContext(traceContext: TraceContext): void {
    const store = storage.getStore();
    if (store) {
      (store as { traceContext?: TraceContext }).traceContext = traceContext;
    }
  }
};
