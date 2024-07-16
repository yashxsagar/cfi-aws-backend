const AWS = require('aws-sdk');
const SQS = new AWS.SQS({ apiVersion: '2012-11-05' });
const queueUrl = process.env.SQS_QUEUE_URL;

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const params = {
    MessageBody: JSON.stringify(event),
    QueueUrl: queueUrl,
  };

  try {
    const data = await SQS.sendMessage(params).promise();
    console.log(`Message sent to SQS, ID: ${data.MessageId}`);
    return { statusCode: 200, body: 'Message sent to SQS' };
  } catch (err) {
    console.error('Error sending message to SQS', err);
    return { statusCode: 500, body: 'Error sending message to SQS' };
  }
};
