const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { signToken } = require('../middleware/auth');
const query = db.queryAsync;
const withTransaction = db.withTransaction;

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

      await conn.query('INSERT INTO userrole (UserID, RoleID) VALUES (?, ?)', [userId, roleId]);
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

    const rows = await query(
      `SELECT u.UserID, u.UserName, u.Email, u.Password, u.Status, r.RoleName
       FROM users u
       LEFT JOIN userrole ur ON ur.UserID = u.UserID
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
    const rows = await query(
      `SELECT COUNT(*) AS count
       FROM users u
       LEFT JOIN userrole ur ON ur.UserID = u.UserID
       LEFT JOIN roles r ON r.RoleID = ur.RoleID
       WHERE IFNULL(r.RoleName, 'Student') <> 'Admin'`
    );

    return res.json({ count: Number(rows[0]?.count || 0) });
  } catch (error) {
    return next(error);
  }
};
