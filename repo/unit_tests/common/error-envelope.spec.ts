import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import {
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

describe('Error Envelope Consistency', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = {
      headers: {},
      route: { path: '/test' },
      url: '/test',
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
    filter = new HttpExceptionFilter();
  });

  it('should produce consistent envelope for 400 Bad Request', () => {
    filter.catch(new BadRequestException('Invalid input'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body).toHaveProperty('statusCode', 400);
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('traceId');
  });

  it('should produce consistent envelope for 401 Unauthorized', () => {
    filter.catch(new UnauthorizedException('Not authenticated'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(401);
  });

  it('should produce consistent envelope for 403 Forbidden', () => {
    filter.catch(new ForbiddenException('No access'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });

  it('should produce consistent envelope for 404 Not Found', () => {
    filter.catch(new NotFoundException('Resource not found'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should produce consistent envelope for 409 Conflict', () => {
    filter.catch(new ConflictException('Duplicate'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(409);
  });

  it('should produce consistent envelope for 422 Unprocessable Entity', () => {
    filter.catch(
      new HttpException('Validation failed', HttpStatus.UNPROCESSABLE_ENTITY),
      mockHost as any,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(422);
  });

  it('should produce consistent envelope for 429 Too Many Requests', () => {
    filter.catch(
      new HttpException('Rate limited', HttpStatus.TOO_MANY_REQUESTS),
      mockHost as any,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(429);
  });

  it('should produce consistent envelope for 500 Internal Server Error', () => {
    filter.catch(new Error('Unexpected'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body).toHaveProperty('traceId');
  });

  it('should always include traceId in error response', () => {
    mockRequest.traceId = 'custom-trace';
    filter.catch(new BadRequestException('test'), mockHost as any);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.traceId).toBeDefined();
  });

  it('should include details array for validation errors', () => {
    const exception = new BadRequestException({
      message: ['field1 is required', 'field2 must be positive'],
    });
    filter.catch(exception, mockHost as any);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.message).toBe('Validation failed');
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details).toHaveLength(2);
  });
});
