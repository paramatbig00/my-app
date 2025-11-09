const express = require("express");
const router = express.Router();
const axios = require("axios");
const { pool } = require("../db");
require("dotenv").config();

// ✅ ขั้นตอน 1: ขอ Token จาก eGov (ส่งกลับไปให้ frontend)
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

    // 🔹 Step 1: ขอ Token จาก eGov
    const tokenResponse = await axios.get("https://api.egov.go.th/ws/auth/validate", {
      params: { ConsumerSecret: CONSUMER_SECRET, AgentID: AGENT_ID },
    });

    const token = tokenResponse.data?.token;

    if (!token) {
      throw new Error("ไม่ได้รับ token จาก eGov API");
    }

    console.log("✅ ได้ Token แล้ว:", token);

    // ✅ ส่ง token กลับไปให้ frontend ใช้กับ CZP SDK
    res.json({
      success: true,
      user: { token },
    });

  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาด:", err.message);
    res.status(500).json({
      success: false,
      message: "ไม่สามารถขอ Token จาก eGov ได้",
      error: err.message,
    });
  }
});

// ✅ บันทึกข้อมูลผู้ใช้ลงฐานข้อมูล (Frontend ส่งมาหลังจากดึงจาก CZP SDK แล้ว)
router.post("/saveUser", async (req, res) => {
  try {
    const { citizenId, firstname, lastname, mobile, email } = req.body;

    if (!citizenId) {
      return res.status(400).json({ success: false, message: "Missing citizenId" });
    }

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
      [userId, citizenId, firstname, lastname, mobile, email]
    );

    console.log("💾 บันทึกข้อมูลผู้ใช้เรียบร้อย:", result.rows[0]);

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

module.exports = router;
