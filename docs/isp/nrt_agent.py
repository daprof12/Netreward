#!/usr/bin/env python3
import os
import time
import json
import hmac
import hashlib
import requests
import argparse

def generate_signature(payload_str, secret):
    return hmac.new(secret.encode('utf-8'), payload_str.encode('utf-8'), hashlib.sha256).hexdigest()

def send_heartbeat(api_key, secret, node_id, active_sessions, bytes_up, bytes_down):
    endpoint = os.environ.get('NRT_ENDPOINT', 'https://pmpeyfkbqipfnhokfksl.supabase.co/functions/v1/tracking')
    
    event = {
        "device_id": node_id,  # For ISPs, node_id acts as the device
        "campaign_id": "isp_heartbeat",
        "session_id": f"hb_{int(time.time())}",
        "bytes_up": bytes_up,
        "bytes_down": bytes_down,
        "duration_seconds": 300,
        "active_sessions": active_sessions
    }
    
    payload = json.dumps({"events": [event]})
    signature = generate_signature(payload, secret)
    
    headers = {
        "Content-Type": "application/json",
        "x-isp-api-key": api_key,
        "x-hmac-sig": signature
    }
    
    print(f"Sending heartbeat for {node_id}...")
    try:
        res = requests.post(endpoint, data=payload, headers=headers)
        if res.status_code == 200:
            print("Heartbeat successful:", res.json())
        else:
            print(f"Failed ({res.status_code}):", res.text)
    except Exception as e:
        print("Error sending heartbeat:", e)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='NetReward ISP Heartbeat Agent')
    parser.add_argument('--isp-key', required=True, help='ISP API Key (ni_live_...)')
    parser.add_argument('--secret', required=True, help='ISP Secret Key')
    parser.add_argument('--node', required=True, help='Node ID (e.g., LAGOS_01)')
    parser.add_argument('--interval', type=int, default=300, help='Heartbeat interval in seconds')
    
    args = parser.parse_args()
    print(f"Started NetReward ISP Agent for node {args.node}")
    
    while True:
        # In a real environment, read these metrics from SNMP or your router interface
        active_sessions = 1420
        bytes_up = 1024 * 1024 * 500  # 500MB up
        bytes_down = 1024 * 1024 * 1024 * 5  # 5GB down
        
        send_heartbeat(args.isp_key, args.secret, args.node, active_sessions, bytes_up, bytes_down)
        time.sleep(args.interval)
