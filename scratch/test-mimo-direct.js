const MIMO_API_KEY = "sk-eu4fphmrg3coflpuxnujmiwsov3arxr8c7ynqvvrwotzbb67";
const MIMO_ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions";
const MIMO_MODEL = "mimo-v2.5-pro";

async function testMimo() {
  console.log("Testing Mimo API endpoint...");
  try {
    const res = await fetch(MIMO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": MIMO_API_KEY,
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages: [
          { role: "system", content: "Tu es un assistant de test. Réponds en JSON : {\"status\": \"ok\"}" },
          { role: "user", content: "Test Mimo" }
        ],
        temperature: 0.3,
        max_tokens: 100
      })
    });

    console.log("HTTP Status:", res.status);
    const text = await res.text();
    console.log("Response Text:", text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testMimo();
