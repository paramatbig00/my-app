const express = require("express");
const router = express.Router();
const { pool } = require("../db");
require("dotenv").config();

// 🧩 MOCK DATA (จำลองข้อมูลผู้ใช้จาก eGov)
const mockSensitiveData = {
  citizenId: "1234567890123",
  firstName: "สมชาย",
  lastName: "ใจดี",
  mobile: "0812345678",
  email: "somchai@example.com",
  userId: "USR-MOCK-001"
};

// ==========================
//  ✅ MOCK MODE /api/login
// ==========================
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

    // 🧠 จำลองว่า token ถูกต้อง และได้ข้อมูลผู้ใช้
    const userData = { ...mockSensitiveData, appId, mToken };

    // ✅ บันทึก (mock) ลงฐานข้อมูล
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
        userData.userId,
        userData.citizenId,
        userData.firstName,
        userData.lastName,
        userData.mobile,
        userData.email,
      ]
    );

    console.log("✅ MOCK user saved:", result.rows[0]);

    res.json({
      success: true,
      message: "ดึงข้อมูลจาก mock สำเร็จ",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("❌ MOCK Error:", err.message);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาด mock data",
      error: err.message,
    });
  }
});

module.exports = router;
