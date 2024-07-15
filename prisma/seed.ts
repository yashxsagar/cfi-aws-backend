import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import * as cliProgress from 'cli-progress';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'info', 'warn'],
});

const BATCH_SIZE = 1000; // Adjust the batch size based on your requirements
const DELAY_MS = 1000; // Adjust the delay between batches based on your requirements

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearDatabase() {
  await prisma.lCADisclosure.deleteMany();
}

async function main() {
  await clearDatabase();

  const results = [];
  fs.createReadStream(
    'prisma/LCA Disclosures FY 2024 - Labeled, Sorted and Formatted - Final.csv',
  )
    .pipe(csv())
    .on('headers', (headers) => {
      console.log(`Headers: ${headers}`);
    })
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', async () => {
      const dataWithoutHeader = results.slice(1);
      const totalRecords = dataWithoutHeader.length;

      // Create a progress bar
      const progressBar = new cliProgress.SingleBar(
        {},
        cliProgress.Presets.shades_classic,
      );
      progressBar.start(totalRecords, 0);

      for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
        const batch = dataWithoutHeader.slice(i, i + BATCH_SIZE);

        // Create an array of promises for batch insertion
        const promises = batch.map((record) =>
          prisma.lCADisclosure.create({
            data: {
              jobTitle: record['JOB_TITLE'],
              socTitle: record['SOC_TITLE'],
              employerName: record['EMPLOYER_NAME'],
              tradeNameDba: record['TRADE_NAME_DBA'],
              worksiteCity: record['WORKSITE_CITY'],
              worksiteCounty: record['WORKSITE_COUNTY'],
              worksiteState: record['WORKSITE_STATE'].toUpperCase().slice(0, 2), // Ensure uppercase and 2 characters
              worksitePostalCode: record['WORKSITE_POSTAL_CODE'].slice(0, 5), // Ensure max length of 5 characters
              wageRateOfPayFrom: parseFloat(record['WAGE_RATE_OF_PAY_FROM']),
              wageRateOfPayTo: record['WAGE_RATE_OF_PAY_TO']
                ? parseFloat(record['WAGE_RATE_OF_PAY_TO'])
                : null,
              harmonizedWageRate: parseFloat(record['HARMONIZED_WAGE_RATE']),
              prevailingWage: parseFloat(record['PREVAILING_WAGE']),
              pwWageLevel: record['PW_WAGE_LEVEL']
                ? (record['PW_WAGE_LEVEL'] as 'I' | 'II' | 'III' | 'IV')
                : null, // Ensure it's one of I, II, III, IV or null
              combinedTitle: record['combined_title'],
              kmeansCluster: parseInt(record['kmeans_cluster']),
              industryJobTitle: record['Industry Job Title'],
              dbscanCluster: parseInt(record['dbscan_cluster']),
            },
          }),
        );

        // Execute all promises in parallel and wait for them to complete
        await Promise.all(promises);

        // Update the progress bar
        progressBar.update(i + BATCH_SIZE);

        // Add a delay between batches
        await delay(DELAY_MS);
      }

      progressBar.stop();
    });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
