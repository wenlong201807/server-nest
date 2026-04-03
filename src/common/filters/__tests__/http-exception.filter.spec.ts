import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from '../http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test-url',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle string exception response', () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
    const timestamp = Date.now();

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.BAD_REQUEST,
      message: 'Test error',
      errors: null,
      timestamp,
      path: '/test-url',
    });
  });

  it('should handle object exception response with message', () => {
    const exception = new HttpException(
      { message: 'Validation failed' },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    const timestamp = Date.now();

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Validation failed',
      errors: null,
      timestamp,
      path: '/test-url',
    });
  });

  it('should handle object exception response with errors', () => {
    const errors = { field: 'Field is required' };
    const exception = new HttpException(
      { message: 'Validation failed', errors },
      HttpStatus.BAD_REQUEST,
    );
    const timestamp = Date.now();

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      errors,
      timestamp,
      path: '/test-url',
    });
  });

  it('should handle array message and join with comma', () => {
    const exception = new HttpException(
      { message: ['Error 1', 'Error 2', 'Error 3'] },
      HttpStatus.BAD_REQUEST,
    );
    const timestamp = Date.now();

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.BAD_REQUEST,
      message: 'Error 1, Error 2, Error 3',
      errors: null,
      timestamp,
      path: '/test-url',
    });
  });

  it('should use default message when no message provided', () => {
    const exception = new HttpException({}, HttpStatus.INTERNAL_SERVER_ERROR);
    const timestamp = Date.now();

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器错误',
      errors: null,
      timestamp,
      path: '/test-url',
    });
  });

  it('should handle 404 not found exception', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    const timestamp = Date.now();

    jest.spyOn(Date, 'now').mockReturnValue(timestamp);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.NOT_FOUND,
      message: 'Not Found',
      errors: null,
      timestamp,
      path: '/test-url',
    });
  });
});
