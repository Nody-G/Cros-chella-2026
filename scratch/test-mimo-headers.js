const MIMO_API_KEY = "sk-eu4fphmrg3coflpuxnujmiwsov3arxr8c7ynqvvrwotzbb67";
const MIMO_ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions";
const MIMO_MODEL = "mimo-v2.5-pro";

async function testHeader(name, headers) {
  console.log(`\nTesting with header format [${name}]...`);
  try {
    const res = await fetch(MIMO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages: [
          { role: "system", content: "Test" },
          { role: "user", content: "Hello" }
        ],
        max_tokens: 50
      })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (err) {
    console.error("Error:", err);
  }
}

async function run() {
  await testHeader("api-key", { "api-key": MIMO_API_KEY });
  await testHeader("Authorization Bearer", { "Authorization": `Bearer ${MIMO_API_KEY}` });
}

run();
