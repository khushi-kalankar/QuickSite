import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

export function Home() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate("/builder", { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background animation layer */}
      <div className="absolute inset-0 z-0">
        <BackgroundGradientAnimation />
      </div>
      
      {/* Content layer */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Wand2 className="w-12 h-12 text-blue-400" />
            </div>
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-300 to-purple-900 mb-4">
              QuickSite
            </h1>
            <p className="text-lg text-gray-300">
              Fast website prototyping made simple. Test layouts and
              functionality easily. Save time in your development process.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg shadow-lg p-6">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the website you want to build..."
                className="w-full h-32 p-4 bg-black/80 text-gray-100 border focus:outline-1 focus:border-transparent focus:outline-cyan-400 border-gray-700 rounded-3xl placeholder-gray-500"
              />
              <button
                type="submit"
                className="w-full mt-10 bg-blue-400 text-gray-100 py-3 px-6 rounded-full font-medium hover:bg-blue-700 transition-colors"
              >
                Generate Website
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}