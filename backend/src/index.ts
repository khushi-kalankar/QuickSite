require("dotenv").config();

async function main() {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat-v3-0324:free",
      messages: [
        {
          role: "user",
          content: "Write the css code for a simple todo web app",
        },
      ],
      stream: true,
    }),
  });

  if (!response.body) {
    console.error("Response body is null. Cannot stream.");
    return;
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(line => line.startsWith("data:"));

    for (const line of lines) {
      const json = line.replace("data: ", "").trim();
      if (json === "[DONE]") return;
      try {
        const content = JSON.parse(json).choices?.[0]?.delta?.content;
        if (content) process.stdout.write(content);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
}

main();
