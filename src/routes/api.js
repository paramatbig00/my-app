const express = require("express");
const router = express.Router();
const axios = require("axios");
const { pool } = require("../db");
require("dotenv").config();

// ✅ ใช้เมื่อ frontend ส่ง appId และ mToken เข้ามา
router.post("/login", async (req, res) => {
  try {
    const { appId, mToken } = req.body;
    const { CONSUMER_SECRET, AGENT_ID } = process.env;

    if (!appId || !mToken) {
      return res.status(400).json({ success: false, message: "Missing appId or mToken" });
    }
    console.log("🔑 รับ appId และ mToken:", { appId, mToken });
    console.log("🔑 ใช้ AGENT_ID และ CONSUMER_SECRET:", { AGENT_ID, CONSUMER_SECRET });
    // STEP 1: ขอ token จาก eGov
    const tokenRes = await axios.get("https://api.egov.go.th/ws/auth/validate", {
      params: { ConsumerSecret: CONSUMER_SECRET, AgentID: AGENT_ID },
      headers: {
        "Consumer-Key": AGENT_ID,
        "Content-Type": "application/json",
      },
    });
    
    const token = tokenRes.data?.Result || tokenRes.data?.token;
    if (!token) throw new Error("ไม่ได้รับ token จาก eGov");

    // STEP 2: ใช้ appId และ mToken เพื่อดึงข้อมูลจริง
    const dataRes = await axios.post(
      "https://api.egov.go.th/ws/dga/czp/uat/v1/core/shield/data/deproc",
      { appId, mToken },
      {
        headers: {
          "Consumer-Key": AGENT_ID,
          "Content-Type": "application/json",
          Token: token,
        },
      }
    );

    const userData = dataRes.data?.result;
    if (!userData) throw new Error("ไม่พบข้อมูลผู้ใช้จาก eGov");

    // STEP 3: บันทึกข้อมูลผู้ใช้ลงฐานข้อมูล
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
        userData.citizenId || "",
        userData.firstName || "",
        userData.lastName || "",
        userData.mobile || "",
        userData.email || "",
      ]
    );

    console.log("✅ บันทึกผู้ใช้เรียบร้อย:", result.rows[0]);

    res.json({
      success: true,
      message: "Login และดึงข้อมูลผู้ใช้สำเร็จ",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลจาก eGov ได้",
      error: err.message,
    });
  }
});

module.exports = router;
