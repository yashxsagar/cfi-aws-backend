const AWS = require('aws-sdk');
const axios = require('axios');

const sqs = new AWS.SQS();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const notionVersion = '2022-06-28';

const POLLING_INTERVAL = 60 * 1000; // Poll every 60 seconds

exports.handler = async (event) => {
  const userId = event.userId;
  const accessToken = event.accessToken;
  const databaseId = event.databaseId;

  console.log(`Starting polling for user ${userId} on database ${databaseId}`);

  try {
    const notion = axios.create({
      baseURL: 'https://api.notion.com/v1/',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Notion-Version': notionVersion,
      },
    });

    console.log('Notion client created');

    const response = await notion.post(`databases/${databaseId}/query`, {
      filter: {
        and: [
          {
            property: 'Job Title',
            select: {
              is_not_empty: true,
            },
          },
          {
            property: 'Location',
            rich_text: {
              is_not_empty: true,
            },
          },
          {
            property: 'State',
            select: {
              is_not_empty: true,
            },
          },
          {
            property: 'Compensation Offered',
            number: {
              is_not_empty: true,
            },
          },
          {
            property: 'Fairness Indicator',
            rich_text: {
              is_empty: true,
            },
          },
        ],
      },
    });

    console.log('Notion query executed successfully');

    const pagesToProcess = response.data.results;

    console.log(`Found ${pagesToProcess.length} pages to process`);

    if (pagesToProcess.length > 0) {
      for (const page of pagesToProcess) {
        const jobTitle = page.properties['Job Title'].select.name;
        const location = page.properties['Location'].rich_text[0].text.content;
        const state = page.properties['State'].select.name;
        const compensationOffered =
          page.properties['Compensation Offered'].number;

        // Push the job to SQS queue
        const messageBody = JSON.stringify({
          userId,
          accessToken,
          pageId: page.id,
          jobTitle,
          location,
          state,
          compensationOffered,
        });

        console.log('Sending message to SQS:', messageBody);

        try {
          const sqsResonse = await sqs
            .sendMessage({
              QueueUrl: process.env.AWS_SQS_QUEUE_URL,
              MessageBody: messageBody,
            })
            .promise();
          console.log('SQS sendMessage response:', sqsResponse);
        } catch (sqsError) {
          console.error('Error sending message to SQS:', sqsError);
        }
      }
    } else {
      console.log('No pages to process');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Polling executed successfully.' }),
    };
  } catch (error) {
    console.error('Error during polling:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
