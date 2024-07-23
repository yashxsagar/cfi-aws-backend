import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import * as notion from 'notion-types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(profile: any): Promise<any> {
    const user = await this.usersService.findOrCreate(profile);
    return user;
  }

  async login(user: any) {
    const payload = {
      username: user.name,
      sub: user.id,
      email: user.email,
      image: user.image,
      accessToken: user.accessToken,
      databaseId: user.databaseId,
    };
    const jwtToken = this.jwtService.sign(payload);
    await this.usersService.storeToken(
      user.id,
      user.accessToken,
      user.refreshToken,
      jwtToken,
    );
    return {
      jwtToken,
    };
  }

  async verifyToken(token: string) {
    return this.jwtService.verify(token);
  }
}
