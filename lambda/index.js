const axios = require('axios');
const AWS = require('aws-sdk'); // This is necessary to use the AWS SDK provided by Lambda
const axiosRetry = require('axios-retry').default;

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();
const notionVersion = '2022-06-28';

axiosRetry(axios, {
  retries: 3, // Number of retry attempts
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Time between retries in milliseconds
  },
  retryCondition: (error) => {
    // Retry on network errors and 5xx status codes
    return (
      axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error)
    );
  },
});

exports.handler = async (event) => {
  console.log('Lambda function started.');

  try {
    const params = {
      TableName: 'CompXPollingTable',
    };

    console.log('Scanning DynamoDB table for users.');
    const data = await dynamodb.scan(params).promise();
    const users = data.Items;

    console.log(`Found ${users.length} users to poll.`);
    for (const user of users) {
      const { UserId, AccessToken, DatabaseId } = user;

      console.log(`Processing user ${UserId} with database ${DatabaseId}.`);
      const notion = axios.create({
        baseURL: 'https://api.notion.com/v1/',
        headers: {
          Authorization: `Bearer ${AccessToken}`,
          'Notion-Version': notionVersion,
        },
      });

      console.log(`Querying Notion database ${DatabaseId}.`);
      const response = await notion.post(`databases/${DatabaseId}/query`, {
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

      const pagesToProcess = response.data.results;
      console.log(
        `Found ${pagesToProcess.length} pages to process for user ${UserId}.`,
      );

      if (pagesToProcess.length > 0) {
        for (const page of pagesToProcess) {
          const jobTitle = page.properties['Job Title'].select.name;
          const location =
            page.properties['Location'].rich_text[0].text.content;
          const state = page.properties['State'].select.name;
          const compensationOffered =
            page.properties['Compensation Offered'].number;

          // Push the job to SQS queue
          const messageBody = JSON.stringify({
            UserId,
            AccessToken,
            pageId: page.id,
            jobTitle,
            location,
            state,
            compensationOffered,
          });

          try {
            await axios.post('https://tabx.io/webhook', webhookData);
            console.log(`Successfully sent data to webhook for user ${UserId}`);
          } catch (error) {
            console.error(
              `Error sending data to webhook for user ${UserId}: ${error.message}`,
            );
            console.error(
              `Error details: ${error.response ? error.response.data : 'No response data'}`,
            );
          }

          console.log(
            `Sending message to SQS for user ${UserId}: ${messageBody}`,
          );

          await sqs
            .sendMessage({
              QueueUrl: process.env.AWS_SQS_QUEUE_URL,
              MessageBody: messageBody,
            })
            .promise();

          console.log(`Message sent to SQS for user ${UserId}.`);
        }
      } else {
        console.log(`No pages to process for user ${UserId}.`);
      }
    }

    console.log('Polling executed successfully.');
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
