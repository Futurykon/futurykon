# Plutura - Prediction Market

A prediction market application built with React, TypeScript, Vite, and Supabase.

## Features

- User authentication (email/password and magic link)
- Create and view prediction questions
- Submit predictions with probability estimates
- Responsive design with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   bun dev
   ```

### Testing

Run the test suite to verify integrations work correctly:

```bash
# Run tests
npm run test
# or
bun test

# Run tests with UI
npm run test:ui
# or
bun test:ui

# Run tests with coverage
npm run test:coverage
# or
bun test:coverage
```

### Test Coverage

The test suite includes:

- **Authentication Tests**: Login, signup, and magic link functionality
- **Database Integration**: Fetching questions and predictions from Supabase
- **Form Handling**: Input validation and submission logic
- **Error Handling**: Graceful handling of database and auth errors

## Database Schema

The application uses two main tables:

- `questions`: Stores prediction questions with titles, descriptions, and resolution criteria
- `predictions`: Stores user predictions with probabilities and reasoning

## Architecture

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Auth, Database, Real-time)
- **Testing**: Vitest + React Testing Library

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/cb68717e-4c19-48dd-ab81-8424694476af) and click on Share -> Publish.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests to ensure everything works
4. Submit a pull request
