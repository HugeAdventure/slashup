const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { player } = req.query;
  console.log(`[API] Received request for player: ${player}`);

  if (!player) {
    return res.status(400).json({ error: 'No player specified' });
  }

  let connection;
  try {
    console.log("[API] Connecting to Database...");
    
    connection = await mysql.createConnection({
      host: 'uk02-sql.pebblehost.com',
      user: 'customer_1134473_Slashup',
      password: 'ZXC8^be^+^lVBZ+IIomjAyh9',
      database: 'customer_1134473_Slashup',
      port: 3306,
      connectTimeout: 10000
    });

    console.log("[API] Connected! Fetching stats...");

    const [statsRows] = await connection.execute(
      'SELECT * FROM slashup_stats WHERE name = ?',
      [player]
    );

    if (statsRows.length === 0) {
      console.log("[API] Player not found in DB.");
      await connection.end();
      return res.status(404).json({ error: 'Player not found' });
    }


    const [rankRows] = await connection.execute(
        'SELECT COUNT(*) + 1 as rank FROM slashup_stats WHERE wins > ?',
        [statsRows[0].wins]
    );
    const exactRank = rankRows[0].rank;

    const [matchRows] = await connection.execute(
      'SELECT winner_name, loser_name, match_time FROM slashup_matches WHERE winner_name = ? OR loser_name = ? ORDER BY id DESC LIMIT 5',
      [player, player]
    );

    await connection.end();
    console.log("[API] Success! Sending data.");

    res.status(200).json({
      stats: { ...statsRows[0], rank: exactRank },
      matches: matchRows
    });

  } catch (error) {
    console.error("[API ERROR]", error);
    if(connection) await connection.end();
    res.status(500).json({ error: 'Database Error: ' + error.message });
  }
};
