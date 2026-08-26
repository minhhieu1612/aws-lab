# AWS EC2 Node.js Server

A production-ready, cloud-optimized Node.js & Express server designed specifically for deployment on **AWS EC2** (Amazon Elastic Compute Cloud).

Includes an interactive status dashboard, health check endpoints for AWS Application Load Balancers (ALBs), system metrics telemetry, and AWS IMDSv2 metadata detection.

---

## 🚀 Quick Local Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   # or development mode with hot reload:
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:3000
   ```

---

## ☁️ Step-by-Step AWS EC2 Deployment Guide

### Option 1: Automated Deployment via EC2 User Data (Fastest)

1. Go to the **AWS Management Console** → **EC2** → **Launch Instances**.
2. **Name**: `aws-node-server`
3. **Application and OS Images (AMI)**: Select **Amazon Linux 2023** or **Ubuntu 24.04 LTS**.
4. **Instance type**: `t2.micro` or `t3.micro` (Free Tier eligible).
5. **Key pair (login)**: Select an existing key pair or create a new `.pem` file to connect via SSH.
6. **Network settings (Security Group)**:
   - Allow **SSH** (`22`) from your IP.
   - Allow **HTTP** (`80`) from `0.0.0.0/0`.
   - Allow **Custom TCP** (`3000`) from `0.0.0.0/0`.
7. Scroll down to **Advanced details** → **User data**, and paste the contents of [`ec2-userdata.sh`](./ec2-userdata.sh).
8. Click **Launch instance**.
9. Once the instance state is **Running**, copy its **Public IPv4 address** and open:
   ```
   http://<YOUR_EC2_PUBLIC_IP>:3000
   ```

---

### Option 2: Manual Deployment via SSH / EC2 Instance Connect

1. **Connect to your EC2 instance:**
   ```bash
   ssh -i "your-key.pem" ec2-user@<YOUR_EC2_PUBLIC_IP>
   # Or for Ubuntu:
   ssh -i "your-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```

2. **Install Node.js 20 & Git:**
   *On Amazon Linux 2023:*
   ```bash
   sudo dnf update -y
   sudo dnf install -y git
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo dnf install -y nodejs
   ```

   *On Ubuntu:*
   ```bash
   sudo apt update -y
   sudo apt install -y git curl
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
   sudo apt install -y nodejs
   ```

3. **Clone the project & install dependencies:**
   ```bash
   git clone https://github.com/minhhieu1612/aws-lab.git
   cd aws-lab
   npm install --production
   ```

4. **Run in background using PM2 (24/7 Uptime & Auto-restart):**
   ```bash
   sudo npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

---

## 🌐 Endpoints & API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Interactive Server Status & Metrics Dashboard |
| `GET` | `/health` | Health check endpoint for AWS ALB / ELB Target Groups |
| `GET` | `/api/system` | Hardware specs, CPU count, RAM utilization, and uptime |
| `GET` | `/api/info` | App info, environment mode, and AWS IMDSv2 metadata |
| `POST` | `/api/echo` | Test POST requests and echo JSON payloads |

---

## 🔒 Production Recommendations

- **Nginx Reverse Proxy (Port 80 -> 3000):**
  Forward standard HTTP traffic (port 80) to port 3000 so users don't need `:3000` in the URL:
  ```bash
  sudo dnf install -y nginx  # or sudo apt install -y nginx
  ```
- **Free SSL / HTTPS:** Use **Certbot (Let's Encrypt)** for free SSL certificates on custom domains.
