// Simple browser debug script
console.log('=== BROWSER DEBUG SCRIPT ===');

// Test if we can fetch from the dev server
fetch('http://localhost:5173/')
  .then(response => {
    console.log('✅ Server is reachable');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    return response.text();
  })
  .then(html => {
    console.log('HTML contains React?', html.includes('src="/src/main.tsx"'));
    console.log('HTML length:', html.length);
  })
  .catch(error => {
    console.error('❌ Server not reachable:', error);
  });

// Check if we can load the actual React page
setTimeout(() => {
  console.log('\n=== TESTING REACT PAGE ===');
  fetch('http://localhost:5173/src/main.tsx')
    .then(response => {
      console.log('main.tsx status:', response.status);
      if (response.ok) {
        return response.text();
      }
      throw new Error('Failed to load main.tsx');
    })
    .then(code => {
      console.log('✅ React entry point loaded');
      console.log('Code length:', code.length);
    })
    .catch(error => {
      console.error('❌ React entry point error:', error);
    });
}, 1000);
