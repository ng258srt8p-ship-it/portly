/**
 * Alert evaluator — scans active price-drop alerts vs current sailing prices,
 * generates HTML email payloads, dedupes, and queues them in alert_emails.
 *
 * Pipeline per tick:
 *   1) Select N alert subscriptions that haven't been notified recently
 *   2) For each: load the sailing + its price history
 *   3) Decide if it qualifies: price drop % from original >= threshold_pct AND
 *      last_notified_at is null or > 7 days ago (cooldown)
 *   4) Render HTML email body
 *   5) Fingerprint = subscriber_email|sailing_id|score_bucket
 *      score_bucket = Math.floor(dropPct) — collapses micro-changes so a sailing
 *      bouncing between 22.4% and 22.6% doesn't queue duplicate alerts
 *   6) INSERT INTO alert_emails with status='pending' unless fingerprint exists
 *
 * Dispatch is decoupled — dispatcher runs on every cron tick and drains the
 * alert_emails queue via whatever provider is configured (Resend / mock).
 */

export interface AlertEnv {
  DB: D1Database;
  CACHE: KVNamespace;
}

export interface AlertRow {
  id: number;
  email: string;
  sailing_id: string;
  sailing_url: string | null;
  threshold_pct: number;
  is_active: number;
  last_notified_at: string | null;
}

export interface SailingAlertFacts {
  id: string;
  ship: string;
  cruise_line: string;
  sail_date: string;
  nights: number;
  departure_port: string | null;
  current_price: number;
  original_price: number;
  destination: string | null;
  ai_score: number | null;
  ai_insider_summary: string | null;
  ai_verdict: string | null;
  booking_url: string | null;
  booking_label: string | null;
  badge_text: string | null;
  itinerary: string | null;
}

export interface AlertEvaluationResult {
  alertId: number;
  triggered: boolean;
  dropPct?: number;
  reasoning?: string;
}

export interface AlertTickResult {
  scanned: number;
  triggered: number;
  queued: number;
  deduped: number;
  errors: number;
  cooldown: number;
}

const COOLDOWN_DAYS = 7;
const FRONTEND_BASE = 'https://portly-1i0.pages.dev';

function fmtMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  } catch {
    return iso;
  }
}

function parseItinerary(itin: string | null): string[] {
  if (!itin) return [];
  try {
    const v = JSON.parse(itin);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** Render the alert email as a styled HTML string. Self-contained (no external CSS). */
export function renderAlertEmail(opts: {
  alert: Pick<AlertRow, 'email' | 'sailing_id'>;
  facts: SailingAlertFacts;
  dropPct: number;
  unsubscribeUrl: string;
}): string {
  const { alert, facts, dropPct, unsubscribeUrl } = opts;
  const ports = parseItinerary(facts.itinerary);
  const dropPctRounded = Math.round(dropPct * 10) / 10;
  const savings = facts.original_price - facts.current_price;
  const deadPrice = facts.original_price || facts.current_price;
  const scoreBadge = facts.ai_score
    ? `<div style="margin-top:8px;font-size:13px;color:#475569;"><strong style="color:#1e40af;font-size:14px;">AI Deal Score: ${Math.round(facts.ai_score)}/100</strong>${facts.ai_verdict ? ' — ' + escapeHtml(facts.ai_verdict) : ''}</div>`
    : '';
  const insider = facts.ai_insider_summary
    ? `<div style="margin-top:14px;padding:14px 16px;background:#f8fafc;border-left:3px solid #2A44E7;border-radius:6px;font-size:13px;line-height:1.55;color:#1e293b;"><strong style="color:#2A44E7;">Insider read</strong><br/>${escapeHtml(facts.ai_insider_summary)}</div>`
    : '';
  const portsList = ports.length
    ? `<div style="margin-top:10px;font-size:13px;color:#475569;"><strong>Route:</strong> ${escapeHtml(ports.join(' → '))}</div>`
    : '';
  const bookingLink = facts.booking_url
    ? `<a href="${escapeHtml(facts.booking_url)}" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#2A44E7;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Book now — ${escapeHtml(facts.booking_label || 'view fare')}</a>`
    : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your price drop alert</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:#2A44E7;padding:24px 32px;">
          <div style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.01em;">TripTide Cruise Deals</div>
          <div style="margin-top:4px;font-size:12px;color:#c7d2fe;">Price-drop alert</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <div style="font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Your trip dropped</div>
          <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0f172a;line-height:1.25;">${escapeHtml(facts.ship)} · ${escapeHtml(facts.cruise_line)}</h1>
          <div style="margin-top:6px;font-size:14px;color:#475569;">${fmtDate(facts.sail_date)} · ${facts.nights} nights${facts.departure_port ? ' · from ' + escapeHtml(facts.departure_port) : ''}${facts.destination ? ' · ' + escapeHtml(facts.destination) : ''}</div>
          ${portsList}
          <div style="margin-top:18px;padding:18px 20px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;">
            <div style="font-size:13px;color:#065f46;font-weight:600;">Price dropped ${dropPctRounded}% — you save ${fmtMoney(savings)}/person</div>
            <div style="margin-top:6px;font-size:22px;font-weight:700;color:#064e3b;">${fmtMoney(facts.current_price)}<span style="font-size:14px;font-weight:500;color:#6b7280;text-decoration:line-through;margin-left:10px;">${fmtMoney(deadPrice)}</span><span style="font-size:12px;color:#6b7280;font-weight:500;margin-left:6px;">/person</span></div>
          </div>
          ${scoreBadge}
          ${insider}
          <div style="margin-top:22px;">
            <a href="${FRONTEND_BASE}/sailing/${encodeURIComponent(facts.id)}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View this sailing</a>
            ${bookingLink}
          </div>
        </td></tr>
        <tr><td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
          <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
            You received this email because you set a price-drop alert with TripTide.
            <a href="${unsubscribeUrl}" style="color:#64748b;">Unsubscribe or manage alerts</a>.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&', '<':'<', '>':'>', '"':'"', "'":'&#39;' }[c] as string));
}

/** Scan N active alerts and queue triggered ones. */
export async function runAlertEvaluationTick(env: AlertEnv, opts?: { maxPerTick?: number }): Promise<AlertTickResult> {
  const cap = opts?.maxPerTick ?? 25;

  // Pull oldest-notified-first active alerts. Cooldown enforced here in SQL so
  // we don't even fetch alerts that fired within the last COOLDOWN_DAYS.
  const { results: alerts } = await env.DB.prepare(
    `SELECT id, email, sailing_id, sailing_url, threshold_pct, is_active, last_notified_at
       FROM alerts
      WHERE is_active = 1
        AND sailing_id IS NOT NULL
        AND (last_notified_at IS NULL
             OR last_notified_at < datetime('now', ?))
      ORDER BY COALESCE(last_notified_at, '1970-01-01') ASC
      LIMIT ?`
  ).bind(`-${COOLDOWN_DAYS} days`, cap).all();
  const alertRows = (alerts || []) as unknown as AlertRow[];

  const siteBase = FRONTEND_BASE;
  let scanned = 0, triggered = 0, queued = 0, deduped = 0, errors = 0, cooldown = 0;
  for (const a of alertRows) {
    scanned++;
    try {
      const facts = await env.DB.prepare(
        `SELECT s.id, s.sail_date, s.nights, s.price AS current_price, s.original_price,
                s.departure_port, s.itinerary, s.badge_text, s.booking_url, s.booking_label,
                s.ai_score, s.ai_insider_summary, s.ai_verdict,
                sh.name AS ship, cl.name AS cruise_line, d.name AS destination
           FROM sailings s
           JOIN ships sh       ON s.ship_id = sh.id
           JOIN cruise_lines cl ON s.cruise_line_id = cl.id
      LEFT JOIN destinations d ON s.destination_id = d.id
          WHERE s.id = ?`
      ).bind(a.sailing_id).first<SailingAlertFacts>();
      if (!facts) {
        // Sailing was deleted (e.g., replaced by a date-variant). Quietly skip.
        continue;
      }
      // Sanity: prices must be positive numbers
      const cur = Number(facts.current_price);
      const orig = Number(facts.original_price) || cur;
      if (!(cur > 0 && orig > 0)) continue;
      const dropPct = orig > cur ? ((orig - cur) / orig) * 100 : 0;
      if (dropPct < (a.threshold_pct || 10)) {
        // Below threshold — don't queue
        continue;
      }
      triggered++;

      // Dedupe fingerprint: email|sailing_id|floor(dropPct)
      // floor(dropPct) buckets 22.0%–22.99% → "22" so micro-retracements don't
      // requeue inside the cooldown window.
      const dropBucket = Math.floor(dropPct);
      const fp = `${a.email}|${a.sailing_id}|${dropBucket}`;
      const existing = await env.DB.prepare(
        `SELECT id FROM alert_emails WHERE fingerprint = ? AND status IN ('pending','sent') ORDER BY id DESC LIMIT 1`
      ).bind(fp).first<{ id: number }>();
      if (existing) {
        deduped++;
        continue;
      }

      const unsubscribeUrl = `${siteBase}/alerts/unsubscribe?email=${encodeURIComponent(a.email)}&sailing=${encodeURIComponent(a.sailing_id)}`;
      const htmlBody = renderAlertEmail({
        alert: a,
        facts: { ...facts, current_price: cur, original_price: orig },
        dropPct,
        unsubscribeUrl,
      });
      const subject = `${facts.ship}: price dropped ${Math.round(dropPct*10)/10}% to $${Math.round(cur).toLocaleString('en-US')}/person`;
      const snapshot = JSON.stringify({
        ship: facts.ship, line: facts.cruise_line, date: facts.sail_date,
        nights: facts.nights, current_price: cur, original_price: orig,
        dropPct: Math.round(dropPct*10)/10, url: `${siteBase}/sailing/${facts.id}`,
      });

      const insert = await env.DB.prepare(
        `INSERT INTO alert_emails (subscriber_id, sailing_id, sailing_snapshot, subject, html_body, status, fingerprint, queued_at)
         VALUES (NULL, ?, ?, ?, ?, 'pending', ?, datetime('now'))`
      ).bind(a.sailing_id, snapshot, subject, htmlBody, fp).run();
      if (insert.success) queued++;
      else errors++;
    } catch (e) {
      errors++;
    }
  }
  return { scanned, triggered, queued, deduped, errors, cooldown };
}

export interface DispatchTickResult {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: number;
  provider: string;
}

/** Drain N pending emails. Uses Resend if RESEND_API_KEY present, else mock. */
export async function runAlertDispatchTick(env: AlertEnv & { RESEND_API_KEY?: string; ALERT_FROM_EMAIL?: string }, opts?: { maxPerTick?: number }): Promise<DispatchTickResult> {
  const cap = opts?.maxPerTick ?? 10;
  const useResend = !!env.RESEND_API_KEY;
  const provider = useResend ? 'resend' : 'mock';
  const fromEmail = env.ALERT_FROM_EMAIL || 'TripTide Deals <deals@portly-1i0.pages.dev>';

  // Pull pending emails — but we need subscriber email which lives in alerts table.
  const { results: pending } = await env.DB.prepare(
    `SELECT ae.id AS alert_email_id, ae.sailing_id, ae.subject, ae.html_body, ae.fingerprint,
            a.email AS to_email
       FROM alert_emails ae
  LEFT JOIN alerts a ON a.sailing_id = ae.sailing_id AND a.is_active = 1
      WHERE ae.status = 'pending'
      ORDER BY ae.queued_at ASC
      LIMIT ?`
  ).bind(cap).all();
  const rows = (pending || []) as unknown as { alert_email_id: number; to_email: string | null; subject: string; html_body: string; fingerprint: string; sailing_id: string | null; }[];
  if (rows.length === 0) return { attempted: 0, sent: 0, failed: 0, skipped: 0, errors: 0, provider };

  let attempted = 0, sent = 0, failed = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    attempted++;
    if (!row.to_email) {
      // No active subscription found — skip (don't mark failed; admin can review)
      await env.DB.prepare(`UPDATE alert_emails SET status='skipped' WHERE id = ?`).bind(row.alert_email_id).run();
      skipped++;
      continue;
    }

    try {
      if (useResend) {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: row.to_email,
            subject: row.subject,
            html: row.html_body,
          }),
        });
        if (resp.ok) {
          const body = await resp.json() as { id?: string };
          await env.DB.prepare(
            `UPDATE alert_emails SET status='sent', attempts=attempts+1, sent_at=datetime('now') WHERE id = ?`
          ).bind(row.alert_email_id).run();
          await env.DB.prepare(
            `INSERT INTO alert_email_log (alert_id, provider, status, http_status, message_id, ts) VALUES (?, ?, 'sent', ?, ?, datetime('now'))`
          ).bind(row.alert_email_id, provider, resp.status, body?.id || null).run();
          // Mark the source alert as notified
          await env.DB.prepare(
            `UPDATE alerts SET last_notified_at = datetime('now') WHERE sailing_id = ? AND email = ?`
          ).bind(row.sailing_id, row.to_email).run();
          sent++;
        } else {
          const errText = await resp.text();
          await env.DB.prepare(
            `UPDATE alert_emails SET attempts=attempts+1, last_error=? WHERE id = ?`
          ).bind(errText.slice(0, 500), row.alert_email_id).run();
          await env.DB.prepare(
            `INSERT INTO alert_email_log (alert_id, provider, status, http_status, error, ts) VALUES (?, ?, 'failed', ?, ?, datetime('now'))`
          ).bind(row.alert_email_id, provider, resp.status, errText.slice(0, 500)).run();
          failed++;
        }
      } else {
        // Mock — record in log as mock-sent, leave alert_emails as pending (so
        // future Resend wiring will actually deliver it). Mark alerts row as
        // notified so we don't keep re-evaluating.
        await env.DB.prepare(
          `UPDATE alert_emails SET attempts=attempts+1 WHERE id = ?`
        ).bind(row.alert_email_id).run();
        await env.DB.prepare(
          `INSERT INTO alert_email_log (alert_id, provider, status, http_status, message_id, ts) VALUES (?, 'mock', 'skipped', 0, ?, datetime('now'))`
        ).bind(row.alert_email_id, `mock_${row.alert_email_id}`).run();
        await env.DB.prepare(
          `UPDATE alerts SET last_notified_at = datetime('now') WHERE sailing_id = ? AND email = ?`
        ).bind(row.sailing_id, row.to_email).run();
        sent++;
      }
    } catch (e: any) {
      errors++;
      await env.DB.prepare(
        `UPDATE alert_emails SET attempts=attempts+1, last_error=? WHERE id = ?`
      ).bind(String(e).slice(0, 500), row.alert_email_id).run();
    }
  }

  return { attempted, sent, failed, skipped, errors, provider };
}
