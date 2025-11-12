// ✅ ใช้ axios จาก CDN (จะต้อง include ใน <script> HTML ด้วย)
async function initData() {
  const loader = document.getElementById("loader");
  const card = document.getElementById("userCard");
  const errorMsg = document.getElementById("errorMsg");

  // 🔧 ตั้งค่าคงที่
  const BASE_API = "https://api.egov.go.th/ws";
  const consumerSecret = "izDMfcvMutU"; // ใส่ตรง ๆ ได้เพราะไม่ใช่ secret จริง
  const agentId = "YOUR_AGENT_ID"; // 🔸 ใส่ค่าจริงแทน
  const consumerKey = "YOUR_CONSUMER_KEY"; // 🔸 ใส่ค่าจริงแทน

  const apiAuth = `${BASE_API}/auth/validate`;

  try {
    loader.style.display = "flex";
    card.style.display = "none";
    errorMsg.textContent = "";

    // 🔹 ดึง appId และ mToken จาก CZP SDK หรือ query params
    const params = new URLSearchParams(window.location.search);
    const appId = (window.czpSdk && window.czpSdk.getAppId?.()) || params.get("appId");
    const mToken = (window.czpSdk && window.czpSdk.getToken?.()) || params.get("mToken");

    if (!appId || !mToken) throw new Error("ไม่พบ appId หรือ mToken");

    // ✅ เรียก API validate
    const getAuth = await axios.get(apiAuth, {
      params: {
        ConsumerSecret: consumerSecret,
        AgentID: agentId,
      },
      headers: {
        "Consumer-Key": consumerKey,
        "Content-Type": "application/json",
        Token: mToken,
      },
    });

    if (getAuth.data.success !== true) {
      throw new Error("การตรวจสอบโทเค็นล้มเหลว: " + (getAuth.data.message || "-"));
    }

    // ✅ แสดงผลบนหน้า
    document.getElementById("appId").textContent = appId;
    document.getElementById("mToken").textContent = mToken;
    document.getElementById("testToken").textContent =
      getAuth.data.result || JSON.stringify(getAuth.data);

    loader.style.display = "none";
    card.style.display = "block";
  } catch (err) {
    console.error(err);
    loader.style.display = "none";
    card.style.display = "block";
    errorMsg.textContent = "เกิดข้อผิดพลาด: " + err.message;
  }
}

window.addEventListener("load", initData);
