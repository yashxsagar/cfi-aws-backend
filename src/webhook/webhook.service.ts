import { Injectable, Logger } from '@nestjs/common';
import { GenerateCfiService } from '../generatecfi/generatecfi.service';
import { NotionService } from '../notion/notion.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly generateCfiService: GenerateCfiService,
    private readonly notionService: NotionService,
  ) {}

  async processWebhook(data: any) {
    const {
      UserId,
      AccessToken,
      pageId,
      jobTitle,
      location,
      state,
      compensationOffered,
    } = data;

    try {
      const fairnessIndicator =
        await this.generateCfiService.getFairnessIndicator(
          jobTitle,
          location,
          state,
          compensationOffered,
        );

      await this.notionService.updateFairnessIndicator(
        AccessToken,
        pageId,
        fairnessIndicator.signal,
        fairnessIndicator.assessment,
      );

      await this.notionService.appendFileToDatabase(
        AccessToken,
        pageId,
        fairnessIndicator.pdfUrl,
        `${jobTitle} ${location} Fairness Report`,
      );

      this.logger.log(
        `Processed webhook data for user ${UserId} successfully.`,
      );
    } catch (error) {
      this.logger.error(`Error processing webhook data: ${error.message}`);
    }
  }
}
