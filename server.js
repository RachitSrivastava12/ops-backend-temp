// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
// allow your frontend origin during development / set to your deployed origin in production
app.use(cors({ origin: true }));

// use DATABASE_URL from env
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL environment variable");
  process.exit(1);
}

// Render Postgres often requires ssl with rejectUnauthorized false
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

if (pool)
{
    console.log("connected to db")
}
// ensure table exists
const ensureTable = async () => {
  const createQuery = `
    CREATE TABLE IF NOT EXISTS opson_waitlist (
      id SERIAL PRIMARY KEY,
      org_type TEXT,
      goal TEXT,
      email TEXT,
      amount TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `;
  await pool.query(createQuery);
};

app.post("/api/submit", async (req, res) => {
  try {
    const { orgType, goal, email, amount } = req.body;

    // basic validation
    if (!email || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "Valid email required" });
    }

    // create table if not exists
    await ensureTable();

    const insertQuery = `
      INSERT INTO opson_waitlist (org_type, goal, email, amount)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at;
    `;
    const { rows } = await pool.query(insertQuery, [
      orgType || null,
      goal || null,
      email,
      amount || null,
    ]);

    return res.json({ ok: true, id: rows[0].id, created_at: rows[0].created_at });
  } catch (err) {
    console.error("submit error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// health
app.get("/ping", (req, res) => res.send("pong"));

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
