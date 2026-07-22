import { Router, Request, Response } from 'express';

const router = Router();

interface AlertRequest {
  email?: string;
  sailingUrl?: string;
}

/**
 * POST /api/alerts/create
 * Creates a new price alert entry.
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { email, sailingUrl } = req.body as AlertRequest;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
      });
    }

    // Validate sailing URL (optional — must be non-empty if provided)
    if (sailingUrl !== undefined && !sailingUrl.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Sailing URL or ID is required',
      });
    }

    // Insert alert into database (alert_subscriptions table)
    const pool = (await import('../db/pool')).getPool();
    const result = await pool.query(
      `INSERT INTO alert_subscriptions (email, sailing_url, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, email`,
      [email, sailingUrl || null]
    );

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
      },
    });
  } catch (err: any) {
    console.error('[Alerts] Create alert error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
