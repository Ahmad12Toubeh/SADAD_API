# SADAD_API

## Overview
Backend API for SADAD (NestJS + MongoDB).

## Requirements
- Node.js 18+
- MongoDB

## Setup
1. Copy environment file:
   - `.env.example` -> `.env`
2. Update values in `.env`.

Example `.env` (key fields):
- `PORT=3001`
- `MONGODB_URI=mongodb://localhost:27017/sadad`
- `JWT_SECRET=replace_with_secure_secret`
- `JWT_EXPIRATION=7d`
- `APP_BASE_URL=http://localhost:3000`
- `CORS_ORIGIN=http://localhost:3000`

## Run
- `npm install`
- `npm run start:dev`

API base:
- `http://localhost:3001/api`
Swagger:
- `http://localhost:3001/api/docs`

## Auth Cookie
- Login sets `accessToken` as HttpOnly cookie.
- Frontend requests must use `credentials: include`.

## Scheduled Jobs
- Late installments are marked every 15 minutes.
