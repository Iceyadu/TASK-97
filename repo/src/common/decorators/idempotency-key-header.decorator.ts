import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

/**
 * Required Idempotency-Key header (case-insensitive per HTTP spec).
 */
export const IdempotencyKeyHeader = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const raw =
      req.headers['idempotency-key'] ?? req.headers['Idempotency-Key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (typeof key !== 'string' || !key.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    return key.trim();
  },
);
