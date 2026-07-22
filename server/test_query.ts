import { getPool } from './db/pool';

async function test() {
  const pool = getPool();
  
  try {
    console.log('Testing sailing query...');
    const sailingResult = await pool.query(
      `SELECT id, cruise_line, ship_name, duration_days, departure_port,
              destination_region, departure_date, itinerary, cabin_categories, booking_url
       FROM sailings WHERE id = $1`,
      [1049]
    );
    console.log('Sailing query OK:', sailingResult.rows.length, 'rows');
    
    console.log('Testing pricing query...');
    const pricingResult = await pool.query(
      `SELECT cabin_type, total_out_the_door_usd
       FROM pricing_snapshots
       WHERE sailing_id = $1
       ORDER BY captured_at DESC`,
      [1049]
    );
    console.log('Pricing query OK:', pricingResult.rows.length, 'rows');
    
    console.log('Testing history query...');
    const historyResult = await pool.query(
      `SELECT cabin_type, total_out_the_door_usd, captured_at
       FROM pricing_snapshots
       WHERE sailing_id = $1 AND cabin_type = 'Inside'
       ORDER BY captured_at ASC
       LIMIT 20`,
      [1049]
    );
    console.log('History query OK:', historyResult.rows.length, 'rows');
    
    console.log('Testing ship_details query...');
    const shipResult = await pool.query(
      `SELECT year_built, passenger_capacity, tonnage
       FROM ship_details WHERE ship_name = $1 LIMIT 1`,
      [sailingResult.rows[0].ship_name]
    );
    console.log('Ship query OK:', shipResult.rows.length, 'rows');
    
    console.log('Testing destination_insights query...');
    const destResult = await pool.query(
      `SELECT avg_price_ppd, best_value_months, peak_season_months, price_trend
       FROM destination_insights WHERE destination_region = $1 LIMIT 1`,
      [sailingResult.rows[0].destination_region]
    );
    console.log('Destination query OK:', destResult.rows.length, 'rows');
    
    console.log('Testing market_comparisons query...');
    const mktResult = await pool.query(
      `SELECT avg_price_ppd, overall_rating, best_value_rating
       FROM market_comparisons WHERE cruise_line = $1 LIMIT 1`,
      [sailingResult.rows[0].cruise_line]
    );
    console.log('Market query OK:', mktResult.rows.length, 'rows');
    
  } catch (err: any) {
    console.error('ERROR:', err.message);
    if (err.sql) console.error('SQL:', err.sql);
  } finally {
    await pool.end();
  }
}

test();
