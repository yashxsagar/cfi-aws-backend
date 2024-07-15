import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { GeneratecfiModule } from './generatecfi/generatecfi.module';
import { UsersModule } from './users/users.module';
import { NotionModule } from './notion/notion.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseService } from './database/database.service';
import { AuthService } from './auth/auth.service';
import { UsersService } from './users/users.service';
import { JwtService } from '@nestjs/jwt';
import { VercelBlobService } from './vercel-blob/vercel-blob.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DatabaseModule,
    GeneratecfiModule,
    UsersModule,
    NotionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseService,
    AuthService,
    UsersService,
    JwtService,
    VercelBlobService,
  ],
})
export class AppModule {}
