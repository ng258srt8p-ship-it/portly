#!/usr/bin/env python3
"""
Fetch cruise lines and ships from Wikidata via SPARQL.
Populates canonical reference data for cruise lines and ships.

Run once to populate database, then periodically to sync new ships.
"""

import json
import time
import urllib.request
import urllib.parse
from typing import List, Dict, Any

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"

# Major cruise line Wikidata IDs
CRUISE_LINES = {
    "Carnival Cruise Line": "Q656554",
    "Royal Caribbean International": "Q929872", 
    "Norwegian Cruise Line": "Q130309",
    "Princess Cruises": "Q745700",
    "Celebrity Cruises": "Q1052823",
    "Holland America Line": "Q1624735",
    "MSC Cruises": "Q663626",
    "Disney Cruise Line": "Q420947",
    "Virgin Voyages": "Q20539284",
    "Seabourn": "Q37125557",
    "Silversea Cruises": "Q2286599",
    "Cunard Line": "Q730587",
    "Azamara": "Q2875081",
    "Oceania Cruises": "Q379437",
    "Viking Ocean Cruises": "Q17091043",
    "Regent Seven Seas Cruises": "Q3247233",
}

HEADERS = {
    'User-Agent': 'Portly/1.0 (https://github.com/portly; contact@example.com)',
    'Accept': 'application/sparql-results+json'
}

def run_sparql(query: str) -> List[Dict]:
    """Execute SPARQL query and return results."""
    url = f"{SPARQL_ENDPOINT}?format=json&query={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers=HEADERS)
    
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    
    return data['results']['bindings']

def fetch_all_cruise_lines() -> List[Dict]:
    """Fetch all cruise lines with ship counts."""
    query = """
    SELECT ?line ?lineLabel (COUNT(?ship) as ?shipCount) WHERE {
      ?ship wdt:P31/wdt:P279* wd:Q1797442 ;  # instance of: cruise ship
            wdt:P137 ?line .                 # operator
      ?line rdfs:label ?lineLabel .
      FILTER(LANG(?lineLabel) = "en")
    } GROUP BY ?line ?lineLabel ORDER BY DESC(?shipCount)
    """
    results = run_sparql(query)
    
    lines = []
    for b in results:
        lines.append({
            'wikidata_id': b['line']['value'].split('/')[-1],
            'name': b['lineLabel']['value'],
            'ship_count': int(b['shipCount']['value'])
        })
    return lines

def fetch_ships_for_line(line_name: str, line_qid: str) -> List[Dict]:
    """Fetch all ships for a specific cruise line."""
    query = f"""
    SELECT ?ship ?shipLabel ?tonnage ?capacity ?yearBuilt ?imo WHERE {{
      ?ship wdt:P137 wd:{line_qid} ;
            rdfs:label ?shipLabel .
      OPTIONAL {{ ?ship wdt:P2056 ?tonnage . }}      # gross tonnage
      OPTIONAL {{ ?ship wdt:P1362 ?capacity . }}     # passenger capacity
      OPTIONAL {{ ?ship wdt:P571 ?yearBuilt . }}     # inception/built
      OPTIONAL {{ ?ship wdt:P458 ?imo . }}           # IMO number
      FILTER(LANG(?shipLabel) = "en")
    }} ORDER BY ?shipLabel
    """
    results = run_sparql(query)
    
    ships = []
    for b in results:
        ships.append({
            'wikidata_id': b['ship']['value'].split('/')[-1],
            'name': b['shipLabel']['value'],
            'cruise_line': line_name,
            'gross_tonnage': int(b['tonnage']['value']) if 'tonnage' in b else None,
            'passenger_capacity': int(b['capacity']['value']) if 'capacity' in b else None,
            'year_built': int(b['yearBuilt']['value'][:4]) if 'yearBuilt' in b else None,
            'imo_number': b['imo']['value'] if 'imo' in b else None,
        })
    return ships

def main():
    print("Fetching cruise lines from Wikidata...")
    lines = fetch_all_cruise_lines()
    print(f"Found {len(lines)} cruise lines")
    
    all_ships = []
    for line in lines:
        if line['ship_count'] > 0:
            print(f"  Fetching ships for {line['name']} ({line['ship_count']} ships)...")
            ships = fetch_ships_for_line(line['name'], line['wikidata_id'])
            all_ships.extend(ships)
            time.sleep(0.5)  # Be nice to the endpoint
    
    print(f"\nTotal ships found: {len(all_ships)}")
    
    # Output as JSON for import
    output = {
        'cruise_lines': lines,
        'ships': all_ships,
        'fetched_at': time.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    with open('/tmp/wikidata_cruise_data.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print("Saved to /tmp/wikidata_cruise_data.json")
    
    # Print summary
    for line in lines:
        line_ships = [s for s in all_ships if s['cruise_line'] == line['name']]
        if line_ships:
            print(f"\n{line['name']} ({len(line_ships)} ships):")
            for s in line_ships[:3]:
                specs = []
                if s['gross_tonnage']: specs.append(f"{s['gross_tonnage']:,} GT")
                if s['passenger_capacity']: specs.append(f"{s['passenger_capacity']:,} pax")
                if s['year_built']: specs.append(f"built {s['year_built']}")
                print(f"  - {s['name']} ({', '.join(specs) if specs else 'no specs'})")
            if len(line_ships) > 3:
                print(f"  ... and {len(line_ships) - 3} more")

if __name__ == '__main__':
    main()