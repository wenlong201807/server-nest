import { Test, TestingModule } from '@nestjs/testing';
import { CertificationTypeService } from '../certification-type.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CertificationType } from '../entities/certification-type.entity';
import { NotFoundException } from '@nestjs/common';

describe('CertificationTypeService', () => {
  let service: CertificationTypeService;
  let mockRepository: any;

  const mockType = {
    id: 1,
    code: 'house',
    name: '房产认证',
    icon: '/icons/house.png',
    description: '房产证认证',
    requiredFields: ['name', 'id_card', 'property_book'],
    sortOrder: 1,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificationTypeService,
        {
          provide: getRepositoryToken(CertificationType),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CertificationTypeService>(CertificationTypeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该返回所有启用的认证类型', async () => {
      mockRepository.find.mockResolvedValue([mockType]);

      const result = await service.findAll(true);

      expect(result).toEqual([mockType]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isEnabled: true },
        order: { sortOrder: 'ASC', id: 'ASC' },
      });
    });

    it('应该返回所有认证类型（包括禁用的）', async () => {
      mockRepository.find.mockResolvedValue([mockType]);

      const result = await service.findAll(false);

      expect(result).toEqual([mockType]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { sortOrder: 'ASC', id: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('应该返回存在的认证类型', async () => {
      mockRepository.findOne.mockResolvedValue(mockType);

      const result = await service.findOne(1);

      expect(result).toEqual(mockType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('应该抛出异常当认证类型不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('认证类型 999 不存在');
    });
  });

  describe('findByCode', () => {
    it('应该返回存在的认证类型', async () => {
      mockRepository.findOne.mockResolvedValue(mockType);

      const result = await service.findByCode('house');

      expect(result).toEqual(mockType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'house', isEnabled: true },
      });
    });

    it('应该抛出异常当认证类型不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByCode('invalid')).rejects.toThrow(NotFoundException);
      await expect(service.findByCode('invalid')).rejects.toThrow('认证类型 invalid 不存在');
    });
  });

  describe('create', () => {
    it('应该创建认证类型', async () => {
      const data = {
        code: 'new_type',
        name: '新类型',
        icon: '/icons/new.png',
        description: '新认证类型',
      };

      mockRepository.create.mockReturnValue(mockType);
      mockRepository.save.mockResolvedValue(mockType);

      const result = await service.create(data);

      expect(result).toEqual(mockType);
      expect(mockRepository.create).toHaveBeenCalledWith(data);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('应该更新认证类型', async () => {
      const data = { name: '更新后的名称' };
      const updatedType = { ...mockType, name: '更新后的名称' };

      mockRepository.findOne.mockResolvedValue(mockType);
      mockRepository.save.mockResolvedValue(updatedType);

      const result = await service.update(1, data);

      expect(result.name).toBe('更新后的名称');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('应该抛出异常当认证类型不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('应该删除认证类型', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('initDefaultTypes', () => {
    it('应该初始化默认认证类型', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockType);

      await service.initDefaultTypes();

      expect(mockRepository.save).toHaveBeenCalledTimes(5);
    });

    it('应该跳过已存在的认证类型', async () => {
      mockRepository.findOne.mockResolvedValue(mockType);

      await service.initDefaultTypes();

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
