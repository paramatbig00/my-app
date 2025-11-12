// src/routes/api.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { pool } = require("../db");
require("dotenv").config();

// ✅ Endpoint: รับ appId และ mToken จาก frontend แล้วเรียก API ของ DGA
router.post("/login", async (req, res) => {
  try {
    const { appId, mToken } = req.body;
    if (!appId || !mToken) {
      return res
        .status(400)
        .json({ success: false, message: "Missing appId or mToken" });
    }

    console.log("📥 รับจาก Frontend:", { appId, mToken });
    console.log("🔑 Consumer-Key:", process.env.CONSUMER_KEY);
    // ✅ เรียก API ตามเอกสารจริง
    const czpResponse = await axios.post(
      "https://api.egov.go.th/ws/dga/czp/uat/v1/core/shield/data/deproc",
      {
        AppId: appId,
        MToken: mToken,
      },
      {
        headers: {
          "Consumer-Key": process.env.CONSUMER_KEY,
          "Content-Type": "application/json",
          Token: mToken,
        },
      }
    );

    const result = czpResponse.data;
    if (result.messageCode !== 200) {
      throw new Error(result.message || "CZP API Error");
    }

    const user = result.result;

    // ✅ บันทึกฐานข้อมูล
    await pool.query(
      `INSERT INTO "User" (userId, citizenId, firstname, lastname, mobile, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (citizenId) DO UPDATE
       SET firstname = EXCLUDED.firstname,
           lastname = EXCLUDED.lastname,
           mobile = EXCLUDED.mobile,
           email = EXCLUDED.email`,
      [
        user.userId,
        user.citizenId,
        user.firstName,
        user.lastName,
        user.mobile,
        user.email,
      ]
    );

    res.json({
      success: true,
      message: "ดึงข้อมูลจาก CZP สำเร็จ",
      user,
    });
  } catch (err) {
    console.error("❌ CZP Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ CZP",
      error: err.response?.data || err.message,
    });
  }
  res.status(500).json({
    success: false,
    message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ CZP",
    error: err.response?.data || err.message,
  });
});

module.exports = router;
