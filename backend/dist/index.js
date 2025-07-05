"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const express_1 = __importDefault(require("express"));
const prompts_1 = require("./prompts");
const node_1 = require("./defaults/node");
const react_1 = require("./defaults/react");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post("/template", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
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
        const response = yield fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                model: "deepseek/deepseek-chat-v3-0324:free",
                messages: [
                    {
                        role: "system",
                        content: "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            }),
        });
        console.log("OpenRouter response status:", response.status); // Debug log
        if (!response.ok) {
            const errorText = yield response.text();
            console.error("OpenRouter API error:", errorText);
            return res.status(500).json({
                error: "External API error",
                details: errorText,
            });
        }
        const resData = yield response.json();
        const answer = (_d = (_c = (_b = (_a = resData.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim().toLowerCase();
        console.log("AI answer:", answer); // Debug log
        if (answer === "react") {
            return res.json({
                prompts: [
                    prompts_1.BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [react_1.basePrompt],
            });
        }
        if (answer === "node") {
            return res.json({
                prompts: [
                    prompts_1.BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${node_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [node_1.basePrompt],
            });
        }
        // More detailed error response
        return res.status(400).json({
            error: "Invalid AI response",
            receivedAnswer: answer,
            expectedAnswers: ["react", "node"],
        });
    }
    catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({
            error: "Server error",
            message: error.message,
        });
    }
}));
app.post("/chat", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const messages = req.body.messages;
    const headers = {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "My App",
    };
    const response = yield fetch("https://openrouter.ai/api/v1/chat/completions", {
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
            system: (0, prompts_1.getSystemPrompt)(), // Make sure this function exists
        }),
    });
    const resData = yield response.json();
    const responseText = (_c = (_b = (_a = resData.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content;
    res.json({
        response: responseText,
    });
}));
app.listen(3000, () => {
    console.log("Server running on port 3000");
    console.log("API Key configured:", !!process.env.OPENROUTER_API_KEY);
});
