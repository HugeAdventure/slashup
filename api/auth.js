const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { code } = req.query;

  if (!code) return res.status(400).json({ error: 'No code provided' });

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
        'SELECT * FROM slashup_codes WHERE code = ?', 
        [code]
    );

    if (rows.length === 0) {
        await connection.end();
        return res.status(401).json({ success: false, error: 'Invalid code' });
    }

    const uuid = rows[0].uuid;

    const [userRows] = await connection.execute(
        'SELECT name FROM slashup_stats WHERE uuid = ?',
        [uuid]
    );
    
    const name = userRows.length > 0 ? userRows[0].name : "Unknown";

    await connection.execute('DELETE FROM slashup_codes WHERE code = ?', [code]);

    await connection.end();

    res.status(200).json({ success: true, name: name, uuid: uuid });

  } catch (error) {
    if(connection) await connection.end();
    res.status(500).json({ error: error.message });
  }
};
