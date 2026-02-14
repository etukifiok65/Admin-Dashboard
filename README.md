# HomiCare Admin Dashboard

Web-based admin dashboard for managing the HomiCare Plus healthcare platform.

## Features

- **Dashboard**: Overview of key metrics and platform statistics
- **User Management**: View and manage patient accounts
- **Provider Management**: Verify providers and manage healthcare professionals
- **Appointments**: Monitor and manage service appointments
- **Financial**: Track revenue, payments, and provider payouts
- **Analytics**: View platform performance metrics and trends
- **Settings**: Configure platform-wide settings

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Access to HomiCare Supabase project credentials

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

## Development

Start the development server:

```bash
npm run dev
```

The dashboard will open at `http://localhost:3000`

## Build

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
src/
  ├── components/        # Reusable React components
  ├── pages/            # Page components for different sections
  ├── services/         # API and Supabase integration
  ├── hooks/            # Custom React hooks
  ├── types/            # TypeScript type definitions
  ├── utils/            # Utility functions
  ├── styles/           # CSS and styling
  ├── App.tsx           # Main app component
  └── index.tsx         # React entry point
```

## Authentication

The admin dashboard uses Supabase authentication with role-based access control. Only users with the `admin` role can access the dashboard.

Admin users must:
1. Have a valid Supabase auth account
2. Have `admin` role set in their JWT claims
3. Have an `admin_users` profile record in the database

## API Integration

The dashboard connects to the same Supabase backend as the mobile app. Services are located in `src/services/`:

- `supabase.ts` - Supabase client initialization
- `adminAuth.service.ts` - Admin authentication
- `adminDashboard.service.ts` - Dashboard data fetching

## Styling

The project uses TailwindCSS for styling. Configuration is in `tailwind.config.js`

## Deployment

### Environment Variables for Production

Set the following environment variables during deployment:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase public anon key
- `VITE_API_URL` - Your API endpoint

### Build Output

The production build is generated in the `dist/` folder and can be deployed to:

- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

## TODO / In Progress

- [ ] Provider verification document viewer
- [ ] Advanced filtering on user and provider lists
- [ ] Financial reporting and export features
- [ ] Analytics charts and graphs
- [ ] Notification management
- [ ] Audit logging
- [ ] Rate limiting configuration
- [ ] Service category management

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Create a pull request

## License

HomiCare Plus Admin Dashboard © 2026. All rights reserved.
