/**
 * TRIPTIDE — Expanded Database Seed Script
 *
 * Populates ALL tables with rich, realistic data without calling any external API.
 * Ships: 50 real cruise ships across 8 lines
 * Sailings: 200+ with varied destinations, dates, and ports
 * Pricing: 500+ snapshots across cabin tiers, plus 2-3 historical records each
 * Insights: Destination insights, market comparisons, booking insights
 *
 * Run via: npx ts-node server/db/seedExpanded.ts
 */

import { getPool, closePool, testConnection } from './pool';

// =============================================================================
// SHIP DETAILS — 50 real cruise ships across 8 lines
// Data based on published specs (year_built, capacity, tonnage, etc.)
// =============================================================================

interface ShipData {
  shipName: string;
  cruiseLine: string;
  shipClass: string;
  yearBuilt: number;
  passengerCapacity: number;
  crewCount: number;
  tonnage: number;
  restaurants: string[];
  pools: number;
  entertainment: string[];
  amenities: string[];
  deckCount: number;
  cabinCount: number;
}

const ships: ShipData[] = [
  // ---- ROYAL CARIBBEAN (10) ----
  { shipName: 'Icon of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Icon', yearBuilt: 2024, passengerCapacity: 5610, crewCount: 2350, tonnage: 250800, restaurants: ['Empire Supper Club', 'Pearl Cafe', 'AquaDome Market', 'Izumi', 'Giovanni\'s Italian Kitchen', 'Chops Grille', 'Playmakers Sports Bar', 'El Loco Fresh', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Park Cafe'], pools: 7, entertainment: ['AquaTheater', 'Absolute Zero Ice Rink', 'Starburst Entertainment Zone', 'Royal Theater', 'The Overlook', 'Dual FlowRider surf simulators'], amenities: ['Empire Supper Club', 'The Hideaway', 'Thrill Island water park', 'Cloud 17', 'Royal Bay Pool', 'Fitness Center', 'Casino', 'Spa & Salon', 'Adventure Ocean Youth Club', 'Teen Club', 'The Grove'], deckCount: 20, cabinCount: 2805 },
  { shipName: 'Symphony of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Oasis', yearBuilt: 2018, passengerCapacity: 5518, crewCount: 2200, tonnage: 228081, restaurants: ['Wonderland', '150 Central Park', 'Chops Grille', 'Izumi', 'Hooked Seafood', 'Jamie\'s Italian', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Park Cafe', 'El Loco Fresh', 'Johnny Rockets'], pools: 4, entertainment: ['AquaTheater', 'Ice Skating Rink', 'Studio B', 'Casino Royale', 'Comedy Club', 'Blaze Nightclub', 'FlowRider'], amenities: ['Central Park', 'Boardwalk', 'Vitality Spa', 'Fitness Center', 'Casino', 'Youth Zone', 'Teen Lounge', 'Solarium', 'Sports Court', 'Mini Golf'], deckCount: 18, cabinCount: 2759 },
  { shipName: 'Wonder of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Oasis', yearBuilt: 2022, passengerCapacity: 5488, crewCount: 2195, tonnage: 236857, restaurants: ['Wonderland', 'Chops Grille', 'Izumi', 'Giovanni\'s Italian Kitchen', 'Hooked Seafood', 'El Loco Fresh', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Park Cafe', 'Playmakers', 'Johnny Rockets'], pools: 4, entertainment: ['AquaTheater', 'Ice Rink', 'Royal Theater', 'Casino', 'Comedy Club', 'Music Hall', 'FlowRider', 'Zip Line'], amenities: ['Central Park', 'Boardwalk', 'Suite Sun Deck', 'Vitality Spa', 'Fitness Center', 'Casino', 'Adventure Ocean', 'Sports Court'], deckCount: 18, cabinCount: 2744 },
  { shipName: 'Utopia of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Oasis', yearBuilt: 2024, passengerCapacity: 5668, crewCount: 2300, tonnage: 236857, restaurants: ['Wonderland', '150 Central Park', 'Chops Grille', 'Izumi', 'Giovanni\'s Table', 'El Loco Fresh', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Park Cafe', 'Playmakers', 'Johnny Rockets'], pools: 4, entertainment: ['AquaTheater', 'Ice Rink', 'Royal Theater', 'Comedy Club', 'Boleros', 'FlowRider', 'Zip Line', 'Carousel'], amenities: ['Central Park', 'Boardwalk', 'Perfect Waterfront', 'Solarium', 'Fitness Center', 'Casino', 'Adventure Ocean', 'Edge Teen Club'], deckCount: 18, cabinCount: 2834 },
  { shipName: 'Allure of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Oasis', yearBuilt: 2010, passengerCapacity: 5464, crewCount: 2100, tonnage: 225282, restaurants: ['Chops Grille', 'Giovanni\'s Table', 'Izumi', 'Rita\'s Cantina', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Park Cafe', 'Johnny Rockets', 'Starbucks'], pools: 4, entertainment: ['AquaTheater', 'Ice Rink', 'Royal Theater', 'Comedy Club', 'Blaze', 'FlowRider', 'Zip Line', 'Carousel'], amenities: ['Central Park', 'Boardwalk', 'Vitality Spa', 'Fitness Center', 'Casino', 'Adventure Ocean', 'Sports Deck', 'Mini Golf'], deckCount: 16, cabinCount: 2732 },
  { shipName: 'Oasis of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Oasis', yearBuilt: 2009, passengerCapacity: 5400, crewCount: 2100, tonnage: 225282, restaurants: ['Chops Grille', 'Giovanni\'s Table', 'Izumi', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Park Cafe', 'Johnny Rockets', 'Wipe Out Cafe'], pools: 4, entertainment: ['AquaTheater', 'Ice Rink', 'Royal Theater', 'Comedy Club', 'Opal Theater', 'FlowRider', 'Zip Line', 'Carousel'], amenities: ['Central Park', 'Boardwalk', 'Solarium', 'Fitness Center', 'Casino', 'Adventure Ocean', 'Sports Court'], deckCount: 16, cabinCount: 2700 },
  { shipName: 'Harmony of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Oasis', yearBuilt: 2016, passengerCapacity: 5479, crewCount: 2100, tonnage: 226963, restaurants: ['Wonderland', 'Chops Grille', 'Izumi', 'Jamie\'s Italian', 'El Loco Fresh', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Park Cafe', 'Johnny Rockets'], pools: 4, entertainment: ['AquaTheater', 'Ice Rink', 'Royal Theater', 'Comedy Club', 'Dazzles', 'FlowRider', 'Zip Line', 'Escape Room'], amenities: ['Central Park', 'Boardwalk', 'Solarium', 'Vitality Spa', 'Fitness Center', 'Casino', 'Adventure Ocean', 'Sports Court'], deckCount: 16, cabinCount: 2740 },
  { shipName: 'Freedom of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Freedom', yearBuilt: 2006, passengerCapacity: 3632, crewCount: 1376, tonnage: 154407, restaurants: ['Chops Grille', 'Giovanni\'s Table', 'Izumi', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Cafe Promenade', 'Ben & Jerry\'s', 'Johnny Rockets'], pools: 3, entertainment: ['Arcade', 'Ice Rink', 'Casino', 'Comedy Club', 'FlowRider', 'Rock Climbing Wall', 'Water Park'], amenities: ['Solarium', 'Vitality Spa', 'Fitness Center', 'Casino', 'Adventure Ocean', 'Sports Court', 'Rock Wall', 'Mini Golf'], deckCount: 15, cabinCount: 1816 },
  { shipName: 'Independence of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Freedom', yearBuilt: 2008, passengerCapacity: 3634, crewCount: 1376, tonnage: 154407, restaurants: ['Chops Grille', 'Izumi', 'Giovanni\'s Table', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Fish & Ships', 'Cafe Promenade', 'Johnny Rockets'], pools: 3, entertainment: ['Ice Rink', 'Casino', 'Comedy Club', 'Arcade', 'FlowRider', 'Rock Wall', 'Sports Court'], amenities: ['Solarium', 'Spa', 'Fitness Center', 'Casino', 'Adventure Ocean', 'Sports Deck', 'Rock Wall'], deckCount: 15, cabinCount: 1817 },
  { shipName: 'Navigator of the Seas', cruiseLine: 'Royal Caribbean', shipClass: 'Voyager', yearBuilt: 2002, passengerCapacity: 3114, crewCount: 1185, tonnage: 138279, restaurants: ['Chops Grille', 'Izumi', 'Giovanni\'s Table', 'Windjammer', 'Main Dining Room', 'Sorrento\'s', 'Cafe Promenade', 'Playmakers'], pools: 2, entertainment: ['Casino', 'Comedy Club', 'Ice Rink', 'FlowRider', 'Rock Wall', 'Arcade', 'Nightclub'], amenities: ['Solarium', 'Spa', 'Fitness Center', 'Casino', 'Adventure Ocean', 'Rock Wall', 'Sports Court', 'Mini Golf'], deckCount: 15, cabinCount: 1557 },

  // ---- NORWEGIAN CRUISE LINE (7) ----
  { shipName: 'Norwegian Viva', cruiseLine: 'Norwegian Cruise Line', shipClass: 'Prima Plus', yearBuilt: 2023, passengerCapacity: 3215, crewCount: 1506, tonnage: 142500, restaurants: ['Hudson\'s', 'Commodore Room', 'Food Republic', 'Le Bistro', 'Cagney\'s Steakhouse', 'Los Lobos', 'Palomar', 'Onda by Scarpetta', 'The Local', 'Garden Cafe', 'Indulge Food Hall'], pools: 3, entertainment: ['Syrah Theater', 'The Improv', 'Stardust Lounge', 'Viva Speedway', 'Galaxy Pavilion', 'The Stadium', 'Teatro Metropolitan'], amenities: ['Mandara Spa', 'Fitness Center', 'Casino', 'Splash Academy Youth Program', 'Entourage Teen Club', 'Wave Pool', 'Infinity Beach', 'Oceanwalk'], deckCount: 18, cabinCount: 1640 },
  { shipName: 'Norwegian Prima', cruiseLine: 'Norwegian Cruise Line', shipClass: 'Prima', yearBuilt: 2022, passengerCapacity: 3099, crewCount: 1506, tonnage: 142500, restaurants: ['Hudson\'s', 'Commodore Room', 'Food Republic', 'Le Bistro', 'Cagney\'s', 'Los Lobos', 'Hasuki', 'Onda', 'The Local', 'Garden Cafe'], pools: 3, entertainment: ['Teatro Prima', 'The Improv', 'Prima Speedway', 'Galaxy Pavilion', 'Stardust Lounge', 'The Stadium', 'Escape Room'], amenities: ['Mandara Spa', 'Fitness Center', 'Casino', 'Youth Program', 'Oceanwalk', 'Infinity Beach', 'Racetrack', 'Vibe Beach Club'], deckCount: 18, cabinCount: 1580 },
  { shipName: 'Norwegian Escape', cruiseLine: 'Norwegian Cruise Line', shipClass: 'Breakaway Plus', yearBuilt: 2015, passengerCapacity: 4266, crewCount: 1733, tonnage: 164600, restaurants: ['Savor', 'Taste', 'Manhattan Room', 'Le Bistro', 'Cagney\'s', 'Moderno', 'Food Republic', 'Teppanyaki', 'O\'Sheehan\'s', 'Garden Cafe', 'Margaritaville'], pools: 3, entertainment: ['Escape Theater', 'Comedy Club', 'Skyline Bar', 'Spice H2O', 'Aqua Park', 'Ropes Course', 'Mini Golf', 'Sports Complex'], amenities: ['Mandara Spa', 'Fitness Center', 'Casino', 'Splash Academy', 'Entourage', 'Vibe Beach Club', 'Water Park', 'Bowling Alley'], deckCount: 18, cabinCount: 2133 },
  { shipName: 'Norwegian Breakaway', cruiseLine: 'Norwegian Cruise Line', shipClass: 'Breakaway', yearBuilt: 2013, passengerCapacity: 3963, crewCount: 1595, tonnage: 146600, restaurants: ['Savor', 'Taste', 'Manhattan Room', 'Le Bistro', 'Cagney\'s', 'Moderno', 'Teppanyaki', 'O\'Sheehan\'s', 'Wasabi', 'Garden Cafe', 'Uptown Grill'], pools: 3, entertainment: ['Breakaway Theater', 'Comedy Club', 'Spice H2O', 'Circus Dinner Show', 'Aqua Park', 'Bowling Alley', 'Ropes Course', 'Rock Wall'], amenities: ['Mandara Spa', 'Fitness Center', 'Casino', 'Splash Academy', 'Entourage', 'Vibe Beach Club', 'Water Slides', 'Sports Complex'], deckCount: 16, cabinCount: 1982 },
  { shipName: 'Norwegian Bliss', cruiseLine: 'Norwegian Cruise Line', shipClass: 'Breakaway Plus', yearBuilt: 2018, passengerCapacity: 4004, crewCount: 1716, tonnage: 168028, restaurants: ['Savor', 'Taste', 'Manhattan Room', 'Le Bistro', 'Cagney\'s', 'Moderno', 'Food Republic', 'Teppanyaki', 'Los Lobos', 'Garden Cafe', 'The Local', 'Q Texas Smokehouse'], pools: 3, entertainment: ['Bliss Theater', 'Comedy Club', 'Skyline Bar', 'Spice H2O', 'Observation Lounge', 'Go-Kart Track', 'Laser Tag', 'Aqua Park'], amenities: ['Mandara Spa', 'Fitness Center', 'Casino', 'Splash Academy', 'Entourage', 'Race Track', 'Observation Lounge', 'Water Park'], deckCount: 18, cabinCount: 2002 },
  { shipName: 'Norwegian Encore', cruiseLine: 'Norwegian Cruise Line', shipClass: 'Breakaway Plus', yearBuilt: 2019, passengerCapacity: 3998, crewCount: 1707, tonnage: 169116, restaurants: ['Savor', 'Taste', 'Manhattan Room', 'Le Bistro', 'Cagney\'s', 'Moderno', 'Food Republic', 'Teppanyaki', 'Los Lobos', 'Garden Cafe', 'The Local', 'Q'], pools: 3, entertainment: ['Encore Theater', 'Comedy Club', 'Observation Lounge', 'Go-Kart Track', 'Galaxy Pavilion', 'Laser Tag', 'Aqua Park', 'The Speedway'], amenities: ['Mandara Spa', 'Fitness Center', 'Casino', 'Splash Academy', 'Race Track', 'Observation Lounge', 'Water Slides', 'Open Air Laser Tag'], deckCount: 18, cabinCount: 1999 },
  { shipName: 'Norwegian Joy', cruiseLine: 'Norwegian Cruise Line', shipClass: 'Breakaway Plus', yearBuilt: 2017, passengerCapacity: 3850, crewCount: 1680, tonnage: 168800, restaurants: ['Savor', 'Taste', 'Manhattan Room', 'Le Bistro', 'Cagney\'s', 'Moderno', 'Food Republic', 'Teppanyaki', 'La Cucina', 'Garden Cafe', 'The Local', 'Q'], pools: 3, entertainment: ['Joy Theater', 'Comedy Club', 'Observation Lounge', 'Galaxy Pavilion', 'Speedway', 'Laser Tag', 'Aqua Park', 'Mini Golf'], amenities: ['Mandara Spa', 'Fitness Center', 'Casino', 'Youth Program', 'Race Track', 'Observation Lounge', 'Water Slides', 'Vibe Beach Club'], deckCount: 18, cabinCount: 1925 },

  // ---- PRINCESS CRUISES (6) ----
  { shipName: 'Discovery Princess', cruiseLine: 'Princess Cruises', shipClass: 'Royal', yearBuilt: 2022, passengerCapacity: 3660, crewCount: 1346, tonnage: 145000, restaurants: ['Crown Grill', 'Sabatini\'s', 'Alfredo\'s Pizzeria', 'International Cafe', 'Gigi\'s Pizzeria', 'Salty Dog Grill', 'Horizon Court Buffet', 'Concerto Dining Room', 'Symphony Dining Room', 'Cielo Dining Room', 'The Catch by Rudi', 'Oceans Grill'], pools: 4, entertainment: ['Princess Theater', 'Vista Lounge', 'Casino', 'Movies Under the Stars', 'Club 6', 'The Enclave', 'Princess Live!', 'Crooners Lounge'], amenities: ['The Sanctuary', 'Lotus Spa', 'Fitness Center', 'Casino', 'Youth Center', 'The Enclave', 'Discovery at SEA program', 'Splash Zone'], deckCount: 19, cabinCount: 1830 },
  { shipName: 'Sun Princess', cruiseLine: 'Princess Cruises', shipClass: 'Sphere', yearBuilt: 2024, passengerCapacity: 4300, crewCount: 1600, tonnage: 177882, restaurants: ['Crown Grill', 'Sabatini\'s', 'Alfredo\'s Pizzeria', 'International Cafe', 'Horizon Buffet', 'Americano Dining Room', 'Soleil Dining Room', 'The Butcher\'s Block by Dario', 'Spellbound by Sarafian', 'Oceans Grill', 'Gigi\'s Pizzeria'], pools: 5, entertainment: ['Princess Theater', 'Casino', 'Movies Under the Stars', 'The Dome', 'Piazza', 'Arena', 'Club 360'], amenities: ['The Sanctuary', 'Lotus Spa', 'Fitness Center', 'Casino', 'Splash Zone', 'Youth Program', 'The Dome Geodesic Structure', 'Infinity Pool'], deckCount: 21, cabinCount: 2150 },
  { shipName: 'Enchanted Princess', cruiseLine: 'Princess Cruises', shipClass: 'Royal', yearBuilt: 2020, passengerCapacity: 3660, crewCount: 1346, tonnage: 145000, restaurants: ['Crown Grill', 'Sabatini\'s', 'Alfredo\'s', 'International Cafe', 'Horizon Buffet', 'Concerto Dining', 'Symphony Dining', 'Cielo Dining', 'Salt Dog Grill', 'Bistro Sur La Mer', 'Vines Wine Bar'], pools: 4, entertainment: ['Princess Theater', 'Vista Lounge', 'Casino', 'Movies Under the Stars', 'Take 5 Jazz Bar', 'Club 6', 'Princess Live!'], amenities: ['The Sanctuary', 'Lotus Spa', 'Fitness Center', 'Casino', 'Youth Center', 'The Enclave', 'Discovery program'], deckCount: 19, cabinCount: 1830 },
  { shipName: 'Sky Princess', cruiseLine: 'Princess Cruises', shipClass: 'Royal', yearBuilt: 2019, passengerCapacity: 3660, crewCount: 1346, tonnage: 145000, restaurants: ['Crown Grill', 'Sabatini\'s', 'Alfredo\'s', 'International Cafe', 'Horizon Buffet', 'Concerto Dining', 'Symphony Dining', 'Cielo Dining', 'Salty Dog Grill', 'Ocean Terrace Seafood', 'Vines'], pools: 4, entertainment: ['Princess Theater', 'Vista Lounge', 'Casino', 'Movies Under the Stars', 'Club 6', 'Take 5', 'Princess Live!'], amenities: ['The Sanctuary', 'Lotus Spa', 'Fitness Center', 'Casino', 'Youth Center', 'The Enclave'], deckCount: 19, cabinCount: 1830 },
  { shipName: 'Majestic Princess', cruiseLine: 'Princess Cruises', shipClass: 'Royal', yearBuilt: 2017, passengerCapacity: 3560, crewCount: 1346, tonnage: 145000, restaurants: ['Crown Grill', 'Sabatini\'s', 'Alfredo\'s', 'International Cafe', 'Horizon Buffet', 'Concerto Dining', 'Symphony Dining', 'Cielo Dining', 'Salty Dog Grill', 'Noodle Bar', 'Ocean Terrace'], pools: 4, entertainment: ['Princess Theater', 'Casino', 'Movies Under the Stars', 'Club 6', 'Vista Lounge', 'Princess Live!', 'Wheelhouse Bar'], amenities: ['The Sanctuary', 'Lotus Spa', 'Fitness Center', 'Casino', 'Youth Center', 'The Enclave', 'Hollywood Pool Club'], deckCount: 19, cabinCount: 1780 },
  { shipName: 'Regal Princess', cruiseLine: 'Princess Cruises', shipClass: 'Royal', yearBuilt: 2014, passengerCapacity: 3560, crewCount: 1346, tonnage: 141000, restaurants: ['Crown Grill', 'Sabatini\'s', 'Alfredo\'s', 'International Cafe', 'Horizon Buffet', 'Concerto Dining', 'Symphony Dining', 'Allegro Dining', 'Salty Dog Grill', 'Trident Grill', 'Vines'], pools: 4, entertainment: ['Princess Theater', 'Casino', 'Movies Under the Stars', 'Club 6', 'Vista Lounge', 'Princess Live!', 'SeaWalk'], amenities: ['The Sanctuary', 'Lotus Spa', 'Fitness Center', 'Casino', 'Youth Center', 'The Enclave', 'SeaWalk'], deckCount: 19, cabinCount: 1780 },

  // ---- CARNIVAL (7) ----
  { shipName: 'Carnival Celebration', cruiseLine: 'Carnival Cruise Line', shipClass: 'Excel', yearBuilt: 2022, passengerCapacity: 5214, crewCount: 1737, tonnage: 183521, restaurants: ['Emerald Restaurant', 'Sapphire Restaurant', 'Guy\'s Burger Joint', 'Pig & Anchor', 'Bonsai Teppanyaki', 'Chibang!', 'Cucina del Capitano', 'Fahrenheit 513 Steakhouse', 'Lido Marketplace', 'BlueIguana Cantina', 'Mongolian Wok', 'Seafood Shack', 'Shaq\'s Big Chicken'], pools: 4, entertainment: ['Celebration Central', 'Grand Theater', 'Liquid Lounge', 'Summer Landing', 'Ultimate Playground', 'SkyCourt', 'WaterWorks', 'Bolt Roller Coaster'], amenities: ['Cloud 9 Spa', 'Fitness Center', 'Casino', 'Camp Ocean Youth Program', 'Circle C Tween Club', 'Club O2 Teen Club', 'Water Works', 'Bolt Roller Coaster'], deckCount: 17, cabinCount: 2607 },
  { shipName: 'Mardi Gras', cruiseLine: 'Carnival Cruise Line', shipClass: 'Excel', yearBuilt: 2020, passengerCapacity: 5282, crewCount: 1745, tonnage: 184089, restaurants: ['Emerald Restaurant', 'Sapphire Restaurant', 'Guy\'s Burger Joint', 'Pig & Anchor', 'Bonsai Teppanyaki', 'Chibang!', 'Cucina del Capitano', 'Fahrenheit 513', 'Lido Marketplace', 'BlueIguana Cantina', 'Mongolian Wok', 'Shaq\'s Big Chicken', 'Street Eats'], pools: 4, entertainment: ['Grand Central', 'Grand Theater', 'Liquid Lounge', 'Summer Landing', 'Ultimate Playground', 'Bolt Roller Coaster', 'WaterWorks', 'SkyCourse Ropes'], amenities: ['Cloud 9 Spa', 'Fitness Center', 'Casino', 'Camp Ocean', 'Circle C', 'Club O2', 'WaterWorks', 'Bolt Coaster', 'Ropes Course'], deckCount: 17, cabinCount: 2641 },
  { shipName: 'Carnival Jubilee', cruiseLine: 'Carnival Cruise Line', shipClass: 'Excel', yearBuilt: 2023, passengerCapacity: 5224, crewCount: 1737, tonnage: 183521, restaurants: ['Emerald Restaurant', 'Sapphire Restaurant', 'Guy\'s Burger Joint', 'Pig & Anchor', 'Bonsai Teppanyaki', 'Chibang!', 'Cucina del Capitano', 'Fahrenheit 513', 'Lido Marketplace', 'BlueIguana Cantina', 'Mongolian Wok', 'Shaq\'s Big Chicken'], pools: 4, entertainment: ['Celebration Central', 'Grand Theater', 'Liquid Lounge', 'Ultimate Playground', 'SkyCourt', 'WaterWorks', 'Bolt Roller Coaster', 'Ropes Course'], amenities: ['Cloud 9 Spa', 'Fitness Center', 'Casino', 'Camp Ocean', 'Youth Program', 'WaterWorks', 'Bolt Roller Coaster', 'Currents Pool'], deckCount: 17, cabinCount: 2612 },
  { shipName: 'Carnival Panorama', cruiseLine: 'Carnival Cruise Line', shipClass: 'Vista', yearBuilt: 2019, passengerCapacity: 4000, crewCount: 1450, tonnage: 133500, restaurants: ['Horizon Restaurant', 'Miracle Restaurant', 'Guy\'s Burger Joint', 'Pig & Anchor', 'Bonsai Teppanyaki', 'Cucina del Capitano', 'Fahrenheit 555', 'Lido Marketplace', 'BlueIguana Cantina', 'Shaq\'s Big Chicken', 'JavaBlue Cafe'], pools: 3, entertainment: ['Panorama Theater', 'Liquid Lounge', 'SkyRide', 'WaterWorks', '4D Cinema', 'SkyCourse', 'Trivia Lounge', 'Casino'], amenities: ['Cloud 9 Spa', 'Fitness Center', 'Casino', 'Camp Ocean', 'Circle C', 'Club O2', 'SkyRide', 'WaterWorks', 'Ropes Course'], deckCount: 15, cabinCount: 2000 },
  { shipName: 'Carnival Horizon', cruiseLine: 'Carnival Cruise Line', shipClass: 'Vista', yearBuilt: 2018, passengerCapacity: 3960, crewCount: 1450, tonnage: 133500, restaurants: ['Horizon Restaurant', 'Miracle Restaurant', 'Guy\'s Burger Joint', 'Pig & Anchor', 'Bonsai Sushi', 'Cucina del Capitano', 'Fahrenheit 555', 'Lido Marketplace', 'BlueIguana Cantina', 'Seafood Shack', 'JavaBlue'], pools: 3, entertainment: ['Horizon Theater', 'Liquid Lounge', 'SkyRide', 'WaterWorks', 'IMAX Theater', 'SkyCourse', 'Casino', 'Pulse Nightclub'], amenities: ['Cloud 9 Spa', 'Fitness Center', 'Casino', 'Camp Ocean', 'Circle C', 'Club O2', 'IMAX', 'WaterWorks', 'SkyRide'], deckCount: 15, cabinCount: 1980 },
  { shipName: 'Carnival Vista', cruiseLine: 'Carnival Cruise Line', shipClass: 'Vista', yearBuilt: 2016, passengerCapacity: 3934, crewCount: 1450, tonnage: 133500, restaurants: ['Horizon Restaurant', 'Miracle Restaurant', 'Guy\'s Burger Joint', 'Pig & Anchor', 'Bonsai Sushi', 'Cucina del Capitano', 'Fahrenheit 555', 'Lido Marketplace', 'BlueIguana Cantina', 'Grand Buffet', 'Taste Bar'], pools: 3, entertainment: ['Vista Theater', 'Liquid Lounge', 'SkyRide', 'WaterWorks', 'Casino', 'Pulse Nightclub', 'Trivia Lounge', 'Comedy Club'], amenities: ['Cloud 9 Spa', 'Fitness Center', 'Casino', 'Camp Ocean', 'Youth Program', 'WaterWorks', 'SkyRide', 'Ropes Course'], deckCount: 15, cabinCount: 1967 },
  { shipName: 'Carnival Dream', cruiseLine: 'Carnival Cruise Line', shipClass: 'Dream', yearBuilt: 2009, passengerCapacity: 3646, crewCount: 1369, tonnage: 128000, restaurants: ['Crimson Restaurant', 'Saffron Restaurant', 'Guy\'s Burger Joint', 'Pig & Anchor', 'Bonsai Sushi', 'Cucina del Capitano', 'Fahrenheit 555', 'Lido Marketplace', 'BlueIguana Cantina', 'Ocean Plaza', 'Pizzeria del Capitano'], pools: 3, entertainment: ['Dream Theater', 'Liquid Lounge', 'WaterWorks', 'Casino', 'Comedy Club', 'Pulse Nightclub', 'Hasbro Game Show', 'Mini Golf'], amenities: ['Cloud 9 Spa', 'Fitness Center', 'Casino', 'Camp Ocean', 'WaterWorks', 'Mini Golf', 'Sports Court', 'Video Arcade'], deckCount: 14, cabinCount: 1823 },

  // ---- CELEBRITY (5) ----
  { shipName: 'Celebrity Beyond', cruiseLine: 'Celebrity Cruises', shipClass: 'Edge', yearBuilt: 2022, passengerCapacity: 3260, crewCount: 1395, tonnage: 140600, restaurants: ['Eden Restaurant', 'Le Voyage by Daniel Boulud', 'Fine Cut Steakhouse', 'Raw on 5', 'Blu', 'Cosmopolitan', 'Tuscan Restaurant', 'Normandie', 'Oceanview Cafe', 'Spa Cafe & Juice Bar', 'Al Bacio', 'The Grate'], pools: 4, entertainment: ['The Theater', 'Eden', 'Club', 'The Magic Carpet', 'The Sunset Bar', 'Rooftop Garden', 'Casino', 'The Martini Bar'], amenities: ['The Retreat', 'SEA Thermal Suite', 'Fitness Center', 'Casino', 'Camp at Sea Youth Program', 'Rooftop Garden', 'Magic Carpet', 'Spa'], deckCount: 17, cabinCount: 1630 },
  { shipName: 'Celebrity Ascent', cruiseLine: 'Celebrity Cruises', shipClass: 'Edge', yearBuilt: 2023, passengerCapacity: 3260, crewCount: 1395, tonnage: 140600, restaurants: ['Eden Restaurant', 'Le Voyage', 'Fine Cut', 'Raw on 5', 'Blu', 'Cosmopolitan', 'Tuscan', 'Normandie', 'Oceanview Cafe', 'Al Bacio', 'The Grate', 'Cyber Cabana'], pools: 4, entertainment: ['The Theater', 'Eden', 'Club', 'Magic Carpet', 'Sunset Bar', 'Rooftop Garden', 'Casino', 'The Martini Bar'], amenities: ['The Retreat', 'Thermal Suite', 'Fitness Center', 'Casino', 'Youth Program', 'Rooftop Garden', 'Magic Carpet'], deckCount: 17, cabinCount: 1630 },
  { shipName: 'Celebrity Apex', cruiseLine: 'Celebrity Cruises', shipClass: 'Edge', yearBuilt: 2020, passengerCapacity: 2910, crewCount: 1270, tonnage: 129000, restaurants: ['Eden Restaurant', 'Fine Cut Steakhouse', 'Raw on 5', 'Blu', 'Cosmopolitan', 'Tuscan', 'Normandie', 'Oceanview Cafe', 'Al Bacio', 'Spa Cafe'], pools: 4, entertainment: ['The Theater', 'Eden', 'Club', 'Magic Carpet', 'Sunset Bar', 'Rooftop Garden', 'Casino', 'The Martini Bar', 'The Grand Plaza'], amenities: ['The Retreat', 'Thermal Suite', 'Fitness Center', 'Casino', 'Camp at Sea', 'Rooftop Garden', 'Magic Carpet'], deckCount: 16, cabinCount: 1455 },
  { shipName: 'Celebrity Edge', cruiseLine: 'Celebrity Cruises', shipClass: 'Edge', yearBuilt: 2018, passengerCapacity: 2908, crewCount: 1270, tonnage: 129000, restaurants: ['Eden Restaurant', 'Fine Cut Steakhouse', 'Raw on 5', 'Blu', 'Cosmopolitan', 'Tuscan', 'Normandie', 'Oceanview Cafe', 'Al Bacio', 'Spa Cafe'], pools: 4, entertainment: ['The Theater', 'Eden', 'Club', 'Magic Carpet', 'Sunset Bar', 'Rooftop Garden', 'Casino', 'The Martini Bar'], amenities: ['The Retreat', 'Thermal Suite', 'Fitness Center', 'Casino', 'Youth Program', 'Rooftop Garden', 'Magic Carpet', 'Spa'], deckCount: 16, cabinCount: 1454 },
  { shipName: 'Celebrity Solstice', cruiseLine: 'Celebrity Cruises', shipClass: 'Solstice', yearBuilt: 2008, passengerCapacity: 2852, crewCount: 1250, tonnage: 122000, restaurants: ['Murano', 'Tuscan Grille', 'Blu', 'Silk Harvest', 'Moonlight Sonata', 'Grand Epernay', 'Oceanview Cafe', 'AquaSpa Cafe', 'The Porch', 'Bistro on Five'], pools: 3, entertainment: ['Celebrity Theater', 'Casino', 'Sky Observation Lounge', 'The Lawn Club', 'Hot Glass Show', 'Quasar', 'Michaels Club'], amenities: ['AquaSpa', 'Fitness Center', 'Casino', 'Youth Program', 'The Lawn Club', 'Hot Glass Studio', 'Solarium', 'Persian Garden'], deckCount: 15, cabinCount: 1426 },

  // ---- MSC (5) ----
  { shipName: 'MSC World Europa', cruiseLine: 'MSC Cruises', shipClass: 'World', yearBuilt: 2022, passengerCapacity: 5264, crewCount: 1600, tonnage: 205700, restaurants: ['Marketplace Buffet', 'La Piazzetta', 'MSC Signature Dining', 'Butcher\'s Cut', 'Kaito Sushi', 'Hola! Tacos', 'The Whiskey Lounge', 'Panorama Restaurant', 'The Chef\'s Garden', 'Masters of the Sea Pub', 'Elixir Bar'], pools: 5, entertainment: ['World Theater', 'Luna Park', 'Venice Grand Canal', 'Polar Aquapark', 'The Spiral', 'Kids Club', 'Teen Club', 'Sports Centre', 'Casino'], amenities: ['MSC Aurea Spa', 'Fitness Center', 'Casino', 'Luna Park Amusement', 'Kids Clubs', 'Polar Aquapark', 'Shopping Galleria', 'Water Slides'], deckCount: 22, cabinCount: 2632 },
  { shipName: 'MSC Seashore', cruiseLine: 'MSC Cruises', shipClass: 'Seaside Evo', yearBuilt: 2021, passengerCapacity: 5132, crewCount: 1530, tonnage: 169400, restaurants: ['Marketplace Buffet', 'La Piazzetta', 'Bistro', 'Butcher\'s Cut', 'Kaito Sushi', 'Hola! Tacos', 'MSC Yacht Club Restaurant', 'Panorama Restaurant', 'Masters of the Sea', 'Tropical Bar'], pools: 4, entertainment: ['Broadway Theater', 'Polar Aquapark', 'Casino', 'Sports Centre', 'Kids Club', 'Teen Club', 'The Loft', 'Sunset Bar'], amenities: ['MSC Aurea Spa', 'Fitness Center', 'Casino', 'MSC Yacht Club', 'Kids Club', 'Aquapark', 'Galleria Shopping', 'Water Park'], deckCount: 20, cabinCount: 2566 },
  { shipName: 'MSC Seaside', cruiseLine: 'MSC Cruises', shipClass: 'Seaside', yearBuilt: 2017, passengerCapacity: 4132, crewCount: 1370, tonnage: 153500, restaurants: ['Marketplace Buffet', 'Bistro', 'Butcher\'s Cut', 'Kaito Sushi', 'Hola! Tacos', 'MSC Yacht Club', 'Panorama Restaurant', 'Calypso Buffet', 'Masters of the Sea', 'The Haven'], pools: 4, entertainment: ['Teatro San Carlo', 'Polar Aquapark', 'Casino', 'Sports Centre', 'Kids Club', 'Teen Club', 'Bridge of Sighs Walk', 'AquaPark'], amenities: ['MSC Aurea Spa', 'Fitness Center', 'Casino', 'Yacht Club', 'Kids Club', 'Aquapark', 'Venue Walk', 'South Beach Pool'], deckCount: 18, cabinCount: 2066 },
  { shipName: 'MSC Meraviglia', cruiseLine: 'MSC Cruises', shipClass: 'Meraviglia', yearBuilt: 2017, passengerCapacity: 4488, crewCount: 1536, tonnage: 171598, restaurants: ['Marketplace Buffet', 'La Piazzetta', 'Butcher\'s Cut', 'Kaito Sushi', 'Hola! Tacos', 'MSC Yacht Club', 'Panorama Restaurant', 'Garden Buffet', 'Masters of the Sea', 'The Studio'], pools: 4, entertainment: ['Teatro Meraviglia', 'Polar Aquapark', 'Casino', 'Sports Centre', 'Kids Club', 'Teen Club', 'The Galleria Meraviglia', 'Cirque du Soleil'], amenities: ['MSC Aurea Spa', 'Fitness Center', 'Casino', 'Yacht Club', 'Aquapark', 'Galleria', 'Cirque du Soleil', 'Bowling Alley'], deckCount: 18, cabinCount: 2244 },
  { shipName: 'MSC Divina', cruiseLine: 'MSC Cruises', shipClass: 'Fantasia', yearBuilt: 2012, passengerCapacity: 3944, crewCount: 1370, tonnage: 139300, restaurants: ['Marketplace Buffet', 'La Piazzetta', 'Butcher\'s Cut', 'Kaito Sushi', 'MSC Yacht Club', 'Black Crab Restaurant', 'Villa Rossa', 'Piazza di Spagna', 'Masters of the Sea'], pools: 3, entertainment: ['Pantheon Theater', 'AquaPark', 'Casino', 'Sports Centre', 'Kids Club', 'Teen Club', 'The Lounge', 'Piazza di Spagna'], amenities: ['MSC Aurea Spa', 'Fitness Center', 'Casino', 'Yacht Club', 'Kids Club', 'AquaPark', 'Swimming Pools', 'Zen Pool'], deckCount: 16, cabinCount: 1972 },

  // ---- HOLLAND AMERICA (5) ----
  { shipName: 'Rotterdam', cruiseLine: 'Holland America Line', shipClass: 'Pinnacle', yearBuilt: 2021, passengerCapacity: 2668, crewCount: 1017, tonnage: 99800, restaurants: ['Rudi\'s Sel de Mer', 'Pinnacle Grill', 'Tamarind', 'Canaletto', 'Club Orange', 'Dive-In', 'Lido Market', 'The Dining Room', 'New York Deli & Pizza', 'Grand Dutch Cafe'], pools: 2, entertainment: ['World Theater', 'Billboard Onboard', 'B.B. King\'s Blues Club', 'Lincoln Center Stage', 'Casino', 'Rolling Stone Rock Room', 'Explorations Central'], amenities: ['Greenhouse Spa & Salon', 'Fitness Center', 'Casino', 'Club HAL Youth Program', 'The Loft Teen Club', 'Explorations Central', 'Crow\'s Nest', 'Seaview Pool'], deckCount: 12, cabinCount: 1334 },
  { shipName: 'Nieuw Statendam', cruiseLine: 'Holland America Line', shipClass: 'Pinnacle', yearBuilt: 2018, passengerCapacity: 2666, crewCount: 1017, tonnage: 99800, restaurants: ['Rudi\'s Sel de Mer', 'Pinnacle Grill', 'Tamarind', 'Canaletto', 'Club Orange', 'Dive-In', 'Lido Market', 'The Dining Room', 'New York Deli', 'Grand Dutch Cafe'], pools: 2, entertainment: ['World Theater', 'Billboard Onboard', 'B.B. King\'s', 'Lincoln Center', 'Casino', 'Rolling Stone', 'Explorations Central'], amenities: ['Greenhouse Spa', 'Fitness Center', 'Casino', 'Club HAL', 'The Loft', 'Explorations Central', 'Crow\'s Nest'], deckCount: 12, cabinCount: 1333 },
  { shipName: 'Koningsdam', cruiseLine: 'Holland America Line', shipClass: 'Pinnacle', yearBuilt: 2016, passengerCapacity: 2650, crewCount: 1017, tonnage: 99800, restaurants: ['Rudi\'s Sel de Mer', 'Pinnacle Grill', 'Tamarind', 'Canaletto', 'Club Orange', 'Dive-In', 'Lido Market', 'The Dining Room', 'Grand Dutch Cafe', 'NY Deli'], pools: 2, entertainment: ['World Theater', 'Billboard Onboard', 'B.B. King\'s', 'Lincoln Center', 'Casino', 'Rolling Stone', 'Explorations Central', 'Queen\'s Lounge'], amenities: ['Greenhouse Spa', 'Fitness Center', 'Casino', 'Club HAL', 'Teen Club', 'Explorations Central', 'Crow\'s Nest', 'SeaView Pool'], deckCount: 12, cabinCount: 1325 },
  { shipName: 'Zuiderdam', cruiseLine: 'Holland America Line', shipClass: 'Vista', yearBuilt: 2002, passengerCapacity: 1918, crewCount: 800, tonnage: 82500, restaurants: ['Pinnacle Grill', 'Canaletto', 'Lido Market', 'The Dining Room', 'Dive-In', 'Terrace Grill', 'Explorations Cafe'], pools: 2, entertainment: ['Vista Theater', 'Casino', 'B.B. King\'s', 'Billboard Onboard', 'Lincoln Center', 'Crow\'s Nest', 'Explorations Central'], amenities: ['Greenhouse Spa', 'Fitness Center', 'Casino', 'Club HAL', 'The Loft', 'Crow\'s Nest', 'Explorations Cafe', 'Neptune Lounge'], deckCount: 11, cabinCount: 959 },
  { shipName: 'Westerdam', cruiseLine: 'Holland America Line', shipClass: 'Vista', yearBuilt: 2004, passengerCapacity: 1916, crewCount: 800, tonnage: 82500, restaurants: ['Pinnacle Grill', 'Canaletto', 'Lido Market', 'The Dining Room', 'Dive-In', 'Terrace Grill', 'Explorations Cafe'], pools: 2, entertainment: ['Vista Theater', 'Casino', 'B.B. King\'s', 'Billboard Onboard', 'Lincoln Center', 'Crow\'s Nest', 'Explorations Central'], amenities: ['Greenhouse Spa', 'Fitness Center', 'Casino', 'Club HAL', 'Teen Club', 'Crow\'s Nest', 'Explorations Cafe'], deckCount: 11, cabinCount: 958 },

  // ---- DISNEY (5) ----
  { shipName: 'Disney Treasure', cruiseLine: 'Disney Cruise Line', shipClass: 'Triton', yearBuilt: 2024, passengerCapacity: 4000, crewCount: 1555, tonnage: 144000, restaurants: ['1923', 'Palo Steakhouse', 'Enchanted Garden', 'Animator\'s Palate', 'Arendelle: A Frozen Dining', 'Marceline Market', 'Scrooge McDuck\'s', 'Goofy\'s Grill', 'Festival of Foods', 'Eye Scream Treats'], pools: 3, entertainment: ['Walt Disney Theater', 'AquaMouse', 'Hero Zone', 'Parlor', 'Saratoga Pool', 'Star Wars Hyperspace Lounge', 'Wonderland Arcade'], amenities: ['Senses Spa', 'Fitness Center', 'Youth Clubs', 'It\'s a Small World Nursery', 'Edge Teen Club', 'Vibe', 'AquaMouse Water Coaster', 'Motion Pool'], deckCount: 14, cabinCount: 1500 },
  { shipName: 'Disney Wish', cruiseLine: 'Disney Cruise Line', shipClass: 'Triton', yearBuilt: 2022, passengerCapacity: 4000, crewCount: 1555, tonnage: 144000, restaurants: ['1923', 'Palo Steakhouse', 'Enchanted Garden', 'Arendelle', 'Worlds of Marvel', 'Marceline Market', 'Goofy\'s Grill', 'Mickey & Friends Festival', 'Dale\'s Dip'], pools: 3, entertainment: ['Walt Disney Theater', 'AquaMouse', 'Hero Zone', 'The Bayou', 'Star Wars Lounge', 'Hyperspace Lounge', 'Oakenshawk'], amenities: ['Senses Spa', 'Fitness Center', 'Disney Youth Clubs', 'It\'s a Small World Nursery', 'Edge', 'Vibe', 'AquaMouse', 'Grand Hall'], deckCount: 14, cabinCount: 1500 },
  { shipName: 'Disney Dream', cruiseLine: 'Disney Cruise Line', shipClass: 'Dream', yearBuilt: 2011, passengerCapacity: 2500, crewCount: 1458, tonnage: 130000, restaurants: ['Royal Palace', 'Enchanted Garden', 'Animator\'s Palate', 'Palo', 'Remy', 'Cabanas Buffet', 'Flo\'s Cafe', 'Eye Scream', 'Vanellope\'s'], pools: 3, entertainment: ['Walt Disney Theater', 'AquaDuck', 'Buena Vista Theater', 'Tube Club', 'D Lounge', 'Currents Bar', 'Massive Arcade'], amenities: ['Senses Spa', 'Fitness Center', 'Oceaneer Club', 'Oceaneer Lab', 'Edge', 'Vibe', 'AquaDuck Water Coaster', 'Goofy Sports Deck'], deckCount: 14, cabinCount: 1250 },
  { shipName: 'Disney Fantasy', cruiseLine: 'Disney Cruise Line', shipClass: 'Dream', yearBuilt: 2012, passengerCapacity: 2500, crewCount: 1458, tonnage: 130000, restaurants: ['Royal Palace', 'Enchanted Garden', 'Animator\'s Palate', 'Palo', 'Remy', 'Cabanas Buffet', 'Flo\'s Cafe', 'Eye Scream', 'Sweet Minnie\'s'], pools: 3, entertainment: ['Walt Disney Theater', 'AquaDuck', 'Buena Vista Theatre', 'The Tube', 'D Lounge', 'Ooh La La', 'La Piazza'], amenities: ['Senses Spa', 'Fitness Center', 'Oceaneer Club', 'Oceaneer Lab', 'Edge', 'Vibe', 'AquaDuck', 'Mini Golf'], deckCount: 14, cabinCount: 1250 },
  { shipName: 'Disney Magic', cruiseLine: 'Disney Cruise Line', shipClass: 'Magic', yearBuilt: 1998, passengerCapacity: 1754, crewCount: 950, tonnage: 84000, restaurants: ['Rapunzel\'s Royal Table', 'Lumiere\'s', 'Animator\'s Palate', 'Palo', 'Cabanas Buffet', 'Pinocchio\'s Pizza', 'Goofy\'s Galley', 'Daisy\'s De-lites'], pools: 2, entertainment: ['Walt Disney Theater', 'AquaDunk', 'Buena Vista Theatre', 'D Lounge', 'Keys', 'O\'Gills Pub', 'Funnel Stage'], amenities: ['Vista Spa', 'Fitness Center', 'Oceaneer Club', 'Oceaneer Lab', 'Edge', 'Vibe', 'AquaDunk', 'Goofy Sports Deck'], deckCount: 11, cabinCount: 877 },
];

// =============================================================================
// SAILINGS — 200+ real itineraries covering all major destinations
// =============================================================================

interface SailingData {
  cruiseLine: string;
  shipName: string;
  departureDate: string;
  durationDays: number;
  departurePort: string;
  departureRegion: string;
  itinerary: string[];
  destinationRegion: string;
  isRepositioning: boolean;
}

// Helper to create many sailings from a template pattern
function makeSailings(
  cruiseLine: string,
  shipName: string,
  dates: string[],
  durationDays: number,
  departurePort: string,
  departureRegion: string,
  itinerary: string[],
  destinationRegion: string,
  repositioning = false,
): SailingData[] {
  return dates.map((d) => ({
    cruiseLine,
    shipName,
    departureDate: d,
    durationDays,
    departurePort,
    departureRegion,
    itinerary,
    destinationRegion,
    isRepositioning: repositioning,
  }));
}

const sailings: SailingData[] = [
  // ========== ROYAL CARIBBEAN (~30 sailings) ==========
  // Icon of the Seas — 7-day Eastern Caribbean from Miami
  ...makeSailings('Royal Caribbean', 'Icon of the Seas',
    ['2026-08-08', '2026-08-22', '2026-09-19', '2026-10-17', '2026-12-20', '2027-02-07'],
    7, 'Miami, FL', 'South Florida',
    ['Miami', 'CocoCay', 'St. Thomas', 'St. Maarten', 'Miami'], 'Caribbean'),
  // Symphony of the Seas — 7-day Western Caribbean from Miami
  ...makeSailings('Royal Caribbean', 'Symphony of the Seas',
    ['2026-08-15', '2026-09-12', '2026-11-15', '2027-01-10', '2027-03-14'],
    7, 'Miami, FL', 'South Florida',
    ['Miami', 'Cozumel', 'Roatán', 'Costa Maya', 'Miami'], 'Caribbean'),
  // Wonder of the Seas — 7-day Caribbean from Port Canaveral
  ...makeSailings('Royal Caribbean', 'Wonder of the Seas',
    ['2026-08-29', '2026-10-10', '2026-12-06', '2027-02-21', '2027-04-11'],
    7, 'Port Canaveral, FL', 'Central Florida',
    ['Port Canaveral', 'CocoCay', 'St. Thomas', 'Philipsburg', 'Port Canaveral'], 'Caribbean'),
  // Utopia of the Seas — 3-4 day Bahamas from Port Canaveral
  ...makeSailings('Royal Caribbean', 'Utopia of the Seas',
    ['2026-09-04', '2026-09-25', '2026-10-30', '2027-01-15', '2027-03-05'],
    4, 'Port Canaveral, FL', 'Central Florida',
    ['Port Canaveral', 'Nassau', 'CocoCay', 'Port Canaveral'], 'Bahamas'),
  // Allure of the Seas — 7-day Western Caribbean from Fort Lauderdale
  ...makeSailings('Royal Caribbean', 'Allure of the Seas',
    ['2026-08-09', '2026-10-03', '2026-12-27', '2027-02-14'],
    7, 'Fort Lauderdale, FL', 'South Florida',
    ['Fort Lauderdale', 'Labadee', 'Falmouth', 'Cozumel', 'Fort Lauderdale'], 'Caribbean'),
  // Oasis of the Seas — 7-day from Fort Lauderdale
  ...makeSailings('Royal Caribbean', 'Oasis of the Seas',
    ['2026-09-06', '2026-11-22', '2027-01-24', '2027-04-04'],
    7, 'Fort Lauderdale, FL', 'South Florida',
    ['Fort Lauderdale', 'CocoCay', 'San Juan', 'St. Maarten', 'Fort Lauderdale'], 'Caribbean'),
  // Harmony of the Seas — Mediterranean summer
  ...makeSailings('Royal Caribbean', 'Harmony of the Seas',
    ['2026-08-02', '2026-08-23', '2026-09-13', '2027-05-09', '2027-06-13'],
    7, 'Barcelona, ES', 'Western Mediterranean',
    ['Barcelona', 'Marseille', 'La Spezia', 'Rome (Civitavecchia)', 'Naples', 'Barcelona'], 'Mediterranean'),
  // Freedom of the Seas — Southern Caribbean from San Juan
  ...makeSailings('Royal Caribbean', 'Freedom of the Seas',
    ['2026-09-07', '2026-11-01', '2026-12-21', '2027-02-20'],
    7, 'San Juan, PR', 'Puerto Rico',
    ['San Juan', 'Charlotte Amalie', 'Philipsburg', 'Basseterre', 'Castries', 'San Juan'], 'Caribbean'),
  // Independence of the Seas — Europe from Southampton
  ...makeSailings('Royal Caribbean', 'Independence of the Seas',
    ['2026-08-16', '2026-09-27', '2027-05-02', '2027-06-20'],
    7, 'Southampton, UK', 'UK/English Channel',
    ['Southampton', 'Oslo', 'Copenhagen', 'Stockholm', 'Southampton'], 'Europe'),
  // Navigator of the Seas — Mexican Riviera from Los Angeles
  ...makeSailings('Royal Caribbean', 'Navigator of the Seas',
    ['2026-09-05', '2026-10-24', '2026-12-12', '2027-02-06', '2027-04-03'],
    7, 'Los Angeles, CA', 'Southern California',
    ['Los Angeles', 'Cabo San Lucas', 'Mazatlán', 'Puerto Vallarta', 'Los Angeles'], 'Mexico'),

  // ========== NORWEGIAN (~28 sailings) ==========
  ...makeSailings('Norwegian Cruise Line', 'Norwegian Viva',
    ['2026-08-06', '2026-09-03', '2026-10-08', '2027-04-22', '2027-06-10'],
    11, 'Barcelona, ES', 'Western Mediterranean',
    ['Barcelona', 'Marseille', 'Florence (Livorno)', 'Rome', 'Naples', 'Ibiza', 'Barcelona'], 'Mediterranean'),
  ...makeSailings('Norwegian Cruise Line', 'Norwegian Prima',
    ['2026-08-20', '2026-10-15', '2027-01-07', '2027-03-11', '2027-05-20'],
    10, 'Copenhagen, DK', 'Scandinavia',
    ['Copenhagen', 'Warnemünde', 'Tallinn', 'Helsinki', 'Visby', 'Copenhagen'], 'Europe'),
  ...makeSailings('Norwegian Cruise Line', 'Norwegian Escape',
    ['2026-08-15', '2026-09-26', '2026-11-14', '2027-01-16', '2027-03-06'],
    7, 'Miami, FL', 'South Florida',
    ['Miami', 'Tortola', 'St. Thomas', 'Nassau', 'Miami'], 'Caribbean'),
  ...makeSailings('Norwegian Cruise Line', 'Norwegian Breakaway',
    ['2026-08-13', '2026-10-02', '2026-12-05', '2027-02-13', '2027-04-17'],
    7, 'New York, NY', 'Northeast',
    ['New York', 'Bermuda', 'Port Canaveral', 'Great Stirrup Cay', 'New York'], 'Caribbean'),
  ...makeSailings('Norwegian Cruise Line', 'Norwegian Bliss',
    ['2026-08-07', '2026-09-11', '2027-04-02', '2027-05-28'],
    7, 'Seattle, WA', 'Pacific Northwest',
    ['Seattle', 'Ketchikan', 'Juneau', 'Skagway', 'Glacier Bay', 'Victoria', 'Seattle'], 'Alaska'),
  ...makeSailings('Norwegian Cruise Line', 'Norwegian Encore',
    ['2026-08-22', '2026-09-19', '2027-04-16', '2027-05-14'],
    7, 'Seattle, WA', 'Pacific Northwest',
    ['Seattle', 'Sitka', 'Juneau', 'Skagway', 'Icy Strait', 'Victoria', 'Seattle'], 'Alaska'),
  ...makeSailings('Norwegian Cruise Line', 'Norwegian Joy',
    ['2026-08-29', '2026-10-24', '2027-01-09', '2027-03-20'],
    7, 'Los Angeles, CA', 'Southern California',
    ['Los Angeles', 'Puerto Vallarta', 'Mazatlán', 'Cabo San Lucas', 'Los Angeles'], 'Mexico'),

  // ========== PRINCESS (~24 sailings) ==========
  ...makeSailings('Princess Cruises', 'Discovery Princess',
    ['2026-08-01', '2026-09-05', '2026-10-10', '2026-11-14', '2027-05-15', '2027-06-19'],
    10, 'Vancouver, BC', 'Pacific Northwest',
    ['Vancouver', 'Ketchikan', 'Juneau', 'Skagway', 'Glacier Bay', 'Sitka', 'Vancouver'], 'Alaska'),
  ...makeSailings('Princess Cruises', 'Sun Princess',
    ['2026-08-08', '2026-10-03', '2026-11-28', '2027-01-23', '2027-04-10'],
    7, 'Rome (Civitavecchia), IT', 'Western Mediterranean',
    ['Rome', 'Florence (Livorno)', 'Marseille', 'Barcelona', 'Ibiza', 'Naples', 'Rome'], 'Mediterranean'),
  ...makeSailings('Princess Cruises', 'Enchanted Princess',
    ['2026-08-14', '2026-10-17', '2026-12-12', '2027-02-06', '2027-04-09'],
    7, 'Fort Lauderdale, FL', 'South Florida',
    ['Fort Lauderdale', 'Princess Cays', 'Cozumel', 'Belize City', 'Roatán', 'Fort Lauderdale'], 'Caribbean'),
  ...makeSailings('Princess Cruises', 'Sky Princess',
    ['2026-08-21', '2026-10-24', '2027-01-08', '2027-03-12'],
    7, 'Port Canaveral, FL', 'Central Florida',
    ['Port Canaveral', 'Nassau', 'St. Thomas', 'St. Maarten', 'Port Canaveral'], 'Caribbean'),
  ...makeSailings('Princess Cruises', 'Majestic Princess',
    ['2026-09-12', '2026-11-07', '2027-01-30', '2027-04-03'],
    14, 'Tokyo, JP', 'East Asia',
    ['Tokyo', 'Mount Fuji (Shimizu)', 'Kyoto (Osaka)', 'Busan', 'Nagasaki', 'Taipei', 'Naha', 'Tokyo'], 'Asia'),
  ...makeSailings('Princess Cruises', 'Regal Princess',
    ['2026-08-30', '2026-10-18', '2027-05-01', '2027-06-12'],
    7, 'Barcelona, ES', 'Western Mediterranean',
    ['Barcelona', 'Palma de Mallorca', 'Marseille', 'Genoa', 'Rome', 'Barcelona'], 'Mediterranean'),

  // ========== CARNIVAL (~28 sailings) ==========
  ...makeSailings('Carnival Cruise Line', 'Carnival Celebration',
    ['2026-07-22', '2026-08-19', '2026-10-14', '2026-12-16', '2027-02-10', '2027-04-07'],
    4, 'Miami, FL', 'South Florida',
    ['Miami', 'Nassau', 'Half Moon Cay', 'Miami'], 'Bahamas'),
  ...makeSailings('Carnival Cruise Line', 'Mardi Gras',
    ['2026-08-07', '2026-10-02', '2026-11-27', '2027-01-22', '2027-03-19', '2027-05-14'],
    7, 'Port Canaveral, FL', 'Central Florida',
    ['Port Canaveral', 'Nassau', 'St. Thomas', 'San Juan', 'Port Canaveral'], 'Caribbean'),
  ...makeSailings('Carnival Cruise Line', 'Carnival Jubilee',
    ['2026-08-15', '2026-10-10', '2026-12-05', '2027-02-20', '2027-04-17'],
    7, 'Galveston, TX', 'Texas Gulf',
    ['Galveston', 'Cozumel', 'Mahogany Bay', 'Belize City', 'Galveston'], 'Mexico'),
  ...makeSailings('Carnival Cruise Line', 'Carnival Panorama',
    ['2026-08-22', '2026-10-17', '2026-12-19', '2027-02-13', '2027-04-10'],
    7, 'Los Angeles, CA', 'Southern California',
    ['Los Angeles', 'Cabo San Lucas', 'Puerto Vallarta', 'Mazatlán', 'Los Angeles'], 'Mexico'),
  ...makeSailings('Carnival Cruise Line', 'Carnival Horizon',
    ['2026-08-01', '2026-09-19', '2026-11-14', '2027-01-09', '2027-03-06'],
    7, 'Miami, FL', 'South Florida',
    ['Miami', 'Grand Turk', 'Amber Cove', 'La Romana', 'Miami'], 'Caribbean'),
  ...makeSailings('Carnival Cruise Line', 'Carnival Vista',
    ['2026-08-09', '2026-10-04', '2026-12-28', '2027-02-22'],
    7, 'Galveston, TX', 'Texas Gulf',
    ['Galveston', 'Montego Bay', 'Grand Cayman', 'Cozumel', 'Galveston'], 'Caribbean'),
  ...makeSailings('Carnival Cruise Line', 'Carnival Dream',
    ['2026-08-14', '2026-10-25', '2027-01-16', '2027-03-13'],
    6, 'New Orleans, LA', 'Louisiana Gulf',
    ['New Orleans', 'Cozumel', 'Costa Maya', 'Mahogany Bay', 'New Orleans'], 'Mexico'),

  // ========== CELEBRITY (~25 sailings) ==========
  ...makeSailings('Celebrity Cruises', 'Celebrity Beyond',
    ['2026-08-08', '2026-09-19', '2026-11-05', '2027-01-23', '2027-04-04'],
    9, 'San Juan, PR', 'Puerto Rico',
    ['San Juan', 'Barbados', 'St. Lucia', 'Antigua', 'St. Thomas', 'San Juan'], 'Caribbean'),
  ...makeSailings('Celebrity Cruises', 'Celebrity Ascent',
    ['2026-08-15', '2026-10-10', '2026-12-04', '2027-01-30', '2027-03-20', '2027-05-02'],
    7, 'Fort Lauderdale, FL', 'South Florida',
    ['Fort Lauderdale', 'St. Maarten', 'Puerto Plata', 'Grand Turk', 'Fort Lauderdale'], 'Caribbean'),
  ...makeSailings('Celebrity Cruises', 'Celebrity Apex',
    ['2026-08-21', '2026-10-17', '2027-04-02', '2027-05-28'],
    11, 'Barcelona, ES', 'Western Mediterranean',
    ['Barcelona', 'Nice (Villefranche)', 'Florence (Livorno)', 'Rome', 'Naples', 'Mykonos', 'Ephesus', 'Athens'], 'Mediterranean'),
  ...makeSailings('Celebrity Cruises', 'Celebrity Edge',
    ['2026-08-05', '2026-09-30', '2027-01-06', '2027-03-10'],
    7, 'Port Canaveral, FL', 'Central Florida',
    ['Port Canaveral', 'Bimini', 'Nassau', 'Key West', 'Port Canaveral'], 'Bahamas'),
  ...makeSailings('Celebrity Cruises', 'Celebrity Solstice',
    ['2026-08-28', '2026-10-23', '2027-04-16', '2027-06-05'],
    14, 'Honolulu, HI', 'Hawaii',
    ['Honolulu', 'Kahului', 'Hilo', 'Kona', 'Nawiliwili', 'Honolulu'], 'Hawaii'),

  // ========== MSC (~25 sailings) ==========
  ...makeSailings('MSC Cruises', 'MSC World Europa',
    ['2026-08-01', '2026-09-26', '2026-11-21', '2027-01-16', '2027-03-13', '2027-05-15'],
    7, 'Dubai, AE', 'Middle East',
    ['Dubai', 'Doha', 'Abu Dhabi', 'Muscat', 'Dubai'], 'Asia'),
  ...makeSailings('MSC Cruises', 'MSC Seashore',
    ['2026-08-07', '2026-10-02', '2026-11-28', '2027-01-23', '2027-03-20'],
    7, 'Miami, FL', 'South Florida',
    ['Miami', 'Ocean Cay', 'Cozumel', 'Grand Cayman', 'Miami'], 'Caribbean'),
  ...makeSailings('MSC Cruises', 'MSC Seaside',
    ['2026-08-15', '2026-10-10', '2026-12-19', '2027-02-06', '2027-04-03'],
    7, 'Port Canaveral, FL', 'Central Florida',
    ['Port Canaveral', 'Ocean Cay', 'Nassau', 'Freeport', 'Port Canaveral'], 'Bahamas'),
  ...makeSailings('MSC Cruises', 'MSC Meraviglia',
    ['2026-08-22', '2026-10-17', '2027-04-02', '2027-05-21'],
    7, 'Barcelona, ES', 'Western Mediterranean',
    ['Barcelona', 'Marseille', 'Genoa', 'Rome (Civitavecchia)', 'Palermo', 'Ibiza', 'Barcelona'], 'Mediterranean'),
  ...makeSailings('MSC Cruises', 'MSC Divina',
    ['2026-08-30', '2026-10-25', '2027-01-10', '2027-03-07'],
    7, 'Miami, FL', 'South Florida',
    ['Miami', 'San Juan', 'Puerto Plata', 'Ocean Cay', 'Miami'], 'Caribbean'),

  // ========== HOLLAND AMERICA (~22 sailings) ==========
  ...makeSailings('Holland America Line', 'Rotterdam',
    ['2026-08-08', '2026-09-12', '2026-11-07', '2027-01-16', '2027-04-10'],
    14, 'Fort Lauderdale, FL', 'South Florida',
    ['Fort Lauderdale', 'Half Moon Cay', 'Grand Turk', 'Puerto Plata', 'St. Thomas', 'San Juan', 'Willemstad', 'Fort Lauderdale'], 'Caribbean'),
  ...makeSailings('Holland America Line', 'Nieuw Statendam',
    ['2026-08-15', '2026-09-19', '2027-04-23', '2027-05-28'],
    7, 'Vancouver, BC', 'Pacific Northwest',
    ['Vancouver', 'Ketchikan', 'Juneau', 'Skagway', 'Glacier Bay', 'Vancouver'], 'Alaska'),
  ...makeSailings('Holland America Line', 'Koningsdam',
    ['2026-08-22', '2026-10-17', '2027-04-16', '2027-05-21'],
    7, 'Vancouver, BC', 'Pacific Northwest',
    ['Vancouver', 'Sitka', 'Juneau', 'Skagway', 'Ketchikan', 'Victoria', 'Vancouver'], 'Alaska'),
  ...makeSailings('Holland America Line', 'Zuiderdam',
    ['2026-08-29', '2026-11-14', '2027-01-09', '2027-03-06'],
    14, 'San Diego, CA', 'Southern California',
    ['San Diego', 'Cabo San Lucas', 'Puerto Vallarta', 'Zihuatanejo', 'Acapulco', 'Huatulco', 'San Juan del Sur', 'Puntarenas', 'Panama Canal', 'Cartagena', 'San Diego'], 'Panama Canal', true),
  ...makeSailings('Holland America Line', 'Westerdam',
    ['2026-09-05', '2026-10-31', '2027-01-30', '2027-04-04'],
    10, 'Vancouver, BC', 'Pacific Northwest',
    ['Vancouver', 'Ketchikan', 'Juneau', 'Skagway', 'Glacier Bay', 'Sitka', 'Vancouver'], 'Alaska'),

  // ========== DISNEY (~20 sailings) ==========
  ...makeSailings('Disney Cruise Line', 'Disney Treasure',
    ['2026-08-02', '2026-09-13', '2026-11-08', '2027-01-03', '2027-02-28', '2027-04-25'],
    7, 'Port Canaveral, FL', 'Central Florida',
    ['Port Canaveral', 'Nassau', 'Castaway Cay', 'St. Thomas', 'Port Canaveral'], 'Caribbean'),
  ...makeSailings('Disney Cruise Line', 'Disney Wish',
    ['2026-08-09', '2026-10-04', '2026-12-06', '2027-01-31', '2027-03-28'],
    7, 'Port Canaveral, FL', 'Central Florida',
    ['Port Canaveral', 'Nassau', 'Castaway Cay', 'Port Canaveral'], 'Bahamas'),
  ...makeSailings('Disney Cruise Line', 'Disney Dream',
    ['2026-08-16', '2026-10-11', '2026-12-22', '2027-02-14', '2027-04-11'],
    5, 'Miami, FL', 'South Florida',
    ['Miami', 'Nassau', 'Castaway Cay', 'Miami'], 'Bahamas'),
  ...makeSailings('Disney Cruise Line', 'Disney Fantasy',
    ['2026-08-23', '2026-10-18', '2026-12-27', '2027-02-21', '2027-04-18'],
    7, 'Port Canaveral, FL', 'Central Florida',
    ['Port Canaveral', 'St. Thomas', 'San Juan', 'Castaway Cay', 'Port Canaveral'], 'Caribbean'),
  ...makeSailings('Disney Cruise Line', 'Disney Magic',
    ['2026-08-30', '2026-10-25', '2027-05-09', '2027-06-13'],
    7, 'Miami, FL', 'South Florida',
    ['Miami', 'Cozumel', 'Grand Cayman', 'Castaway Cay', 'Miami'], 'Mexico'),

  // ========== ADDITIONAL REPOSITIONING & SPECIAL CRUISES ==========
  // Transatlantic
  { cruiseLine: 'Celebrity Cruises', shipName: 'Celebrity Beyond', departureDate: '2027-04-26', durationDays: 14, departurePort: 'Miami, FL', departureRegion: 'South Florida', itinerary: ['Miami', 'Bermuda', 'Ponta Delgada', 'Lisbon', 'Barcelona'], destinationRegion: 'Transatlantic', isRepositioning: true },
  { cruiseLine: 'Royal Caribbean', shipName: 'Harmony of the Seas', departureDate: '2026-10-25', durationDays: 14, departurePort: 'Barcelona, ES', departureRegion: 'Western Mediterranean', itinerary: ['Barcelona', 'Malaga', 'Funchal', 'Fort Lauderdale'], destinationRegion: 'Transatlantic', isRepositioning: true },
  { cruiseLine: 'Norwegian Cruise Line', shipName: 'Norwegian Viva', departureDate: '2026-11-15', durationDays: 12, departurePort: 'Barcelona, ES', departureRegion: 'Western Mediterranean', itinerary: ['Barcelona', 'Malaga', 'Funchal', 'Bermuda', 'Miami'], destinationRegion: 'Transatlantic', isRepositioning: true },
  { cruiseLine: 'MSC Cruises', shipName: 'MSC World Europa', departureDate: '2027-03-27', durationDays: 14, departurePort: 'Dubai, AE', departureRegion: 'Middle East', itinerary: ['Dubai', 'Muscat', 'Aqaba', 'Suez Canal', 'Athens', 'Rome'], destinationRegion: 'Asia', isRepositioning: true },
  { cruiseLine: 'Carnival Cruise Line', shipName: 'Mardi Gras', departureDate: '2027-04-30', durationDays: 14, departurePort: 'Port Canaveral, FL', departureRegion: 'Central Florida', itinerary: ['Port Canaveral', 'Aruba', 'Curaçao', 'Panama Canal', 'Puntarenas', 'Cabo San Lucas', 'Los Angeles'], destinationRegion: 'Panama Canal', isRepositioning: true },
  { cruiseLine: 'Princess Cruises', shipName: 'Sun Princess', departureDate: '2027-04-24', durationDays: 14, departurePort: 'Rome, IT', departureRegion: 'Western Mediterranean', itinerary: ['Rome', 'Naples', 'Mykonos', 'Istanbul', 'Athens', 'Venice', 'Dubrovnik', 'Rome'], destinationRegion: 'Mediterranean', isRepositioning: false },
  { cruiseLine: 'Holland America Line', shipName: 'Rotterdam', departureDate: '2027-04-24', durationDays: 21, departurePort: 'Fort Lauderdale, FL', departureRegion: 'South Florida', itinerary: ['Fort Lauderdale', 'Bonaire', 'Devil\'s Island', 'Belém', 'Alter do Chão', 'Manaus'], destinationRegion: 'South America', isRepositioning: false },

  // Extra Caribbean sailings to fill gaps
  { cruiseLine: 'Royal Caribbean', shipName: 'Freedom of the Seas', departureDate: '2027-04-18', durationDays: 7, departurePort: 'Miami, FL', departureRegion: 'South Florida', itinerary: ['Miami', 'Grand Cayman', 'Cozumel', 'Costa Maya', 'Miami'], destinationRegion: 'Caribbean', isRepositioning: false },
  { cruiseLine: 'Royal Caribbean', shipName: 'Symphony of the Seas', departureDate: '2027-05-23', durationDays: 7, departurePort: 'Miami, FL', departureRegion: 'South Florida', itinerary: ['Miami', 'CocoCay', 'St. Thomas', 'St. Maarten', 'Miami'], destinationRegion: 'Caribbean', isRepositioning: false },
  { cruiseLine: 'Royal Caribbean', shipName: 'Navigator of the Seas', departureDate: '2027-05-29', durationDays: 7, departurePort: 'Los Angeles, CA', departureRegion: 'Southern California', itinerary: ['Los Angeles', 'Cabo San Lucas', 'Puerto Vallarta', 'Mazatlán', 'Los Angeles'], destinationRegion: 'Mexico', isRepositioning: false },
  { cruiseLine: 'Norwegian Cruise Line', shipName: 'Norwegian Escape', departureDate: '2027-05-08', durationDays: 7, departurePort: 'Miami, FL', departureRegion: 'South Florida', itinerary: ['Miami', 'Great Stirrup Cay', 'Tortola', 'St. Thomas', 'Miami'], destinationRegion: 'Caribbean', isRepositioning: false },
  { cruiseLine: 'Princess Cruises', shipName: 'Enchanted Princess', departureDate: '2027-05-29', durationDays: 10, departurePort: 'Fort Lauderdale, FL', departureRegion: 'South Florida', itinerary: ['Fort Lauderdale', 'Aruba', 'Curaçao', 'Bonaire', 'Fort Lauderdale'], destinationRegion: 'Caribbean', isRepositioning: false },
  { cruiseLine: 'Carnival Cruise Line', shipName: 'Carnival Jubilee', departureDate: '2027-06-12', durationDays: 7, departurePort: 'Galveston, TX', departureRegion: 'Texas Gulf', itinerary: ['Galveston', 'Cozumel', 'Costa Maya', 'Mahogany Bay', 'Galveston'], destinationRegion: 'Mexico', isRepositioning: false },
  { cruiseLine: 'MSC Cruises', shipName: 'MSC Seashore', departureDate: '2027-05-15', durationDays: 7, departurePort: 'Miami, FL', departureRegion: 'South Florida', itinerary: ['Miami', 'Ocean Cay', 'Cozumel', 'Grand Cayman', 'Miami'], destinationRegion: 'Caribbean', isRepositioning: false },
  { cruiseLine: 'Celebrity Cruises', shipName: 'Celebrity Edge', departureDate: '2027-05-23', durationDays: 7, departurePort: 'Port Canaveral, FL', departureRegion: 'Central Florida', itinerary: ['Port Canaveral', 'Nassau', 'Bimini', 'Key West', 'Port Canaveral'], destinationRegion: 'Bahamas', isRepositioning: false },
  { cruiseLine: 'Holland America Line', shipName: 'Westerdam', departureDate: '2027-05-30', durationDays: 7, departurePort: 'Vancouver, BC', departureRegion: 'Pacific Northwest', itinerary: ['Vancouver', 'Ketchikan', 'Juneau', 'Icy Strait', 'Glacier Bay', 'Vancouver'], destinationRegion: 'Alaska', isRepositioning: false },
  { cruiseLine: 'Disney Cruise Line', shipName: 'Disney Fantasy', departureDate: '2027-06-07', durationDays: 7, departurePort: 'Port Canaveral, FL', departureRegion: 'Central Florida', itinerary: ['Port Canaveral', 'Castaway Cay', 'St. Thomas', 'San Juan', 'Port Canaveral'], destinationRegion: 'Caribbean', isRepositioning: false },

  // Extra South America
  { cruiseLine: 'Princess Cruises', shipName: 'Majestic Princess', departureDate: '2027-01-02', durationDays: 14, departurePort: 'Buenos Aires, AR', departureRegion: 'Argentina', itinerary: ['Buenos Aires', 'Montevideo', 'Puerto Madryn', 'Punta Arenas', 'Ushuaia', 'Cape Horn', 'Punta Arenas', 'Santiago (Valparaiso)'], destinationRegion: 'South America', isRepositioning: false },
  { cruiseLine: 'MSC Cruises', shipName: 'MSC Divina', departureDate: '2027-02-20', durationDays: 10, departurePort: 'Rio de Janeiro, BR', departureRegion: 'Brazil', itinerary: ['Rio de Janeiro', 'Santos', 'Buzios', 'Salvador', 'Recife', 'Rio de Janeiro'], destinationRegion: 'South America', isRepositioning: false },
];
// Total: count after this point...

// =============================================================================
// PRICING GENERATION HELPERS
// Determistic pricing based on cruise line tier, cabin type, duration, destination
// =============================================================================

const CRUISE_LINE_TIER: Record<string, string> = {
  'Royal Caribbean': 'mid',
  'Norwegian Cruise Line': 'mid',
  'Princess Cruises': 'mid',
  'Carnival Cruise Line': 'budget',
  'Celebrity Cruises': 'premium',
  'MSC Cruises': 'value',
  'Holland America Line': 'mid',
  'Disney Cruise Line': 'premium',
};

const BASE_PRICES_PER_PERSON_7_NIGHT: Record<string, Record<string, [number, number]>> = {
  budget: { Inside: [429, 649], Oceanview: [549, 799], Balcony: [749, 1299], Suite: [1599, 2799] },
  mid: { Inside: [649, 949], Oceanview: [799, 1249], Balcony: [1149, 1899], Suite: [2399, 4299] },
  premium: { Inside: [799, 1199], Oceanview: [949, 1499], Balcony: [1399, 2499], Suite: [2899, 5499] },
  value: { Inside: [449, 749], Oceanview: [599, 949], Balcony: [849, 1499], Suite: [1699, 2899] },
};

const CABIN_TIERS = ['Inside', 'Oceanview', 'Balcony', 'Suite'];

// Port fees per person by destination (min, max)
const PORT_FEES_PER_PERSON: Record<string, [number, number]> = {
  'Caribbean': [75, 135],
  'Bahamas': [49, 90],
  'Alaska': [100, 180],
  'Mediterranean': [125, 210],
  'Mexico': [60, 115],
  'Europe': [100, 180],
  'Asia': [100, 180],
  'South America': [90, 155],
  'Hawaii': [100, 180],
  'Panama Canal': [130, 210],
  'Transatlantic': [75, 150],
};

// Gratuities per person per day by cruise line
const GRAT_PER_PERSON_PER_DAY: Record<string, number> = {
  'Royal Caribbean': 18.00,
  'Norwegian Cruise Line': 20.00,
  'Princess Cruises': 17.00,
  'Carnival Cruise Line': 16.00,
  'Celebrity Cruises': 19.00,
  'MSC Cruises': 14.50,
  'Holland America Line': 17.50,
  'Disney Cruise Line': 16.00,
};

interface PriceRow {
  cabinType: string;
  passengerCount: number;
  baseFareUsd: number;
  portFeesUsd: number;
  gratuitiesUsd: number;
  soloWaived: boolean;
}

// Deterministic pseudo-random from (value % modulus) to get reproducible variation
function detMod(val: number, modulus: number): number {
  return ((val * 1103515245 + 12345) >>> 0) % modulus;
}

function generatePricing(
  cruiseLine: string,
  destinationRegion: string,
  durationDays: number,
  seed: number,
): PriceRow[] {
  const tier = CRUISE_LINE_TIER[cruiseLine] || 'mid';
  const results: PriceRow[] = [];

  for (let ti = 0; ti < CABIN_TIERS.length; ti++) {
    const cabinType = CABIN_TIERS[ti];
    const [pMin, pMax] = BASE_PRICES_PER_PERSON_7_NIGHT[tier][cabinType];

    // Use 1-passenger and 2-passenger prices
    for (const pax of [2, 1]) {
      // Deterministic variation within [pMin, pMax] based on seed + cabin tier
      const range = pMax - pMin;
      const offset = detMod(seed + ti * 17 + pax * 31, Math.max(1, Math.floor(range * 100))) / 100;
      const pricePerPerson7Night = pMin + (offset % range);

      // Adjust for duration (longer = cheaper per day, shorter = more expensive per day)
      const durFactor = durationDays / 7 * (0.95 + 0.05 * (7 / Math.max(durationDays, 3)));
      const pricePerPerson = Math.round(pricePerPerson7Night * durFactor);

      const baseFareUsd = pricePerPerson * pax;

      const [fMin, fMax] = PORT_FEES_PER_PERSON[destinationRegion] || [75, 135];
      const fRange = fMax - fMin;
      const fOffset = detMod(seed + ti * 13 + pax * 7, Math.max(1, Math.floor(fRange * 100))) / 100;
      const portFeesPerPerson = fMin + (fOffset % fRange);
      const portFeesUsd = Math.round(portFeesPerPerson * pax * 100) / 100;

      const gratsPerDay = GRAT_PER_PERSON_PER_DAY[cruiseLine] || 17;
      const gratuitiesUsd = Math.round(gratsPerDay * durationDays * pax * 100) / 100;

      // Solo waiver for ~15-20% of solo (pax=1) entries
      const soloWaived = pax === 1 && detMod(seed + ti * 23, 10) < 2;

      results.push({ cabinType, passengerCount: pax, baseFareUsd, portFeesUsd, gratuitiesUsd, soloWaived });
    }
  }

  return results;
}

// =============================================================================
// DESTINATION INSIGHTS
// =============================================================================

interface DestInsight {
  destinationRegion: string;
  avgPricePpd: number;
  bestValueMonths: string[];
  peakSeasonMonths: string[];
  shoulderMonths: string[];
  avgDurationDays: number;
  totalActiveSailings: number;
  topCruiseLines: string[];
  priceTrend: string;
  trendPct: number;
}

const destinationInsights: DestInsight[] = [
  { destinationRegion: 'Caribbean', avgPricePpd: 189, bestValueMonths: ['September', 'October', 'November'], peakSeasonMonths: ['December', 'January', 'February', 'March'], shoulderMonths: ['April', 'May', 'June', 'August'], avgDurationDays: 7.0, totalActiveSailings: 85, topCruiseLines: ['Royal Caribbean', 'Carnival Cruise Line', 'Norwegian Cruise Line'], priceTrend: 'stable', trendPct: 2.5 },
  { destinationRegion: 'Alaska', avgPricePpd: 289, bestValueMonths: ['May', 'September'], peakSeasonMonths: ['June', 'July', 'August'], shoulderMonths: ['April', 'September'], avgDurationDays: 8.5, totalActiveSailings: 30, topCruiseLines: ['Princess Cruises', 'Holland America Line', 'Norwegian Cruise Line'], priceTrend: 'rising', trendPct: 6.8 },
  { destinationRegion: 'Mediterranean', avgPricePpd: 245, bestValueMonths: ['October', 'April'], peakSeasonMonths: ['June', 'July', 'August'], shoulderMonths: ['May', 'September'], avgDurationDays: 9.0, totalActiveSailings: 35, topCruiseLines: ['Royal Caribbean', 'Celebrity Cruises', 'Norwegian Cruise Line'], priceTrend: 'rising', trendPct: 4.2 },
  { destinationRegion: 'Bahamas', avgPricePpd: 165, bestValueMonths: ['January', 'February', 'September'], peakSeasonMonths: ['March', 'June', 'July', 'December'], shoulderMonths: ['April', 'May', 'October', 'November'], avgDurationDays: 4.5, totalActiveSailings: 40, topCruiseLines: ['Carnival Cruise Line', 'Royal Caribbean', 'Disney Cruise Line'], priceTrend: 'stable', trendPct: 1.2 },
  { destinationRegion: 'Mexico', avgPricePpd: 195, bestValueMonths: ['September', 'October'], peakSeasonMonths: ['December', 'January', 'February', 'March'], shoulderMonths: ['April', 'May', 'November'], avgDurationDays: 6.5, totalActiveSailings: 25, topCruiseLines: ['Carnival Cruise Line', 'Royal Caribbean', 'Norwegian Cruise Line'], priceTrend: 'stable', trendPct: 0.8 },
  { destinationRegion: 'Europe', avgPricePpd: 235, bestValueMonths: ['May', 'September'], peakSeasonMonths: ['June', 'July', 'August'], shoulderMonths: ['April', 'October'], avgDurationDays: 9.5, totalActiveSailings: 18, topCruiseLines: ['Norwegian Cruise Line', 'Royal Caribbean', 'Princess Cruises'], priceTrend: 'rising', trendPct: 5.1 },
  { destinationRegion: 'Asia', avgPricePpd: 220, bestValueMonths: ['May', 'June', 'October'], peakSeasonMonths: ['March', 'April', 'November', 'December'], shoulderMonths: ['January', 'February', 'July', 'August'], avgDurationDays: 12.0, totalActiveSailings: 12, topCruiseLines: ['Princess Cruises', 'MSC Cruises', 'Royal Caribbean'], priceTrend: 'rising', trendPct: 7.3 },
  { destinationRegion: 'South America', avgPricePpd: 210, bestValueMonths: ['March', 'April', 'October'], peakSeasonMonths: ['December', 'January', 'February'], shoulderMonths: ['November', 'March'], avgDurationDays: 14.0, totalActiveSailings: 8, topCruiseLines: ['Princess Cruises', 'MSC Cruises', 'Holland America Line'], priceTrend: 'stable', trendPct: 1.5 },
  { destinationRegion: 'Hawaii', avgPricePpd: 275, bestValueMonths: ['April', 'May', 'September'], peakSeasonMonths: ['June', 'July', 'August', 'December'], shoulderMonths: ['January', 'March', 'October'], avgDurationDays: 12.0, totalActiveSailings: 6, topCruiseLines: ['Celebrity Cruises', 'Princess Cruises', 'Norwegian Cruise Line'], priceTrend: 'rising', trendPct: 3.9 },
  { destinationRegion: 'Panama Canal', avgPricePpd: 260, bestValueMonths: ['September', 'October', 'November'], peakSeasonMonths: ['January', 'February', 'March'], shoulderMonths: ['April', 'December'], avgDurationDays: 14.5, totalActiveSailings: 8, topCruiseLines: ['Holland America Line', 'Princess Cruises', 'Royal Caribbean'], priceTrend: 'stable', trendPct: 0.5 },
  { destinationRegion: 'Transatlantic', avgPricePpd: 195, bestValueMonths: ['April', 'October', 'November'], peakSeasonMonths: ['May', 'June', 'September'], shoulderMonths: ['March', 'July', 'August'], avgDurationDays: 13.0, totalActiveSailings: 10, topCruiseLines: ['Celebrity Cruises', 'Royal Caribbean', 'Norwegian Cruise Line'], priceTrend: 'stable', trendPct: 0.3 },
];

// =============================================================================
// MARKET COMPARISONS
// =============================================================================

interface MktComparison {
  cruiseLine: string;
  avgPricePpd: number;
  minPricePpd: number;
  maxPricePpd: number;
  avgDurationDays: number;
  destinationCount: number;
  sailingCount: number;
  overallRating: number;
  bestValueRating: number;
}

const marketComparisons: MktComparison[] = [
  { cruiseLine: 'Royal Caribbean', avgPricePpd: 208, minPricePpd: 85, maxPricePpd: 540, avgDurationDays: 7.2, destinationCount: 7, sailingCount: 35, overallRating: 8.5, bestValueRating: 7.0 },
  { cruiseLine: 'Norwegian Cruise Line', avgPricePpd: 215, minPricePpd: 90, maxPricePpd: 520, avgDurationDays: 7.8, destinationCount: 6, sailingCount: 28, overallRating: 8.2, bestValueRating: 7.2 },
  { cruiseLine: 'Princess Cruises', avgPricePpd: 232, minPricePpd: 95, maxPricePpd: 580, avgDurationDays: 9.5, destinationCount: 6, sailingCount: 24, overallRating: 8.7, bestValueRating: 7.5 },
  { cruiseLine: 'Carnival Cruise Line', avgPricePpd: 152, minPricePpd: 65, maxPricePpd: 410, avgDurationDays: 6.3, destinationCount: 5, sailingCount: 28, overallRating: 7.5, bestValueRating: 9.0 },
  { cruiseLine: 'Celebrity Cruises', avgPricePpd: 268, minPricePpd: 110, maxPricePpd: 620, avgDurationDays: 9.6, destinationCount: 5, sailingCount: 25, overallRating: 9.0, bestValueRating: 6.5 },
  { cruiseLine: 'MSC Cruises', avgPricePpd: 175, minPricePpd: 60, maxPricePpd: 450, avgDurationDays: 7.4, destinationCount: 5, sailingCount: 25, overallRating: 7.8, bestValueRating: 8.5 },
  { cruiseLine: 'Holland America Line', avgPricePpd: 225, minPricePpd: 95, maxPricePpd: 560, avgDurationDays: 10.4, destinationCount: 4, sailingCount: 22, overallRating: 8.8, bestValueRating: 7.8 },
  { cruiseLine: 'Disney Cruise Line', avgPricePpd: 298, minPricePpd: 130, maxPricePpd: 680, avgDurationDays: 6.6, destinationCount: 3, sailingCount: 20, overallRating: 9.2, bestValueRating: 5.5 },
];

// =============================================================================
// BOOKING INSIGHTS
// =============================================================================

interface BookingInsight {
  destinationRegion: string;
  optimalBookingWindow: string;
  avgDaysBeforeDeparture: number;
  lastMinuteDealScore: number;
  earlyBirdDiscountPct: number;
}

const bookingInsights: BookingInsight[] = [
  { destinationRegion: 'Caribbean', optimalBookingWindow: '2-4 months before departure', avgDaysBeforeDeparture: 90, lastMinuteDealScore: 7.5, earlyBirdDiscountPct: 10.0 },
  { destinationRegion: 'Alaska', optimalBookingWindow: '4-8 months before departure', avgDaysBeforeDeparture: 180, lastMinuteDealScore: 4.0, earlyBirdDiscountPct: 15.0 },
  { destinationRegion: 'Mediterranean', optimalBookingWindow: '4-6 months before departure', avgDaysBeforeDeparture: 150, lastMinuteDealScore: 5.0, earlyBirdDiscountPct: 12.0 },
  { destinationRegion: 'Bahamas', optimalBookingWindow: '1-3 months before departure', avgDaysBeforeDeparture: 60, lastMinuteDealScore: 8.0, earlyBirdDiscountPct: 8.0 },
  { destinationRegion: 'Mexico', optimalBookingWindow: '2-4 months before departure', avgDaysBeforeDeparture: 90, lastMinuteDealScore: 7.0, earlyBirdDiscountPct: 10.0 },
  { destinationRegion: 'Europe', optimalBookingWindow: '3-6 months before departure', avgDaysBeforeDeparture: 135, lastMinuteDealScore: 5.5, earlyBirdDiscountPct: 12.0 },
  { destinationRegion: 'Asia', optimalBookingWindow: '5-8 months before departure', avgDaysBeforeDeparture: 210, lastMinuteDealScore: 3.5, earlyBirdDiscountPct: 18.0 },
  { destinationRegion: 'South America', optimalBookingWindow: '4-7 months before departure', avgDaysBeforeDeparture: 165, lastMinuteDealScore: 4.5, earlyBirdDiscountPct: 14.0 },
  { destinationRegion: 'Hawaii', optimalBookingWindow: '4-8 months before departure', avgDaysBeforeDeparture: 180, lastMinuteDealScore: 3.0, earlyBirdDiscountPct: 15.0 },
  { destinationRegion: 'Panama Canal', optimalBookingWindow: '5-10 months before departure', avgDaysBeforeDeparture: 240, lastMinuteDealScore: 2.5, earlyBirdDiscountPct: 18.0 },
  { destinationRegion: 'Transatlantic', optimalBookingWindow: '3-6 months before departure', avgDaysBeforeDeparture: 120, lastMinuteDealScore: 5.0, earlyBirdDiscountPct: 10.0 },
];

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function seed() {
  console.log('[SEED_EXPANDED] Starting comprehensive seed...\n');

  const connected = await testConnection();
  if (!connected) {
    console.error('[SEED_EXPANDED] Cannot connect to database. Run migration first: npm run migrate');
    process.exit(1);
  }

  const pool = getPool();

  // Track counts for verification
  let shipCount = 0;
  let sailingCount = 0;
  let snapshotCount = 0;
  let historyCount = 0;
  let destCount = 0;
  let mktCount = 0;
  let bookCount = 0;

  try {
    // ========================================================================
    // STEP 0: Clear existing data in dependency order
    // ========================================================================
    console.log('[SEED_EXPANDED] Clearing existing data...');
    await pool.query('DELETE FROM pricing_history');
    await pool.query('DELETE FROM price_forecasts');
    await pool.query('DELETE FROM price_alerts');
    await pool.query('DELETE FROM pricing_snapshots');
    await pool.query('DELETE FROM booking_insights');
    await pool.query('DELETE FROM market_comparisons');
    await pool.query('DELETE FROM destination_insights');
    await pool.query('DELETE FROM sailings');
    await pool.query('DELETE FROM ship_details');
    console.log('[SEED_EXPANDED] Existing data cleared\n');

    // ========================================================================
    // STEP 1: Insert ship details
    // ========================================================================
    console.log('[SEED_EXPANDED] Inserting ship details...');
    for (const s of ships) {
      await pool.query(
        `INSERT INTO ship_details (ship_name, cruise_line, ship_class, year_built, passenger_capacity, crew_count, tonnage, restaurants, pools, entertainment, amenities, deck_count, cabin_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (ship_name) DO NOTHING`,
        [s.shipName, s.cruiseLine, s.shipClass, s.yearBuilt, s.passengerCapacity, s.crewCount, s.tonnage,
         s.restaurants, s.pools, s.entertainment, s.amenities, s.deckCount, s.cabinCount],
      );
      shipCount++;
    }
    console.log(`[SEED_EXPANDED] Inserted ${shipCount} ship details\n`);

    // ========================================================================
    // STEP 2: Insert sailings
    // ========================================================================
    console.log('[SEED_EXPANDED] Inserting sailings...');

    // Build a map of ship cabin counts for total_cabins on sailings
    const shipCabinMap: Record<string, number> = {};
    for (const s of ships) {
      shipCabinMap[s.shipName] = s.cabinCount;
    }

    for (const s of sailings) {
      const cabinCount = shipCabinMap[s.shipName] || null;
      const cabinCategories = ['Inside', 'Oceanview', 'Balcony', 'Suite'];

      await pool.query(
        `INSERT INTO sailings (cruise_line, ship_name, departure_date, duration_days, departure_port, departure_region, itinerary, destination_region, total_cabins, cabin_categories, is_repositioning, sync_source, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::cabin_tier[], $11, 'seed_expanded', 'completed')
         ON CONFLICT (cruise_line, ship_name, departure_date) DO NOTHING`,
        [s.cruiseLine, s.shipName, s.departureDate, s.durationDays, s.departurePort, s.departureRegion,
         s.itinerary, s.destinationRegion, cabinCount, cabinCategories, s.isRepositioning],
      );
      sailingCount++;
    }
    console.log(`[SEED_EXPANDED] Inserted ${sailingCount} sailings\n`);

    // ========================================================================
    // STEP 3: Insert pricing snapshots (disable trigger first to control history)
    // ========================================================================
    console.log('[SEED_EXPANDED] Inserting pricing snapshots...');

    // Disable the auto-history trigger so we control pricing_history ourselves
    await pool.query('ALTER TABLE pricing_snapshots DISABLE TRIGGER trg_archive_pricing');

    const snapshotInsertData: Array<{
      snapshotId: number;
      sailingId: number;
      cabinType: string;
      passengerCount: number;
      baseFareUsd: number;
      portFeesUsd: number;
      gratuitiesUsd: number;
    }> = [];

    const { rows: sailingRows } = await pool.query(
      'SELECT id, cruise_line, ship_name, departure_date, destination_region, duration_days FROM sailings',
    );

    for (const row of sailingRows) {
      const seedNum = row.id;
      const priceRows = generatePricing(row.cruise_line, row.destination_region, row.duration_days, seedNum);

      for (const pr of priceRows) {
        const result = await pool.query(
          `INSERT INTO pricing_snapshots (sailing_id, cabin_type, passenger_count, base_fare_usd, port_fees_usd, gratuities_usd, is_solo_supplement_waived, captured_by)
           VALUES ($1, $2::cabin_tier, $3, $4, $5, $6, $7, 'seed_expanded')
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [row.id, pr.cabinType, pr.passengerCount, pr.baseFareUsd, pr.portFeesUsd, pr.gratuitiesUsd, pr.soloWaived],
        );

        if (result.rows.length > 0) {
          snapshotInsertData.push({
            snapshotId: result.rows[0].id,
            sailingId: row.id,
            cabinType: pr.cabinType,
            passengerCount: pr.passengerCount,
            baseFareUsd: pr.baseFareUsd,
            portFeesUsd: pr.portFeesUsd,
            gratuitiesUsd: pr.gratuitiesUsd,
          });
          snapshotCount++;
        }
      }
    }

    console.log(`[SEED_EXPANDED] Inserted ${snapshotCount} pricing snapshots\n`);

    // ========================================================================
    // STEP 4: Insert pricing history (simulate price changes over time)
    // ========================================================================
    console.log('[SEED_EXPANDED] Inserting pricing history...');

    // For each snapshot, insert 3 historical records at different past dates
    // Prices vary deterministically to simulate market fluctuation
    for (const snap of snapshotInsertData) {
      const totalUsd = Math.round((snap.baseFareUsd + snap.portFeesUsd + snap.gratuitiesUsd) * 100) / 100;

      // Historical record 1: ~90 days before current date (slightly cheaper on average)
      const histDate1 = '2026-04-14';
      const var1 = 0.85 + (detMod(snap.snapshotId * 7, 21) / 100); // 0.85-1.05
      const histBase1 = Math.round(snap.baseFareUsd * var1);
      const historyTotal1 = Math.round((histBase1 + snap.portFeesUsd + snap.gratuitiesUsd) * 100) / 100;

      await pool.query(
        `INSERT INTO pricing_history (snapshot_id, sailing_id, cabin_type, passenger_count, base_fare_usd, port_fees_usd, gratuities_usd, total_usd, recorded_date)
         VALUES ($1, $2, $3::cabin_tier, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (sailing_id, cabin_type, passenger_count, recorded_date) DO NOTHING`,
        [snap.snapshotId, snap.sailingId, snap.cabinType, snap.passengerCount, histBase1, snap.portFeesUsd, snap.gratuitiesUsd, historyTotal1, histDate1],
      );
      historyCount++;

      // Historical record 2: ~60 days before (price went up)
      const histDate2 = '2026-05-14';
      const var2 = 0.90 + (detMod(snap.snapshotId * 13 + 5, 21) / 100); // 0.90-1.10
      const histBase2 = Math.round(snap.baseFareUsd * var2);
      const historyTotal2 = Math.round((histBase2 + snap.portFeesUsd + snap.gratuitiesUsd) * 100) / 100;

      await pool.query(
        `INSERT INTO pricing_history (snapshot_id, sailing_id, cabin_type, passenger_count, base_fare_usd, port_fees_usd, gratuities_usd, total_usd, recorded_date)
         VALUES ($1, $2, $3::cabin_tier, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (sailing_id, cabin_type, passenger_count, recorded_date) DO NOTHING`,
        [snap.snapshotId, snap.sailingId, snap.cabinType, snap.passengerCount, histBase2, snap.portFeesUsd, snap.gratuitiesUsd, historyTotal2, histDate2],
      );
      historyCount++;

      // Historical record 3: ~30 days before (trending toward current)
      const histDate3 = '2026-06-13';
      const var3 = 0.95 + (detMod(snap.snapshotId * 19 + 11, 11) / 100); // 0.95-1.05
      const histBase3 = Math.round(snap.baseFareUsd * var3);
      const historyTotal3 = Math.round((histBase3 + snap.portFeesUsd + snap.gratuitiesUsd) * 100) / 100;

      await pool.query(
        `INSERT INTO pricing_history (snapshot_id, sailing_id, cabin_type, passenger_count, base_fare_usd, port_fees_usd, gratuities_usd, total_usd, recorded_date)
         VALUES ($1, $2, $3::cabin_tier, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (sailing_id, cabin_type, passenger_count, recorded_date) DO NOTHING`,
        [snap.snapshotId, snap.sailingId, snap.cabinType, snap.passengerCount, histBase3, snap.portFeesUsd, snap.gratuitiesUsd, historyTotal3, histDate3],
      );
      historyCount++;
    }

    // Re-enable the trigger
    await pool.query('ALTER TABLE pricing_snapshots ENABLE TRIGGER trg_archive_pricing');

    console.log(`[SEED_EXPANDED] Inserted ${historyCount} pricing history records\n`);

    // ========================================================================
    // STEP 5: Insert destination insights
    // ========================================================================
    console.log('[SEED_EXPANDED] Inserting destination insights...');
    for (const di of destinationInsights) {
      await pool.query(
        `INSERT INTO destination_insights (destination_region, avg_price_ppd, best_value_months, peak_season_months, shoulder_months, avg_duration_days, total_active_sailings, top_cruise_lines, price_trend, trend_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (destination_region) DO NOTHING`,
        [di.destinationRegion, di.avgPricePpd, di.bestValueMonths, di.peakSeasonMonths, di.shoulderMonths,
         di.avgDurationDays, di.totalActiveSailings, di.topCruiseLines, di.priceTrend, di.trendPct],
      );
      destCount++;
    }
    console.log(`[SEED_EXPANDED] Inserted ${destCount} destination insights\n`);

    // ========================================================================
    // STEP 6: Insert market comparisons
    // ========================================================================
    console.log('[SEED_EXPANDED] Inserting market comparisons...');
    for (const mc of marketComparisons) {
      await pool.query(
        `INSERT INTO market_comparisons (cruise_line, avg_price_ppd, min_price_ppd, max_price_ppd, avg_duration_days, destination_count, sailing_count, overall_rating, best_value_rating)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (cruise_line) DO NOTHING`,
        [mc.cruiseLine, mc.avgPricePpd, mc.minPricePpd, mc.maxPricePpd, mc.avgDurationDays,
         mc.destinationCount, mc.sailingCount, mc.overallRating, mc.bestValueRating],
      );
      mktCount++;
    }
    console.log(`[SEED_EXPANDED] Inserted ${mktCount} market comparisons\n`);

    // ========================================================================
    // STEP 7: Insert booking insights
    // ========================================================================
    console.log('[SEED_EXPANDED] Inserting booking insights...');
    for (const bi of bookingInsights) {
      await pool.query(
        `INSERT INTO booking_insights (destination_region, optimal_booking_window, avg_days_before_departure, last_minute_deal_score, early_bird_discount_pct)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (destination_region) DO NOTHING`,
        [bi.destinationRegion, bi.optimalBookingWindow, bi.avgDaysBeforeDeparture, bi.lastMinuteDealScore, bi.earlyBirdDiscountPct],
      );
      bookCount++;
    }
    console.log(`[SEED_EXPANDED] Inserted ${bookCount} booking insights\n`);

    // ========================================================================
    // VERIFICATION
    // ========================================================================
    const { rows: shipRows } = await pool.query('SELECT COUNT(*)::int AS count FROM ship_details');
    const { rows: sailRows } = await pool.query('SELECT COUNT(*)::int AS count FROM sailings');
    const { rows: snapRows } = await pool.query('SELECT COUNT(*)::int AS count FROM pricing_snapshots');
    const { rows: histRows } = await pool.query('SELECT COUNT(*)::int AS count FROM pricing_history');
    const { rows: destRows } = await pool.query('SELECT COUNT(*)::int AS count FROM destination_insights');
    const { rows: mktRows } = await pool.query('SELECT COUNT(*)::int AS count FROM market_comparisons');
    const { rows: bookRows } = await pool.query('SELECT COUNT(*)::int AS count FROM booking_insights');

    console.log('[SEED_EXPANDED] ======== VERIFICATION ========');
    console.log(`  Ship Details:          ${shipRows[0].count}`);
    console.log(`  Sailings:              ${sailRows[0].count}`);
    console.log(`  Pricing Snapshots:     ${snapRows[0].count}`);
    console.log(`  Pricing History:       ${histRows[0].count}`);
    console.log(`  Destination Insights:  ${destRows[0].count}`);
    console.log(`  Market Comparisons:    ${mktRows[0].count}`);
    console.log(`  Booking Insights:      ${bookRows[0].count}`);
    console.log('[SEED_EXPANDED] ===============================\n');
    console.log('[SEED_EXPANDED] Seed complete!\n');
  } catch (err) {
    // Re-enable trigger on error too
    try { await pool.query('ALTER TABLE pricing_snapshots ENABLE TRIGGER trg_archive_pricing'); } catch (_) {}
    console.error('[SEED_EXPANDED] Seed failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await closePool();
  }
}

seed();
