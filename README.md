# Student Courses Platform

A Next.js-based platform for students to access and view their enrolled courses. This platform integrates with Supabase for authentication and database management.

## Features

- **Student Authentication**: Secure sign-up and login functionality
- **Course Dashboard**: View all enrolled courses in one place
- **Course Access Control**: Students can only access courses they're enrolled in
- **Course Content**: Rich markdown-based course content with multimedia support
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Content**: Markdown with react-markdown

## Database Schema

This project uses two main tables from the parent project:

### courses Table
- Course information including title, description, content (markdown)
- Categories: automation, ai, productivity, business, other
- Support for different levels: beginner, intermediate, advanced
- Multilingual support (en, es)
- Draft/Published status

### course_signups Table
- Student enrollment records
- Links students (by email) to courses (by slug)
- Tracks signup status and metadata
- One signup per email per course constraint

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

3. Edit .env.local with your Supabase credentials

### Database Setup

Run the migration files in your Supabase SQL editor in order:
1. migrations/018_create_course_signups.sql
2. migrations/020_create_courses.sql
3. migrations/022_revert_course_signups_name_split.sql

### Running the Development Server

```bash
npm run dev
```

Open http://localhost:3000 to see the application.

## Project Structure

- app/ - Next.js app directory with pages
- contexts/ - React contexts (AuthContext)
- hooks/ - Custom React hooks (useCourses)
- lib/ - Utility functions (Supabase client)
- types/ - TypeScript type definitions
- migrations/ - Database migration files

## License

MIT
