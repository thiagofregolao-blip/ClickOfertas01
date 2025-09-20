# Click Ofertas Paraguai

## Overview

Click Ofertas Paraguai is a web application designed to help store owners create and manage digital flyers by streamlining product management and automating the generation of shareable promotional content. It features an admin panel for store management and a public-facing flyer display with an Instagram-style feed and intelligent search. The project aims to provide a competitive edge in the market by offering a unique service for digitalizing shopping tourism, particularly focusing on cross-border price comparisons between Paraguay and Brazil, including a travel cost calculator.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### September 20, 2025
- **CRITICAL FIX**: Analytics Dashboard issue resolved - removed duplicate endpoint implementations that were preventing data display
- **Analytics Backend**: Corrected analytics logic by removing incorrect session filtering and fixing database queries  
- **Code Cleanup**: Reduced TypeScript errors in storage.ts from 21 to 15 through systematic cleanup
- **Badge Removal**: Completely removed all badge functionality (Featured, Stories, Totem) from product forms and listings per user request
- **Data Verification**: Confirmed analytics data collection working correctly (584+ sessions, 27+ views, 112+ searches in database)

## System Architecture

Click Ofertas Paraguai is built as a full-stack TypeScript application using React for the frontend, Express.js for the backend, and PostgreSQL with Drizzle ORM for data persistence.

### Frontend
- **Framework**: React with TypeScript and Vite.
- **UI/UX**: Shadcn/ui (Radix UI-based) and Tailwind CSS for a mobile-first, responsive design.
- **State Management**: TanStack Query for server state; React hooks for local state.
- **Routing**: Wouter for client-side routing.
- **Forms**: React Hook Form with Zod validation.

### Backend
- **Runtime**: Node.js with Express.js.
- **Database ORM**: Drizzle with PostgreSQL dialect.
- **Authentication**: Replit Auth with session management.
- **API**: RESTful endpoints for CRUD operations.

### Data Storage
- **Database**: PostgreSQL via Neon serverless.
- **Session Storage**: PostgreSQL-backed sessions.
- **File Storage**: External URLs for images.

### Authentication & Authorization
- **Provider**: Replit OpenID Connect (OIDC).
- **Access Control**: Route-level protection for admin features; public access for flyer display.

### Key Features
- **Store & Product Management**: CRUD operations, branding, and status management.
- **Flyer Generation**: Automatic layout generation and PNG download (html2canvas).
- **Social Sharing**: Native sharing API.
- **User Experience**: Instagram-style feed, intelligent search, category filtering, and real-time updates.
- **Advanced Features (Planned)**: Dynamic media (video) for products, automated price comparison within Paraguay, and a revolutionary international price comparison system (Brazil vs. Paraguay) with a personalized travel cost calculator leveraging web scraping.

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit Platform**: Hosting and authentication.

### Frontend Libraries
- **UI Components**: Radix UI.
- **Styling**: Tailwind CSS.
- **Data Fetching**: TanStack Query.
- **Form Handling**: React Hook Form, Hookform Resolvers.
- **Validation**: Zod.
- **Image Generation**: html2canvas.
- **Date Utilities**: date-fns.

### Backend Dependencies
- **Database**: Drizzle ORM.
- **Authentication**: OpenID Client, Express Session.
- **Utilities**: Memoizee, nanoid.

### Development Tools
- **Build Tool**: Vite.
- **Language**: TypeScript.
- **Server Development**: TSX.
- **Production Bundling**: ESBuild.

### PWA & App Store Distribution
- The application is a fully functional Progressive Web App (PWA) supporting offline usage and installability on both iOS and Android.
- **Google Play Store**: Recommended distribution via Trusted Web Activities (TWA) using PWABuilder.
- **Apple App Store**: Requires conversion to a hybrid app using tools like Ionic Capacitor or Apache Cordova.