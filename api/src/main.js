import http from 'node:http';

const port = Number(process.env.API_PORT || 3000);
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.url === '/health') {
    res.end(JSON.stringify({ status: 'ok', service: 'api', version: '0.1.0' }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: 'NOT_FOUND', message: 'API placeholder' }));
});
server.listen(port, '0.0.0.0', () => {
  console.log(`comicdrama-api listening on ${port}`);
});