import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { StoreSettings } from '../settings/schemas/store-settings.schema';

describe('AuthService password reset flow', () => {
  let service: AuthService;

  const usersServiceMock = {
    findByEmail: jest.fn(),
    setResetPasswordToken: jest.fn(),
    findByResetTokenHash: jest.fn(),
    updatePasswordHash: jest.fn(),
    clearResetPasswordToken: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        AUTH_RETURN_RESET_TOKEN: 'true',
        APP_BASE_URL: 'http://localhost:3000',
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: getModelToken(StoreSettings.name), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('returns success for unknown email', async () => {
    usersServiceMock.findByEmail.mockResolvedValue(undefined);
    const res = await service.forgotPassword({ email: 'none@test.com' });
    expect(res.success).toBe(true);
  });

  it('generates reset token for known email', async () => {
    usersServiceMock.findByEmail.mockResolvedValue({ _id: 'u1', email: 'user@test.com' });
    usersServiceMock.setResetPasswordToken.mockResolvedValue({});
    const res = await service.forgotPassword({ email: 'user@test.com' });
    expect(res.success).toBe(true);
    expect(typeof res.resetToken).toBe('string');
    expect(usersServiceMock.setResetPasswordToken).toHaveBeenCalled();
  });

  it('throws on invalid reset token', async () => {
    usersServiceMock.findByResetTokenHash.mockResolvedValue(undefined);
    await expect(service.resetPassword({ token: 'bad', newPassword: 'newpass123' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
