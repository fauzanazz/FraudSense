#!/bin/bash

# Fraud Detection App Deployment Script
# This script helps deploy both frontend and backend

echo "🚀 Fraud Detection App Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vercel CLI is installed
check_vercel() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed. Please install it first:"
        echo "npm install -g vercel"
        exit 1
    fi
    print_success "Vercel CLI is installed"
}

# Deploy backend
deploy_backend() {
    print_status "Deploying backend..."
    
    cd backend
    
    # Check if vercel.json exists
    if [ ! -f "vercel.json" ]; then
        print_error "vercel.json not found in backend directory"
        exit 1
    fi
    
    # Deploy to Vercel
    print_status "Running: vercel --prod"
    vercel --prod
    
    if [ $? -eq 0 ]; then
        print_success "Backend deployed successfully!"
        print_status "Please note the backend URL for frontend configuration"
    else
        print_error "Backend deployment failed"
        exit 1
    fi
    
    cd ..
}

# Deploy frontend
deploy_frontend() {
    print_status "Deploying frontend..."
    
    cd front-end-new
    
    # Check if vercel.json exists
    if [ ! -f "vercel.json" ]; then
        print_error "vercel.json not found in front-end-new directory"
        exit 1
    fi
    
    # Deploy to Vercel
    print_status "Running: vercel --prod"
    vercel --prod
    
    if [ $? -eq 0 ]; then
        print_success "Frontend deployed successfully!"
    else
        print_error "Frontend deployment failed"
        exit 1
    fi
    
    cd ..
}

# Setup environment variables
setup_env() {
    print_status "Setting up environment variables..."
    
    echo ""
    echo "Please provide the following information:"
    echo ""
    
    read -p "Backend URL (e.g., https://your-backend.vercel.app): " BACKEND_URL
    read -p "Frontend URL (e.g., https://your-frontend.vercel.app): " FRONTEND_URL
    
    # Create .env.production for frontend
    cd front-end-new
    echo "NEXT_PUBLIC_SOCKET_URL=$BACKEND_URL" > .env.production
    print_success "Created .env.production in frontend"
    cd ..
    
    # Create .env for backend
    cd backend
    echo "NODE_ENV=production" > .env
    echo "CORS_ORIGIN=$FRONTEND_URL" >> .env
    print_success "Created .env in backend"
    cd ..
    
    print_success "Environment variables configured"
}

# Main deployment flow
main() {
    echo ""
    print_status "Starting deployment process..."
    
    # Check prerequisites
    check_vercel
    
    echo ""
    echo "Choose deployment option:"
    echo "1) Deploy both frontend and backend"
    echo "2) Deploy backend only"
    echo "3) Deploy frontend only"
    echo "4) Setup environment variables only"
    echo "5) Exit"
    echo ""
    
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            setup_env
            deploy_backend
            deploy_frontend
            print_success "Full deployment completed!"
            ;;
        2)
            setup_env
            deploy_backend
            ;;
        3)
            setup_env
            deploy_frontend
            ;;
        4)
            setup_env
            ;;
        5)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Deployment process completed!"
    echo ""
    print_status "Next steps:"
    echo "1. Configure environment variables in Vercel dashboard"
    echo "2. Test the application"
    echo "3. Set up custom domains if needed"
    echo ""
}

# Run main function
main 