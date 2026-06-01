const http = require('http');

const studentData = [
  {
    name: "Test Student A",
    dept: "CSE",
    cgpa: 8.5,
    arrears: 0,
    skills: ["React", "Node"],
    regNo: "1920100999"
  },
  {
    name: "Test Student B",
    dept: "ECE",
    cgpa: 7.2,
    arrears: 1,
    skills: ["C++"],
    regNo: "1920100998"
  }
];

const postData = JSON.stringify(studentData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/upload/json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('BODY:');
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch (e) {
      console.log(body);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
