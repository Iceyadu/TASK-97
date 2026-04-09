import { TraceIdInterceptor } from '../../src/common/interceptors/trace-id.interceptor';
import { of } from 'rxjs';

describe('TraceIdInterceptor', () => {
  let interceptor: TraceIdInterceptor;

  beforeEach(() => {
    interceptor = new TraceIdInterceptor();
  });

  it('should use X-Trace-Id from request header if provided', (done) => {
    const mockRequest: any = {
      headers: { 'x-trace-id': 'custom-trace-123' },
    };
    const mockResponse: any = {
      setHeader: jest.fn(),
    };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;
    const mockHandler = {
      handle: () => of('response'),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      expect(mockRequest[TraceIdInterceptor.TRACE_ID_KEY]).toBe(
        'custom-trace-123',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Trace-Id',
        'custom-trace-123',
      );
      done();
    });
  });

  it('should generate UUID trace ID if not provided in header', (done) => {
    const mockRequest: any = { headers: {} };
    const mockResponse: any = { setHeader: jest.fn() };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;
    const mockHandler = { handle: () => of('response') };

    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      const traceId = mockRequest[TraceIdInterceptor.TRACE_ID_KEY];
      expect(traceId).toBeDefined();
      expect(traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      done();
    });
  });

  it('should set trace ID on response header', (done) => {
    const mockRequest: any = { headers: {} };
    const mockResponse: any = { setHeader: jest.fn() };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;
    const mockHandler = { handle: () => of('response') };

    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Trace-Id',
        expect.any(String),
      );
      done();
    });
  });
});
