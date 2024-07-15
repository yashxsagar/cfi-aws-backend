import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { NotionOAuth2Strategy } from './strategies/notion-oauth2.strategy';
import { UsersModule } from '../users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { DatabaseService } from 'src/database/database.service';
import { AuthController } from './auth.controller';
import { NotionService } from 'src/notion/notion.service';
import { GenerateCfiService } from 'src/generatecfi/generatecfi.service';
import { VercelBlobService } from 'src/vercel-blob/vercel-blob.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '180d' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    NotionOAuth2Strategy,
    UsersService,
    ConfigService,
    DatabaseService,
    NotionService,
    GenerateCfiService,
    VercelBlobService,
  ],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
