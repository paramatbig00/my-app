const express = require("express");
const router = express.Router();
const axios = require("axios");
const { pool } = require("../db");
require("dotenv").config();

router.post("/login", async (req, res) => {
  try {
    const { appId, mToken } = req.body;
    const { CONSUMER_SECRET, AGENT_ID } = process.env;

    if (!appId || !mToken) {
      return res.status(400).json({ success: false, message: "Missing appId or mToken" });
    }

    // ✅ STEP 1 — ขอ Token จาก eGov (ตามคู่มือ)
    const tokenRes = await axios.get(
      "https://api.egov.go.th/ws/auth/validate",
      {
        params: {
          ConsumerSecret: CONSUMER_SECRET,
          AgentID: AGENT_ID
        },
        headers: {
          "Consumer-Key": AGENT_ID,
          "Content-Type": "application/json"
        }
      }
    );

    const token = tokenRes.data?.Result || tokenRes.data?.token;
    if (!token) throw new Error("ไม่ได้รับ Token จาก eGov");

    // ✅ STEP 2 — ดึงข้อมูล Sensitive Data
    const dataRes = await axios.post(
      "https://api.egov.go.th/ws/dga/czp/v1/core/shield/data/deproc",
      { appId, mToken },
      {
        headers: {
          "Consumer-Key": AGENT_ID,
          "Content-Type": "application/json",
          Token: token
        }
      }
    );

    const userData = dataRes.data?.result;
    if (!userData) throw new Error("ไม่พบข้อมูลผู้ใช้จาก eGov");

    // ✅ STEP 3 — บันทึกลง Database
    const userId = `USR-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO "User" (userId, citizenId, firstname, lastname, mobile, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (citizenId) DO UPDATE
       SET firstname = EXCLUDED.firstname,
           lastname = EXCLUDED.lastname,
           mobile = EXCLUDED.mobile,
           email = EXCLUDED.email
       RETURNING *`,
      [
        userId,
        userData.citizenId,
        userData.firstName,
        userData.lastName,
        userData.mobile,
        userData.email
      ]
    );

    res.json({
      success: true,
      message: "ดึงข้อมูลสำเร็จ",
      user: result.rows[0]
    });

  } catch (err) {
    console.error("❌ Error:", err?.response?.data || err.message);

    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาด eGov",
      error: err?.response?.data || err.message
    });
  }
});

module.exports = router;
