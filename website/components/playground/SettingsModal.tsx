import React, { useRef, useEffect, useState } from "react";
import {
  getApiKey,
  setApiKey,
  getBaseURL,
  setBaseURL,
  getSystemPrompt,
  setSystemPrompt,
  getModel,
  setModel,
} from "../../lib/settings";

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  robotName?: string;
  systemPrompt?: string; // <-- Add this line
}

export function SettingsModal({
  show,
  onClose,
  robotName,
  systemPrompt: configSystemPrompt, // <-- Add this line
}: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const [apiKey, setApiKeyState] = useState("");
  const [baseURL, setBaseURLState] = useState("");
  const [systemPrompt, setSystemPromptState] = useState("");
  const [model, setModelState] = useState("");

  type ModelType = "OpenAI" | "Ollama" | "Custom";
  const [modelType, setModelType] = useState<ModelType>("OpenAI");
  const [showUseDefaultPrompt, setShowUseDefaultPrompt] = useState(false);

  // Auto-detect type and set recommended defaults
  useEffect(() => {
    if (show) {
      const base = getBaseURL();
      setApiKeyState(getApiKey());
      if (base === "https://api.openai.com/v1/" || base === "" || base == null) {
        setModelType("OpenAI");
        setBaseURLState("https://api.openai.com/v1/");
        setModelState(getModel() || "gpt-4.1-nano");
      } else if (base === "http://localhost:11434/v1") {
        setModelType("Ollama");
        setBaseURLState("http://localhost:11434/v1");
        setModelState(getModel() || "mistral-small3.1");
      } else {
        setModelType("Custom");
        setBaseURLState(base);
        setModelState(getModel());
      }
      setSystemPromptState(
        getSystemPrompt(robotName) || configSystemPrompt || ""
      );
      const localPrompt = getSystemPrompt(robotName) || "";
      const configPrompt = configSystemPrompt || "";
      // Only show button if localPrompt is not empty and differs from configPrompt
      setShowUseDefaultPrompt(
        localPrompt !== "" && localPrompt !== configPrompt && !!configPrompt
      );
    }
  }, [show, robotName, configSystemPrompt]);

  // When switching LLM type, only change Base URL, keep other values unchanged
  const handleModelTypeChange = (type: ModelType) => {
    setModelType(type);
    if (type === "OpenAI") {
      setBaseURLState("https://api.openai.com/v1/");
    } else if (type === "Ollama") {
      setBaseURLState("http://localhost:11434/v1");
    } else {
      setBaseURLState(getBaseURL() || "");
    }
  };

  useEffect(() => {
    if (!show) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show, onClose]);

  if (!show) return null;

  const handleSave = () => {
    setApiKey(apiKey);
    setBaseURL(baseURL);
    // Only save system prompt if there is already a prompt in local storage (for this robotName)
    const localPrompt = getSystemPrompt(robotName) || "";
    if (localPrompt !== "") {
      setSystemPrompt(systemPrompt, robotName);
    }
    setModel(model);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="bg-zinc-800 p-6 rounded-lg shadow-xl w-96 max-w-full lg:w-[500px] xl:w-[600px] mx-4"
      >
        {/* LLM type selection - options on the right */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xl font-bold text-white">LLM:</span>
          <select
            value={modelType}
            onChange={(e) => handleModelTypeChange(e.target.value as ModelType)}
            className="p-1 rounded bg-zinc-700 text-white outline-none text-base font-semibold ml-4"
          >
            <option value="OpenAI">OpenAI</option>
            <option value="Ollama">Ollama</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
        {/* LLM description */}
        <div className="mb-2 text-xs text-zinc-300 text-right">
          {modelType === "OpenAI" && (
            <>
              Get your OpenAI API key at
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-300 ml-1"
              >
                https://platform.openai.com/api-keys
              </a>
              .<br />
              The API Key is stored only in your browser.
            </>
          )}
          {modelType === "Ollama" && (
            <>
              Local Ollama does not require an API Key.
              <br />
              Make sure Ollama service is running locally.
              <br />
              Download Ollama at https://ollama.com/download
            </>
          )}
          {modelType === "Custom" && (
            <>Any OpenAI compatible LLM can be used here.</>
          )}
        </div>
        {/* API Key */}
        <div className="flex items-center mb-4 ml-4">
          <label className="text-white font-medium flex items-center mr-2 whitespace-nowrap">
            API Key:
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            placeholder={modelType === "Ollama" ? "" : "sk-..."}
            className="flex-1 p-2 rounded bg-zinc-700 text-white outline-none"
          />
        </div>
        {/* Base URL */}
        <div className="flex items-center mb-4 ml-4">
          <label className="text-white font-medium mr-2 whitespace-nowrap">
            Base URL:
          </label>
          <input
            type="text"
            value={baseURL}
            onChange={(e) => setBaseURLState(e.target.value)}
            placeholder={
              modelType === "OpenAI"
                ? "Not required"
                : modelType === "Ollama"
                ? "http://localhost:11434/v1"
                : "http://your-custom-endpoint/v1"
            }
            className="flex-1 p-2 rounded bg-zinc-700 text-white outline-none"
          />
        </div>
        {/* Model */}
        <div className="flex items-center mb-4 ml-4">
          <label className="text-white font-medium mr-2 whitespace-nowrap">
            Model:
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModelState(e.target.value)}
            placeholder={
              modelType === "Ollama"
                ? "mistral-small3.1"
                : modelType === "OpenAI"
                ? "gpt-4.1-nano"
                : ""
            }
            className="flex-1 p-2 rounded bg-zinc-700 text-white outline-none"
          />
        </div>
        {/* Divider */}
        <hr className="my-4 border-zinc-600" />
        {/* System Prompt Section */}
        <div>
          <div className="mb-2 flex items-center">
            <span className="block text-xl font-bold text-white">
              System Prompt:
            </span>
            {showUseDefaultPrompt && (
              <button
                className="ml-3 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                onClick={() => {
                  if (
                    window.confirm(
                      "Your prompt will be replaced with the default prompt. Please copy your current prompt if you want to save it."
                    )
                  ) {
                    setSystemPromptState(configSystemPrompt || "");
                    setSystemPrompt(configSystemPrompt || "", robotName);
                    setShowUseDefaultPrompt(false);
                  }
                }}
                title="Use default prompt"
              >
                Use default prompt
              </button>
            )}
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPromptState(e.target.value)}
            placeholder="System prompt for the AI model"
            rows={6}
            className="w-full p-2 rounded bg-zinc-700 text-white mb-4 outline-none min-h-[80px] text-base"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="bg-zinc-600 hover:bg-zinc-500 text-white px-4 py-2 rounded"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
