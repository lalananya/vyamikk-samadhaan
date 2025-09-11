// Quick test for the backend
const http = require("http");

const options = {
  hostname: "localhost",
  port: 4000,
  path: "/api/v1/healthz",
  method: "GET",
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Response:", data);
  });
});

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
