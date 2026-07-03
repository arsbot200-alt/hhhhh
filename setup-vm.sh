#!/bin/bash

# Exit on any error
set -e

echo "======================================"
echo " Setting up Telegram Video Bot on VM  "
echo "======================================"

echo "[1/4] Installing dependencies (Node.js, FFmpeg, Git)..."
sudo dnf clean all
sudo dnf update -y

# Install standard development tools
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y git wget

# Install Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Enable CRB (Code Ready Builder) repository for CentOS Stream 9
sudo dnf config-manager --set-enabled crb || sudo dnf config-manager --enable crb || true

# Install EPEL
sudo dnf install -y epel-release

# Install RPM Fusion for FFmpeg
sudo dnf install -y https://mirrors.rpmfusion.org/free/el/rpmfusion-free-release-9.noarch.rpm || true
sudo dnf install -y https://mirrors.rpmfusion.org/nonfree/el/rpmfusion-nonfree-release-9.noarch.rpm || true

# Install FFmpeg
sudo dnf install -y ffmpeg ffmpeg-devel

echo "[2/4] Cloning repository..."
if [ -d "Batmiz" ]; then
  echo "Directory Batmiz already exists, pulling latest..."
  cd Batmiz
  git reset --hard HEAD
  git pull
else
  git clone https://github.com/arsbot200-alt/Batmiz.git
  cd Batmiz
fi

echo "[3/4] Installing NPM packages..."
npm install

echo "[4/4] Building the application..."
npm run build

echo "======================================"
echo " Setup Complete!                      "
echo "======================================"
echo "To start the bot in the background, run:"
echo "  cd ~/Batmiz"
echo "  sudo npm install -g pm2"
echo "  pm2 start dist/server.cjs --name tg-video-bot"
echo "======================================"
