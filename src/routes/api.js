const express = require("express");
const router = express.Router();
const axios = require("axios");
const { pool } = require("../db");
require("dotenv").config();

// ✅ ขั้นตอน 1: ขอ Token จาก eGov
router.get("/init", async (req, res) => {
  try {
    console.log("🔹 เริ่มขอ Token จาก eGov...");

    const { CONSUMER_SECRET, AGENT_ID } = process.env;

    if (!CONSUMER_SECRET || !AGENT_ID) {
      return res.status(400).json({
        success: false,
        message: "Missing ConsumerSecret or AgentID in .env file",
      });
    }

    // 🔹 Step 1: ขอ Token
    const tokenResponse = await axios.get("https://api.egov.go.th/ws/auth/validate", {
      params: { ConsumerSecret: CONSUMER_SECRET, AgentID: AGENT_ID },
    });

    if (!tokenResponse.data?.token) {
      throw new Error("ไม่ได้รับ token จาก eGov API");
    }

    const token = tokenResponse.data.token;
    console.log("✅ ได้ Token แล้ว:", token);

    // 🔹 Step 2: ใช้ Token เรียก Sensitive Data API (ตัวอย่าง: ข้อมูลประชาชน)
    const sensitiveResponse = await axios.get(
      "https://api.egov.go.th/ws/dopa/getCitizenProfile",
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          citizenId: "1101700206181", // ตัวอย่างเลขบัตร สามารถเปลี่ยนให้ dynamic ได้
        },
      }
    );

    const user = sensitiveResponse.data || {};

    // ✅ บันทึกข้อมูลลง table User (พร้อมกัน)
    await pool.query(
      `INSERT INTO "User" (userId, citizenId, firstname, lastname, mobile, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (userId) DO UPDATE 
       SET citizenId = EXCLUDED.citizenId,
           firstname = EXCLUDED.firstname,
           lastname = EXCLUDED.lastname,
           mobile = EXCLUDED.mobile,
           email = EXCLUDED.email`,
      [
        user.userId || "czp-user",
        user.citizenId || "-",
        user.firstname || "-",
        user.lastname || "-",
        user.mobile || "-",
        user.email || "-",
      ]
    );

    console.log("✅ ดึงข้อมูล Sensitive Data สำเร็จ");
    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาด:", err.message);
    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลจาก eGov ได้",
      error: err.message,
    });
  }
});

module.exports = router;

// ✅ บันทึกข้อมูลผู้ใช้ลงฐานข้อมูล
router.post("/saveUser", async (req, res) => {
  try {
    const { citizenId, firstname, lastname, mobile, email } = req.body;

    if (!citizenId) {
      return res.status(400).json({ success: false, message: "Missing citizenId" });
    }

    const userId = `USR-${Date.now()}`; // สร้าง userId ชั่วคราว
    const result = await pool.query(
      `INSERT INTO "User" (userId, citizenId, firstname, lastname, mobile, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, citizenId, firstname, lastname, mobile, email]
    );

    res.json({
      success: true,
      message: "User saved successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error saving user:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to save user",
      error: error.message,
    });
  }
});
