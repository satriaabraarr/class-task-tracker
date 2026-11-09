const jwt = require("jsonwebtoken");
const config = require("../config");
const prisma = require("../lib/prisma");
const { unauthorized, forbidden } = require("../lib/errors");

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function setAuthCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax",
    maxAge: config.cookieMaxAgeMs,
    path: "/",
  });
}

function clearAuthCookie(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax",
    path: "/",
  });
}

/** Memverifikasi token dan memuat pengguna dari database (role tidak dipercaya dari klien). */
async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    const bearer = header && header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = req.cookies?.[config.cookieName] || bearer;
    if (!token) throw unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw unauthorized("Sesi tidak valid atau sudah kedaluwarsa");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, classId: true },
    });
    if (!user) throw unauthorized("Sesi tidak valid atau sudah kedaluwarsa");

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
    next();
  };

module.exports = { signToken, setAuthCookie, clearAuthCookie, requireAuth, requireRole };
