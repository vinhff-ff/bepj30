const bcrypt = require("bcryptjs");
const { env } = require("../config/env");

function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.bcryptSaltRounds);
}

function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = { hashPassword, comparePassword };
