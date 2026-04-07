async function runTest() {
  console.log("Testing Global Rate Limiter & Brute Force Protection on /login...");
  
  for (let i = 1; i <= 6; i++) {
    const res = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hacker@example.com', password: 'password123' })
    });
    const status = res.status;
    const body = await res.json();
    console.log(`[Attempt ${i}] Status: ${status} | Error: ${body.error || body.message}`);
    
    // Pause briefly to simulate realistic script attack
    await new Promise(r => setTimeout(r, 200));
  }
}

runTest();
