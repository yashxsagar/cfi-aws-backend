import { Controller, Get, Req, Res, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { NotionService } from '../notion/notion.service';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { NotionOAuth2Strategy } from './strategies/notion-oauth2.strategy';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import axios from 'axios';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly notionService: NotionService,
    private readonly configService: ConfigService,
    private readonly notionOAuth2Strategy: NotionOAuth2Strategy,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  @Get('login')
  //   @UseGuards(AuthGuard('notion'))
  async login(@Req() req: Request, @Res() res: Response) {
    // This will initiate the Notion OAuth2 login flow
    const token = req.cookies.jwt;
    if (token) {
      try {
        const decoded = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_SECRET'),
        });
        const user = await this.usersService.findById(decoded.sub);
        if (user) {
          const notionWorkspaceUrl = await this.notionService.getWorkspaceUrl(
            user.accessToken,
          );
          return res.redirect(notionWorkspaceUrl);
        }
      } catch (error) {
        // Token validation failed, proceed with OAuth2 flow
      }
    }
    return res.redirect('/auth/notion'); // Trigger the OAuth2 flow
  }

  @Get('notion')
  @UseGuards(AuthGuard('notion'))
  async notionLogin(@Req() req: Request) {
    // The actual login process will be handled by the Notion OAuth2 strategy
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    try {
      console.log('Notion issued code prior to profile fetch is: ' + code);
      const tokenData = await this.notionOAuth2Strategy.getToken(code);
      const userProfile = await axios.get(
        'https://api.notion.com/v1/users/me',
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Notion-Version': '2022-06-28',
          },
        },
      );
      console.log(userProfile.data.bot.owner);
      const database = await this.notionService.findOrCreateDatabase(
        tokenData.access_token,
      );
      const databaseId = database.id;
      const user = await this.authService.validateUser({
        providerId: userProfile.data.bot.owner.user.id,
        name: userProfile.data.bot.owner.user.name,
        email: userProfile.data.bot.owner.user.person.email,
        databaseId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      });

      //   await this.notionService.findOrCreateDatabase(tokenData.access_token);
      const jwt = await this.authService.login(user);
      console.log(jwt);
      res.cookie('jwt', jwt.jwtToken, {
        httpOnly: true,
        maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days in milliseconds
        // secure: this.configService.get('NODE_ENV') === 'production',
      });

      const notionWorkspaceUrl = await this.notionService.getWorkspaceUrl(
        tokenData.access_token,
      );
      console.log(notionWorkspaceUrl);

      // Start polling for the new user
      await this.notionService.startPolling(
        tokenData.access_token,
        user.id,
        databaseId,
      );

      return res.redirect(notionWorkspaceUrl);
    } catch (error) {
      console.error('Error during OAuth2 callback:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

// import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { AuthService } from './auth.service';
// import { NotionService } from '../notion/notion.service';
// import { Request, Response } from 'express';
// import { ConfigService } from '@nestjs/config';

// @Controller('auth')
// export class AuthController {
//   constructor(
//     private readonly authService: AuthService,
//     private readonly notionService: NotionService,
//     private readonly configService: ConfigService,
//   ) {}

//   @Get('login')
//   @UseGuards(AuthGuard('notion'))
//   async login(@Req() req: Request) {
//     // const user = await this.authService.validateUser(req.user.profile);
//     // await this.notionService.createOrUpdateDatabase(
//     //   user.id,
//     //   'CompX Fairness Indicator',
//     // );
//     // return this.authService.login(user);
//   }

//   @Get('callback')
//   @UseGuards(AuthGuard('notion'))
//   async callback(@Req() req: any, @Res() res: Response) {
//     const user = await this.authService.validateUser(req.user.profile);
//     await this.notionService.findOrCreateDatabase(user.accessToken);
//     const jwt = await this.authService.login(user);
//     res.cookie('jwt', jwt.accessToken, {
//       httpOnly: true,
//       secure: this.configService.get('NODE_ENV') === 'production',
//     });
//     // return res.redirect(this.configService.get('FRONTEND_URL'));
//     const notionWorkspaceUrl = await this.notionService.getWorkspaceUrl(
//       user.accessToken,
//     );

//     return res.redirect(notionWorkspaceUrl);
//   }
// }
