const http = require('http');

async function test() {
  // Login to get token
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qa.tester2@example.com', password: 'VerySecure123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // Create Campaign
  const createRes = await fetch('http://localhost:3000/api/v1/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'CLI QA Test', niche: 'AI', audience: 'Devs', goals: 'Testing', tone: 'Bold'
    })
  });
  const createData = await createRes.json();
  const campaignId = createData.id;
  console.log('Campaign ID:', campaignId);

  // Poll for status
  for (let i = 0; i < 15; i++) {
    const getRes = await fetch(`http://localhost:3000/api/v1/campaigns/${campaignId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await getRes.json();
    console.log(`Poll ${i} Status:`, data.status);
    if (data.status === 'completed') {
      console.log('Success! Posts:', data.posts?.length);
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

test().catch(console.error);
