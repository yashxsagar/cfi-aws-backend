import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class NotionOAuth2Strategy extends PassportStrategy(Strategy, 'notion') {
  private readonly logger = new Logger(NotionOAuth2Strategy.name);

  constructor(configService: ConfigService) {
    super({
      authorizationURL: configService.get('AUTHORIZATION_URL'),
      tokenURL: 'https://api.notion.com/v1/oauth/token',
      clientID: configService.get('NOTION_CLIENT_ID'),
      clientSecret: configService.get('NOTION_CLIENT_SECRET'),
      callbackURL: configService.get('NOTION_CALLBACK_URL'),
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    try {
      this.logger.log(`Access Token: ${accessToken}`);
      this.logger.log(`Refresh Token: ${refreshToken}`);
      this.logger.log(`Profile: ${JSON.stringify(profile)}`);

      const userProfile = await axios.get(
        'https://api.notion.com/v1/users/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Notion-Version': '2022-06-28',
          },
        },
      );

      const user = {
        providerId: userProfile.data.bot.owner.user.id,
        name: userProfile.data.bot.owner.user.name,
        email: userProfile.data.bot.owner.user.email,
        // workspaceName: userProfile.data.workspace_name, // Ensure this field is correct
        accessToken,
        refreshToken,
      };

      done(null, user);
    } catch (error) {
      this.logger.error(`Error fetching user profile: ${error}`);
      done(error, false);
    }
  }

  async getToken(code: string) {
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_CALLBACK_URL;

    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${encoded}`,
        },
      },
    );
    console.log('Access Token:', response.data.access_token);
    return response.data.access_token;
  }
}

// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy } from 'passport-oauth2';
// import { ConfigService } from '@nestjs/config';
// import axios from 'axios';

// @Injectable()
// export class NotionOAuth2Strategy extends PassportStrategy(Strategy, 'notion') {
//   constructor(configService: ConfigService) {
//     super({
//       authorizationURL: configService.get('AUTHORIZATION_URL'),
//       tokenURL: 'https://api.notion.com/v1/oauth/token',
//       clientID: configService.get('NOTION_CLIENT_ID'),
//       clientSecret: configService.get('NOTION_CLIENT_SECRET'),
//       callbackURL: configService.get('NOTION_CALLBACK_URL'),
//     });
//   }

//   async validate(
//     accessToken: string,
//     refreshToken: string,
//     profile: any,
//     done: Function,
//   ) {
//     try {
//       console.log('Access Token:', accessToken);
//       console.log('Refresh Token:', refreshToken);
//       console.log('Profile:', profile);

//       const userProfile = await axios.get(
//         'https://api.notion.com/v1/users/me',
//         {
//           headers: { Authorization: `Bearer ${accessToken}` },
//         },
//       );

//       const user = {
//         providerId: userProfile.data.id,
//         email: userProfile.data.person.email,
//         name: userProfile.data.name,
//         accessToken,
//         refreshToken,
//       };

//       done(null, user);
//     } catch (error) {
//       console.error('Error fetching user profile:', error);
//       done(error, false);
//     }
//   }
// }

// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy } from 'passport-oauth2';
// import { AuthService } from '../auth.service';
// import { ConfigService } from '@nestjs/config';
// import axios from 'axios';

// @Injectable()
// export class NotionOAuth2Strategy extends PassportStrategy(Strategy, 'notion') {
//   constructor(
//     private readonly authService: AuthService,
//     private configService: ConfigService,
//   ) {
//     super({
//       authorizationURL: configService.get('AUTHORIZATION_URL'),
//       tokenURL: 'https://api.notion.com/v1/oauth/token',
//       clientID: configService.get('NOTION_CLIENT_ID'),
//       clientSecret: configService.get('NOTION_CLIENT_SECRET'),
//       callbackURL: configService.get('NOTION_CALLBACK_URL'),
//       //   scope: 'read:content',
//       scopr: ['identity', 'email'],
//     });
//   }

//   async validate(accessToken: string, refreshToken: string, profile: any) {
//     try {
//       // Get user info from Notion API
//       const { data: userInfo } = await axios.get(
//         'https://api.notion.com/v1/users/me',
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             'Notion-Version': '2022-06-28',
//           },
//         },
//       );

//       // Get workspace info from Notion API
//       const { data: workspaceInfo } = await axios.get(
//         'https://api.notion.com/v1/workspaces',
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             'Notion-Version': '2022-06-28',
//           },
//         },
//       );

//       const email = await this.getUserEmail(accessToken);

//       const profileWithWorkspace = {
//         ...userInfo,
//         workspaceName: workspaceInfo.results[0].name,
//         email,
//         accessToken,
//         refreshToken,
//       };

//       const user = await this.authService.validateUser(profileWithWorkspace);
//       if (!user) {
//         throw new UnauthorizedException();
//       }
//       return user;
//     } catch (error) {
//       throw new UnauthorizedException();
//     }
//   }

//   private async getUserEmail(accessToken: string): Promise<string> {
//     const { data: userDetails } = await axios.get(
//       'https://api.notion.com/v1/users/me',
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Notion-Version': '2021-05-13',
//         },
//       },
//     );

//     return userDetails.email;
//   }
// }
