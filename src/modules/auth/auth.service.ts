import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
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
import * as nodemailer from 'nodemailer';

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
          $setOnInsert: { currency: 'JOD' },
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

    if (!user) {
      throw new NotFoundException('No account found with this email');
    }

    const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
    const tokenHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    await this.usersService.setResetPasswordToken(email, tokenHash, expiresAt);
    await this.sendResetPasswordEmail(email, code);

    const returnTokenInResponse = this.configService.get<string>('AUTH_RETURN_RESET_TOKEN') === 'true';
    if (returnTokenInResponse) {
      return { success: true, resetCode: code, resetToken: code, expiresAt };
    }
    return { success: true, message: 'If this email exists, reset instructions were sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const rawCode = dto.code?.trim();
    if (!rawCode) {
      throw new BadRequestException('Reset code is required');
    }

    const tokenHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const user = await this.usersService.findByResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const nextHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePasswordHash(user._id.toString(), nextHash);
    await this.usersService.clearResetPasswordToken(user._id.toString());

    return { success: true, message: 'Password reset successfully' };
  }

  private async sendResetPasswordEmail(email: string, code: string) {
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
            html: `<p>Your SADAD reset code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:3px;">${code}</p><p>This code expires in 15 minutes.</p>`,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          this.logger.warn(`Resend failed (${response.status}): ${body}`);
        } else {
          return;
        }
      } catch (error: any) {
        this.logger.warn(`Resend request failed: ${error?.message ?? String(error)}`);
      }
    }

    try {
      await this.sendEmailViaSmtp({
        to: email,
        subject: 'Reset your SADAD password',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
            <p>Hello,</p>
            <p>We received a request to reset your SADAD account password.</p>
            <p>Your reset code is:</p>
            <p style="font-size:24px;font-weight:700;letter-spacing:3px;">${code}</p>
            <p>This code expires in 15 minutes.</p>
            <p>If you did not request this change, you can ignore this email.</p>
          </div>
        `,
      });
      return;
    } catch (error: any) {
      this.logger.warn(`SMTP password reset email failed: ${error?.message ?? String(error)}`);
    }

    const allowLog =
      this.configService.get<string>('AUTH_RETURN_RESET_TOKEN') === 'true' ||
      process.env.NODE_ENV !== 'production';
    if (allowLog) {
      // Fallback for local development
      this.logger.log(`Password reset code for ${email}: ${code}`);
    }
  }

  private createSmtpTransport() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const secure = String(this.configService.get<string>('SMTP_SECURE') ?? 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      throw new Error('SMTP credentials missing');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  private async sendEmailViaSmtp(input: { to: string; subject: string; html: string }) {
    const from = this.configService.get<string>('SMTP_FROM') ?? this.configService.get<string>('RESEND_FROM_EMAIL');
    if (!from) {
      throw new Error('SMTP_FROM is required');
    }

    const transporter = this.createSmtpTransport();
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  }
}
