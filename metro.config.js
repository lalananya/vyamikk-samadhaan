const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);

// Makes dev-networks less fussy
config.server = config.server || {};
const prev = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (mw, srv) => {
  const base = prev ? prev(mw, srv) : mw;
  return (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return base(req, res, next);
  };
};
module.exports = config;
