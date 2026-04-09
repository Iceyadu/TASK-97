import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { getTraceId } from './trace-id.interceptor';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data === undefined || data === null) {
          return data;
        }
        // If data already has 'data' key (manually wrapped), pass through
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return data;
        }
        // If it's a raw value or array for streaming, pass through
        if (data && data.__raw) {
          return data.value;
        }
        const meta: any = {
          traceId: getTraceId(),
          timestamp: new Date().toISOString(),
        };
        // If it has pagination info
        if (data && typeof data === 'object' && 'items' in data && 'total' in data) {
          return {
            data: data.items,
            meta: {
              ...meta,
              page: data.page || 1,
              pageSize: data.pageSize || 20,
              totalCount: data.total,
            },
          };
        }
        return {
          data,
          meta,
        };
      }),
    );
  }
}
