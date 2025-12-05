const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json([]);
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'uk02-sql.pebblehost.com',
      user: 'customer_1134473_Slashup',
      password: 'ZXC8^be^+^lVBZ+IIomjAyh9',
      database: 'customer_1134473_Slashup',
      port: 3306
    });

    const [rows] = await connection.execute(
      'SELECT name FROM slashup_stats WHERE name LIKE ? LIMIT 5',
      [q + '%'] 
    );

    await connection.end();
    res.status(200).json(rows);

  } catch (error) {
    if(connection) await connection.end();
    res.status(500).json({ error: error.message });
  }
};
