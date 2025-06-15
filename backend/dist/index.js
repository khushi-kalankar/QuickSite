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
require("dotenv").config();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const response = yield fetch("https://openrouter.ai/api/v1/chat/completions", {
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
            const { value, done } = yield reader.read();
            if (done)
                break;
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter(line => line.startsWith("data:"));
            for (const line of lines) {
                const json = line.replace("data: ", "").trim();
                if (json === "[DONE]")
                    return;
                try {
                    const content = (_c = (_b = (_a = JSON.parse(json).choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.delta) === null || _c === void 0 ? void 0 : _c.content;
                    if (content)
                        process.stdout.write(content);
                }
                catch (e) {
                    // Ignore parse errors
                }
            }
        }
    });
}
main();
