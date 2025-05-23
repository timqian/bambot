const API_KEY = "api_key";
const BASE_URL = "base_url";
const MODEL = "model";

export function getApiKey(): string {
  return localStorage.getItem(API_KEY) || "";
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY, key);
}

export function getBaseURL(): string {
  return localStorage.getItem(BASE_URL) || "";
}

export function setBaseURL(url: string) {
  localStorage.setItem(BASE_URL, url);
}

function systemPromptKey(robotName?: string) {
  return robotName ? `system_prompt_${robotName}` : "system_prompt";
}

export function getSystemPrompt(robotName?: string): string {
  return localStorage.getItem(systemPromptKey(robotName)) || "";
}

export function setSystemPrompt(prompt: string, robotName?: string) {
  localStorage.setItem(systemPromptKey(robotName), prompt);
}

export function getModel(): string {
  return localStorage.getItem(MODEL) || "";
}

export function setModel(model: string) {
  localStorage.setItem(MODEL, model);
}

// 后续可以添加更多设置项的 get/set 方法
