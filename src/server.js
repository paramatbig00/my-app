const express = require("express");
const path = require("path");
const apiRoutes = require("./routes/api");
const { initDB } = require("./db");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ✅ Redirect root ไป /test6 อัตโนมัติ
app.get("/", (req, res) => {
  res.redirect("/test6");
});

// ✅ หน้า test6
app.get("/test6", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/test6.html"));
});

// ✅ หน้า home (ถ้ามี)
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ✅ ใช้งาน API routes
app.use("/api", apiRoutes);

// ✅ Start server + init DB
app.listen(PORT, async () => {
  await initDB();
  console.log(`🚀 Server running at http://localhost:${PORT}/test6`);
});
