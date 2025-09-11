require("dotenv").config();
module.exports = {
  PORT: process.env.PORT || 4000,
  DEV_AUTH_ANY: process.env.DEV_AUTH_ANY === "1",
};
