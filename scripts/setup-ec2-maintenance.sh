#!/usr/bin/env bash
# ==============================================================================
# SmartVal EC2 Server Stability & Maintenance Setup Script (Amazon Linux / Ubuntu)
# 
# 1. Configures 4GB swap space to prevent Out-Of-Memory (OOM) kernel panics.
# 2. Configures Docker daemon log rotation to prevent disk space exhaustion.
# 3. Vacuums systemd journald logs and prunes orphaned Docker artifacts.
# 4. Sets up a weekly cron job for automatic Docker maintenance.
# ==============================================================================

set -euo pipefail

echo "=============================================="
echo " Starting SmartVal Host Maintenance Setup... "
echo "=============================================="

# 1. Setup 4GB Swap Space (Prevents OOM crashes when memory spikes)
if [ ! -f /swapfile ] && [ "$(swapon --show | wc -l)" -le 1 ]; then
    echo "[-] Setting up 4GB swap file..."
    sudo dd if=/dev/zero of=/swapfile bs=128M count=32 status=progress
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
    fi
    echo "[+] 4GB swap space enabled successfully."
else
    echo "[i] Swap is already active:"
    swapon --show
fi

# 2. Configure Docker Daemon Log Rotation (Prevents Docker logs from filling disk)
echo "[-] Configuring Docker daemon logging limits..."
sudo mkdir -p /etc/docker
DAEMON_JSON="/etc/docker/daemon.json"

if [ -f "$DAEMON_JSON" ]; then
    echo "[i] Existing $DAEMON_JSON found. Backing up to ${DAEMON_JSON}.bak..."
    sudo cp "$DAEMON_JSON" "${DAEMON_JSON}.bak"
fi

cat <<'EOF' | sudo tee "$DAEMON_JSON" > /dev/null
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  }
}
EOF
echo "[+] Docker log limits configured (max 20MB per container, 3 rotated files)."

# 3. Vacuum bloated system logs
echo "[-] Vacuuming systemd journal logs to max 200MB..."
sudo journalctl --vacuum-size=200M || true

# 4. Prune unused Docker images, dead containers, and build cache
echo "[-] Pruning stopped containers, dangling images, and build caches..."
sudo docker system prune -af --volumes || true

# 5. Setup weekly automatic Docker prune cron
CRON_FILE="/etc/cron.weekly/smartval-docker-prune"
echo "[-] Setting up weekly maintenance cron job at $CRON_FILE..."
cat <<'EOF' | sudo tee "$CRON_FILE" > /dev/null
#!/bin/sh
docker system prune -f --filter "until=168h" > /dev/null 2>&1
journalctl --vacuum-size=200M > /dev/null 2>&1
EOF
sudo chmod +x "$CRON_FILE"
echo "[+] Weekly maintenance cron installed."

# 6. Restart Docker daemon to apply logging limits
echo "[-] Restarting Docker service..."
sudo systemctl restart docker

echo "=============================================="
echo " Setup complete! Host is protected against:   "
echo "  * OOM crashes (4GB Swap active)             "
echo "  * Disk bloat (Docker logs capped at 60MB)   "
echo "  * Unused Docker layer accumulation          "
echo "=============================================="
