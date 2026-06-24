const pool = require('../config/db');

exports.getNestedCampaignMetrics = async (req, res) => {
  try {
    const query = `
      WITH ac_metrics AS (
        -- Step 1: Calculate total and contacted metrics per AC
        SELECT 
          parliament_no,
          ac_no,
          COUNT(*)::INT AS total_voters,
          COUNT(*) FILTER (WHERE contact_status = 'contacted')::INT AS contacted_count,
          ROUND(
            (COUNT(*) FILTER (WHERE contact_status = 'contacted') * 100.0) / NULLIF(COUNT(*), 0), 2
          )::FLOAT AS contacted_percentage
        FROM public.voters
        GROUP BY parliament_no, ac_no
      ),
      pc_metrics AS (
        -- Step 2: Calculate total and contacted metrics per PC
        SELECT 
          parliament_no,
          COUNT(*)::INT AS total_voters,
          COUNT(*) FILTER (WHERE contact_status = 'contacted')::INT AS contacted_count,
          ROUND(
            (COUNT(*) FILTER (WHERE contact_status = 'contacted') * 100.0) / NULLIF(COUNT(*), 0), 2
          )::FLOAT AS contacted_percentage
        FROM public.voters
        GROUP BY parliament_no
      )
      
      -- Step 3: Combine them using safe subtraction for remaining metrics
      SELECT 
        pc.parliament_no,
        pc.total_voters,
        pc.contacted_count,
        pc.contacted_percentage,
        
        -- Safe Math for PC Level Remaining Metrics
        (pc.total_voters - pc.contacted_count)::INT AS remaining_count,
        ROUND(
          ((pc.total_voters - pc.contacted_count) * 100.0) / NULLIF(pc.total_voters, 0), 2
        )::FLOAT AS remaining_percentage,
        
        COALESCE(
          json_agg(
            json_build_object(
              'ac_no', ac.ac_no,
              'total_voters', ac.total_voters,
              'contacted_count', ac.contacted_count,
              'contacted_percentage', ac.contacted_percentage,
              
              -- Safe Math for AC Level Remaining Metrics
              'remaining_count', (ac.total_voters - ac.contacted_count)::INT,
              'remaining_percentage', ROUND(
                ((ac.total_voters - ac.contacted_count) * 100.0) / NULLIF(ac.total_voters, 0), 2
              )::FLOAT
            ) ORDER BY ac.ac_no ASC
          ), '[]'::json
        ) AS acs
      FROM pc_metrics pc
      LEFT JOIN ac_metrics ac ON pc.parliament_no = ac.parliament_no
      GROUP BY 
        pc.parliament_no, pc.total_voters, pc.contacted_count, pc.contacted_percentage
      ORDER BY pc.parliament_no ASC;
    `;

    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Hierarchical Campaign Metrics Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};