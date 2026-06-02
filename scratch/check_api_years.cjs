const http = require('http');

function getApiData(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
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
  try {
    const yearsRes = await getApiData('/api/years?all=true');
    console.log('GET /api/years:', JSON.stringify(yearsRes));

    const placementsRes = await getApiData('/api/placements?limit=1');
    console.log('\nGET /api/placements (sample):', JSON.stringify(placementsRes.data?.placements?.[0]));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
