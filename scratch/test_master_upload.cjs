const http = require('http');

const masterData = [
  {
    reg_no: "1920100888",
    student_name: "Siddharth Verma",
    department: "CSE",
    batch_year: 2026,
    cgpa: 9.1,
    arrears: 0,
    skills: "React,Node.js,Python,TypeScript",
    company_name: "Astra Tech",
    role: "Frontend Architect",
    package: 12.5,
    placement_status: "Placed",
    drive_date: "2026-06-01",
    hr_name: "Neha Kapoor",
    hr_email: "neha.kapoor@astratech.com",
    hr_phone: "9876543000"
  }
];

const executeRequest = (policy, callback) => {
  const postData = JSON.stringify(masterData);
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/upload/json?policy=${policy}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    res.setEncoding('utf8');
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        callback(null, res.statusCode, parsed);
      } catch (e) {
        callback(e, res.statusCode, body);
      }
    });
  });

  req.on('error', (e) => { callback(e); });
  req.write(postData);
  req.end();
};

// Step 1: Ingest brand new master records (should insert)
console.log("=== STEP 1: UPLOADING NEW MASTER RECORDS (policy = skip) ===");
executeRequest('skip', (err, status, response) => {
  if (err) {
    console.error("Step 1 failed:", err);
    return;
  }
  console.log(`STATUS: ${status}`);
  console.log(JSON.stringify(response, null, 2));

  // Step 2: Upload same records again (should trigger duplicate skips)
  console.log("\n=== STEP 2: RE-UPLOADING SAME RECORDS (policy = skip) ===");
  executeRequest('skip', (err2, status2, response2) => {
    if (err2) {
      console.error("Step 2 failed:", err2);
      return;
    }
    console.log(`STATUS: ${status2}`);
    console.log(JSON.stringify(response2, null, 2));

    // Step 3: Re-upload with overwrite (should update database fields)
    console.log("\n=== STEP 3: RE-UPLOADING SAME RECORDS WITH OVERWRITE (policy = overwrite) ===");
    executeRequest('overwrite', (err3, status3, response3) => {
      if (err3) {
        console.error("Step 3 failed:", err3);
        return;
      }
      console.log(`STATUS: ${status3}`);
      console.log(JSON.stringify(response3, null, 2));
    });
  });
});
