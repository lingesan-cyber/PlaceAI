const http = require('http');

function getAnalytics(year) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/analytics/overview?batch_year=${year}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function run() {
  const years = ['2024', '2025', '2026', 'all'];
  for (const year of years) {
    console.log(`\n--- Fetching analytics for batch_year: "${year}" ---`);
    try {
      const res = await getAnalytics(year);
      console.log(`Response success: ${res.success}`);
      if (res.success) {
        console.log(`Data:`, JSON.stringify(res.data));
      } else {
        console.log(`Message: ${res.message}`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }
}

run();
