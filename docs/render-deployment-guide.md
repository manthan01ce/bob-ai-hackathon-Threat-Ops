# 🚀 ThreatOps — Render.com Deployment Guide

This document provides complete, step-by-step instructions to deploy **ThreatOps** on [Render.com](https://render.com).

---

## ⚡ Option 1: 1-Click Render Blueprint Deployment (Recommended)

ThreatOps includes a pre-configured Infrastructure-as-Code manifest ([`render.yaml`](../render.yaml)).

### Steps:
1. Log in to [Render.com](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ Select **Blueprint**.
3. Connect your GitHub repository (`manthan01ce/bob-ai-hackathon-Threat-Ops` or `manthan01ce/manthan01ce-bob-ai-hackathon-ThreatOps`).
4. Render will automatically detect `render.yaml` and display two provisioned services:
   - `threatops-api` (FastAPI Python Backend)
   - `threatops-web` (Next.js 16 Web Dashboard)
5. Click **Apply**. Render will automatically build, link, and deploy both services!

---

## 🛠️ Option 2: Manual Web Service Setup on Render

If you prefer to configure Web Services manually in the Render Dashboard:

### 1. Deploy the Backend API Service (`threatops-api`)
- **Service Type:** Web Service
- **Name:** `threatops-api`
- **Environment:** `Python 3`
- **Root Directory:** `src/backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:**
  - `DATABASE_URL`: `postgresql://neondb_owner:npg_gS1I7ZzXlkhF@ep-shy-cell-a8vhptd9-pooler.eastus2.azure.neon.tech/neondb?sslmode=require`
  - `PYTHON_VERSION`: `3.10.14`

---

### 2. Deploy the Frontend Web Dashboard (`threatops-web`)
- **Service Type:** Web Service
- **Name:** `threatops-web`
- **Environment:** `Node`
- **Root Directory:** `src/frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **Environment Variables:**
  - `NEXT_PUBLIC_MAPTILER_KEY`: `CRFoY3RXgAloQLarTcRL`
  - `NEXT_PUBLIC_API_BASE`: `https://threatops-api.onrender.com/api` *(Replace with your `threatops-api` URL)*
  - `NODE_VERSION`: `20.18.0`

---

## ✅ Deployment Verification Checklist

- **FastAPI OpenAPI Swagger Docs:** `https://threatops-api.onrender.com/docs`
- **Backend Healthcheck:** `https://threatops-api.onrender.com/api/dashboard/summary`
- **Live Web Dashboard:** `https://threatops-web.onrender.com`
