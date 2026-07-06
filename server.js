const http = require('http');

const PORT = Number(process.env.PORT || 443);

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hello from the Node.js API', method: 'GET' }));
    return;
  }

  if (method === 'POST' && url === '/') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      let parsedBody = {};

      try {
        parsedBody = body ? JSON.parse(body) : {};
      } catch {
        parsedBody = { raw: body };
      }

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'POST received', data: parsedBody }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
