require("dotenv").config();
const { dbConnnectonMySql } = require("../config/db/connection");
const runSeed = require("./seed");

(async () => {
  await dbConnnectonMySql();
  await runSeed();
  process.exit();
})();
