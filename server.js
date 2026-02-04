// // server.js
// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const { Pool } = require("pg");

// const app = express();
// app.use(express.json());
// // allow your frontend origin during development / set to your deployed origin in production
// app.use(cors({ origin: true }));

// // use DATABASE_URL from env
// const connectionString = process.env.DATABASE_URL;
// if (!connectionString) {
//   console.error("Missing DATABASE_URL environment variable");
//   process.exit(1);
// }

// // Render Postgres often requires ssl with rejectUnauthorized false
// const pool = new Pool({
//   connectionString,
//   ssl: { rejectUnauthorized: false },
// });

// if (pool)
// {
//     console.log("connected to db")
// }
// // ensure table exists
// const ensureTable = async () => {
//   const createQuery = `
//     CREATE TABLE IF NOT EXISTS opson_waitlist (
//       id SERIAL PRIMARY KEY,
//       org_type TEXT,
//       goal TEXT,
//       email TEXT,
//       amount TEXT,
//       created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
//     );
//   `;
//   await pool.query(createQuery);
// };

// app.post("/api/submit", async (req, res) => {
//   try {
//     const { orgType, goal, email, amount } = req.body;

//     // basic validation
//     if (!email || !email.includes("@")) {
//       return res.status(400).json({ ok: false, error: "Valid email required" });
//     }

//     // create table if not exists
//     await ensureTable();

//     const insertQuery = `
//       INSERT INTO opson_waitlist (org_type, goal, email, amount)
//       VALUES ($1, $2, $3, $4)
//       RETURNING id, created_at;
//     `;
//     const { rows } = await pool.query(insertQuery, [
//       orgType || null,
//       goal || null,
//       email,
//       amount || null,
//     ]);

//     return res.json({ ok: true, id: rows[0].id, created_at: rows[0].created_at });
//   } catch (err) {
//     console.error("submit error:", err);
//     return res.status(500).json({ ok: false, error: "Server error" });
//   }
// });

// // health
// app.get("/ping", (req, res) => res.send("pong"));

// const port = process.env.PORT || 3001;
// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const nodemailer = require("nodemailer"); // ✅ ADDED

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

// ✅ ADDED: email transporter (nothing else changed)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

    // ✅ ADDED: send email to Arjun (DB save stays untouched)
    try {
      await transporter.sendMail({
        from: `"OpsOnChain Website" <${process.env.EMAIL_USER}>`,
        to: "arjunpanthula@opsonchain.com",
        subject: "🚀 New Website Registration",
        html: `
          <h2>New Registration</h2>
          <p><strong>Organization Type:</strong> ${orgType || "-"}</p>
          <p><strong>Execution Goal:</strong> ${goal || "-"}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Amount:</strong> ${amount || "-"}</p>
        `,
      });
    } catch (mailErr) {
      console.error("email error:", mailErr);
    }

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
