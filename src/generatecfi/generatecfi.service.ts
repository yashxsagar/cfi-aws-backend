import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma, LCADisclosure } from '@prisma/client';
// import PDFDocument from 'pdfkit';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import { VercelBlobService } from 'src/vercel-blob/vercel-blob.service';
import axios from 'axios';

@Injectable()
export class GenerateCfiService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly vercelBlobService: VercelBlobService,
  ) {}

  async fetchData(jobTitle: string, location: string, state: string) {
    let records: LCADisclosure[];

    // Try fetching by city first
    records = await this.prisma.lCADisclosure.findMany({
      where: {
        industryJobTitle: jobTitle,
        worksiteCity: location,
        worksiteState: state,
      },
    });

    if (records.length < 7) {
      // Try fetching by county if less than 7 records found by city
      records = await this.prisma.lCADisclosure.findMany({
        where: {
          industryJobTitle: jobTitle,
          worksiteCounty: location.toUpperCase(),
          worksiteState: state,
        },
      });
    }

    if (records.length < 7) {
      // Fallback to state level
      records = await this.prisma.lCADisclosure.findMany({
        where: {
          industryJobTitle: jobTitle,
          worksiteState: state,
        },
      });
    }

    if (records.length < 7) {
      // Fallback to national level
      records = await this.prisma.lCADisclosure.findMany({
        where: {
          industryJobTitle: jobTitle,
        },
      });
    }

    return records;
  }

  calculateMeanCompensation(records: LCADisclosure[]): number {
    const totalCompensation = records.reduce(
      (sum, record) => sum + record.harmonizedWageRate,
      0,
    );
    return totalCompensation / records.length;
  }

  determineFairnessIndicator(
    offeredCompensation: number,
    meanCompensation: number,
  ): { signal: string; assessment: string } {
    const lowerBoundFair = meanCompensation * 0.95;
    const upperBoundFair = meanCompensation * 1.05;
    const upperBoundSolid = meanCompensation * 1.1;
    const upperBoundVerySolid = meanCompensation * 1.15;
    const lowerBoundUnderpaid = meanCompensation * 0.9;
    const lowerBoundUndervalued = meanCompensation * 0.85;

    if (
      offeredCompensation >= lowerBoundFair &&
      offeredCompensation <= upperBoundFair
    ) {
      return {
        signal: 'Fair',
        assessment:
          'Offered compensation is within ±5% of the mean for the given job title and Location',
      };
    } else if (
      offeredCompensation > upperBoundFair &&
      offeredCompensation <= upperBoundSolid
    ) {
      return {
        signal: 'Solid (Hindi Users: हार्ड :)) ',
        assessment:
          ' Offered compensation is between +5% and +10% of the mean for the given job title and Location',
      };
    } else if (
      offeredCompensation > upperBoundSolid &&
      offeredCompensation <= upperBoundVerySolid
    ) {
      return {
        signal: 'Very Solid (Hindi Users: बहुत हार्ड :)))',
        assessment:
          'Offered compensation is  between +10% to +15% above the mean for the given job title and Location',
      };
    } else if (offeredCompensation > upperBoundVerySolid) {
      return {
        signal: 'Lottery',
        assessment:
          'Offered compensation is more than +15% of the mean for the given job title and Location',
      };
    } else if (
      offeredCompensation >= lowerBoundUnderpaid &&
      offeredCompensation < lowerBoundFair
    ) {
      return {
        signal: 'Underpaid',
        assessment:
          'Offered compensation is between 90% and 95% of the mean for the given job title and Location',
      };
    } else if (
      offeredCompensation >= lowerBoundUndervalued &&
      offeredCompensation < lowerBoundUnderpaid
    ) {
      return {
        signal: 'Undervalued',
        assessment:
          'Offered compensation is between 85% and 90% of the mean for the given job title and Location',
      };
    } else {
      return {
        signal: 'Lowballed!',
        assessment:
          'Offered compensation is less than 85% of the mean for the given job title and Location',
      };
    }
  }

  async getFairnessIndicator(
    jobTitle: string,
    location: string,
    state: string,
    compensationOffered: number,
  ): Promise<{ signal: string; assessment: string; pdfUrl: string }> {
    // Verify if the job title exists in the database
    const jobTitleExists = await this.prisma.lCADisclosure.findFirst({
      where: {
        industryJobTitle: jobTitle,
      },
    });

    if (!jobTitleExists) {
      throw new BadRequestException(
        `The job title "${jobTitle}" does not exist.`,
      );
    }
    // Check for nationwide record count
    const nationwideRecordsCount = await this.prisma.lCADisclosure.count({
      where: {
        industryJobTitle: jobTitle,
      },
    });

    if (nationwideRecordsCount < 7) {
      throw new BadRequestException(
        'Insufficient data to determine fairness indicator.',
      );
    }

    const records = await this.fetchData(jobTitle, location, state);
    const meanCompensation = this.calculateMeanCompensation(records);
    console.log(compensationOffered, meanCompensation);

    // Generate PDF with the records
    const pdfUrl = await this.generatePdf(records);

    // Append the PDF to the Notion database
    // const notionPageId = 'replace_with_actual_page_id'; // You need to get the actual Notion page ID where you want to append the PDF
    // await this.appendFileToDatabase(pdfUrl, notionPageId, 'Fairness Report');

    const cfi = this.determineFairnessIndicator(
      compensationOffered,
      meanCompensation,
    );
    return { signal: cfi.signal, assessment: cfi.assessment, pdfUrl };
  }

  async generatePdf(records: LCADisclosure[]): Promise<string> {
    const doc = new PDFDocument();
    const filePath = 'public/cfiReports/generated.pdf';
    doc.pipe(fs.createWriteStream(filePath));

    doc.text('Job Disclosure Records', {
      align: 'center',
    });

    doc.moveDown();

    const headers = [
      'Industry Job Title',
      'Worksite City',
      'Worksite County',
      'Worksite State',
      'Harmonized Wage Rate',
    ];

    const tableData = records.map((record) => [
      record.industryJobTitle,
      record.worksiteCity,
      record.worksiteCounty,
      record.worksiteState,
      record.harmonizedWageRate,
    ]);

    // Add table headers
    doc.font('Helvetica-Bold').text(headers.join(' | '));
    doc.moveDown();

    // Add table rows
    doc
      .font('Helvetica')
      .text(tableData.map((row) => row.join(' | ')).join('\n'));

    doc.end();

    return this.uploadPdfToCloud(filePath);
  }

  async uploadPdfToCloud(filePath: string): Promise<string> {
    const fileStream = fs.createReadStream(filePath);
    const pdfUrl = await this.vercelBlobService.uploadPDF(
      filePath,
      `generated.pdf`,
    );

    return pdfUrl;
  }
}
