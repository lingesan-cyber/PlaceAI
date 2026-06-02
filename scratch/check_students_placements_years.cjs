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
    const studentsRes = await getApiData('/api/students?limit=5000');
    const placementsRes = await getApiData('/api/placements?limit=5000');

    const students = studentsRes.data?.students || [];
    const placements = placementsRes.data?.placements || [];

    const studentYears = Array.from(new Set(students.map(s => String(s.batch_year ?? s.year ?? '')))).filter(Boolean).sort();
    const placementYears = Array.from(new Set(placements.map(p => String(p.batch_year ?? p.year ?? '')))).filter(Boolean).sort();

    console.log('Total students:', students.length);
    console.log('Student years:', studentYears);
    console.log('Total placements:', placements.length);
    console.log('Placement years:', placementYears);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
