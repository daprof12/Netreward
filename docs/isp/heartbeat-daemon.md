# ISP Integration: Heartbeat Daemon

ISPs integrate with NetReward at the network level, not the application level. To earn NetReward tokens (NRT) for providing high-quality internet to campaigns, you must report aggregated data usage.

The simplest way is using our Python Heartbeat Daemon.

## 1. Credentials
Get these from your NetReward Dashboard > Settings > Integrated Platforms.
- **ISP API Key**: `ni_live_xxxxxxxx`
- **Secret Key**: `nrt_secret_xxxxxxxx` (Keep this safe! Used for HMAC signatures)

## 2. Installation (Linux/Unix)

You can run the heartbeat agent on any Linux server, router (OpenWRT with python3), or ground station.

```bash
# 1. Download the agent script
curl -o nrt_agent.py https://raw.githubusercontent.com/daprof12/Netreward/main/docs/isp/nrt_agent.py
chmod +x nrt_agent.py

# 2. Install dependencies
pip3 install requests

# 3. Test it (replace with your keys)
python3 nrt_agent.py \
  --isp-key="ni_live_YOUR_API_KEY" \
  --secret="YOUR_SECRET_KEY" \
  --node="LAGOS_MAIN_01"
```

## 3. Running as a Systemd Service (Recommended)

To ensure the agent runs continuously in the background and restarts on reboot:

1. Create `/etc/systemd/system/nrt-agent.service`:
```ini
[Unit]
Description=NetReward ISP Heartbeat Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/nrt_agent.py --isp-key="ni_live_xxx" --secret="xxx" --node="NODE_01"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable nrt-agent
sudo systemctl start nrt-agent
```

## 4. Custom Integration (Other Languages)

If you use a different stack (Go, C++, Java), you can hit the API directly.
**Endpoint**: `POST https://pmpeyfkbqipfnhokfksl.supabase.co/functions/v1/tracking`

**Headers Required:**
- `Content-Type: application/json`
- `x-isp-api-key`: Your ISP API Key
- `x-hmac-sig`: HMAC-SHA256 signature of the raw request body using your Secret Key

**Body:**
```json
{
  "events": [
    {
      "device_id": "YOUR_NODE_ID",
      "campaign_id": "isp_heartbeat",
      "session_id": "hb_1684321000",
      "bytes_up": 524288000,
      "bytes_down": 5368709120,
      "duration_seconds": 300,
      "active_sessions": 1420
    }
  ]
}
```
