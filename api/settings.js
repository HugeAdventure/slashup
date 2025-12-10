const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { uuid, theme, youtube, twitch, discord, twitter } = req.body;

  if (!uuid) return res.status(400).json({ error: 'Missing UUID' });

  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'uk02-sql.pebblehost.com',
      user: 'customer_1134473_Slashup',
      password: 'ZXC8^be^+^lVBZ+IIomjAyh9',
      database: 'customer_1134473_Slashup',
      port: 3306
    });

    const updates = [];
    const params = [];

    if (theme) { updates.push('site_theme = ?'); params.push(theme); }
    if (youtube !== undefined) { updates.push('social_youtube = ?'); params.push(youtube); }
    if (twitch !== undefined) { updates.push('social_twitch = ?'); params.push(twitch); }
    if (discord !== undefined) { updates.push('social_discord = ?'); params.push(discord); }
    if (twitter !== undefined) { updates.push('social_twitter = ?'); params.push(twitter); }

    if (updates.length > 0) {
        const query = `UPDATE slashup_stats SET ${updates.join(', ')} WHERE uuid = ?`;
        params.push(uuid);
        await connection.execute(query, params);
    }

    await connection.end();
    res.status(200).json({ success: true });

  } catch (error) {
    if(connection) await connection.end();
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
