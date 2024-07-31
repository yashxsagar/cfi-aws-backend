import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Client } from '@notionhq/client';
import { GenerateCfiService } from '../generatecfi/generatecfi.service';
import { DatabaseService } from '../database/database.service';
import { SQS } from 'aws-sdk';
import { DynamoDB } from 'aws-sdk';
import {
  PageObjectResponse,
  PartialPageObjectResponse,
  PartialDatabaseObjectResponse,
  DatabaseObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import * as AWS from 'aws-sdk';

@Injectable()
export class NotionService {
  private notion: Client;
  private readonly logger = new Logger(NotionService.name);
  private sqs = new SQS();
  private dynamodb = new DynamoDB.DocumentClient();

  constructor(
    private generateCfiService: GenerateCfiService,
    private readonly databaseService: DatabaseService,
  ) {}

  async findOrCreateDatabase(
    accessToken: string,
    duplicated_template_id?: string,
  ) {
    this.notion = new Client({ auth: accessToken });
    console.log('The users access token is:' + accessToken);

    if (duplicated_template_id) {
      try {
        // const database = await this.notion.databases.retrieve({
        //   database_id: duplicated_template_id,
        // });
        const database = await this.retryFetchDatabase(
          duplicated_template_id,
          accessToken,
        );
        console.log(database);
        return database;
      } catch (error) {
        this.logger.error(
          `Error finding or creating database: ${error.message}`,
        );
        throw error;
        // const database = await this.findDatabase();
        // if (database) {
        //   this.logger.log(`Database found: ${database.id}`);
        //   return database;
        // }
        // throw new Error('No database found. Please duplicate the template.');
      }
    } else {
      return undefined;
    }
  }

  private async retryFetchDatabase(
    duplicated_databaseId: string,
    accessToken: string,
    retries = 5,
    delay = 1000,
  ) {
    this.notion = new Client({ auth: accessToken });
    let attempt = 0;

    while (attempt < retries) {
      try {
        return await this.notion.databases.retrieve({
          database_id: duplicated_databaseId,
        });
      } catch (error) {
        if (error.status === 404 && attempt < retries - 1) {
          attempt++;
          this.logger.warn(
            `Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`,
          );
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw error; // Rethrow if not a 404 or out of retries
        }
      }
    }
    throw new Error(
      `Failed to retrieve database with ID: ${duplicated_databaseId} after ${retries} attempts.`,
    );
  }

  private async findDatabase() {
    try {
      const response = await this.notion.search({
        query: 'CompX Fairness Indicator',
        filter: {
          value: 'database',
          property: 'object',
        },
      });

      return response.results.length ? response.results[0] : null;
    } catch (error) {
      this.logger.error(`Error finding database: ${error.message}`);
      throw error;
    }
  }

  async updateFairnessIndicator(
    accessToken: string,
    pageId: string,
    fairnessIndicator: string,
    assessmentRemarks: string,
  ) {
    this.notion = new Client({ auth: accessToken });

    const fairnessIndicatorColor = this.getBackgroundColor(fairnessIndicator);
    const assessmentRemarksColor = this.getBackgroundColor(fairnessIndicator);

    try {
      const response = await this.notion.pages.update({
        page_id: pageId,
        properties: {
          'Fairness Indicator': {
            rich_text: [
              {
                text: {
                  content: fairnessIndicator,
                },
                annotations: {
                  color: fairnessIndicatorColor,
                },
              },
            ],
          },
          'Assessment Remarks': {
            rich_text: [
              {
                text: {
                  content: assessmentRemarks,
                },
                annotations: {
                  color: assessmentRemarksColor,
                },
              },
            ],
          },
          Status: {
            status: {
              name: 'Evaluation Complete!',
              color: 'green',
            },
          },
        },
      });
      this.logger.log(`Updated Fairness Indicator for page: ${pageId}`);
      return response;
    } catch (error) {
      this.logger.error(`Error updating Fairness Indicator: ${error.message}`);
      throw error;
    }
  }

  private getBackgroundColor(value: string): any {
    switch (value) {
      case 'Fair':
        return 'yellow_background';
      case 'Solid (Hindi Users: हार्ड :))':
        return 'purple_background';
      case 'Very Solid':
        return 'blue_background';
      case 'Lottery':
        return 'green_background';
      case 'Underpaid':
        return 'pink_background';
      case 'Undervalued':
        return 'orange_background';
      case 'Lowballed!':
        return 'red_background';
      default:
        return 'gray';
    }
  }

  private isPageObjectResponse(object: any): object is PageObjectResponse {
    return 'properties' in object;
  }

  private getSelectProperty(property: any) {
    return property?.type === 'select' ? property.select.name : null;
  }

  private getTextProperty(property: any) {
    return property?.type === 'rich_text' && property.rich_text.length > 0
      ? property.rich_text[0].text.content
      : null;
  }

  private getNumberProperty(property: any) {
    return property?.type === 'number' ? property.number : null;
  }

  async startPolling(accessToken: string, userId: string, databaseId: string) {
    const params = {
      TableName: 'CompXPollingTable',
      Item: {
        UserId: userId,
        AccessToken: accessToken,
        DatabaseId: databaseId,
      },
    };

    try {
      await this.dynamodb.put(params).promise();
      this.logger.log(`Added user ${userId} to DynamoDB for polling.`);

      // Immediately trigger the first poll
      await this.triggerPollingLambda(userId, accessToken, databaseId);
    } catch (error) {
      this.logger.error(`Error adding user to DynamoDB: ${error.message}`);
    }
  }

  private async triggerPollingLambda(
    userId: string,
    accessToken: string,
    databaseId: string,
  ) {
    const lambda = new AWS.Lambda();
    const payload = {
      userId,
      accessToken,
      databaseId,
    };

    try {
      await lambda
        .invoke({
          FunctionName: 'CompXPollingFunction',
          InvocationType: 'Event',
          Payload: JSON.stringify(payload),
        })
        .promise();

      this.logger.log(`Triggered Lambda polling for user ${userId}.`);
    } catch (error) {
      this.logger.error(`Error triggering Lambda polling: ${error.message}`);
    }
  }

  async getWorkspaceUrl(databaseId: string): Promise<string> {
    try {
      // const response = await this.notion.search({
      //   query: 'CompX Fairness Indicator',
      //   filter: {
      //     value: 'database',
      //     property: 'object',
      //   },
      // });
      const response = (await this.notion.databases.retrieve({
        database_id: databaseId,
      })) as { url: string };

      if (response) {
        const database = response;
        console.log(database);
        // console.log(JSON.stringify(database));
        // return `https://www.notion.so/${database.id.replace(/-/g, '')}`;
        return database.url;
      } else {
        throw new Error('No CompX Fairness Indicator database found.');
      }
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        throw new UnauthorizedException(
          'Notion API access unauthorized or forbidden.',
        );
      }
      this.logger.error(`Error getting workspace URL: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to retrieve workspace URL.',
      );
      // throw error;
    }
  }

  async appendFileToDatabase(
    accessToken: string,
    pageId: string,
    fileUrl: string,
    fileName: string,
  ) {
    this.notion = new Client({ auth: accessToken });

    const response = await this.notion.pages.update({
      page_id: pageId,
      properties: {
        Justification: {
          files: [
            {
              name: fileName,
              type: 'external',
              external: {
                url: fileUrl,
              },
            },
          ],
        },
      },
    });
    return response;
  }
}

// import { Injectable, Logger } from '@nestjs/common';
// import { Client } from '@notionhq/client';
// import { GenerateCfiService } from '../generatecfi/generatecfi.service';
// import {
//   PageObjectResponse,
//   PartialPageObjectResponse,
//   PartialDatabaseObjectResponse,
//   DatabaseObjectResponse,
// } from '@notionhq/client/build/src/api-endpoints';
// import { DatabaseService } from '../database/database.service';
// import { Color, ColorFormat } from 'notion-types';

// @Injectable()
// export class NotionService {
//   private notion: Client;
//   private readonly logger = new Logger(NotionService.name);

//   constructor(
//     private generateCfiService: GenerateCfiService,
//     private readonly databaseService: DatabaseService,
//   ) {
//     // this.notion = new Client({ auth: process.env.NOTION_TOKEN });
//     // this.startPolling(accessToken);
//   }

//   async findOrCreateDatabase(accessToken: string) {
//     try {
//       this.notion = new Client({ auth: accessToken });
//       const database = await this.findDatabase();
//       if (database) {
//         this.logger.log(`Database found: ${database.id}`);
//         return database;
//       }
//       throw new Error('No database found. Please duplicate the template.');
//     } catch (error) {
//       this.logger.error(`Error finding or creating database: ${error.message}`);
//       throw error;
//     }
//   }

//   private async findDatabase() {
//     try {
//       const response = await this.notion.search({
//         query: 'CompX Fairness Indicator',
//         filter: {
//           value: 'database',
//           property: 'object',
//         },
//       });

//       return response.results.length ? response.results[0] : null;
//     } catch (error) {
//       this.logger.error(`Error finding database: ${error.message}`);
//       throw error;
//     }
//   }

//   async updateFairnessIndicator(
//     accessToken: string,
//     pageId: string,
//     fairnessIndicator: string,
//     assessmentRemarks: string,
//   ) {
//     this.notion = new Client({ auth: accessToken });

//     const fairnessIndicatorColor = this.getBackgroundColor(fairnessIndicator);
//     const assessmentRemarksColor = this.getBackgroundColor(fairnessIndicator);

//     try {
//       const response = await this.notion.pages.update({
//         page_id: pageId,
//         properties: {
//           'Fairness Indicator': {
//             rich_text: [
//               {
//                 text: {
//                   content: fairnessIndicator,
//                 },
//                 annotations: {
//                   color: fairnessIndicatorColor,
//                 },
//               },
//             ],
//           },
//           'Assessment Remarks': {
//             rich_text: [
//               {
//                 text: {
//                   content: assessmentRemarks,
//                 },
//                 annotations: {
//                   color: assessmentRemarksColor,
//                 },
//               },
//             ],
//           },
//           Status: {
//             status: {
//               name: 'Evaluation Complete!',
//               color: 'green',
//             },
//           },
//         },
//       });
//       this.logger.log(`Updated Fairness Indicator for page: ${pageId}`);
//       return response;
//     } catch (error) {
//       this.logger.error(`Error updating Fairness Indicator: ${error.message}`);
//       throw error;
//     }
//   }

//   //determine the bg-color of the 2 computed/generated fields
//   private getBackgroundColor(value: string): any {
//     switch (value) {
//       case 'Fair':
//         return 'yellow_background';
//       case 'Solid (Hindi Users: हार्ड :))':
//         return 'purple_background';
//       case 'Very Solid':
//         return 'blue_background';
//       case 'Lottery':
//         return 'green_background';
//       case 'Underpaid':
//         return 'pink_background';
//       case 'Undervalued':
//         return 'orange_background';
//       case 'Lowballed!':
//         return 'red_background';
//       default:
//         return 'gray';
//     }
//   }

//   private isPageObjectResponse(object: any): object is PageObjectResponse {
//     return 'properties' in object;
//   }

//   private getSelectProperty(property: any) {
//     return property?.type === 'select' ? property.select.name : null;
//   }

//   private getTextProperty(property: any) {
//     return property?.type === 'rich_text' && property.rich_text.length > 0
//       ? property.rich_text[0].text.content
//       : null;
//   }

//   private getNumberProperty(property: any) {
//     return property?.type === 'number' ? property.number : null;
//   }

//   async startPolling(accessToken: string) {
//     this.notion = new Client({ auth: accessToken });

//     setInterval(async () => {
//       try {
//         this.logger.log('Polling started');
//         const database = await this.findOrCreateDatabase(accessToken);
//         const databaseId = database.id;
//         const response = await this.notion.databases.query({
//           database_id: databaseId,
//           filter: {
//             and: [
//               {
//                 property: 'Job Title',
//                 select: {
//                   is_not_empty: true,
//                 },
//               },
//               {
//                 property: 'Location',
//                 rich_text: {
//                   is_not_empty: true,
//                 },
//               },
//               {
//                 property: 'State',
//                 select: {
//                   is_not_empty: true,
//                 },
//               },
//               {
//                 property: 'Compensation Offered',
//                 number: {
//                   is_not_empty: true,
//                 },
//               },
//               {
//                 property: 'Fairness Indicator',
//                 rich_text: {
//                   is_empty: true,
//                 },
//               },
//             ],
//           },
//         });

//         this.logger.log(
//           `Found ${response.results.length} new entries to process.`,
//         );

//         for (const page of response.results) {
//           if (this.isPageObjectResponse(page)) {
//             const jobTitle = this.getSelectProperty(
//               page.properties['Job Title'],
//             );
//             const location = this.getTextProperty(page.properties['Location']);
//             const state = this.getSelectProperty(page.properties['State']);
//             const compensationOffered = this.getNumberProperty(
//               page.properties['Compensation Offered'],
//             );

//             this.logger.log(`Processing page: ${page.id}`);
//             this.logger.log(`Job Title: ${jobTitle}`);
//             this.logger.log(`Location: ${location}`);
//             this.logger.log(`State: ${state}`);
//             this.logger.log(`Compensation Offered: ${compensationOffered}`);

//             if (jobTitle && location && state && compensationOffered !== null) {
//               const { signal, assessment, pdfUrl } =
//                 await this.generateCfiService.getFairnessIndicator(
//                   jobTitle,
//                   location,
//                   state,
//                   compensationOffered,
//                 );
//               await this.updateFairnessIndicator(
//                 accessToken,
//                 page.id,
//                 signal,
//                 assessment,
//               );
//               await this.appendFileToDatabase(
//                 accessToken,
//                 page.id,
//                 pdfUrl,
//                 `${jobTitle}_${location}_${state}_${page.id}`,
//               );
//             }
//           }
//         }
//       } catch (error) {
//         this.logger.error(`Error during polling: ${error.message}`);
//       }
//     }, 10000); // Poll every 60 seconds
//   }

//   async getWorkspaceUrl(accessToken: string): Promise<string> {
//     try {
//       const response = await this.notion.search({
//         query: 'CompX Fairness Indicator',
//         filter: {
//           value: 'database',
//           property: 'object',
//         },
//       });

//       if (response.results.length) {
//         const database = response.results[0] as DatabaseObjectResponse;
//         return `https://www.notion.so/${database.id.replace(/-/g, '')}`;
//       } else {
//         throw new Error('No CompX Fairness Indicator database found.');
//       }
//     } catch (error) {
//       this.logger.error(`Error getting workspace URL: ${error.message}`);
//       throw error;
//     }
//   }
//   async appendFileToDatabase(
//     accessToken: string,
//     pageId: string,
//     fileUrl: string,
//     fileName: string,
//   ) {
//     this.notion = new Client({ auth: accessToken });

//     const response = await this.notion.pages.update({
//       page_id: pageId,
//       properties: {
//         Justification: {
//           files: [
//             {
//               name: fileName,
//               type: 'external',
//               external: {
//                 url: fileUrl,
//               },
//             },
//           ],
//         },
//       },
//     });
//     return response;
//   }
// }

// import { Injectable } from '@nestjs/common';
// import { Client } from '@notionhq/client';
// import { GenerateCfiService } from '../generatecfi/generatecfi.service';
// import {
//   PageObjectResponse,
//   PartialPageObjectResponse,
//   PartialDatabaseObjectResponse,
//   DatabaseObjectResponse,
// } from '@notionhq/client/build/src/api-endpoints';
// import { DatabaseService } from '../database/database.service';

// @Injectable()
// export class NotionService {
//   private notion: Client;

//   constructor(
//     private generateCfiService: GenerateCfiService,
//     private readonly databaseService: DatabaseService,
//   ) {
//     // this.notion = new Client({ auth: process.env.NOTION_TOKEN });
//     // this.startPolling(accessToken);
//   }

//   async findOrCreateDatabase(accessToken: string) {
//     this.notion = new Client({ auth: accessToken });
//     const database = await this.findDatabase();
//     if (database) {
//       return database;
//     }
//     throw new Error('No database found. Please duplicate the template.');
//   }

//   private async findDatabase() {
//     const response = await this.notion.search({
//       query: 'CompX Fairness Indicator',
//       filter: {
//         value: 'database',
//         property: 'object',
//       },
//     });

//     return response.results.length ? response.results[0] : null;
//   }

//   async updateFairnessIndicator(
//     accessToken: string,
//     pageId: string,
//     fairnessIndicator: string,
//     assessmentRemarks: string,
//   ) {
//     this.notion = new Client({ auth: accessToken });

//     const response = await this.notion.pages.update({
//       page_id: pageId,
//       properties: {
//         FairnessIndicator: {
//           select: {
//             name: fairnessIndicator,
//           },
//         },
//         AssessmentRemarks: {
//           rich_text: [
//             {
//               text: {
//                 content: assessmentRemarks,
//               },
//             },
//           ],
//         },
//       },
//     });
//     return response;
//   }

//   private isPageObjectResponse(object: any): object is PageObjectResponse {
//     return 'properties' in object;
//   }

//   private getTitleProperty(property: any) {
//     return property?.type === 'title' && property.title.length > 0
//       ? property.title[0].text.content
//       : null;
//   }

//   private getTextProperty(property: any) {
//     return property?.type === 'text' && property.title.length > 0
//       ? property.title[0].text.content
//       : null;
//   }

//   private getRichTextProperty(property: any) {
//     return property?.type === 'rich_text' && property.rich_text.length > 0
//       ? property.rich_text[0].text.content
//       : null;
//   }

//   private getSelectProperty(property: any) {
//     return property?.type === 'select' ? property.select.name : null;
//   }

//   private getNumberProperty(property: any) {
//     return property?.type === 'number' ? property.number : null;
//   }

//   async startPolling(accessToken: string) {
//     this.notion = new Client({ auth: accessToken });

//     setInterval(async () => {
//       const database = await this.findOrCreateDatabase(accessToken);
//       const databaseId = database.id;
//       const response = await this.notion.databases.query({
//         database_id: databaseId,
//         filter: {
//           and: [
//             {
//               property: 'Job Title',
//               select: {
//                 is_not_empty: true,
//               },
//             },
//             {
//               property: 'Location',
//               rich_text: {
//                 is_not_empty: true,
//               },
//             },
//             {
//               property: 'State',
//               select: {
//                 is_not_empty: true,
//               },
//             },
//             {
//               property: 'Compensation Offered',
//               number: {
//                 is_not_empty: true,
//               },
//             },
//             {
//               property: 'Fairness Indicator',
//               rich_text: {
//                 is_empty: true,
//               },
//             },
//           ],
//         },
//       });

//       for (const page of response.results) {
//         if (this.isPageObjectResponse(page)) {
//           const jobTitle = this.getRichTextProperty(
//             page.properties['Job Title'],
//           );
//           const location = this.getRichTextProperty(
//             page.properties['Location'],
//           );
//           const state = this.getSelectProperty(page.properties['State']);
//           const compensationOffered = this.getNumberProperty(
//             page.properties['Compensation Offered'],
//           );

//           if (jobTitle && location && state && compensationOffered !== null) {
//             const { signal, assessment } =
//               await this.generateCfiService.getFairnessIndicator(
//                 jobTitle,
//                 location,
//                 state,
//                 compensationOffered,
//               );
//             await this.updateFairnessIndicator(
//               accessToken,
//               page.id,
//               signal,
//               assessment,
//             );
//           }
//         }
//       }
//     }, 60000); // Poll every 60 seconds
//   }
//   async getWorkspaceUrl(accessToken: string): Promise<string> {
//     const response = await this.notion.search({
//       query: 'CompX Fairness Indicator',
//       filter: {
//         value: 'database',
//         property: 'object',
//       },
//     });

//     if (response.results.length) {
//       const database = response.results[0] as DatabaseObjectResponse;
//       return `https://www.notion.so/${database.id.replace(/-/g, '')}`;
//     } else {
//       throw new Error('No CompX Fairness Indicator database found.');
//     }
//   }
// }
