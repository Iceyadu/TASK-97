import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

const traceStorage = new AsyncLocalStorage<string>();

export function getTraceId(): string {
  return traceStorage.getStore() || uuidv4();
}

export function runWithTraceId<T>(traceId: string, fn: () => Promise<T>): Promise<T> {
  return traceStorage.run(traceId, fn);
}

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  static readonly TRACE_ID_KEY = 'traceId';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const traceId =
      (request.headers['x-trace-id'] as string) || uuidv4();

    request[TraceIdInterceptor.TRACE_ID_KEY] = traceId;
    response.setHeader('X-Trace-Id', traceId);

    return new Observable((subscriber) => {
      traceStorage.run(traceId, () => {
        next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
