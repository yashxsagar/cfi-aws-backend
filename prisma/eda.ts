import { PrismaClient } from '@prisma/client';
import { createObjectCsvWriter } from 'csv-writer';

const prisma = new PrismaClient();

async function main() {
  // Query the database for the frequency of each Industry Job Title
  const industryJobTitleFrequency = await prisma.lCADisclosure.groupBy({
    by: ['industryJobTitle'],
    _count: {
      industryJobTitle: true,
    },
    orderBy: {
      _count: {
        industryJobTitle: 'desc',
      },
    },
  });

  // Query the database for the frequency of each Worksite State
  const worksiteStateFrequency = await prisma.lCADisclosure.groupBy({
    by: ['worksiteState'],
    _count: {
      worksiteState: true,
    },
    orderBy: {
      _count: {
        worksiteState: 'desc',
      },
    },
  });

  // Calculate total counts
  const totalIndustryJobs = industryJobTitleFrequency.reduce(
    (sum, record) => sum + record._count.industryJobTitle,
    0,
  );
  const totalWorksiteJobs = worksiteStateFrequency.reduce(
    (sum, record) => sum + record._count.worksiteState,
    0,
  );

  // Create CSV writers
  const industryCsvWriter = createObjectCsvWriter({
    path: 'prisma/Industry_Job_Title_Frequency.csv',
    header: [
      { id: 'industryJobTitle', title: 'Industry Job Title' },
      { id: 'count', title: 'Frequency' },
    ],
  });

  const stateCsvWriter = createObjectCsvWriter({
    path: 'prisma/Worksite_State_Frequency.csv',
    header: [
      { id: 'worksiteState', title: 'Worksite State' },
      { id: 'count', title: 'Frequency' },
    ],
  });

  // Prepare data for CSV
  const industryRecords = industryJobTitleFrequency.map((record) => ({
    industryJobTitle: record.industryJobTitle,
    count: record._count.industryJobTitle,
  }));

  // Add total row to industry records
  industryRecords.push({
    industryJobTitle: 'Total',
    count: totalIndustryJobs,
  });

  const stateRecords = worksiteStateFrequency.map((record) => ({
    worksiteState: record.worksiteState,
    count: record._count.worksiteState,
  }));

  // Add total row to state records
  stateRecords.push({
    worksiteState: 'Total',
    count: totalWorksiteJobs,
  });

  // Write data to CSV
  await industryCsvWriter.writeRecords(industryRecords);
  await stateCsvWriter.writeRecords(stateRecords);

  console.log('CSV files created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
