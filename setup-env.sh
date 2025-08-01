#!/bin/bash

# Environment Variable Setup Script
# This script helps set up environment variables for development and deployment

echo "🔧 Environment Variable Setup"
echo "============================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Setup local environment
setup_local() {
    print_info "Setting up local environment variables..."
    
    cd front-end-new
    
    # Create .env.local for local development
    echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:3001" > .env.local
    
    print_success "Created .env.local for local development"
    print_info "Local backend URL: http://localhost:3001"
    
    cd ..
}

# Setup production environment
setup_production() {
    print_info "Setting up production environment variables..."
    
    echo ""
    echo "Please provide your backend URL:"
    echo "Examples:"
    echo "  - https://your-app.railway.app"
    echo "  - https://your-app.onrender.com"
    echo "  - https://your-app.vercel.app"
    echo ""
    
    read -p "Enter your backend URL: " BACKEND_URL
    
    if [ -z "$BACKEND_URL" ]; then
        print_warning "No URL provided. Skipping production setup."
        return
    fi
    
    # Create .env.production for frontend
    cd front-end-new
    echo "NEXT_PUBLIC_SOCKET_URL=$BACKEND_URL" > .env.production
    print_success "Created .env.production"
    cd ..
    
    # Create .env for backend
    cd backend
    echo "NODE_ENV=production" > .env
    echo "CORS_ORIGIN=https://your-frontend.vercel.app" >> .env
    print_success "Created .env for backend"
    cd ..
    
    print_info "Production backend URL: $BACKEND_URL"
    print_warning "Remember to update CORS_ORIGIN in backend/.env with your actual frontend URL"
}

# Show current environment variables
show_current() {
    print_info "Current environment variables:"
    echo ""
    
    if [ -f "front-end-new/.env.local" ]; then
        echo "Local (.env.local):"
        cat front-end-new/.env.local
        echo ""
    fi
    
    if [ -f "front-end-new/.env.production" ]; then
        echo "Production (.env.production):"
        cat front-end-new/.env.production
        echo ""
    fi
    
    if [ -f "backend/.env" ]; then
        echo "Backend (.env):"
        cat backend/.env
        echo ""
    fi
}

# Test backend connection
test_backend() {
    print_info "Testing backend connection..."
    
    if [ -f "front-end-new/.env.production" ]; then
        BACKEND_URL=$(grep NEXT_PUBLIC_SOCKET_URL front-end-new/.env.production | cut -d'=' -f2)
        
        if [ ! -z "$BACKEND_URL" ]; then
            print_info "Testing: $BACKEND_URL/health"
            
            # Test with curl if available
            if command -v curl &> /dev/null; then
                response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
                if [ "$response" = "200" ]; then
                    print_success "Backend is accessible!"
                else
                    print_warning "Backend returned status: $response"
                fi
            else
                print_warning "curl not available. Please test manually: $BACKEND_URL/health"
            fi
        fi
    else
        print_warning "No production environment file found"
    fi
}

# Main menu
main() {
    echo ""
    echo "Choose an option:"
    echo "1) Setup local environment (for development)"
    echo "2) Setup production environment (for deployment)"
    echo "3) Show current environment variables"
    echo "4) Test backend connection"
    echo "5) Setup both local and production"
    echo "6) Exit"
    echo ""
    
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            setup_local
            ;;
        2)
            setup_production
            ;;
        3)
            show_current
            ;;
        4)
            test_backend
            ;;
        5)
            setup_local
            setup_production
            ;;
        6)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_warning "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Setup completed!"
    echo ""
    print_info "Next steps:"
    echo "1. For local development: npm run dev"
    echo "2. For production: Set environment variables in Vercel dashboard"
    echo "3. Test your application"
}

# Run main function
main 