import { Test, TestingModule } from '@nestjs/testing';
import {
  CertificationTypeAdminController,
  CertificationTypePublicController,
} from '../certification-type.controller';
import { CertificationTypeService } from '../certification-type.service';

describe('CertificationTypeAdminController', () => {
  let controller: CertificationTypeAdminController;
  let certificationTypeService: any;

  beforeEach(async () => {
    certificationTypeService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      initDefaultTypes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificationTypeAdminController],
      providers: [
        {
          provide: CertificationTypeService,
          useValue: certificationTypeService,
        },
      ],
    }).compile();

    controller = module.get<CertificationTypeAdminController>(CertificationTypeAdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该调用 certificationTypeService.findAll', async () => {
      const mockList = [
        { id: 1, code: 'student', name: '学生认证', isEnabled: true },
      ];
      certificationTypeService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll();

      expect(result).toEqual({ list: mockList });
      expect(certificationTypeService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findOne', () => {
    it('应该调用 certificationTypeService.findOne', async () => {
      const mockType = { id: 1, code: 'student', name: '学生认证' };
      certificationTypeService.findOne.mockResolvedValue(mockType);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockType);
      expect(certificationTypeService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('应该调用 certificationTypeService.create', async () => {
      const dto = {
        code: 'teacher',
        name: '教师认证',
        icon: 'teacher-icon',
        description: '教师身份认证',
        requiredFields: ['realName', 'teacherId'],
        sortOrder: 2,
      };
      const mockType = { id: 2, ...dto };
      certificationTypeService.create.mockResolvedValue(mockType);

      const result = await controller.create(dto);

      expect(result).toEqual(mockType);
      expect(certificationTypeService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('应该调用 certificationTypeService.update', async () => {
      const dto = { name: '学生认证（更新）', isEnabled: false };
      certificationTypeService.update.mockResolvedValue(undefined);

      const result = await controller.update(1, dto);

      expect(result).toEqual({ message: '更新成功' });
      expect(certificationTypeService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('delete', () => {
    it('应该调用 certificationTypeService.delete', async () => {
      certificationTypeService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(1);

      expect(result).toEqual({ message: '删除成功' });
      expect(certificationTypeService.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('init', () => {
    it('应该调用 certificationTypeService.initDefaultTypes', async () => {
      certificationTypeService.initDefaultTypes.mockResolvedValue(undefined);

      const result = await controller.init();

      expect(result).toEqual({ message: '初始化成功' });
      expect(certificationTypeService.initDefaultTypes).toHaveBeenCalled();
    });
  });
});

describe('CertificationTypePublicController', () => {
  let controller: CertificationTypePublicController;
  let certificationTypeService: any;

  beforeEach(async () => {
    certificationTypeService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificationTypePublicController],
      providers: [
        {
          provide: CertificationTypeService,
          useValue: certificationTypeService,
        },
      ],
    }).compile();

    controller = module.get<CertificationTypePublicController>(CertificationTypePublicController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该调用 certificationTypeService.findAll 并返回公开字段', async () => {
      const mockList = [
        {
          id: 1,
          code: 'student',
          name: '学生认证',
          icon: 'student-icon',
          description: '学生身份认证',
          requiredFields: ['realName', 'studentId'],
          isEnabled: true,
          sortOrder: 1,
        },
      ];
      certificationTypeService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll();

      expect(result.list).toHaveLength(1);
      expect(result.list[0]).not.toHaveProperty('id');
      expect(result.list[0]).not.toHaveProperty('isEnabled');
      expect(result.list[0]).toHaveProperty('code');
      expect(result.list[0]).toHaveProperty('name');
      expect(certificationTypeService.findAll).toHaveBeenCalledWith(true);
    });
  });
});
