#!/usr/bin/env python3
"""
Fetch port data from UN/LOCODE.
Downloads and parses the official UN/LOCODE CSV for port locations.

UN/LOCODE is the standard for port/location codes used in shipping logistics.
"""

import csv
import io
import urllib.request
from typing import List, Dict, Any

# UN/LOCODE CSV URL (updated periodically)
UNLOCODE_URL = "https://service.unece.org/trade/locode/locode_2024-1.csv"

# Function codes for port-related locations
PORT_FUNCTIONS = {
    '1': 'Port',
    'B': 'Ferry terminal',
    '4': 'Airport',
    '5': 'Rail terminal',
    '6': 'Road terminal',
    '7': 'Postal exchange office',
}

def fetch_unlocode() -> List[Dict]:
    """Download and parse UN/LOCODE CSV, filtering for ports."""
    print(f"Downloading UN/LOCODE from {UNLOCODE_URL}...")
    
    req = urllib.request.Request(
        UNLOCODE_URL,
        headers={'User-Agent': 'Portly/1.0'}
    )
    
    with urllib.request.urlopen(req, timeout=60) as resp:
        content = resp.read().decode('utf-8-sig')  # Handle BOM
    
    print(f"Downloaded {len(content):,} characters")
    
    # Parse CSV
    reader = csv.DictReader(io.StringIO(content))
    
    ports = []
    for row in reader:
        # Function column indicates what type of location
        function = row.get('Function', '').strip()
        
        # Keep only port/ferry locations (Function contains '1' or 'B')
        if '1' in function or 'B' in function:
            # Coordinates are in "DDMMN DDDDMMW" format
            coords = row.get('Coordinates', '').strip()
            lat, lon = parse_coordinates(coords)
            
            ports.append({
                'locode': row.get('LOCODE', '').strip(),
                'country': row.get('Country', '').strip(),
                'name': row.get('Name', '').strip(),
                'name_wo_diacritics': row.get('NameWoDiacritics', '').strip(),
                'subdivision': row.get('SubDiv', '').strip(),
                'function': function,
                'status': row.get('Status', '').strip(),
                'date': row.get('Date', '').strip(),
                'iata': row.get('IATA', '').strip(),
                'latitude': lat,
                'longitude': lon,
                'coordinates_raw': coords,
                'remarks': row.get('Remarks', '').strip(),
            })
    
    return ports

def parse_coordinates(coord_str: str) -> tuple:
    """Parse UN/LOCODE coordinate format: DDMMN DDDMMW -> (lat, lon)"""
    if not coord_str or len(coord_str) < 8:
        return (None, None)
    
    try:
        parts = coord_str.split()
        if len(parts) != 2:
            return (None, None)
        
        lat_str, lon_str = parts[0], parts[1]
        
        # Latitude: DDMMN/S (e.g., "2546N")
        lat_deg = int(lat_str[:2])
        lat_min = int(lat_str[2:4])
        lat_dir = lat_str[4]
        lat = lat_deg + lat_min / 60.0
        if lat_dir == 'S':
            lat = -lat
        
        # Longitude: DDDMMW/E (e.g., "08012W")
        lon_deg = int(lon_str[:3])
        lon_min = int(lon_str[3:5])
        lon_dir = lon_str[5]
        lon = lon_deg + lon_min / 60.0
        if lon_dir == 'W':
            lon = -lon
        
        return (round(lat, 6), round(lon, 6))
    except Exception:
        return (None, None)

def filter_cruise_ports(ports: List[Dict]) -> List[Dict]:
    """Filter to ports commonly used by cruise lines."""
    # Major cruise regions - filter by country/region
    cruise_countries = {
        'US', 'BS', 'BM', 'KY', 'JM', 'HT', 'DO', 'PR', 'VI',  # Caribbean
        'MX', 'BZ', 'GT', 'HN', 'NI', 'CR', 'PA', 'CO', 'VE',  # Central/South America
        'CA',  # Canada/New England
        'IT', 'ES', 'FR', 'GR', 'HR', 'MT', 'CY', 'TR',  # Mediterranean
        'PT', 'GI', 'MA', 'TN', 'DZ', 'LY', 'EG', 'IL', 'LB', 'SY',
        'NO', 'SE', 'DK', 'FI', 'DE', 'EE', 'LV', 'LT', 'PL', 'RU',  # Baltic
        'IS', 'GB', 'IE', 'FO',  # British Isles / Iceland
        'AU', 'NZ', 'PG', 'NC', 'VU', 'FJ', 'WS', 'TO', 'TV', 'KI', 'PF',  # South Pacific
        'JP', 'KR', 'CN', 'TW', 'HK', 'VN', 'TH', 'SG', 'MY', 'ID', 'PH',  # Asia
        'AE', 'QA', 'BH', 'KW', 'OM', 'SA', 'JO',  # Middle East
        'ZA', 'MU', 'SC', 'RE', 'YT', 'KM', 'MG',  # Africa/Indian Ocean
    }
    
    cruise_ports = []
    for p in ports:
        if p['country'] in cruise_countries:
            # Additional filter: prefer major ports (status codes)
            # RL = Recognised location, AA = Approved by national authority
            if p['status'] in ('RL', 'AA', 'RQ', 'AS', 'AF'):
                cruise_ports.append(p)
    
    return cruise_ports

def main():
    ports = fetch_unlocode()
    print(f"Total port locations: {len(ports)}")
    
    cruise_ports = filter_cruise_ports(ports)
    print(f"Cruise-relevant ports: {len(cruise_ports)}")
    
    # Show sample
    print("\nSample cruise ports:")
    for p in cruise_ports[:10]:
        coords = f"({p['latitude']}, {p['longitude']})" if p['latitude'] else "no coords"
        print(f"  {p['locode']} - {p['name']}, {p['country']} {coords} [Function: {p['function']}]")
    
    # Save full data
    import json
    output = {
        'all_ports': ports,
        'cruise_ports': cruise_ports,
        'total_ports': len(ports),
        'cruise_port_count': len(cruise_ports),
        'source': 'UN/LOCODE 2024-1',
        'url': UNLOCODE_URL
    }
    
    with open('/tmp/unlocode_ports.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print("\nSaved to /tmp/unlocode_ports.json")
    
    # Show top countries
    from collections import Counter
    country_counts = Counter(p['country'] for p in cruise_ports)
    print("\nTop countries by cruise port count:")
    for country, count in country_counts.most_common(15):
        print(f"  {country}: {count}")

if __name__ == '__main__':
    main()