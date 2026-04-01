const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'WEBKHOAHOCON',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.queryAsync = async (sql, params = []) => {
  const [rows] = await pool.promise().query(sql, params);
  return rows;
};

pool.withTransaction = async (work) => {
  const connection = await pool.promise().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Loi ket noi MySQL:', err.message);
    return;
  }
  console.log('Ket noi MySQL thanh cong!');
  connection.release();
});

module.exports = pool;
