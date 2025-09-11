#!/bin/bash

echo "🚀 Setting up Vyaamikk Samadhaan Backend..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Create var directory for logs
echo "📁 Creating log directory..."
mkdir -p var

# Generate JWT secrets if not set
if [ -z "$JWT_ACCESS_SECRET" ]; then
    echo "🔐 Generating JWT secrets..."
    ACCESS_SECRET=$(openssl rand -base64 32)
    REFRESH_SECRET=$(openssl rand -base64 32)
    
    # Update .env file
    sed -i.bak "s/your-access-secret-here-change-in-production/$ACCESS_SECRET/" .env
    sed -i.bak "s/your-refresh-secret-here-change-in-production/$REFRESH_SECRET/" .env
    rm .env.bak
    
    echo "✅ JWT secrets generated and updated in .env"
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start PostgreSQL database (or use Docker: docker compose up -d)"
echo "2. Run migrations: npm run prisma:migrate"
echo "3. Start development server: npm run start:dev"
echo ""
echo "API will be available at: http://localhost:4000"
echo "Documentation at: http://localhost:4000/docs"
