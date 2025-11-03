import http from 'http';
import PG from 'pg';
import promClient from 'prom-client';

const port = Number(process.env.PORT || 3000);
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestCounter);

const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10]
});
register.registerMetric(httpRequestDurationMicroseconds);


const client = new PG.Client({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  ssl: false
});


let successfulConnection = false;

async function connectDB() {
  try {
    console.log('Attempting to connect to the database...');
    await client.connect();
    successfulConnection = true;
    console.log('Database connection successful!');
  } catch (err) {
    console.error('Database connection failed:', err.stack);
  }
}

connectDB();

http.createServer(async (req, res) => {
  const end = httpRequestDurationMicroseconds.startTimer({ method: req.method, route: req.url });
  let statusCode = 200;

  try {
    console.log(`Request: ${req.url}`);

    if (req.url === "/api") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");

      let result = null;
      let userAdmin = false;

      if (successfulConnection) {
        try {
          const queryResult = await client.query("SELECT role FROM users LIMIT 1");
          result = queryResult.rows[0];
          userAdmin = result?.role === "admin";
        } catch (error) {
          console.error('Database query failed:', error);
          statusCode = 500;
          successfulConnection = false;
        }
      } else {
        statusCode = 503;
      }

      const data = {
        database: successfulConnection,
        userAdmin: userAdmin
      }

      res.writeHead(statusCode);
      res.end(JSON.stringify(data));

    } else if (req.url === "/metrics") {
      res.setHeader('Content-Type', register.contentType);
      res.writeHead(200);
      res.end(await register.metrics());
      statusCode = 200;

    } else {
      statusCode = 404;
      res.writeHead(statusCode);
      res.end("Not Found");
    }
  } catch (error) {
    console.error('Server error:', error);
    statusCode = 500;
    res.writeHead(statusCode);
    res.end("Internal Server Error");
  } finally {
    end();
    httpRequestCounter.inc({ method: req.method, route: req.url, status_code: statusCode }); 
  }

}).listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
