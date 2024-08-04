# CompX Fairness Indicator

📊🫰🏼💰
A simple and highly accurate fairness indicator for the compensation offered to you - whether you’re joining a new gig, switching to a new gig or simply negotiating a raise. Evaluate the comp offered to you in 10 seconds and make smart well-informed counters.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup](#setup)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Database](#database)
    - [Neon Hosted PostgreSQL](#neon-hosted-postgresql)
    - [Prisma ORM](#prisma-orm)
    - [Seeding the Database](#seeding-the-database)
  - [AWS Setup](#aws-setup)
    - [AWS CLI Configuration](#aws-cli-configuration)
    - [Lambda Function Setup](#lambda-function-setup)
    - [DynamoDB Configuration](#dynamodb-configuration)
    - [Elastic Beanstalk Initialization](#elastic-beanstalk-initialization)
    - [EventBridge Rule Setup](#eventbridge-rule-setup)
  - [Creating Notion Public Integration](#notion-integration)
  - [Setting up Vercel Blob](#setting-up-vercel-blob)
  - [Deployment](#deployment)
    - [Frontend on Vercel](#frontend-on-vercel)
    - [Backend on AWS](#backend-on-aws)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Introduction

Asess your true worth - Supafast! Are you someone who's about to join a new job or switch gigs or awaitng your appraisal. How do you know whether the comp offered by your HR manager is fair or not? CompX does exactly that. It tells you the competitiveness of your pay while drawing from hard objective wage disclosures data from the US Dept. of Labor. Simply key in the job title, location, state, and compensation offered for a job offer/role and get instant clarity on what your peers are getting paid in your area for the same job role. The app returns a fairness indicator along with assessment remarks and attaches a PDF report containing supporting records.

## Features

- Evaluates the fairness of job compensation offers for working professionals in the US.
- Uses Notion database for inuitive and friendly user input and results display.
- Generates PDF reports of supporting wage records published by the Department of Labor in the US.
- Secure and persistent authentication with Notion.
- Uses Vercel Blob for cloud storage of PDF reports.
- Cloud deployed using AWS and Vercel

## Tech Stack

- Frontend: Next.js 14.2.3, Tailwind CSS, Daisy UI
- Backend: NestJS, Prisma, PostgreSQL
- Database: Neon-hosted PostgreSQL
- Cloud Services: AWS Lambda, DynamoDB, Elastic Beanstalk, CloudBridge
- Deployment: Vercel for frontend, AWS for backend

## Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or higher)
- npm (usually comes with Node.js)
- bash or zsh terminal
- TypeScript: TypeScript is used for strict type checking. Install globally with npm install -g typescript.
- Prisma: Installed globally. You can install Prisma CLI with npm install -g prisma
- A Notion user account followed by a developer account for creating a public Notion integration with Template option to obtain the API access credentials (ClientId, Client Secret, Authorization URL) and set up the callback url
- A Neon account for a hosted PostgreSQL database with the DATABASE_URL connection string handy
- AWS CLI: Version 2.x. Used for managing AWS services like Lambda, SQS, and DynamoDB. Install from [AWS CLI installation guide] (https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html).
- AWS Account: Required for deploying the backend services. Ensure you have IAM permissions to manage EC2, Lambda, SQS, DynamoDB, and other related services.
- Vercel Account: For deploying the frontend application. Sign up at [Vercel's website] (https://vercel.com/).
- Environment Variables - Ensure to set up the environment variables correctly by creating a .env file at the root of the project. Refer to the .env.example file for guidance

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/compx-fairness-indicator.git
   cd compx-fairness-indicator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   Copy the .env.example file to .env and fill in the required values.

   ```bash
   cp .env.example .env
   ```

4. Seed the database:
   ```bash
   npx ts-node prisma/seed.ts
   ```

## Setup

### Frontend

1. **Clone the Repository**:

```bash
git clone https://github.com/yashxsagar/compx-frontend.git
cd compx-frontend
```

2. **Install Dependencies**:

```bash
    npm install
```

3. **Set up environment variables**:

- Copy the .env.example file to .env and fill in the required values.

```bash
cp .env.example .env
```

4. **Start the Development Server**:

```bash
npm run dev
```

### Backend

1. **Clone the Repository**:

```bash
    git clone https://github.com/yashxsagar/cfi-aws-backend.git
    cd cfi-aws-backend
```

2. **Install Dependencies**:

```bash
    npm install
```

3. **Start the Development Server**:

```bash
npm run start:dev
```

### Database

#### Neon Hosted PostgreSQL

1. **Create a Database**:

- Sign up and log in to [Neon](https://neon.tech/).
- Create a new PostgreSQL database and obtain the connection string.

2. **Update .env File**:

- Add the connection string to the .env file in the backend (cfi-aws-backend) directory:

```bash
  DATABASE_URL="postgresql://<DB_USERNAME>:<DB_PASSWORD>@<NEON_HOST>/<DB_NAME>?sslmode=require&connection_limit=300"
```

### Prisma ORM

1. **Generate Prisma Client**:

```bash
npx prisma generate
```

2. **Run Migrations**:

```bash
npx prisma migrate dev --name init
```

3. **Seeding the Database**
   Prepare Seed Script:

   - Ensure LCA Disclosures FY 2024 - Labeled, Sorted and Formatted - Final.csv is present in the prisma directory.

   Run the Seed Script:

```bash
npx ts-node prisma/seed.ts
```

### AWS Setup

#### AWS CLI Configuration

1. **Install AWS CLI**:

```bash
pip install awscli
```

2. **Configure AWS CLI**:

```bash
aws configure
```

- Enter your AWS Access Key, Secret Key, default region (us-east-1), and output format (json).

#### Lambda Function Setup

1. **Create Lambda Function**:

```bash
aws lambda create-function --function-name CompXFunction \
 --zip-file fileb://function.zip --handler index.handler --runtime nodejs20.x \
 --role arn:aws:iam::123456789012:role/CompXLambdaRole
```

2. **Set Environment Variables:** -

```bash
aws lambda update-function-configuration --function-name CompXFunction \
 --environment "Variables={AWS_SQS_QUEUE_URL='your_aws_sqs_url',NEST_API_URL='your_backend_url'}"
```

#### DynamoDB Configuration

1. **Create DynamoDB Table**:

```bash
  aws dynamodb create-table --table-name CompXTable \
   --attribute-definitions AttributeName=PrimaryKey,AttributeType=S \
   --key-schema AttributeName=PrimaryKey,KeyType=HASH \
   --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

#### Elastic Beanstalk Initialization

1. **Initialize Elastic Beanstalk**:

```bash
eb init -p node.js-20 CompX
```

2. **Create an Environment**:

```bash
eb create CompX-env
```

3. **Deploy**:

```bash
eb deploy
```

4. **Setup Environment Variables for Elastic Beanstalk**:

```bash
eb setenv DATABASE_URL="postgresql://<DB_USERNAME>:<DB_PASSWORD>@<NEON_HOST>/<DB_NAME>?sslmode=require&connection_limit=300" JWT_SECRET="<YOUR_JWT_SECRET>" NOTION_CLIENT_ID="<YOUR_NOTION_CLIENT_ID>" NOTION_CLIENT_SECRET="<YOUR_NOTION_CLIENT_SECRET>" NOTION_CALLBACK_URL="http://localhost:<YOUR_LOCAL_PORT>/auth/callback"AUTHORIZATION_URL="https://api.notion.com/v1/oauth/authorize?client_id=<YOUR_NOTION_CLIENT_ID>&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A<YOUR_LOCAL_PORT>%2Fauth%2Fcallback"BLOB_READ_WRITE_TOKEN="<YOUR_VERCCEL_BLOB_RW_TOKEN>"AWS_SQS_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/<YOUR_AWS_ACCOUNT_ID>/<YOUR_SQS_QUEUE_NAME>"AWS_REGION="us-east-1" AWS_DYNAMODB_TABLE_NAME="<YOUR_DYNAMODB_TABLE_NAME>"NEXT_APP_URL="http://localhost:<YOUR_NEXT_APP_PORT>" NODE_OPTIONS="--max-old-space-size=1024"
```

5. **Set Up CodeCommit Branch**:

- Create a CodeCommit Repository:

```bash
aws codecommit create-repository --repository-name CompXRepo
```

- Initialize Local Repository:

```bash
git remote add codecommit https://git-codecommit.<region>.amazonaws.com/v1/repos/CompXRepo
```

- Push Local Repository:

```bash
git push -u codecommit main
```

- Update Elastic Beanstalk Environment:

      * Link the CodeCommit repository with Elastic Beanstalk:

  ```bash
  eb setenv REPOSITORY_URI=https://git-codecommit.<region>.amazonaws.com/v1/repos/CompXRepo BRANCH_NAME=main
  ```

### EventBridge Rule Setup

1. **Create EventBridge Rule**:

```bash
aws events put-rule --name CompXRule --schedule-expression "rate(1 minute)"
```

2. **Add Lambda Function as Target**:

```bash
aws events put-targets --rule CompXRule --targets "Id"="1","Arn"="arn:aws:lambda:<region>:<account-id>:function:CompXFunction"
```

3. **Add Permission to Invoke Lambda**:

```bash

aws lambda add-permission --function-name CompXFunction --statement-id CompXRulePermission \
--action 'lambda:InvokeFunction' --principal events.amazonaws.com \
--source-arn arn:aws:events:<region>:<account-id>:rule/CompXRule
```

### Notion Integration

1.  **Create Notion Integration**:
    _ Navigate to [Notion Integrations](https://notion.so/profile/integrations).
    _ Click "New integration with Template" option to create a new Notion integration with Template option - fill in the details to obtain the API access credentials (ClientId, Client Secret, Authorization URL).

    - In the **Notion Url for Optional Template** field, copy the url to the Notion table that'll serve as the frontend UI for the user https://eager-helicopter-0dd.notion.site/c4a1e65e0a4c42cb9abd28c635b86a31?v=a6ae61921d6545c38f46c4b70a7dcdf4

2.  **Update Environment Variables**:
    Add the Notion token and database ID to the .env file:

```bash
NOTION_CLIENT_ID="<YOUR_NOTION_CLIENT_ID>"
NOTION_CLIENT_SECRET="<YOUR_NOTION_CLIENT_SECRET>"
NOTION_CALLBACK_URL="http://localhost:<YOUR_LOCAL_PORT>/auth/callback"
AUTHORIZATION_URL="https://api.notion.com/v1/oauth/authorize?client_id=<YOUR_NOTION_CLIENT_ID>&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A<YOUR_LOCAL_PORT>%2Fauth%2Fcallback"
```

## Usage

1. **Start the application by deploying on Elastic Beanstalk through AWS CLI**

```bash
eb deploy
```

2. **Open your browser and navigate to**:
   [http://<your-frontend-vercel-url>]

3. Click on the **Login with Notion** or **Login** CTA on the home page

4. Follow the prompts to authenticate with Notion and choose the option **Use a template provided by the developer**

5. Input your job details (Job Title - Auto Suggestion Drop Down | Location - Worksite City or County | State | Compensation Offered - Annual Base Pay) in the Notion database and receive the fairness indicator, assessment remarks along with a PDF (Justification) of all job/wage disclosure records used to arrive at your compensation assessment outcome

6. **Repeat Step 5 as many times you like**

### Deployment

#### Frontend on Vercel

1.  **Connect GitHub Repository**:

    - Log in to [Vercel] (https://vercel.com/)

    - Import the CompX repository and follow the setup steps.

2.  **Set Environment Variables**:

    - In the Vercel dashboard, go to "Settings" -> "Environment Variables" and add the necessary variables.

3.  **Deploy**:

    - Vercel automatically deploys the app on every push to the main branch.

#### Backend on AWS

1. **Deploy Using Elastic Beanstalk**:
   The backend can be deployed using Elastic Beanstalk as detailed in the [Elastic Beanstalk Initialization](#elastic-beanstalk-initialization) section.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
