// React App Debug Script - runs in browser context
import puppeteer from 'puppeteer';

async function debugReactApp() {
  console.log('=== REACT APP DEBUG ===');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen to console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
    });
    
    // Listen to page errors
    page.on('pageerror', error => {
      console.log(`[BROWSER ERROR] ${error.message}`);
    });
    
    // Listen to request failures
    page.on('requestfailed', request => {
      console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    console.log('Navigating to React app...');
    await page.goto('http://localhost:5173');
    
    // Wait for React to load
    await page.waitForTimeout(3000);
    
    // Check if React rendered
    const hasReactRoot = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    
    console.log('React app rendered:', hasReactRoot);
    
    // Get current URL (might be redirected)
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check for any visible error messages
    const errorTexts = await page.evaluate(() => {
      const errors = [];
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent || '';
        if (text.toLowerCase().includes('error') || 
            text.toLowerCase().includes('fehler') ||
            text.toLowerCase().includes('loading') ||
            text.toLowerCase().includes('keine') && text.toLowerCase().includes('gefunden')) {
          errors.push(text.trim());
        }
      });
      return errors.slice(0, 5); // Top 5 error messages
    });
    
    if (errorTexts.length > 0) {
      console.log('Potential error messages found:');
      errorTexts.forEach((error, i) => console.log(`  ${i+1}. ${error}`));
    }
    
    // Check if we're on a specific page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Get page content for analysis
    const bodyText = await page.evaluate(() => {
      return document.body.innerText?.substring(0, 500) || 'No body content';
    });
    console.log('Page content preview:', bodyText);
    
    // Try to navigate to einsatzplan view
    console.log('\nTrying to navigate to einsatzplan view...');
    try {
      await page.goto('http://localhost:5173/einsatzplan');
      await page.waitForTimeout(2000);
      
      const einsatzplanContent = await page.evaluate(() => {
        return document.body.innerText?.substring(0, 300) || 'No content';
      });
      console.log('Einsatzplan page content:', einsatzplanContent);
      
    } catch (navError) {
      console.log('Navigation error:', navError.message);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await browser.close();
  }
}

debugReactApp().catch(console.error);
