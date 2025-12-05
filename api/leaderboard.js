const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const page = parseInt(req.query.page) || 1;
  const limit = 20; 
  const offset = (page - 1) * limit;

  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'uk02-sql.pebblehost.com',
      user: 'customer_1134473_Slashup',
      password: 'ZXC8^be^+^lVBZ+IIomjAyh9',
      database: 'customer_1134473_Slashup',
      port: 3306
    });

    const [countRows] = await connection.execute('SELECT COUNT(*) as total FROM slashup_stats');
    const totalPlayers = countRows[0].total;

    const [rows] = await connection.execute(
      'SELECT name, wins, kdr, streak FROM slashup_stats ORDER BY wins DESC LIMIT ? OFFSET ?',
      [limit.toString(), offset.toString()]
    );

    await connection.end();

    res.status(200).json({
      players: rows,
      totalPages: Math.ceil(totalPlayers / limit),
      currentPage: page
    });

  } catch (error) {
    if(connection) await connection.end();
    res.status(500).json({ error: error.message });
  }
};
