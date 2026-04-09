import { BadRequestException } from '@nestjs/common';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/~`\\]).{12,}$/;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordComplexity(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  if (password && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (password && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (password && !/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (password && !/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/~`\\]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertPasswordComplexity(password: string): void {
  const result = validatePasswordComplexity(password);
  if (!result.valid) {
    throw new BadRequestException({
      message: 'Password does not meet complexity requirements',
      details: result.errors.map((e) => ({ field: 'password', message: e })),
    });
  }
}
