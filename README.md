---

# 🚀 Getting Started

This guide walks you through the steps to set up and run the required servers for your project.

---

## 1. 📥 Download and Setup the Toolbox

1. Download **toolbox.exe** from the official GitHub release page:
   👉 [GenAI Toolbox Releases](https://github.com/googleapis/genai-toolbox/releases)

2. Create a new directory named `mcp-toolbox`.

3. Move the downloaded **toolbox.exe** into the `mcp-toolbox` directory.

---

## 2. ⚙️ Configure Your Environment

1. Inside the `mcp-toolbox` directory, create a new file named `.env`.

2. Add any required environment variables to this `.env` file.

---

## 3. ▶️ Run the Servers

Once everything is set up, you’ll need to start **two servers** in separate terminal windows.

### 🔹 Start the MCP Server

From inside the `mcp-toolbox` directory, run:

```bash
toolbox.exe --tools-file="tools.yaml" --ui
```

### 🔹 Start the ADK

In a separate terminal, navigate to the `scopify-startup-evaluator-agent` directory and run:

```bash
adk web
```

---

