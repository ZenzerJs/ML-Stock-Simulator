# 📈 ML-Stock-Simulator

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

> A machine learning-driven financial forecasting platform and stock simulator designed to predict market price trends and performance up to 12 months into the future for commonly traded equities.

---

## 🌟 Key Features

- **Multi-Model Predictive Engine**: Harnesses multiple machine learning algorithms to generate short-term and long-term (up to 12 months) price behavior simulations.
- **Dedicated Data & ML Pipeline**: Built-in data ingestion, feature engineering, and model training pipelines (`/pipeline`).
- **Interactive Web Interface**: High-performance Next.js & TypeScript dashboard (`/src`) for visualizing historical vs. predicted stock trajectories.
- **Dockerized Container Deployment**: Production-ready `Dockerfile` and `.dockerignore` for containerized deployment across cloud environments.
- **AI Agent Guidance**: Structured developer guardrails (`AGENTS.txt`, `CURSOR.txt`, `PRD.txt`, `DESIGN.txt`) for autonomous development and maintenance.

---

## 🏗️ Repository Architecture

```text
ML-Stock-Simulator/
├── pipeline/             # Data ingestion, preprocessing, and ML model training scripts
├── src/                  # Next.js web application (dashboard, charts, UI components)
├── .dockerignore         # Docker build exclusions
├── .gitignore            # Git tracking exclusions
├── AGENTS.txt            # AI agent engineering rules & guidelines
├── CURSOR.txt            # Cursor IDE context & project settings
├── DESIGN.txt            # UI/UX design tokens & visual guidelines
├── Dockerfile            # Container build configuration
├── PRD.txt               # Product Requirements Document
├── next.config.ts        # Next.js configuration
├── package-lock.json     # Node lockfile
├── package.json          # Node.js dependencies & scripts
├── postcss.config.mjs    # PostCSS styling setup
└── tsconfig.json         # TypeScript compiler configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm**
- **Docker** *(optional, for containerized execution)*
- **Python**: `3.10+` *(for running data pipeline scripts)*

---

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ZenzerJs/ML-Stock-Simulator.git
   cd ML-Stock-Simulator
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   # API Keys & Data Feed Credentials
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the Next.js development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the simulator dashboard.

---

### 🐍 ML Pipeline Execution

To train or refresh stock prediction models in the `/pipeline` directory:

```bash
# Navigate to the pipeline workspace
cd pipeline

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install pipeline requirements
pip install -r requirements.txt

# Run model training & simulation pipeline
python train.py
```

---

### 🐳 Running with Docker

Build and containerize the application for production:

```bash
# Build Docker image
docker build -t ml-stock-simulator .

# Run container
docker run -p 3000:3000 ml-stock-simulator
```

---

## 📊 ML Model Strategy

The simulator evaluates market trends using a multi-layered approach:
1. **Feature Extraction**: Technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands) & historical price returns.
2. **Model Diversity**: Evaluates regression and time-series models to produce aggregated confidence metrics.
3. **Simulation Horizons**: Generates projection curves across 1-month, 3-month, 6-month, and 12-month forward windows.

---

## 🛠️ Scripts & Verification

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Next.js local development server |
| `npm run build` | Compiles production Next.js build |
| `npm run start` | Serves the production build locally |
| `npm run lint` | Runs ESLint for code style and quality enforcement |

---

*Developed by [ZenzerJs](https://github.com/ZenzerJs)*
