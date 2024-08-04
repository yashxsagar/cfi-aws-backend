# CompX Fairness Indicator

📊🫰🏼💰
A simple and highly accurate fairness indicator for the compensation offered to you - whether you’re joining a new gig, switching to a new gig or simply negotiating a raise. Evaluate the comp offered to you in 10 seconds and make smart well-informed counters.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Creating Notion Public Integration](#creating-notion-public-integration)
- [Setting up Neon Hosted PostgreSQL](#setting-up-neon-hosted-postgresql)
- [Setting up Vercel Blob](#setting-up-vercel-blob)
- [Contributing](#contributing)
- [License](#license)

## Introduction

CompX Fairness Indicator enables users to evaluate the fairness of a job compensation offer by inputting the job title, location, state, and offered compensation. The app returns a fairness indicator along with assessment remarks and attaches a PDF report containing supporting records.

## Features

- Evaluates the fairness of job compensation offers for working professionals in the US.
- Uses Notion database for inuitive and friendly user input and results display.
- Generates PDF reports of supporting wage records published by the Department of Labor in the US.
- Secure and persistent authentication with Notion.
- Uses Vercel Blob for cloud storage of PDF reports.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14.x or higher)
- npm (usually comes with Node.js)
- A Notion user account followed by developer account
- A Neon hosted PostgreSQL database

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

## Usage

1. Start the application

   ```bash
   npm run start:dev
   ```

2. Duplicate following Notion template into your Notion workspace -
   [CompX Fairness Indicator Notion Template](https://eager-helicopter-0dd.notion.site/c4a1e65e0a4c42cb9abd28c635b86a31?v=a6ae61921d6545c38f46c4b70a7dcdf4&pvs=4)

3. Open your browser and navigate to:
   [http://localhost:3009/auth/login](http://localhost:3009/auth/login)

4. Follow the prompts to authenticate with Notion and grant access to the page/database titled, 'CompX Fairness Indicator'

5. Input your job details (Job Title - Auto Suggestion Drop Down | Location - Worksite City or County | State | Compensation Offered - Annual Base Pay) in the Notion database and receive the fairness indicator, assessment remarks along with a PDF (Justification) of all job/wage disclosure records used to arrive at your compensation assessment outcome
