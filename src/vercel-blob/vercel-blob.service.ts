import { Injectable } from '@nestjs/common';
import { put } from '@vercel/blob';
import * as fs from 'fs';
import { promisify } from 'util';

// const readFile = promisify(fs.readFile);

@Injectable()
export class VercelBlobService {
  private token: string;

  //   constructor() {
  //     this.token = process.env.VERCEL_BLOB_TOKEN;
  //   }

  async uploadPDF(filePath: string, fileName: string): Promise<string> {
    const fileBuffer = await fs.promises.readFile(filePath);
    const response = await put(fileName, fileBuffer, {
      access: 'public',
    });

    return response.url;
  }
}
