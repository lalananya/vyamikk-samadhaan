# Vyaamikk Samadhaan Backend

Production-grade NestJS backend for the Vyaamikk Samadhaan platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for rate limiting)

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Setup environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Generate JWT secrets:**

   ```bash
   # Generate secrets
   openssl rand -base64 32  # for JWT_ACCESS_SECRET
   openssl rand -base64 32  # for JWT_REFRESH_SECRET
   ```

4. **Start database:**

   ```bash
   # Using Docker
   docker compose up -d

   # Or start PostgreSQL manually
   ```

5. **Run migrations:**

   ```bash
   npm run prisma:migrate
   ```

6. **Start development server:**
   ```bash
   npm run start:dev
   ```

## 📚 API Documentation

Once running, visit: http://localhost:4000/docs

## 🔐 Authentication Flow

### 1. Request OTP

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

### 2. Verify OTP

```bash
curl -X POST http://localhost:4000/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "otpToken": "otp-token-from-login",
    "code": "123456",
    "device": {
      "model": "OnePlus 12R",
      "platform": "android",
      "appVersion": "1.0.0"
    }
  }'
```

### 3. Use Access Token

```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer your-access-token"
```

## 🛠️ Development

### Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Database Management

```bash
# Create migration
npm run prisma:migrate

# Reset database
npx prisma migrate reset

# View database
npm run prisma:studio
```

## 🔧 Configuration

### Environment Variables

| Variable             | Description                  | Default     |
| -------------------- | ---------------------------- | ----------- |
| `DATABASE_URL`       | PostgreSQL connection string | Required    |
| `JWT_ACCESS_SECRET`  | JWT access token secret      | Required    |
| `JWT_REFRESH_SECRET` | JWT refresh token secret     | Required    |
| `PORT`               | Server port                  | 4000        |
| `NODE_ENV`           | Environment                  | development |
| `MSG91_API_KEY`      | MSG91 SMS API key            | Optional    |
| `DEV_OTP_DEBUG`      | Enable OTP debugging         | false       |

### OTP Configuration

- **Expiry:** 5 minutes
- **Max Attempts:** 5 per OTP
- **Rate Limits:** 1 per minute, 5 per day per phone
- **Provider:** MSG91 (India) with console fallback in dev

## 🚀 Deployment

### Docker

```bash
# Build image
docker build -t vyamikk-api .

# Run container
docker run -p 4000:4000 --env-file .env vyamikk-api
```

### Production Checklist

- [ ] Set strong JWT secrets
- [ ] Configure MSG91 credentials
- [ ] Set up PostgreSQL database
- [ ] Configure CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Set up SSL/TLS

## 📊 Health Checks

- **Liveness:** `GET /api/v1/healthz`
- **Readiness:** `GET /api/v1/readyz`

## 🔍 Debug Endpoints (Dev Only)

- **Get OTP:** `GET /api/v1/__debug/otp/:phone`

## 🏗️ Architecture

- **Framework:** NestJS with Fastify
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with refresh token rotation
- **Validation:** class-validator + class-transformer
- **Documentation:** OpenAPI/Swagger
- **Logging:** Pino
- **Rate Limiting:** @fastify/rate-limit
- **Security:** Helmet, CORS, input validation

## 📝 API Contracts

All responses follow this format:

### Success Response

```json
{
  "data": { ... },
  "message": "Success"
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

Private - Vyaamikk Samadhaan Platform
