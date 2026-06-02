const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log('=== STARTING DEPARTMENT SCALABILITY AUDIT ===\n');

  // Test 1: Create a department CSBS
  console.log('Test 1: POST /api/departments (CSBS)');
  const postData1 = JSON.stringify({
    department_code: 'CSBS',
    department_name: 'Computer Science and Business Systems'
  });
  const res1 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/departments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData1)
    }
  }, postData1);
  console.log('Response Status:', res1.status);
  console.log('Response Body:', JSON.stringify(res1.data, null, 2));

  const deptId = res1.data?.data?._id;

  // Test 2: Get all departments
  console.log('\nTest 2: GET /api/departments');
  const res2 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/departments',
    method: 'GET'
  });
  console.log('Response Status:', res2.status);
  console.log('Departments Count:', res2.data?.data?.length);
  console.log('Department Codes:', res2.data?.data?.map(d => d.department_code));

  // Test 3: Update department CSBS
  if (deptId) {
    console.log(`\nTest 3: PUT /api/departments/${deptId}`);
    const putData = JSON.stringify({
      department_name: 'CS & Business Systems (Updated)'
    });
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/departments/${deptId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(putData)
      }
    }, putData);
    console.log('Response Status:', res3.status);
    console.log('Updated Name:', res3.data?.data?.department_name);

    // Test 4: Delete department CSBS
    console.log(`\nTest 4: DELETE /api/departments/${deptId}`);
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/departments/${deptId}`,
      method: 'DELETE'
    });
    console.log('Response Status:', res4.status);
    console.log('Deleted Body:', JSON.stringify(res4.data, null, 2));
  }

  // Test 5: Ingest student with a NEW department (AIML) and a SECTION ("B")
  console.log('\nTest 5: POST /api/upload/json (Importing student in new department AIML and section B)');
  const importRecord = [
    {
      reg_no: '1920100777',
      name: 'Dynamic Student',
      department: 'AIML',
      section: 'B',
      batch_year: 2026,
      cgpa: 8.5,
      arrears: 0,
      skills: 'Python,Tensorflow'
    }
  ];
  const postData5 = JSON.stringify(importRecord);
  const res5 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/upload/json?policy=overwrite',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData5)
    }
  }, postData5);
  console.log('Response Status:', res5.status);
  console.log('Import Summary:', JSON.stringify(res5.data, null, 2));

  // Test 6: Verify the AIML department was dynamically registered
  console.log('\nTest 6: GET /api/departments (Verifying AIML was dynamically created)');
  const res6 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/departments',
    method: 'GET'
  });
  const aimlDept = res6.data?.data?.find(d => d.department_code === 'AIML');
  console.log('AIML Department Registered:', !!aimlDept);
  if (aimlDept) {
    console.log('AIML Details:', JSON.stringify(aimlDept, null, 2));
  }

  // Test 7: Fetch the student and verify the section is separate and correct
  console.log('\nTest 7: GET /api/students/1920100777 (Verifying student profile section)');
  const res7 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/students/1920100777',
    method: 'GET'
  });
  console.log('Response Status:', res7.status);
  console.log('Student Name:', res7.data?.data?.name);
  console.log('Student Department:', res7.data?.data?.department);
  console.log('Student Section:', res7.data?.data?.section);
}

run();
