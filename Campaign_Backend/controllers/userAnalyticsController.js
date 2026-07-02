const pool = require('../config/db');

exports.getLoginAndActivityMetrics = async (req, res) => {
  try {
    const query = `
      WITH active_user_footprints AS (
        SELECT user_id AS uid FROM public.refresh_tokens
          WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'
        UNION
        SELECT bla_updated_by AS uid FROM public.voters
          WHERE bla_updated_at >= CURRENT_DATE AND bla_updated_at < CURRENT_DATE + INTERVAL '1 day'
      ),
      user_activity AS (
        SELECT 
          u.id,
          u.assigned_pc_id,
          u.assigned_ac_id,
          CASE WHEN auf.uid IS NOT NULL THEN 1 ELSE 0 END AS logged_in_today
        FROM public.users u
        LEFT JOIN active_user_footprints auf ON u.id = auf.uid
        WHERE u.is_active = 1
      )
      SELECT
        -- Metric 1: Global Totals
        (SELECT COUNT(*)::INT FROM public.users WHERE is_active = 1) AS total_registered_users,
        (SELECT COUNT(DISTINCT uid)::INT FROM active_user_footprints) AS total_active_today,
        
        -- Metric 2: Driven by Master PC table
        COALESCE(
          (SELECT json_agg(pc_g) FROM (
             SELECT 
               pc.pc_name AS pc_name, -- 🌟 Fallback fix if standard 'name' column is explicitly 'pc_name'
               COUNT(ua.id)::INT AS total_users,
               COALESCE(SUM(ua.logged_in_today), 0)::INT AS active_today
             FROM public.parliamentary_constituencies pc
             LEFT JOIN user_activity ua ON pc.id = ua.assigned_pc_id
             GROUP BY pc.id, pc.pc_name
             ORDER BY pc.pc_name ASC
          ) pc_g), '[]'::json
        ) AS pc_level_logins,
        
        -- Metric 3: Driven by Master AC table
        COALESCE(
          (SELECT json_agg(ac_g) FROM (
             SELECT 
               ac.ac_name AS ac_name, -- 🌟 Fallback fix if standard 'name' column is explicitly 'ac_name'
               COUNT(ua.id)::INT AS total_users,
               COALESCE(SUM(ua.logged_in_today), 0)::INT AS active_today
             FROM public.assembly_constituencies ac
             LEFT JOIN user_activity ua ON ac.id = ua.assigned_ac_id
             GROUP BY ac.id, ac.ac_name
             ORDER BY ac.ac_name ASC
          ) ac_g), '[]'::json
        ) AS ac_level_logins,
        
        -- Metric 4: Real-time active user details matching profiles
        COALESCE(
          (SELECT json_agg(u_d) FROM (
             SELECT 
               u.id, u.full_name, u.mobile, u.role, u.pc_name, u.assembly AS ac_name, u.last_login_at 
             FROM public.users u
             JOIN active_user_footprints auf ON u.id = auf.uid
             WHERE u.is_active = 1
             ORDER BY u.last_login_at DESC NULLS LAST
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

//sdfgh