const pool = require('../config/db');

exports.getLoginAndActivityMetrics = async (req, res) => {
  try {
    const query = `
      WITH active_user_footprints AS (
        -- Step 1: Exact logic provided by your senior to capture ALL active UIDs
        SELECT user_id AS uid FROM public.refresh_tokens
          WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'
        UNION
        SELECT bla_updated_by AS uid FROM public.voters
          WHERE bla_updated_at >= CURRENT_DATE AND bla_updated_at < CURRENT_DATE + INTERVAL '1 day'
      ),
      user_metrics AS (
        -- Step 2: Map structural profiles, keeping users even if unassigned
        SELECT 
          u.id, 
          u.full_name, 
          u.mobile, 
          u.role, 
          u.pc_name, 
          u.assembly AS ac_name,
          CASE WHEN auf.uid IS NOT NULL THEN 1 ELSE 0 END AS logged_in_today,
          u.last_login_at
        FROM public.users u
        LEFT JOIN active_user_footprints auf ON u.id = auf.uid
      )
      SELECT
        -- Metric 1: Global Totals (Using the exact distinct footprint count)
        (SELECT COUNT(*)::INT FROM public.users) AS total_registered_users,
        (SELECT COUNT(DISTINCT uid)::INT FROM active_user_footprints) AS total_active_today,
        
        -- Metric 2: Parliamentary Constituency (PC) Level Breakdown
        COALESCE(
          (SELECT json_agg(pc_g) FROM (
             SELECT 
               COALESCE(pc_name, 'Unassigned') AS pc_name, 
               COUNT(*)::INT AS total_users, 
               SUM(logged_in_today)::INT AS active_today 
             FROM user_metrics 
             GROUP BY pc_name
          ) pc_g), '[]'::json
        ) AS pc_level_logins,
        
        -- Metric 3: Assembly Constituency (AC) Level Breakdown
        COALESCE(
          (SELECT json_agg(ac_g) FROM (
             SELECT 
               COALESCE(ac_name, 'Unassigned') AS ac_name, 
               COUNT(*)::INT AS total_users, 
               SUM(logged_in_today)::INT AS active_today 
             FROM user_metrics 
             GROUP BY ac_name
          ) ac_g), '[]'::json
        ) AS ac_level_logins,
        
        -- Metric 4: Details of Active Users (Where profile matches)
        COALESCE(
          (SELECT json_agg(u_d) FROM (
             SELECT id, full_name, mobile, role, pc_name, ac_name, last_login_at 
             FROM user_metrics 
             WHERE logged_in_today = 1 
             ORDER BY last_login_at DESC NULLS LAST
          ) u_d), '[]'::json
        ) AS active_user_details
      FROM (SELECT 1) dummy;
    `;

    const result = await pool.query(query);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("User Login Tracking API Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};