const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const PORT = 3000;

// DEINE API-ZUGANGSDATEN HIER
const API_KEY = "DEIN_API_KEY";
const API_SECRET = "DEIN_API_SECRET";
const API_PASSPHRASE = "DEINE_PASSPHRASE";

function signRequest(timestamp, method, requestPath, body) {
  const prehash = timestamp + method + requestPath + (body ? JSON.stringify(body) : "");
  return crypto.createHmac("sha256", API_SECRET).update(prehash).digest("hex");
}

app.post("/webhook", async (req, res) => {
  const { signal, pair, entry, leverage } = req.body;

  if (!signal || !pair || !entry || !leverage) {
    return res.status(400).send("Ungültiger Payload.");
  }

  const side = signal === "buy" ? "open_long" : "open_short";
  const timestamp = Date.now().toString();
  const method = "POST";
  const requestPath = "/api/mix/v1/order/placeOrder";
  const body = {
    symbol: pair,
    marginCoin: "USDT",
    size: 0.01,
    side: side,
    orderType: "market",
    price: entry,
    leverage: leverage
  };
  const signature = signRequest(timestamp, method, requestPath, body);

  try {
    const response = await axios.post(
      `https://api.bitget.com${requestPath}`,
      body,
      {
        headers: {
          "ACCESS-KEY": API_KEY,
          "ACCESS-SIGN": signature,
          "ACCESS-TIMESTAMP": timestamp,
          "ACCESS-PASSPHRASE": API_PASSPHRASE,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("Order gesendet:", response.data);
    res.status(200).send("✅ Order erfolgreich.");
  } catch (error) {
    console.error("Fehler beim Senden:", error.response?.data || error.message);
    res.status(500).send("❌ Fehler beim Senden.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook aktiv auf http://localhost:${PORT}/webhook`);
});
