# 🎙️ ThreatOps — Hackathon Pitch & Speaker Script

**Total Estimated Duration:** ~4 to 5 Minutes  
**Target Audience:** Hackathon Judges, Utility Engineers, IBM Tech Reviewers  
**Speaker:** Manthan (Team Lead & Full-Stack AI Architect)  

---

## 📽️ SLIDE 1: Title & Project Identity (0:00 - 0:30)

### 📸 Visual Cue:
*Show Slide 1 with high-contrast ThreatOps title, Gujarat grid map preview, and team metadata.*

### 🗣️ Presenter Script:
> "Hello everyone! I’m **Manthan**, Team Lead and Full-Stack AI Engineer for team **ThreatOps**. Today, I am excited to present **ThreatOps** — our predictive grid outage and equipment failure advisor built for the AI Track of the Bob AI Hackathon.
>
> High-voltage electrical grids form the backbone of modern society, but keeping them running relies heavily on aging infrastructure. ThreatOps transforms utility grid operations from **reactive emergency firefighting** to **proactive AI-driven failure prevention**, continuously protecting over 836 high-voltage assets across Gujarat."

---

## 📽️ SLIDE 2: The Challenge (0:30 - 1:15)

### 📸 Visual Cue:
*Show Slide 2 highlighting the 3 problem pillars: silent DGA gas anomalies, blackout risks, and SCADA inefficiency.*

### 🗣️ Presenter Script:
> "Let’s start with the problem. High-voltage power transformers don't fail out of nowhere — they break down due to internal chemical degradation. Gas build-ups like **Acetylene ($C_2H_2$)**, **Ethylene ($C_2H_4$)**, and **Methane ($CH_4$)** cause electrical arcing, severe overheating, and catastrophic oil contamination.
>
> Right now, grid dispatch engineers and SCADA operators at regional utilities spend **over 3 hours per incident** manually parsing sensor logs, cross-referencing tables across 12 different tools, and guessing root causes. 
> 
> With renewable energy like solar and wind adding unpredictable power surges onto aging lines, a single transformer breakdown can trigger regional blackouts, costing over **$2.4 Million per transformer replacement** and disrupting thousands of lives."

---

## 📽️ SLIDE 3: The Solution (1:15 - 2:00)

### 📸 Visual Cue:
*Show Slide 3 featuring the Solution Process Flowchart and core value proposition badges.*

### 🗣️ Presenter Script:
> "That’s why we built **ThreatOps**. ThreatOps is an intelligent decision-support platform that ingests multi-sensor telemetry, analyzes Dissolved Gas Analysis chemistry using machine learning, visualizes statewide grid health, and dispatches field crews before an outage strikes.
>
> As shown in our solution flow: multi-sensor telemetry feeds directly into our **XGBoost AI engine**, achieving a **96.25% classification accuracy** across 6 critical fault types. The results are visualized on a live GIS map covering all 33 districts in Gujarat. Operators get instant SHAP feature explanations and recommended actions, enabling **one-click crew dispatching** with automated skill-matching."

---

## 📽️ SLIDE 4: Technical Architecture (2:00 - 2:45)

### 📸 Visual Cue:
*Show Slide 4 with System Flowchart and Tech Stack Matrix.*

### 🗣️ Presenter Script:
> "Behind the scenes, ThreatOps relies on a robust, modern stack built for scale and sub-second response times.
>
> On the frontend, we use **Next.js 16 with React and Tailwind CSS**, rendering interactive Leaflet GIS maps and telemetry charts. 
> 
> The core server is a high-performance **Python FastAPI backend** hosting our asset managers, risk engines, crew dispatchers, and weather integrations. 
> 
> For data storage, we leverage **Neon Serverless PostgreSQL** with SQLAlchemy ORM, ensuring instant elasticity. Machine learning inference is powered by **XGBoost, scikit-learn, and SHAP**, streaming predictive insights back to the client in milliseconds."

---

## 📽️ SLIDE 5: Key Feature — Substance Inspector & Weather Threat (2:45 - 3:30)

### 📸 Visual Cue:
*Show Slide 5 featuring the 4-step interactive demo flow and Substance Breakdown UI.*

### 🗣️ Presenter Script:
> "Now, let’s look at our flagship feature: the **Station-Level DGA Substance Inspector & AI Studio**.
>
> Operators no longer need to read raw tabular numbers. They can search any transformer or substation, click it, and immediately inspect real-time gas levels — including Acetylene, Ethylene, Methane, Hydrogen, and temperature metrics — color-coded according to **IEC 60599 international standards**.
>
> If a gas level breaches warning thresholds, our AI instantly runs an inference check, displays the top contributing drivers via SHAP, and pairs it with our **District Weather Threat Radar** — combining 30-day historical weather trends with 7-day predictive forecasts to factor in storm and heatwave risks before dispatching field teams."

---

## 📽️ SLIDE 6: IBM Technologies Integration (3:30 - 4:15)

### 📸 Visual Cue:
*Show Slide 6 displaying the IBM Observability & AI Stack diagram.*

### 🗣️ Presenter Script:
> "To deliver true enterprise-grade intelligence, ThreatOps natively integrates **IBM’s AI and Observability stack**:
>
> First, **IBM Bob AI Integration** powers our conversational assistant and CLI, allowing operators to generate instant plain-language incident summaries and execute feeder-switching runbooks via natural language.
>
> Second, **watsonx.ai featuring Granite 3.0** acts as our core model engine, analyzing multi-sensor streams to accurately classify root cause fault modes and synthesize actionable field remediation steps.
>
> Third, **IBM Instana** serves as our SCADA Observability connector, ingesting high-frequency grid telemetry directly from GETCO substation sensors with zero data loss."

---

## 📽️ SLIDE 7: Results & Quantitative Impact (4:15 - 4:45)

### 📸 Visual Cue:
*Show Slide 7 with key impact metric boxes and Baseline vs ThreatOps table.*

### 🗣️ Presenter Script:
> "The impact of ThreatOps is clear and measurable:
>
> - **96.25% model accuracy** across all fault modes.
> - **836+ Gujarat grid assets** monitored across 33 districts.
> - **95% reduction in Mean Time to Resolution (MTTR)** — dropping incident diagnosis time from 3 hours down to **under 15 seconds**.
> - By transitioning from reactive repairs to proactive maintenance, ThreatOps helps utilities prevent millions of dollars in catastrophic transformer destruction and avoids costly grid downtime."

---

## 📽️ SLIDE 8: Team & Engineering Contributions (4:45 - 5:15)

### 📸 Visual Cue:
*Show Slide 8 displaying team structure and Manthan's engineering responsibilities.*

### 🗣️ Presenter Script:
> "Building ThreatOps required end-to-end full-stack engineering across data, backend, frontend, and ML.
>
> As Team Lead and Full-Stack AI Engineer, I architected and built:
> 1. The **XGBoost & SHAP machine learning pipeline** for DGA gas classification.
> 2. The **Next.js 16 UI**, GIS map integration, and AI Predictions Studio.
> 3. The **Python FastAPI backend** and **Neon Serverless PostgreSQL** schemas.
> 4. The **Automated Field Crew Dispatcher** and Weather Threat forecasting modules.
>
> ThreatOps is ready to keep the power grid online, reliable, and intelligent. Thank you!"

---

## 💡 Speaker Tips & Pitch Advice

1. **Pacing:** Keep a steady, confident tone. Aim for ~130 to 150 words per minute.
2. **Demo Integration:** If doing a video recording, switch from slides to a live browser window during **Slide 5** to showcase the live station search, gas sliders, and dispatch button!
3. **Key Term Emphasis:** Stress key numbers like *96.25% accuracy*, *IBM Bob AI*, *watsonx.ai Granite 3.0*, *under 15 seconds*, and *836 assets*.
