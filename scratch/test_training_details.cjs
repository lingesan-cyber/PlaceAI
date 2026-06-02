const http = require('http');

const testStudent = {
  reg_no: "1920109999",
  name: "Test Student Ingestion",
  department: "CSE",
  aptitude_score: 85,
  coding_score: 90,
  communication_score: 80,
  mock_interview_score: 85,
  attendance: 95
};

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      res.setEncoding('utf8');
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

const runTests = async () => {
  try {
    console.log("=== STARTING INTEGRATION TESTS FOR TRAINING DETAILS REST APIs ===");

    // 1. GET /api/training-details (Fetch initial seeded cohort)
    console.log("\n1. Testing GET /api/training-details...");
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/training-details',
      method: 'GET'
    });
    console.log(`STATUS: ${res1.status}`);
    console.log(`Success: ${res1.data.success}`);
    console.log(`Found ${res1.data.data ? res1.data.data.length : 0} seeded records in MongoDB.`);

    // 2. POST /api/training-details (Create new student record)
    console.log("\n2. Testing POST /api/training-details (Create Test Student)...");
    const res2 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/training-details',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, testStudent);
    console.log(`STATUS: ${res2.status}`);
    console.log(JSON.stringify(res2.data, null, 2));

    if (!res2.data.success) {
      throw new Error("POST creation failed!");
    }
    const createdId = res2.data.data._id;

    // 3. PUT /api/training-details/:id (Update scores)
    console.log(`\n3. Testing PUT /api/training-details/${createdId} (Update Scores)...`);
    const updatePayload = {
      aptitude_score: 95,
      coding_score: 98
    };
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/training-details/${createdId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, updatePayload);
    console.log(`STATUS: ${res3.status}`);
    console.log(JSON.stringify(res3.data, null, 2));

    // 4. GET /api/training-details/reg/:reg_no (Verify fetch by register number)
    console.log(`\n4. Testing GET /api/training-details/reg/${testStudent.reg_no}...`);
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/training-details/reg/${testStudent.reg_no}`,
      method: 'GET'
    });
    console.log(`STATUS: ${res4.status}`);
    console.log(`Updated Aptitude: ${res4.data.data.aptitude_score}%`);
    console.log(`Updated Coding: ${res4.data.data.coding_score}%`);

    // 5. POST /api/training-details/import (Bulk importer)
    console.log("\n5. Testing POST /api/training-details/import (Bulk Importer)...");
    const importPayload = [
      {
        reg_no: "1920101111",
        name: "Bulk Student One",
        department: "CSE",
        aptitude_score: 80,
        coding_score: 82,
        communication_score: 80,
        mock_interview_score: 85,
        attendance: 90
      },
      {
        reg_no: "1920102222",
        name: "Bulk Student Two",
        department: "ECE",
        aptitude_score: 60,
        coding_score: 62,
        communication_score: 65,
        mock_interview_score: 60,
        attendance: 78
      }
    ];

    console.log("Importing new records (policy = skip)...");
    const res5a = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/training-details/import?policy=skip',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, importPayload);
    console.log(`STATUS: ${res5a.status}`);
    console.log(JSON.stringify(res5a.data, null, 2));

    console.log("Importing duplicate records (policy = skip)...");
    const res5b = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/training-details/import?policy=skip',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, importPayload);
    console.log(`STATUS: ${res5b.status}`);
    console.log(JSON.stringify(res5b.data, null, 2));

    console.log("Importing duplicate records with updates (policy = overwrite)...");
    const updateImportPayload = [
      {
        reg_no: "1920101111",
        name: "Bulk Student One",
        department: "CSE",
        aptitude_score: 99,
        coding_score: 99,
        communication_score: 99,
        mock_interview_score: 99,
        attendance: 99
      }
    ];
    const res5c = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/training-details/import?policy=overwrite',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, updateImportPayload);
    console.log(`STATUS: ${res5c.status}`);
    console.log(JSON.stringify(res5c.data, null, 2));

    // 6. DELETE /api/training-details/:id (Cleanup Test Student)
    console.log(`\n6. Testing DELETE /api/training-details/${createdId}...`);
    const res6 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/training-details/${createdId}`,
      method: 'DELETE'
    });
    console.log(`STATUS: ${res6.status}`);
    console.log(JSON.stringify(res6.data, null, 2));

    console.log("\n=== ALL TESTS FINISHED SUCCESSFULLY! ===");

  } catch (error) {
    console.error("Test execution encountered an error:", error);
  }
};

runTests();
