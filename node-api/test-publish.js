const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: 'postgres://user:password@postgres:5432/marketing_platform' });
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key';

async function run() {
  try {
    const userEmail = 'pub_test_' + Date.now() + '@example.com';
    const user = await pool.query('INSERT INTO users(email) VALUES($1) RETURNING id', [userEmail]);
    const workspace = await pool.query(`INSERT INTO workspaces(owner_id, name) VALUES($1, 'test') RETURNING id`, [user.rows[0].id]);
    const campaign = await pool.query(`INSERT INTO campaigns(workspace_id, name, status) VALUES($1, 'pubtest', 'completed') RETURNING id`, [workspace.rows[0].id]);
    
    await pool.query(
      `INSERT INTO posts(campaign_id, content_text, status) VALUES($1, $2, 'generated')`, 
      [campaign.rows[0].id, JSON.stringify({platform: "Twitter", content: "AI Automation rulez!"})]
    );

    const token = jwt.sign({ user_id: user.rows[0].id, workspace_id: workspace.rows[0].id }, JWT_SECRET);
    
    const res = await fetch('http://127.0.0.1:3000/api/v1/campaigns/' + campaign.rows[0].id + '/publish', { 
      method: 'POST', 
      headers: { 'Authorization': 'Bearer ' + token } 
    });
    
    console.log('API Status:', res.status);
    console.log(await res.json());
    
    console.log('Waiting 5 seconds for Kafka worker to simulate external API...');
    await new Promise(r => setTimeout(r, 5000));
    
    const finalPosts = await pool.query('SELECT status, published_url FROM posts WHERE campaign_id = $1', [campaign.rows[0].id]);
    console.log('Final DB State:', finalPosts.rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
