// routes/api.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { pool } = require("../db");
require("dotenv").config();

// ==============================
// ✅ ดึงข้อมูลผู้ใช้จาก CZP จริง
// ==============================
router.post("/login", async (req, res) => {
  try {
    const { appId, mToken } = req.body;

    if (!appId || !mToken) {
      return res.status(400).json({
        success: false,
        message: "Missing appId or mToken",
      });
    }

    console.log("📥 รับข้อมูลจาก frontend:", { appId, mToken });

    // 🔗 เรียก API ของ CZP
    const czpResponse = await axios.post(
      "https://czp.dga.or.th/cportal/api/v3/authen/info",
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "x-app-id": appId,
          "x-token": mToken,
        },
      }
    );

    const userData = czpResponse.data?.data || null;

    if (!userData) {
      throw new Error("ไม่พบข้อมูลผู้ใช้จาก CZP");
    }

    console.log("✅ ได้ข้อมูลผู้ใช้จาก CZP:", userData);

    // ✅ บันทึกข้อมูลลงฐานข้อมูล
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
        userData.userId || null,
        userData.citizenId || null,
        userData.firstName || null,
        userData.lastName || null,
        userData.mobile || null,
        userData.email || null,
      ]
    );

    console.log("💾 บันทึกสำเร็จ:", result.rows[0]);

    res.json({
      success: true,
      message: "ดึงข้อมูลจาก CZP สำเร็จ",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ CZP",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
