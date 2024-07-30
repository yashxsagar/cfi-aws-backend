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
    console.log(
      'The cookie received from the Next js request header is: ' + token,
    );
    if (token) {
      try {
        const decoded = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_SECRET'),
        });
        const user = await this.usersService.findById(decoded.sub);
        console.log(
          'The decoded user obtained from the Next js request header is: ' +
            JSON.stringify(user),
        );
        if (user) {
          const notionWorkspaceUrl = await this.notionService.getWorkspaceUrl(
            user.databaseId,
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
      let databaseId = undefined;
      const database = await this.notionService.findOrCreateDatabase(
        tokenData.access_token,
        tokenData.duplicated_template_id,
      );
      if (database == undefined) {
        try {
          const existingUser = await this.usersService.findByEmail(
            userProfile.data.bot.owner.user.person.email,
          );
          if (existingUser) {
            databaseId = existingUser.databaseId;
          } else {
            return res.redirect('/auth/notion');
          }
        } catch (error) {
          throw new Error(error.message);
        }
      } else {
        databaseId = database.id;
      }
      const user = await this.authService.validateUser({
        providerId: userProfile.data.bot.owner.user.id,
        name: userProfile.data.bot.owner.user.name,
        email: userProfile.data.bot.owner.user.person.email,
        image: userProfile.data.bot.owner.user.avatar_url,
        databaseId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      });

      //   await this.notionService.findOrCreateDatabase(tokenData.access_token);
      const jwt = await this.authService.login(user);
      console.log(jwt);
      //   res.cookie('jwt', jwt.jwtToken, {
      //     httpOnly: true,
      //     maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days in milliseconds
      //     sameSite: 'none',
      //     secure: true,
      //     // secure: this.configService.get('NODE_ENV') === 'production',
      //   });

      const notionWorkspaceUrl =
        await this.notionService.getWorkspaceUrl(databaseId);
      console.log(notionWorkspaceUrl);

      // Start polling for the new user
      await this.notionService.startPolling(
        tokenData.access_token,
        user.id,
        databaseId,
      );

      //   return res.redirect(notionWorkspaceUrl);

      // Redirect to the Next.js API route with the JWT token and workspace URL
      return res.redirect(
        `${this.configService.get('NEXT_APP_URL')}/api/auth/callback?token=${jwt.jwtToken}&workspaceUrl=${encodeURIComponent(notionWorkspaceUrl)}`,
      );
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
