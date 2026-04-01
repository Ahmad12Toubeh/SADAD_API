import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { StoreSettings, StoreSettingsDocument } from '../settings/schemas/store-settings.schema';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(StoreSettings.name)
    private readonly storeModel: Model<StoreSettingsDocument>,
  ) {}

  async register(registerDto: RegisterDto): Promise<UserDocument> {
    const { email } = registerDto;
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.usersService.create(registerDto);
    if (registerDto.storeName) {
      await this.storeModel.findOneAndUpdate(
        { ownerUserId: new Types.ObjectId(user._id.toString()) },
        {
          $set: { storeName: registerDto.storeName },
          $setOnInsert: { currency: 'SAR' },
        },
        { upsert: true, new: true },
      );
    }
    return user;
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; user: any }> {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordHash = user.passwordHash ?? user.password;
    if (!passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordOk = await bcrypt.compare(password, passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user._id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string): Promise<UserDocument | undefined> {
    return this.usersService.findById(userId);
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) return undefined;
    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    // Return generic response even if account does not exist.
    if (!user) {
      return { success: true, message: 'If this email exists, reset instructions were generated.' };
    }

    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    await this.usersService.setResetPasswordToken(email, tokenHash, expiresAt);
    await this.sendResetPasswordEmail(email, token);

    const returnTokenInResponse = this.configService.get<string>('AUTH_RETURN_RESET_TOKEN') === 'true';
    if (returnTokenInResponse) {
      return { success: true, resetToken: token, expiresAt };
    }
    return { success: true, message: 'If this email exists, reset instructions were sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const rawToken = dto.token?.trim();
    if (!rawToken) {
      throw new BadRequestException('Reset token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await this.usersService.findByResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const nextHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePasswordHash(user._id.toString(), nextHash);
    await this.usersService.clearResetPasswordToken(user._id.toString());

    return { success: true, message: 'Password reset successfully' };
  }

  private async sendResetPasswordEmail(email: string, token: string) {
    const appUrl = this.configService.get<string>('APP_BASE_URL') || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');

    if (resendApiKey && fromEmail) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: 'Reset your SADAD password',
            html: `<p>Click the link below to reset your password. This link expires in 15 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          this.logger.warn(`Resend failed (${response.status}): ${body}`);
        }
        return;
      } catch (error: any) {
        this.logger.warn(`Resend request failed: ${error?.message ?? String(error)}`);
      }
    }

    // Fallback for local development
    this.logger.log(`Password reset URL for ${email}: ${resetUrl}`);
  }
}
