// src/routes/api.js
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
      return res.status(400).json({ success: false, message: "Missing appId or mToken" });
    }

    console.log("📥 รับข้อมูลจาก Frontend:", { appId, mToken });

    // 🔗 เรียก API CZP ตามเอกสาร Postman
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

    const result = czpResponse.data;
    if (!result.status) throw new Error(result.message || "CZP API Error");

    const userData = result.data;

    // ✅ บันทึกลงฐานข้อมูล (ถ้ามี)
    try {
      await pool.query(
        `INSERT INTO "User" (userId, citizenId, firstname, lastname, mobile, email)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (citizenId) DO UPDATE
         SET firstname = EXCLUDED.firstname,
             lastname = EXCLUDED.lastname,
             mobile = EXCLUDED.mobile,
             email = EXCLUDED.email`,
        [
          userData.userId,
          userData.citizenId,
          userData.firstName,
          userData.lastName,
          userData.mobile,
          userData.email,
        ]
      );
    } catch (dbErr) {
      console.warn("⚠️ ไม่สามารถบันทึกฐานข้อมูล:", dbErr.message);
    }

    res.json({
      success: true,
      message: "ดึงข้อมูลจาก CZP สำเร็จ",
      user: userData,
    });
  } catch (err) {
    console.error("❌ CZP Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ CZP",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
