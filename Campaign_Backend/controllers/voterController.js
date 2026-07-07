const pool = require('../config/db');

exports.getGlobalCampaignSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        total_voters::INT,
        contacted::INT AS contacted_count,
        ROUND((contacted * 100.0) / NULLIF(total_voters, 0), 2)::FLOAT AS contacted_percentage,
        pending::INT AS pending_count,
        ROUND((pending * 100.0) / NULLIF(total_voters, 0), 2)::FLOAT AS pending_percentage,
        no_data::INT AS no_data_count,
        ROUND((no_data * 100.0) / NULLIF(total_voters, 0), 2)::FLOAT AS no_data_percentage,
        households::INT,
        total_acs::INT,
        total_booths::INT,
        male_voters::INT,
        female_voters::INT,
        active_users::INT
      FROM public.mv_dashboard_totals
      LIMIT 1;
    `;

    const result = await pool.query(query);
    
    // Return the single object directly
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Global Campaign Summary Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getNestedCampaignMetrics = async (req, res) => {
try {
const query = `
    WITH ac_metrics AS (
-- Step 1: Calculate total and contacted metrics per AC
SELECT 
 parliament_no,
parliament_name,
ac_no,
ac_name,
COUNT(*)::INT AS total_voters,
COUNT(*) FILTER (WHERE contact_status = 'contacted')::INT AS contacted_count,
ROUND(
(COUNT(*) FILTER (WHERE contact_status = 'contacted') * 100.0) / NULLIF(COUNT(*), 0), 2
 )::FLOAT AS contacted_percentage
FROM public.voters
GROUP BY parliament_no, parliament_name, ac_no, ac_name
 ),
 pc_metrics AS (
-- Step 2: Calculate total and contacted metrics per PC
SELECT 
parliament_no,
 parliament_name,
 COUNT(*)::INT AS total_voters,
COUNT(*) FILTER (WHERE contact_status = 'contacted')::INT AS contacted_count,
ROUND(
 (COUNT(*) FILTER (WHERE contact_status = 'contacted') * 100.0) / NULLIF(COUNT(*), 0), 2
 )::FLOAT AS contacted_percentage
FROM public.voters
GROUP BY parliament_no, parliament_name
 ),
 aggregated_acs AS (
-- Step 3: Bundle ACs into their JSON arrays safely *before* joining them to the PCs
SELECT 
 parliament_no,
 parliament_name,
 COALESCE(
 json_agg(
 json_build_object(
 'ac_no', ac_no,
 'ac_name', ac_name,
 'total_voters', total_voters,
 'contacted_count', contacted_count,
 'contacted_percentage', contacted_percentage,
 'remaining_count', (total_voters - contacted_count)::INT,
 'remaining_percentage', ROUND(((total_voters - contacted_count) * 100.0) / NULLIF(total_voters, 0), 2)::FLOAT
 ) ORDER BY ac_no ASC
 ), '[]'::json
 ) AS acs_list
 FROM ac_metrics
 GROUP BY parliament_no, parliament_name
 )
 
-- Step 4: Assemble the final nested response cleanly without massive GROUP BY requirements
SELECT 
 pc.parliament_no,
 pc.parliament_name,
 pc.total_voters,
pc.contacted_count,
pc.contacted_percentage,
(pc.total_voters - pc.contacted_count)::INT AS remaining_count,
ROUND(
 ((pc.total_voters - pc.contacted_count) * 100.0) / NULLIF(pc.total_voters, 0), 2
)::FLOAT AS remaining_percentage,
COALESCE(aa.acs_list, '[]'::json) AS acs
FROM pc_metrics pc
LEFT JOIN aggregated_acs aa ON pc.parliament_no = aa.parliament_no
ORDER BY pc.parliament_no ASC;
`;

    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Hierarchical Campaign Metrics Error:", err.message);
 res.status(500).json({ error: err.message });
 }
};







exports.getMlaSelfAcMetrics = async (req, res) => {
  const mlaId = req.mla.id; 

  try {
    // Step 1: Fetch the specific pc_id and ac_id assigned to this MLA
    const mlaProfile = await pool.query(
      'SELECT id, name, pc_id, ac_id FROM mlas WHERE id = $1', 
      [mlaId]
    );

    if (mlaProfile.rows.length === 0) {
      return res.status(404).json({ error: 'MLA Profile not found.' });
    }

    const { pc_id, ac_id, name } = mlaProfile.rows[0];

    // Step 2: Compute Voter Metrics filtered strictly by this MLA's constituency values
    const metricsQuery = `
      SELECT 
        $1::VARCHAR AS mla_name,
        parliament_no AS pc_id,
        ac_no AS ac_id,
        COUNT(*)::INT AS total_voters,
        COUNT(*) FILTER (WHERE contact_status = 'contacted')::INT AS contacted_count,
        ROUND(
          (COUNT(*) FILTER (WHERE contact_status = 'contacted') * 100.0) / NULLIF(COUNT(*), 0), 2
        )::FLOAT AS contacted_percentage
      FROM public.mv_voters_master
      WHERE parliament_no = $2 AND ac_no = $3
      GROUP BY parliament_no, ac_no;
    `;

    const metricsResult = await pool.query(metricsQuery, [name, pc_id, ac_id]);

    if (metricsResult.rows.length === 0) {
      return res.status(200).json({
        mla_name: name,
        pc_id: pc_id,
        ac_id: ac_id,
        total_voters: 0,
        contacted_count: 0,
        contacted_percentage: 0.00,
        remaining_count: 0,
        remaining_percentage: 0.00
      });
    }

    const data = metricsResult.rows[0];
    
    // Step 3: Compute remaining values mathematically
    const totalVoters = data.total_voters;
    const contactedCount = data.contacted_count;
    const remainingCount = totalVoters - contactedCount;
    
    const remainingPercentage = totalVoters > 0 
      ? parseFloat(((remainingCount * 100.0) / totalVoters).toFixed(2))
      : 0.00;

    res.status(200).json({
      mla_name: data.mla_name,
      pc_id: data.pc_id,
      ac_id: data.ac_id,
      total_voters: totalVoters,
      contacted_count: contactedCount,
      contacted_percentage: data.contacted_percentage,
      remaining_count: remainingCount,
      remaining_percentage: remainingPercentage
    });

  } catch (err) {
    console.error("MLA Dashboard Voter Metrics Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};