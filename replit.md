# Panfleto Rápido

## Overview

Panfleto Rápido is a web application that enables store owners to create digital flyers by managing products and automatically generating shareable promotional content. The system features two distinct frontend interfaces: an admin panel for store management and a public-facing flyer display. Built as a full-stack TypeScript application, it uses React for the frontend, Express.js for the backend, and PostgreSQL with Drizzle ORM for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for client-side routing with protected and public routes
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle with PostgreSQL dialect
- **Authentication**: Replit Auth integration with session management
- **API Design**: RESTful endpoints with CRUD operations for stores and products

### Data Storage
- **Primary Database**: PostgreSQL with connection pooling via Neon serverless
- **Schema Management**: Drizzle Kit for migrations and schema definition
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **File Storage**: External URLs for images (no local file storage)

### Authentication & Authorization
- **Provider**: Replit OpenID Connect (OIDC)
- **Session Management**: Express sessions with PostgreSQL storage
- **Access Control**: Route-level protection for admin features
- **Public Access**: Unauthenticated access to flyer display pages

### Application Structure
- **Admin Interface**: Protected dashboard for store configuration, product management, and flyer preview
- **Public Interface**: Open flyer display with sharing and download capabilities
- **Dual Frontend Strategy**: Single application serving both admin and public interfaces based on authentication state
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Key Features
- **Store Management**: Store configuration with branding (logo, theme colors, contact info)
- **Product Management**: CRUD operations with status management (active/inactive, featured)
- **Flyer Generation**: Automatic layout generation based on active products
- **Export Capabilities**: PNG download functionality using html2canvas
- **Social Sharing**: Native sharing API with clipboard fallback
- **Real-time Updates**: Optimistic updates with server synchronization

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Platform**: Hosting and authentication provider

### Frontend Libraries
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **Data Fetching**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Hookform Resolvers
- **Validation**: Zod for schema validation
- **Canvas Rendering**: html2canvas for image generation
- **Date Utilities**: date-fns for date manipulation

### Backend Dependencies
- **Database**: Drizzle ORM with PostgreSQL adapter
- **Authentication**: OpenID Client for Replit Auth
- **Session Management**: Express Session with PostgreSQL store
- **Utilities**: Memoizee for caching, nanoid for ID generation

### Development Tools
- **Build Tool**: Vite with React plugin
- **TypeScript**: Full type safety across the stack
- **Development**: TSX for server development with hot reload
- **Linting**: ESBuild for production bundling