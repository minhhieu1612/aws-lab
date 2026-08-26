#!/bin/bash
# ==========================================================
# AWS EC2 User Data Script (Amazon Linux 2023 / RHEL / Ubuntu)
# Automatically installs Node.js, PM2, Git, and starts the app
# ==========================================================

# 1. Update packages
if command -v dnf &> /dev/null; then
    # Amazon Linux 2023 / Fedora / RHEL
    dnf update -y
    dnf install -y git
    # Install Node.js 20
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
elif command -v apt-get &> /dev/null; then
    # Ubuntu / Debian
    apt-get update -y
    apt-get install -y git curl
    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# 2. Install PM2 globally
npm install -g pm2

# 3. Create app directory
APP_DIR="/var/www/aws-node-app"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 4. Clone your GitHub repository (replace with your repo URL)
git clone https://github.com/minhhieu1612/aws-lab.git .

# 5. Install dependencies
npm install --production

# 6. Start with PM2 and configure auto-start on EC2 reboot
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo "AWS EC2 Node server deployment completed successfully!"
