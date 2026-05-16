# SinaiCamps: Complete Oracle Cloud Deployment Guide

This guide covers everything from a brand new Oracle Cloud instance to a fully running, self-healing **SinaiCamps** platform.

---

## Phase 1: Oracle Cloud Infrastructure (OCI) Setup

### 1. Create the Instance
*   **Image**: Ubuntu 24.04 (Canonical).
*   **Shape**: `VM.Standard.E4.Flex` (or similar).
*   **Networking**: Ensure it is in a **Public Subnet**.

### 2. Configure Networking (The "Magic" Step)
Your instance needs to be visible to the internet.
1.  **Ingress Rules**: Go to your Subnet > Security List and add:
    *   **Port 22 (SSH)**: Source `0.0.0.0/0`.
    *   **Port 80 (HTTP)**: Source `0.0.0.0/0`.
    *   **Port 443 (HTTPS)**: Source `0.0.0.0/0`.
2.  **Internet Gateway**: Ensure your VCN has an **Internet Gateway** created.
3.  **Route Table**: Ensure the **Default Route Table** has a rule:
    *   **Destination**: `0.0.0.0/0`
    *   **Target**: Internet Gateway.

---

## Phase 2: Server Software Installation

Connect to your VM (`ssh -i your.key ubuntu@your-ip`) and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx, PostgreSQL, and Sync tools
sudo apt install -y nginx postgresql postgresql-contrib rsync

# Install PM2 (Global)
sudo npm install -g pm2
```

---

## Phase 3: Database Initialization

```bash
# Switch to postgres user and create the SinaiCamps DB
sudo -u postgres psql -c "CREATE USER sinaicamps WITH PASSWORD 'sinaicamps123';"
sudo -u postgres psql -c "CREATE DATABASE sinaicamps OWNER sinaicamps;"

# Apply the initial schema (run this after syncing your files)
sudo -u postgres psql -d sinaicamps -f ~/marketplace/schema.sql
```

---

## Phase 4: App Deployment & Persistence

### 1. Syncing your Files (From your Local Machine)
Run this from your project folder on your computer:
```bash
# Create directories on VM
ssh -i oracle.key ubuntu@your-ip "mkdir -p ~/marketplace/.next/static ~/marketplace/scripts ~/marketplace/logs"

# Sync build and assets
rsync -avz -e "ssh -i oracle.key" .next/standalone/ ubuntu@your-ip:~/marketplace/
rsync -avz -e "ssh -i oracle.key" .next/static/ ubuntu@your-ip:~/marketplace/.next/static/
rsync -avz -e "ssh -i oracle.key" public/ ubuntu@your-ip:~/marketplace/public/
scp -i oracle.key .env.production nginx-unified.conf scripts/boot.sh ubuntu@your-ip:~/marketplace/
```

### 2. Start and Automate
On the VM:
```bash
cd ~/marketplace
pm2 start server.js --name sinaicamps
pm2 save
pm2 startup  # Follow the instruction it prints to enable auto-start

# Setup the Boot Recovery Script
mv ~/marketplace/boot.sh ~/marketplace/scripts/boot.sh
chmod +x ~/marketplace/scripts/boot.sh
crontab -e
# Add this line to the bottom:
@reboot /home/ubuntu/marketplace/scripts/boot.sh
```

---

## Phase 5: Domain & SSL

1.  **Nginx**:
    ```bash
    sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
    sudo ln -s /etc/nginx/sites-available/sinaicamps /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    ```
2.  **SSL**:
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d sinaicamps.com -d api.sinaicamps.com
    ```

---

## Maintenance
*   **View Logs**: `pm2 logs sinaicamps`
*   **Restart App**: `pm2 restart sinaicamps`
*   **Check Boot Status**: `cat ~/marketplace/logs/boot.log`
