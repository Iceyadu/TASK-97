import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { getTraceId } from './trace-id.interceptor';

export interface IAuditService {
  recordEvent(event: {
    traceId: string;
    actorId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    changes?: any;
    reason?: string;
    ipAddress?: string;
    metadata?: any;
  }): Promise<void>;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Optional() @Inject('AuditService') private readonly auditService?: IAuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit write operations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseData) => {
        if (!this.auditService) return;

        try {
          const traceId = getTraceId();
          const user = request.user;
          const path: string = request.route?.path || request.url;

          // Derive resource type and action from route
          const resourceType = this.extractResourceType(path);
          const action = `${resourceType}.${method.toLowerCase()}`;

          await this.auditService.recordEvent({
            traceId,
            actorId: user?.id,
            action,
            resourceType,
            resourceId: request.params?.id,
            ipAddress: request.ip,
            metadata: {
              url: request.url,
              method,
            },
          });
        } catch {
          // Audit failures must not break the request
        }
      }),
    );
  }

  private extractResourceType(path: string): string {
    const segments = path.replace(/^\/api\/v1\//, '').split('/');
    return segments[0] || 'unknown';
  }
}
