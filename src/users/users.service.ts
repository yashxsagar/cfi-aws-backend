import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: DatabaseService) {}

  async findOrCreate(profile: any): Promise<User> {
    const {
      providerId,
      name,
      email,
      //   workspaceName,
      databaseId,
      accessToken,
      refreshToken,
    } = profile;
    let user = await this.prisma.user.findUnique({
      where: { providerId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          providerId,
          name,
          //   workspaceName,
          email,
          databaseId,
          accessToken,
          refreshToken,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { providerId },
        data: { accessToken, refreshToken, name, email },
      });
    }

    return user;
  }

  async storeToken(
    userId: string,
    accessToken: string,
    refreshToken: string,
    token: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { jwtToken: token, accessToken, refreshToken },
    });
  }

  async findToken(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return user?.jwtToken || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
