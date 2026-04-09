import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TraceIdInterceptor } from '../interceptors/trace-id.interceptor';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object') {
        const obj = exResponse as any;
        message = obj.message || message;
        details = obj.details;
        if (Array.isArray(obj.message)) {
          details = obj.message.map((m: string) => ({ message: m }));
          message = 'Validation failed';
        }
      }
    }

    const traceId =
      (request as any)[TraceIdInterceptor.TRACE_ID_KEY] ||
      request.headers['x-trace-id'] ||
      'unknown';

    response.status(status).json({
      statusCode: status,
      error: HttpException.createBody('', '', status)
        ? this.getErrorName(status)
        : 'Error',
      message,
      details,
      traceId,
    });
  }

  private getErrorName(status: number): string {
    const names: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      410: 'Gone',
      413: 'Payload Too Large',
      415: 'Unsupported Media Type',
      422: 'Unprocessable Entity',
      423: 'Locked',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return names[status] || 'Error';
  }
}
