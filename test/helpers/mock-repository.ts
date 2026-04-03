import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class MockRepository<T> {
  private entities: T[] = [];

  create(entity: Partial<T>): T {
    return entity as T;
  }

  async save(entity: T): Promise<T> {
    this.entities.push(entity);
    return entity;
  }

  async find(options?: any): Promise<T[]> {
    return this.entities;
  }

  async findOne(options?: any): Promise<T | null> {
    return this.entities[0] || null;
  }

  async update(criteria: any, partialEntity: any): Promise<any> {
    return { affected: 1 };
  }

  async delete(criteria: any): Promise<any> {
    return { affected: 1 };
  }

  async remove(entity: T): Promise<T> {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }
    return entity;
  }

  async count(options?: any): Promise<number> {
    return this.entities.length;
  }

  createQueryBuilder(alias?: string): any {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(this.entities),
      getOne: jest.fn().mockResolvedValue(this.entities[0] || null),
      getManyAndCount: jest.fn().mockResolvedValue([this.entities, this.entities.length]),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      increment: jest.fn().mockReturnThis(),
      decrement: jest.fn().mockReturnThis(),
    };
  }

  // 测试辅助方法
  setEntities(entities: T[]) {
    this.entities = entities;
 n  clear() {
    this.entities = [];
  }
}

export const createMockRepository = <T>() => new MockRepository<T>();

export const getMockRepositoryToken = (entity: any) => getRepositoryToken(entity);
