import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { FileService } from '../../file/file.service';
import { ConfigService } from '@nestjs/config';

describe('UserController', () => {
  let controller: UserController;
  let userService: any;
  let fileService: any;
  let configService: any;

  beforeEach(async () => {
    userService = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    fileService = {
      generatePresignedUrl: jest.fn(),
      create: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('http://localhost:9002'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: FileService,
          useValue: fileService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('应该返回当前用户信息（无头像）', async () => {
      const userId = 1;
      const mockUser = {
        id: 1,
        mobile: '13800138000',
        nickname: 'TestUser',
        avatarPath: null,
      };
      userService.findById.mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(userId);

      expect(result).toEqual(mockUser);
      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(fileService.generatePresignedUrl).not.toHaveBeenCalled();
    });

    it('应该返回当前用户信息（有头像）', async () => {
      const userId = 1;
      const mockUser = {
        id: 1,
        mobile: '13800138000',
        nickname: 'TestUser',
        avatarPath: 'avatars/user1.jpg',
      };
      const mockAvatarUrl = 'http://localhost:9002/avatars/user1.jpg?token=xxx';
      userService.findById.mockResolvedValue(mockUser);
      fileService.generatePresignedUrl.mockResolvedValue(mockAvatarUrl);

      const result = await controller.getCurrentUser(userId);

      expect(result).toEqual({
        ...mockUser,
        avatarUrl: mockAvatarUrl,
      });
      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(fileService.generatePresignedUrl).toHaveBeenCalledWith('avatars/user1.jpg');
    });
  });

  describe('updateUser', () => {
    it('应该调用 userService.update 更新用户信息', async () => {
      const userId = 1;
      const dto = {
        nickname: 'NewNickname',
        gender: 1,
      };
      const mockUpdatedUser = {
        id: 1,
        mobile: '13800138000',
        nickname: 'NewNickname',
        gender: 1,
      };
      userService.update.mockResolvedValue(mockUpdatedUser);

      const result = await controller.updateUser(userId, dto);

      expect(result).toEqual(mockUpdatedUser);
      expect(userService.update).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('uploadAvatar', () => {
    it('应该上传头像并返回文件信息', async () => {
      const userId = 1;
      const body = { filePath: 'avatars/user1.jpg' };
      const mockFileRecord = {
        id: 10,
        filePath: 'avatars/user1.jpg',
        fileName: 'user1.jpg',
        originalName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileExt: 'jpg',
        fileSize: 0,
        uploadUserId: userId,
        uploadNickname: '',
        type: 'avatar',
        status: 1,
      };
      const mockAvatarUrl = 'http://localhost:9002/avatars/user1.jpg?token=xxx';
      const mockUpdatedUser = {
        id: userId,
        avatarUrl: 'avatars/user1.jpg',
        avatarPath: 'avatars/user1.jpg',
      };

      fileService.create.mockResolvedValue(mockFileRecord);
      fileService.generatePresignedUrl.mockResolvedValue(mockAvatarUrl);
      userService.update.mockResolvedValue(mockUpdatedUser);

      const result = await controller.uploadAvatar(userId, body);

      expect(result).toEqual({
        id: 10,
        filePath: 'avatars/user1.jpg',
        url: mockAvatarUrl,
      });
      expect(fileService.create).toHaveBeenCalledWith({
        filePath: 'avatars/user1.jpg',
        fileName: 'user1.jpg',
        originalName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileExt: 'jpg',
        fileSize: 0,
        uploadUserId: userId,
        uploadNickname: '',
        type: 'avatar',
        status: 1,
      });
      expect(fileService.generatePresignedUrl).toHaveBeenCalledWith('avatars/user1.jpg');
      expect(userService.update).toHaveBeenCalledWith(userId, {
        avatarUrl: 'avatars/user1.jpg',
        avatarPath: 'avatars/user1.jpg',
      });
    });

    it('应该处理带路径的文件名', async () => {
      const userId = 2;
      const body = { filePath: 'uploads/avatars/test/avatar.png' };
      const mockFileRecord = {
        id: 20,
        filePath: 'uploads/avatars/test/avatar.png',
        fileName: 'avatar.png',
      };
      const mockAvatarUrl = 'http://localhost:9002/uploads/avatars/test/avatar.png?token=yyy';

      fileService.create.mockResolvedValue(mockFileRecord);
      fileService.generatePresignedUrl.mockResolvedValue(mockAvatarUrl);
      userService.update.mockResolvedValue({});

      const result = await controller.uploadAvatar(userId, body);

      expect(result.filePath).toBe('uploads/avatars/test/avatar.png');
      expect(fileService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'avatar.png',
          filePath: 'uploads/avatars/test/avatar.png',
        }),
      );
    });
  });
});
