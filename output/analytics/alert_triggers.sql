
-- ============================================================
-- Price Alert Check Function
-- Called by application layer when new pricing is ingested
-- ============================================================

CREATE OR REPLACE FUNCTION check_price_alerts(
    p_cruise_id UUID,
    p_cabin_type_id UUID,
    p_new_total DECIMAL(10,2),
    p_old_total DECIMAL(10,2)
) RETURNS TABLE(
    alert_id UUID,
    user_id UUID,
    alert_type text,
    channel alert_channel,
    destination VARCHAR(500),
    message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.id,
        pa.user_id,
        pa.alert_type::text,
        pa.channel,
        pa.destination,
        CASE 
            WHEN p_new_total < p_old_total AND pa.alert_type = 'price_drop' THEN
                '💲 Price dropped! ' || c.name || ': $' || p_old_total || ' → $' || p_new_total
            WHEN p_new_total > p_old_total AND pa.alert_type = 'price_rise' THEN
                '📈 Price increased! ' || c.name || ': $' || p_old_total || ' → $' || p_new_total
            WHEN p_new_total <= pa.threshold_price THEN
                '🎯 Target price reached! ' || c.name || ' is now $' || p_new_total
            ELSE NULL
        END as message
    FROM price_alerts pa
    JOIN cruises c ON c.id = pa.cruise_id
    WHERE pa.is_active = true
      AND pa.cruise_id = p_cruise_id
      AND (pa.cabin_type_id IS NULL OR pa.cabin_type_id = p_cabin_type_id)
      AND (
          (pa.alert_type = 'price_drop' AND p_new_total < p_old_total) OR
          (pa.alert_type = 'price_rise' AND p_new_total > p_old_total) OR
          (pa.threshold_price IS NOT NULL AND p_new_total <= pa.threshold_price)
      )
      AND (pa.last_triggered_at IS NULL OR pa.last_triggered_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;
