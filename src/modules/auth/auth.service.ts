import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserDocument } from '../users/schemas/user.schema';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<UserDocument> {
    const { email } = registerDto;
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    return this.usersService.create(registerDto);
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
}
