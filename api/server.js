const express = require("express");
const cors = require("cors");
const { PORT, DEV_AUTH_ANY } = require("./config");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// tiny in-memory store (dev only)
const users = new Map();
const normalizePhone = (s = "") => String(s).replace(/\D/g, "").slice(-10);
const mkUser = (phone) => ({
  id: phone,
  phone,
  name: `Dev ${phone.slice(-4)}`,
  role: "pro",
  createdAt: Date.now(),
});

app.use((req, _res, next) => {
  console.log("→", req.method, req.url);
  next();
});

app.get("/health", (_req, res) =>
  res.json({ ok: true, ts: Date.now(), DEV_AUTH_ANY }),
);

// IMPORTANT: login BEFORE auth middleware
app.post("/auth/login", (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const totp = String(req.body?.totp || "");
  if (!/^\d{10}$/.test(phone))
    return res.status(400).json({ error: "phone must be 10 digits" });

  if (DEV_AUTH_ANY && totp === "000000") {
    if (!users.has(phone)) users.set(phone, mkUser(phone));
    return res.json({ token: `dev:${phone}`, user: users.get(phone) });
  }
  return res.status(401).json({ error: "invalid otp (dev expects 000000)" });
});

function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : hdr;
  if (token.startsWith("dev:")) {
    const phone = normalizePhone(token.slice(4));
    if (!/^\d{10}$/.test(phone))
      return res.status(401).json({ error: "bad dev token" });
    if (!users.has(phone) && DEV_AUTH_ANY) users.set(phone, mkUser(phone));
    req.user = users.get(phone);
    return next();
  }
  return res.status(401).json({ error: "unauthorized" });
}

app.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
app.post("/user/role", requireAuth, (req, res) => {
  const role = String(req.body?.role || "");
  if (!["pro", "org"].includes(role))
    return res.status(400).json({ error: "role must be pro|org" });
  const u = users.get(req.user.phone);
  u.role = role;
  users.set(u.phone, u);
  res.json({ ok: true, user: u });
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`API on http://0.0.0.0:${PORT} DEV_AUTH_ANY=${DEV_AUTH_ANY}`),
);
