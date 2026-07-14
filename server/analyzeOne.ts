import { getPool } from './db/pool';
import { analyzeSailingDealOptimized, generatePriceForecast } from './services/analyticsOptimized';

async function analyzeOneSailing() {
  const pool = getPool();
  try {
    // Find one sailing without deal analysis
    const result = await pool.query(
      `SELECT s.id 
       FROM sailings s 
       LEFT JOIN pricing_snapshots ps ON ps.sailing_id = s.id 
       WHERE s.deal_analysis IS NULL 
       AND s.sync_status = 'active'
       GROUP BY s.id
       HAVING COUNT(ps.id) > 0
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log('No sailings found without deal analysis that have pricing data.');
      return;
    }

    const sailingId = result.rows[0].id;
    console.log(`Analyzing sailing ID: ${sailingId}`);

    // Fetch the sailing data needed for analysis
    const sailingDataResult = await pool.query(
      `SELECT s.*, 
              json_agg(
                json_build_object(
                  'id', ps.id,
                  'sailing_id', ps.sailing_id,
                  'cabin_type', ps.cabin_type,
                  'passenger_count', ps.passenger_count,
                  'base_fare_usd', ps.base_fare_usd,
                  'total_out_the_door_usd', ps.total_out_the_door_usd,
                  'captured_at', ps.captured_at
                ) ORDER BY ps.captured_at
              ) as pricing
       FROM sailings s
       LEFT JOIN pricing_snapshots ps ON ps.sailing_id = s.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [sailingId]
    );

    if (sailingDataResult.rows.length === 0) {
      console.log(`Sailing ${sailingId} not found.`);
      return;
    }

    const sailingData = sailingDataResult.rows[0];

    // Run deal analysis
    console.log('Running deal analysis...');
    const dealAnalysis = await analyzeSailingDealOptimized(sailingId.toString(), sailingData, false);
    console.log('Deal analysis completed.');

    // Run price forecast
    console.log('Running price forecast...');
    const priceForecast = await generatePriceForecast(sailingId.toString(), false);
    console.log('Price forecast completed.');

    // Update the sailing with the results
    await pool.query(
      `UPDATE sailings 
       SET deal_analysis = $1, 
           deal_analysis_generated_at = NOW(),
           price_forecast = $2,
           price_forecast_generated_at = NOW()
       WHERE id = $3`,
      [dealAnalysis, priceForecast, sailingId]
    );

    console.log(`Sailing ${sailingId} updated with analysis and forecast.`);
  } catch (err) {
    console.error('Error during analysis:', err);
  } finally {
    await pool.end();
  }
}

analyzeOneSailing().catch(console.error);