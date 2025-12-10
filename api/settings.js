const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { uuid, theme } = req.body;

  if (!uuid || !theme) return res.status(400).json({ error: 'Missing data' });

  const allowedThemes = ['default', 'neon', 'gold', 'matrix'];
  if (!allowedThemes.includes(theme)) return res.status(400).json({ error: 'Invalid theme' });

  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'uk02-sql.pebblehost.com',
      user: 'customer_1134473_Slashup',
      password: 'ZXC8^be^+^lVBZ+IIomjAyh9',
      database: 'customer_1134473_Slashup',
      port: 3306
    });

    await connection.execute(
        'UPDATE slashup_stats SET site_theme = ? WHERE uuid = ?',
        [theme, uuid]
    );

    await connection.end();
    res.status(200).json({ success: true });

  } catch (error) {
    if(connection) await connection.end();
    res.status(500).json({ error: error.message });
  }
};
