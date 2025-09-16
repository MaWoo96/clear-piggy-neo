#!/bin/bash
set -euo pipefail

# Clear Piggy Neo - Development Setup Script
# This script sets up your development environment quickly

echo "🐷 Clear Piggy Neo - Development Setup"
echo "======================================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node -v)"
    echo "   Please install Node.js 18 or higher from: https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
if npm install; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Setup environment variables
echo "🔐 Setting up environment variables..."
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo "✅ Created .env.local from .env.example"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env.local and add your API keys:"
        echo "   - Supabase URL and Anon Key"
        echo "   - Plaid Client ID and Secret"
        echo "   - (Optional) Anthropic API Key"
    else
        echo "⚠️  No .env.example found, skipping .env.local creation"
    fi
else
    echo "✅ .env.local already exists"
fi
echo ""

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
if npm run typecheck; then
    echo "✅ TypeScript compilation successful"
else
    echo "⚠️  TypeScript compilation has errors (this is okay for now)"
fi
echo ""

# Final instructions
echo "======================================"
echo "✨ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your API keys"
echo "2. Start the development server: npm start"
echo "3. Open http://localhost:3003 in your browser"
echo ""
echo "Available commands:"
echo "  npm start      - Start development server"
echo "  npm run build  - Build for production"
echo "  npm test       - Run tests"
echo "  npm run typecheck - Check TypeScript types"
echo "  npm run lint:fix  - Auto-fix code style"
echo ""
echo "Happy coding! 🚀"