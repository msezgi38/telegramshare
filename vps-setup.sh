#!/bin/bash

# Telegram Manager - One-Click VPS Setup Script
# Works on Ubuntu 22.04/24.04 and Debian 11/12

set -e

echo "🚀 Starting Telegram Manager Setup..."

# 1. Update System
echo "🔄 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
if ! [ -x "$(command -v docker)" ]; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
else
    echo "✅ Docker is already installed."
fi

# 3. Install Docker Compose
if ! [ -x "$(command -v docker-compose)" ]; then
    echo "📦 Installing Docker Compose..."
    sudo apt install docker-compose -y
else
    echo "✅ Docker Compose is already installed."
fi

# 4. Setup Project Directory
mkdir -p ~/telegram-manager/data
mkdir -p ~/telegram-manager/telegram-service/sessions

echo "📂 Project structure created at ~/telegram-manager"

# 5. Reminder for Data Transfer
echo ""
echo "--------------------------------------------------------"
echo "✅ INFRASTRUCTURE READY!"
echo "--------------------------------------------------------"
echo "Next Steps:"
echo "1. Transfer your local 'src', 'public', 'telegram-service', 'data' etc. files to ~/telegram-manager"
echo "2. Run: sudo docker-compose up -d --build"
echo "--------------------------------------------------------"
