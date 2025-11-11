const express = require("express");
const path = require("path");
const apiRoutes = require("./routes/api");
const { initDB } = require("./db");  

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3003;


app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/test3.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use("/api", apiRoutes);

app.listen(PORT, async () => {
  await initDB(); //  เรียกสร้าง table
  console.log(`Server running at http://localhost:${PORT}`);
});
