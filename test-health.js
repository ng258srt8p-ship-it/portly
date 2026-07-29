const https = require('node:https');

const options = {
  hostname: 'portly-api.vqh9mnrdbp.workers.dev',
  port: 443,
  path: '/api/health',
  method: 'GET',
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();