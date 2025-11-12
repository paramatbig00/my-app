// src/routes/api.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { pool } = require("../db");
require("dotenv").config();

// ✅ Endpoint: รับ appId และ mToken จาก frontend แล้วเรียก API ของ DGA
router.post("/login", async (req, res) => {
  console.log("🚀 [START] เริ่มต้นกระบวนการ /api/login");

  try {
    // ===== [1] ตรวจสอบข้อมูลที่รับจาก frontend =====
    console.log("📦 [STEP 1] รับข้อมูลจาก frontend:", req.body);

    const { appId, mToken } = req.body;
    if (!appId || !mToken) {
      console.warn("⚠️ [WARN] Missing appId หรือ mToken");
      return res
        .status(400)
        .json({ success: false, message: "Missing appId or mToken" });
    }

    console.log("✅ [STEP 1] ข้อมูลที่รับมา:", { appId, mToken });

    // ===== [2] เตรียม header และเรียก API =====
    const apiUrl =
      "https://api.egov.go.th/ws/dga/czp/uat/v1/core/shield/data/deproc";

    const headers = {
      "Consumer-Key": process.env.CONSUMER_KEY,
      "Content-Type": "application/json",
      Token: mToken,
    };

    console.log("🌐 [STEP 2] กำลังเรียก API DGA...");
    console.log("🔗 Endpoint:", apiUrl);
    console.log("🧩 Headers:", headers);
    console.log("📤 Body:", { AppId: appId, MToken: mToken });

    const czpResponse = await axios.post(
      apiUrl,
      { AppId: appId, MToken: mToken },
      { headers }
    );

    console.log("📥 [STEP 2] ได้รับ Response จาก DGA แล้ว");
    console.log("🧾 Response Data:", czpResponse.data);

    // ===== [3] ตรวจสอบผลลัพธ์จาก API =====
    const result = czpResponse.data;
    if (result.messageCode !== 200) {
      console.error("❌ [STEP 3] DGA API ส่ง Error:", result);
      throw new Error(result.message || "CZP API Error");
    }

    const user = result.result;
    console.log("✅ [STEP 3] ดึงข้อมูลผู้ใช้สำเร็จ:", user);

    // ===== [4] บันทึกข้อมูลลงฐานข้อมูล =====
    try {
      console.log("💾 [STEP 4] กำลังบันทึกข้อมูลผู้ใช้ลงฐานข้อมูล...");

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

      console.log("✅ [STEP 4] บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว");
    } catch (dbErr) {
      console.warn("⚠️ [DB WARN] เกิดข้อผิดพลาดในการบันทึกฐานข้อมูล:", dbErr.message);
    }

    // ===== [5] ส่งผลลัพธ์กลับไปยัง frontend =====
    console.log("📤 [STEP 5] ส่งข้อมูลกลับไป frontend...");
    res.json({
      success: true,
      message: "ดึงข้อมูลจาก CZP สำเร็จ",
      user,
    });

    console.log("🎉 [DONE] ดำเนินการสำเร็จสมบูรณ์\n--------------------------------------");
  } catch (err) {
    // ===== [ERROR HANDLER] =====
    console.error("💥 [ERROR] เกิดข้อผิดพลาดในการเชื่อมต่อกับ CZP");
    console.error("📋 รายละเอียด:", err.response?.data || err.message);

    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ CZP",
      error: err.response?.data || err.message,
    });

    console.log("🚫 [END] จบการทำงานเนื่องจากเกิดข้อผิดพลาด\n--------------------------------------");
  }
});

module.exports = router;
