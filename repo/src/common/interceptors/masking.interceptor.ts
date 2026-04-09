import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

const EXCLUDED_FIELDS = [
  'password_hash',
  'passwordHash',
  'reset_token_hash',
  'resetTokenHash',
  'encryptionKey',
  'encryption_key',
];

const MASKED_FIELDS: Record<string, (val: string) => string> = {
  government_id: maskLastFour,
  governmentId: maskLastFour,
  employee_id: maskLastFour,
  employeeId: maskLastFour,
};

function maskLastFour(value: string): string {
  if (!value || value.length <= 4) return '****';
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

function maskObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(maskObject);
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (EXCLUDED_FIELDS.includes(key)) {
      continue; // strip entirely
    }
    if (MASKED_FIELDS[key] && typeof value === 'string') {
      result[key] = MASKED_FIELDS[key](value);
    } else if (typeof value === 'object') {
      result[key] = maskObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

@Injectable()
export class MaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => maskObject(data)));
  }
}

export { maskObject, maskLastFour };
