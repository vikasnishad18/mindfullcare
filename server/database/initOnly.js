require("dotenv").config();

const { connectDB, closeDB } = require("../config/db");
const initDB = require("./initDB");

async function main() {
  await connectDB();
  await initDB();
  await closeDB();
}

main().catch((err) => {
  console.error("DB init failed:", err);
  process.exitCode = 1;
});
