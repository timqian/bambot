const API_KEY = "api_key";
const BASE_URL = "base_url";
const MODEL = "model";

export function getApiKeyFromLocalStorage(): string {
  return localStorage.getItem(API_KEY) || "";
}

export function setApiKeyToLocalStorage(key: string) {
  localStorage.setItem(API_KEY, key);
}

export function getBaseURLFromLocalStorage(): string {
  return localStorage.getItem(BASE_URL) || "";
}

export function setBaseURLToLocalStorage(url: string) {
  localStorage.setItem(BASE_URL, url);
}

function systemPromptKey(robotName?: string) {
  return robotName ? `system_prompt_${robotName}` : "system_prompt";
}

export function getSystemPromptFromLocalStorage(robotName?: string): string {
  return localStorage.getItem(systemPromptKey(robotName)) || "";
}

export function setSystemPromptToLocalStorage(
  prompt: string,
  robotName?: string
) {
  localStorage.setItem(systemPromptKey(robotName), prompt);
}

export function getModelFromLocalStorage(): string {
  return localStorage.getItem(MODEL) || "";
}

export function setModelToLocalStorage(model: string) {
  localStorage.setItem(MODEL, model);
}

// 后续可以添加更多设置项的 get/set 方法
