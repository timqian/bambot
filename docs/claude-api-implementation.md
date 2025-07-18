# Claude API Implementation

## Overview

This document describes the implementation of Claude API integration in the bambot project, providing an alternative AI provider alongside OpenAI for robot control operations.

## Architecture

### Core Components

#### 1. Chat Control (`website/components/playground/chatControl/ChatControl.tsx:50-66`)

- **Dual Provider Support**: Dynamically selects between OpenAI and Anthropic clients
- **Model Detection**: Uses base URL to determine provider (`https://api.anthropic.com/v1` → Claude)
- **Tool Integration**: Includes `keyPress` tool for direct robot control

```typescript
const client = baseURL === "https://api.anthropic.com/v1" ? anthropic : openai;
const model = baseURL === "https://api.anthropic.com/v1" ? modelName : `${modelName}`;
```

#### 2. Settings Management (`website/components/playground/chatControl/SettingsModal.tsx:134,230-231`)

- **Provider Selection**: Dropdown includes "Claude" option
- **Default Model**: `claude-3-5-sonnet-20241022`
- **API Key Management**: Links to Anthropic console for key generation

#### 3. Configuration Storage (`website/lib/chatSettings.ts:6,11,15,20,29,37,42,47`)

- **SSR Safety**: Guards against server-side rendering issues
- **Local Storage**: Persists API keys, models, and configuration locally

## Dependencies

```json
{
  "@ai-sdk/anthropic": "^1.2.12",
  "@ai-sdk/openai": "^1.3.22", 
  "ai": "^4.3.15",
  "zod": "^3.24.1"
}
```

## Configuration

### Setup Process

1. Select "Claude" from model type dropdown
2. Enter Anthropic API key (get from console.anthropic.com)
3. System automatically sets base URL to `https://api.anthropic.com/v1`
4. Default model `claude-3-5-sonnet-20241022` is selected

### Error Handling

- **API Key Validation**: Checks for key presence before requests
- **Enhanced Error Messages**: Displays specific error details instead of generic messages
- **Connection Validation**: Validates provider configuration

## Robot Control Integration

### Tool System

- **keyPress Tool**: Enables Claude to control robots via keyboard simulation
- **System Prompts**: Robot-specific instructions for different control scenarios
- **Real-Time Control**: Direct integration with robot control hooks

### Security

- **Client-Side Only**: API keys stored in browser localStorage
- **No Backend Storage**: No server-side API key exposure
- **URL Validation**: Validates base URLs for different providers

## Recent Changes

The implementation was recently added with modifications to:

- `ChatControl.tsx`: Dual provider support
- `SettingsModal.tsx`: Claude configuration UI
- `chatSettings.ts`: SSR-safe storage
- `package.json`: Anthropic SDK dependency

## Usage

Claude integration allows for alternative AI-powered robot control with the same tool system and configuration management as the existing OpenAI implementation, providing redundancy and choice for users.
