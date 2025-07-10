<a href="https://bambot.org">
  <img width="1130" alt="Screenshot of bambot.org" src="https://github.com/user-attachments/assets/bcf347d7-5d76-4021-8a99-bb4515323fe0" />
</a>

<br/>
<br/>
<br/>

<p align="center">
  <a href="https://discord.gg/Fq2gvSMyRJ"><img src="https://flat.badgen.net/static/chat/on%20discord" alt="Discord"></a>
  <a href="https://i.v2ex.co/1U6OSqswl.jpeg"><img src="https://flat.badgen.net/static/chat/on%20wechat?color=green" alt="WeChat"></a>
  <a href="https://x.com/tim_qian"><img src="https://flat.badgen.net/static/follow/on%20X?color=black" alt="X"></a>
  <a href="https://deepwiki.com/timqian/bambot"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

# [Bambot](https://bambot.org)

Play with open-source, low-cost AI robots 🤖

## 🚀 Getting Started

### Prerequisites

- **Node.js** (≥12.17.0)
- **Bun** (recommended) or **npm**
- **Chrome/Edge browser** (Web Serial API required)

### Quick Setup

```bash
# Clone repository
git clone https://github.com/timqian/bambot.git
cd bambot

# Install Task runner (if not installed)
brew install go-task/tap/go-task  # macOS
# or visit https://taskfile.dev/installation/

# Setup and start
task setup
task dev
```

### Manual Installation

```bash
cd website
bun install --force  # or npm install
npm run dev
```

**Access**: Open `http://localhost:3000` in Chrome or Edge

### Control Modes

- **🎮 Keyboard**: WASD/Arrow keys for movement, letter keys for joints
- **🤖 Leader-Follower**: Connect two robots for real-time copying
- **💬 AI Chat**: Natural language robot control

### Development Commands

```bash
task dev          # Start development server
task build        # Build for production
task lint         # Code linting
task type-check   # TypeScript validation
task test         # Run all tests
task clean        # Clean build artifacts
```

### Hardware Connection (Optional)

1. Connect robot via USB
2. Click "Connect" in web interface
3. Select serial port
4. Choose control mode

**Supported Robots**: SO-ARM100, Bambot v0, Unitree Go2/G1, STS3215

## Demo Video

<a href="https://x.com/Tim_Qian/status/1901952877243122014"> <img alt="Bambot, open source, low-cost humanoid \($300\)" src="https://github.com/user-attachments/assets/bc9536e2-1fa6-4cb5-99f3-15a794bf09cf" width="600" style="height:auto;" ></a>
