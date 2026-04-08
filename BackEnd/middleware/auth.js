const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'tri16102004';

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
    },
    SECRET_KEY,
    { expiresIn: '8h' }
  );
}

function parseToken(req) {
  const auth = req.headers.authorization || '';
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) {
    return null;
  }
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    return null;
  }
}

function optionalAuth(req, _res, next) {
  const decoded = parseToken(req);
  if (decoded) {
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email,
      username: decoded.username,
    };
  }
  next();
}

function requireAuth(req, res, next) {
  const decoded = parseToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = {
    id: decoded.sub,
    role: decoded.role,
    email: decoded.email,
    username: decoded.username,
  };
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    const decoded = req.user || parseToken(req);
    if (!decoded) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const role = decoded.role || req.user?.role;
    if (!roles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}

module.exports = {
  signToken,
  optionalAuth,
  requireAuth,
  requireRole,
};
