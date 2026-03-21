export interface ResponseDto<T = any> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

export class PaginationDto<T = any> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export class PaginationQueryDto {
  page?: number = 1;
  pageSize?: number = 20;
}
