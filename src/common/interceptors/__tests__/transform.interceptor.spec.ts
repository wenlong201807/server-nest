import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from '../transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();

    mockExecutionContext = {} as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn(),
    } as unknown as CallHandler;
  });

  it('should transform response with success wrapper', (done) => {
    const testData = { id: 1, name: 'test' };
    const timestamp = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);
    (mockCallHandler.handle as jest.Mock).mockReturnValue(of(testData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 0,
          message: 'success',
          data: testData,
          timestamp,
        });
        done();
      },
    });
  });

  it('should transform null data', (done) => {
    const timestamp = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);
    (mockCallHandler.handle as jest.Mock).mockReturnValue(of(null));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 0,
          message: 'success',
          data: null,
          timestamp,
        });
        done();
      },
    });
  });

  it('should transform array data', (done) => {
    const testData = [
      { id: 1, name: 'test1' },
      { id: 2, name: 'test2' },
    ];
    const timestamp = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);
    (mockCallHandler.handle as jest.Mock).mockReturnValue(of(testData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 0,
          message: 'success',
          data: testData,
          timestamp,
        });
        done();
      },
    });
  });

  it('should transform empty object', (done) => {
    const testData = {};
    const timestamp = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);
    (mockCallHandler.handle as jest.Mock).mockReturnValue(of(testData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 0,
          message: 'success',
          data: testData,
          timestamp,
        });
        done();
      },
    });
  });

  it('should transform string data', (done) => {
    const testData = 'success message';
    const timestamp = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);
    (mockCallHandler.handle as jest.Mock).mockReturnValue(of(testData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 0,
          message: 'success',
          data: testData,
          timestamp,
        });
        done();
      },
    });
  });

  it('should transform boolean data', (done) => {
    const testData = true;
    const timestamp = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);
    (mockCallHandler.handle as jest.Mock).mockReturnValue(of(testData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 0,
          message: 'success',
          data: testData,
          timestamp,
        });
        done();
      },
    });
  });
});
