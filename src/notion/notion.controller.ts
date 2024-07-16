import { Controller, Post, UseGuards, Req, Logger } from '@nestjs/common';
import { NotionService } from './notion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('notion')
export class NotionController {
  private readonly logger = new Logger(NotionController.name);
  constructor(private readonly notionService: NotionService) {}

  @UseGuards(JwtAuthGuard)
  @Post('start-polling')
  async startPolling(@Req() req: RequestWithUser) {
    const user = req.user;
    this.logger.log(`User: ${JSON.stringify(user)}`);
    if (!user || !user.accessToken) {
      throw new Error('User or access token not found');
    }
    await this.notionService.startPolling(
      user.accessToken,
      user.userId,
      user.databaseId,
    );
    return { message: 'Started polling for new entries.' };
  }
}

// import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
// import { NotionService } from './notion.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { Request } from 'express';

// @Controller('notion')
// export class NotionController {
//   constructor(private readonly notionService: NotionService) {}

//   @UseGuards(JwtAuthGuard)
//   @Post('start-polling')
//   async startPolling(@Req() req: Request) {
//     const user = req.user;
//     await this.notionService.startPolling(user.accessToken);
//     return { message: 'Started polling for new entries.' };
//   }
// }
// // @Post('create-database')
// // async createDatabase(
// //   @Body('userId') userId: string,
// //   @Body('title') title: string,
// // ) {
// //   return await this.notionService.findOrCreateDatabase();
// // }
