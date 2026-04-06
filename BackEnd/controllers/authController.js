const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { signToken } = require('../middleware/auth');
const query = db.queryAsync;
const withTransaction = db.withTransaction;

const USER_ROLE_TABLE_CANDIDATES = ['userrole', 'userroles', 'user_role'];
let cachedUserRoleTable = null;

async function execRows(sql, params = [], conn = null) {
  if (conn) {
    const [rows] = await conn.query(sql, params);
    return rows;
  }
  return query(sql, params);
}

function validateUserRoleTableName(tableName) {
  if (!USER_ROLE_TABLE_CANDIDATES.includes(tableName) && tableName !== 'userrole') {
    throw new Error('Ten bang user-role khong hop le.');
  }
  return tableName;
}

async function findUserRoleTable(conn = null) {
  const placeholders = USER_ROLE_TABLE_CANDIDATES.map(() => '?').join(', ');
  const rows = await execRows(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${placeholders})
     ORDER BY FIELD(TABLE_NAME, ${placeholders})
     LIMIT 1`,
    [...USER_ROLE_TABLE_CANDIDATES, ...USER_ROLE_TABLE_CANDIDATES],
    conn
  );

  return rows[0]?.TABLE_NAME || null;
}

async function createUserRoleTable(conn = null) {
  await execRows(
    `CREATE TABLE IF NOT EXISTS userrole (
      UserID INT NOT NULL,
      RoleID INT NOT NULL,
      PRIMARY KEY (UserID, RoleID),
      KEY idx_userrole_roleid (RoleID),
      CONSTRAINT fk_userrole_user FOREIGN KEY (UserID) REFERENCES users(UserID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_userrole_role FOREIGN KEY (RoleID) REFERENCES roles(RoleID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    [],
    conn
  );
}

async function resolveUserRoleTable(conn = null) {
  if (cachedUserRoleTable) {
    return validateUserRoleTableName(cachedUserRoleTable);
  }

  let tableName = await findUserRoleTable(conn);
  if (!tableName) {
    await createUserRoleTable(conn);
    tableName = 'userrole';
  }

  cachedUserRoleTable = validateUserRoleTableName(tableName);
  return cachedUserRoleTable;
}

function normalizeUser(row) {
  return {
    id: row.UserID,
    username: row.UserName,
    email: row.Email,
    status: row.Status,
    role: row.RoleName || 'Student',
  };
}

exports.register = async (req, res, next) => {
  try {
    const username = String(req.body.username || req.body.UserName || '').trim();
    const email = String(req.body.email || req.body.Email || '').trim().toLowerCase();
    const password = String(req.body.password || req.body.Password || '').trim();

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email, password la bat buoc.' });
    }

    const existed = await query('SELECT UserID FROM users WHERE Email = ? LIMIT 1', [email]);
    if (existed.length) {
      return res.status(409).json({ message: 'Email da ton tai.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await withTransaction(async (conn) => {
      const userRoleTable = await resolveUserRoleTable(conn);

      const [insertUser] = await conn.query(
        'INSERT INTO users (UserName, Email, Password, Status, CreateTime) VALUES (?, ?, ?, ?, NOW())',
        [username, email, hashedPassword, 'Hoat dong']
      );

      const userId = insertUser.insertId;
      const [studentRoleRows] = await conn.query(
        'SELECT RoleID FROM roles WHERE RoleName = ? LIMIT 1',
        ['Student']
      );

      let roleId = studentRoleRows[0]?.RoleID;
      if (!roleId) {
        const [insertRole] = await conn.query('INSERT INTO roles (RoleName) VALUES (?)', ['Student']);
        roleId = insertRole.insertId;
      }

      await conn.query(`INSERT INTO ${userRoleTable} (UserID, RoleID) VALUES (?, ?)`, [userId, roleId]);
      return { userId, roleId };
    });

    return res.status(201).json({
      message: 'Dang ky thanh cong.',
      user: {
        id: created.userId,
        username,
        email,
        role: 'Student',
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.checkLogin = async (req, res, next) => {
  try {
    const email = String(req.body.email || req.body.Email || '').trim().toLowerCase();
    const password = String(req.body.password || req.body.Password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ message: 'Email va mat khau la bat buoc.' });
    }

     const userRoleTable = await resolveUserRoleTable();

    const rows = await query(
      `SELECT u.UserID, u.UserName, u.Email, u.Password, u.Status, r.RoleName
       FROM users u
       LEFT JOIN ${userRoleTable} ur ON ur.UserID = u.UserID
       LEFT JOIN roles r ON r.RoleID = ur.RoleID
       WHERE u.Email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Email hoac mat khau khong dung.' });
    }

    const row = rows[0];
    const valid = await bcrypt.compare(password, row.Password || '');
    if (!valid) {
      return res.status(401).json({ message: 'Email hoac mat khau khong dung.' });
    }

    if (String(row.Status || '').toLowerCase().includes('khoa')) {
      return res.status(403).json({ message: 'Tai khoan da bi khoa.' });
    }

    const user = normalizeUser(row);
    const token = signToken(user);
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000;

    return res.json({
      message: 'Dang nhap thanh cong!',
      token,
      tokenType: 'Bearer',
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        access: user.role === 'Admin' ? 'admin' : 'student',
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.countNonAdmins = async (_req, res, next) => {
  try {
    const userRoleTable = await resolveUserRoleTable();

    const rows = await query(
      `SELECT COUNT(*) AS count
       FROM users u
       LEFT JOIN ${userRoleTable} ur ON ur.UserID = u.UserID
       LEFT JOIN roles r ON r.RoleID = ur.RoleID
       WHERE IFNULL(r.RoleName, 'Student') <> 'Admin'`
    );

    return res.json({ count: Number(rows[0]?.count || 0) });
  } catch (error) {
    return next(error);
  }
};
