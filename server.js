const http = require('http');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT || 443);

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: Number(process.env.PGPORT || 5432),
      ssl: { rejectUnauthorized: false },
    };

const pool = new Pool(poolConfig);

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product (
      product_id UUID PRIMARY KEY,
      product_name TEXT NOT NULL,
      created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getDbStatus() {
  try {
    const result = await pool.query('SELECT current_database() AS db, current_user AS user');
    return {
      connected: true,
      database: result.rows[0].db,
      user: result.rows[0].user,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/products') {
    try {
      const result = await pool.query('SELECT product_id, product_name, created_date FROM product ORDER BY created_date DESC');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ products: result.rows }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (method === 'POST' && url === '/products') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      let parsedBody = {};

      try {
        parsedBody = body ? JSON.parse(body) : {};
      } catch {
        parsedBody = { raw: body };
      }

      const productName = parsedBody.product_name || parsedBody.name;

      if (!productName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'product_name is required' }));
        return;
      }

      try {
        const result = await pool.query(
          'INSERT INTO product (product_id, product_name) VALUES ($1, $2) RETURNING product_id, product_name, created_date',
          [require('crypto').randomUUID(), productName]
        );

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Product created', product: result.rows[0] }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  if (method === 'GET' && url === '/') {
    const dbStatus = await getDbStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hello from the Node.js API', database: dbStatus }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Not found' }));
});

(async () => {
  try {
    await initDatabase();
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  }
})();
