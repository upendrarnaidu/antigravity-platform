const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  // Catch all console logs and errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CLIENT-ERROR] ${msg.text()}`);
      for (const arg of Object.values(msg.args())) {
         arg.jsonValue().then(v => console.log('Arg:', v)).catch(()=>{});
      }
    } else {
      console.log(`[CLIENT-LOG] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`[PAGE-ERROR] ${err.message}`);
  });
  
  try {
    console.log("Navigating to app...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Switch to Sign Up
    console.log("Signing up...");
    await page.waitForSelector('.auth-tabs button');
    const tabs = await page.$$('.auth-tabs button');
    await tabs[1].click(); // Sign Up
    
    await page.type('input[type="email"]', `qa.puppeteer${Date.now()}@test.com`);
    await page.type('input[type="password"]', 'Password123!');
    await page.click('.btn-primary');
    
    // Wait for dashboard
    await page.waitForSelector('.page-title');
    console.log("Signed in successfully. Navigating to Campaign Wizard...");
    
    await page.click('#new-campaign-btn');
    await page.waitForSelector('#campaign-name');
    
    console.log("Filling Campaign Form...");
    await page.type('#campaign-name', 'Puppeteer Campaign');
    await page.type('#campaign-niche', 'B2B Software');
    await page.type('#campaign-audience', 'CTOs');
    await page.type('#campaign-goals', 'Get Leads');
    
    await page.click('#step1-next');
    
    await page.waitForSelector('#launch-agents-btn');
    console.log("Launching Agents...");
    await page.click('#launch-agents-btn');
    
    console.log("Waiting 10 seconds for redirect and UI rendering...");
    await new Promise(r => setTimeout(r, 10000));
    
    console.log("Done checking.");
  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await browser.close();
  }
})();
