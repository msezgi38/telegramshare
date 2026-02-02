# Telegram Manager Deployment Guide

This application is designed to be easily deployed on a VPS (Virtual Private Server) using Docker.

## 🚀 Recommended Deployment (Docker)

The easiest and most reliable way to deploy on a VPS.

### 1. Prerequisites (VPS Side)
Run these commands on your VPS (Ubuntu/Debian recommended):

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
sudo apt install docker.io docker-compose -y

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Transfer Files to VPS
You can use SCP or SFTP to upload the project files. You only need:
- `src/`, `public/`, `telegram-service/`, `data/`
- `package.json`, `next.config.ts`, `tsconfig.json`
- `Dockerfile`, `docker-compose.yml`
- `requirements.txt` (in telegram-service)

> **Important:** Make sure to copy your `data/` and `telegram-service/sessions/` folders if you want to keep your current accounts and messages.

### 3. Build and Start
```bash
cd telegram-manager
sudo docker-compose up -d --build
```

The application will be available at `http://your-vps-ip:3000`

---

## 🛠️ Manual Deployment (Without Docker)

If you prefer not to use Docker, follow these steps:

### 1. Telegram Service (Python)
```bash
cd telegram-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 2. Web Interface (Node.js)
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

---

## 🔒 Security Recommendations

1. **Firewall (UFW):**
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 3000/tcp # Web Interface
   sudo ufw enable
   ```

2. **Reverse Proxy (Optional but Recommended):**
   Use Nginx or Caddy to point a domain (e.g., `telegram.example.com`) to `localhost:3000` with SSL (HTTPS).

3. **Data Backup:**
   Regularly backup the `data/` folder and `telegram-service/sessions/` folder. These contain all your account data and session keys.

---

## 📈 Updating the App
When you make changes to the code:
```bash
sudo docker-compose down
sudo docker-compose up -d --build
```
