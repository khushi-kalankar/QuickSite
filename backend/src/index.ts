require("dotenv").config();
import express from "express";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";
import cors from "cors";
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.post("/template", async (req: any, res: any) => {
  try {
    console.log("Request body:", req.body);

    const prompt = req.body.prompt;

    const headers = {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "My App",
    };

    console.log("Making request to OpenRouter...");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          model: "deepseek/deepseek-chat-v3-0324:free",
          messages: [
            {
              role: "system",
              content:
                "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    console.log("OpenRouter response status:", response.status); // Debug log

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", errorText);
      return res.status(500).json({
        error: "External API error",
        details: errorText,
      });
    }

    const resData = await response.json();
    const answer = resData.choices?.[0]?.message?.content?.trim().toLowerCase();
    console.log("AI answer:", answer); // Debug log

    if (answer === "react") {
      return res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      });
    }

    if (answer === "node") {
      return res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      });
    }

    // More detailed error response
    return res.status(400).json({
      error: "Invalid AI response",
      receivedAnswer: answer,
      expectedAnswers: ["react", "node"],
    });
  } catch (error: any) {
    console.error("Server error:", error);
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
});

app.post("/chat", async (req: any, res: any) => {
  const messages = req.body.messages;
  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "My App",
  };
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: [
          {
            role: "system",
            content: `You are QuickSite, an AI assistant that generates code in a specific XML format.

CRITICAL: You must ALWAYS respond with code wrapped in boltArtifact tags. Never use markdown code blocks.

Format your response like this:
<boltArtifact id="project-files" title="Project Files">
<boltAction type="file" filePath="server.js">
const express = require('express');
// your actual code here
</boltAction>
<boltAction type="file" filePath="package.json">
{
  "name": "my-app",
  "dependencies": {}
}
</boltAction>
</boltArtifact>

Rules:
- Always use <boltArtifact> and <boltAction> tags
- Never use markdown code blocks (\`\`\`)
- Put complete, functional code inside boltAction tags
- Use proper file paths in filePath attribute
- Generate complete applications, not basic examples`,
          },
          ...messages,
        ],
        max_tokens: 8000,
        system: getSystemPrompt(), // Make sure this function exists
      }),
    }
  );
  const resData = await response.json();
  const responseText = resData.choices?.[0]?.message?.content;
  res.json({
    response: responseText,
  });
});

app.listen(PORT, () => {
  console.log("Server running on port 3000");
  console.log("API Key configured:", !!process.env.OPENROUTER_API_KEY);
});
