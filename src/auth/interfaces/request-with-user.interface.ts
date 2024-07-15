import { Request } from 'express';
import { User } from '@prisma/client';

export interface RequestWithUser extends Request {
  user: {
    userId: string;
    username: string;
    accessToken: string;
  };
}
