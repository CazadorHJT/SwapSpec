# Product Requirements Document (PRD): SwapSpec

| Field               | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| **Project Name**    | SwapSpec                                              |
| **Version**         | 2.0                                                   |
| **Status**          | Draft                                                 |
| **Target Platform** | Mobile App (iOS/Android) + Web Dashboard (co-primary) |
| **Core Focus**      | AI-Driven Engine Swap Planning & 3D Visualization     |

---

## 1. Executive Summary

SwapSpec is a **comprehensive engine swap planning platform** that combines 3D fitment visualization with AI-powered build advisory. By utilizing LiDAR scanning, the application analyzes the 3D volume of a vehicle's engine bay/ under chassis and compares it against a library of scanned engines and transmissions.

The platform helps users:

1. **Visualize physical fitment** and identify interference points (collisions)
2. **Plan required modifications** (custom mounts, tunnel work, steering clearance)
3. **Understand supporting upgrades** needed (cooling, fuel system, drivetrain strength)
4. **Generate complete build plans** with parts lists and fabrication requirements

**The goal:** A user can plan an entire engine swap digitally—identifying every clearance issue, required modification, and supporting upgrade—before turning a wrench or buying a part.

As the scan library grows through user contributions and founder-sourced scans, most users will be able to plan builds using existing scans without needing to scan their own vehicle or engine.

---

## 2. Target Audience (Personas)

### 2.1. The "Garage Fabricator"

- **Profile:** Hobbyist working on a project car (e.g., '69 Camaro, '92 240SX) on weekends
- **Pain Point:** Buys an engine, realizes the oil pan hits the subframe, has to weld custom mounts or resell the engine at a loss
- **Goal:** Wants to know if an LS3 fits and what it will take to make the swap work before spending $10,000

### 2.2. The "Restomod Shop"

- **Profile:** Professional custom car builder
- **Pain Point:** Wasted labor hours mocking up engines and ordering parts that don't fit
- **Goal:** Precise planning to quote customers accurately for fabrication work

### 2.3. The "Crate Engine Retailer" (B2B - Future)

- **Profile:** Companies like Summit Racing, Jegs, or GM Performance
- **Goal:** Reduce returns due to fitment issues by offering a "Verified Fit" badge on their website

---

## 3. Functional Requirements

### 3.1. Engine Bay Scanning & Input

**FR 1.0 - Mobile LiDAR Scanning**
The app must utilize mobile LiDAR to generate a 3D mesh scan of the user's engine bay and chassis. **iOS is the primary platform:** iPhone Pro (12 Pro and newer) and iPad Pro provide true LiDAR via ARKit ARMeshAnchor, targeting ±1–2 cm accuracy. **Android is a lower-fidelity fallback:** ARCore depth estimation approximates LiDAR on supported devices but produces lower-resolution meshes with reduced accuracy (~±3–5 cm). Android accuracy limitations must be clearly communicated to users during the scan workflow. Phase 1 development targets iOS only.

**FR 1.1 - User-Guided Scan Cleanup**
Users manually mark removable components (hoses, wiring, accessories, non-permanent items). Interaction model: user taps or drags to select mesh regions on the 3D scan, confirms removal, and the system cleanly removes that geometry. This requires a 3D touch interaction layer in React Native (not available via standard gesture responders — needs custom native rendering). Rules:

- The system will NOT auto-delete any geometry without explicit user approval
- Brush/lasso selection and AI-assisted suggestions deferred to Phase 2

**FR 1.2 - Scale Calibration**
Two-step calibration process: (1) user places a known-dimension reference object in the scan area (ruler, tape measure, business card); (2) user taps two points on the object in the rendered scan and enters the real-world distance between them. The system computes and applies a scale correction factor to the entire mesh. A calibration status indicator (green = calibrated, yellow = uncalibrated/estimated) is shown throughout the workflow. Users may also manually input specific measurements (frame rail width, firewall-to-radiator distance) as an alternative calibration path.

**FR 1.3 - Vehicle Classification**
To upload a scan, users must input the vehicle's VIN. The VIN is used to categorize the scan by exact year, make, model, and trim level. If the vehicle is modified, users must specify what modifications have been made (e.g., "tubbed rear wheel wells," "aftermarket K-member").

**FR 1.4 - Scan Accuracy Disclaimer**
All scans include a disclaimer: "Scans are for planning purposes. Verify critical dimensions before fabrication."

---

### 3.2. Engine & Parts Database (Library)

**FR 2.0 - 3D Vehicle Scan Library**
A database of 3D scans of vehicle engine bays and undersides, sourced from:

- **Founder-sourced pro scans:** Founder scans common swap platforms using a dedicated professional 3D scanner — significantly higher quality than phone LiDAR. Target: 5–10 vehicles scanned personally before launch.
- **Contracted scans:** Pay shops or freelancers with access to target platforms to scan and submit using a defined process. Target: 5–10 additional platforms at launch.
- **User-contributed scans:** LiDAR scans submitted via the mobile app (see Section 3.5)

Target launch library: ≥10 verified scans covering the most common swap combinations. Priority platforms: LS swap candidates (Fox Body Mustang, S10, first-gen Camaro), S-chassis (240SX), E36/E46 BMW, JZA80 Supra, and similar high-demand platforms.

**FR 2.1 - Digital Drivetrain Library**
A database of common swap engines and transmissions including:

- **Engines:** LS variants, Ford Coyote/Godzilla, Mopar Hemi, Toyota 2JZ, Honda K-Series, BMW B58
- **Transmissions:** T56, TR6060, CD009, 4L80E, 10R80

**FR 2.2 - Accessory Configurator**
Users can toggle engine accessories that affect dimensions:

- Headers (stock manifolds vs. long-tube vs. turbo manifolds)
- Oil pan configuration (front sump vs. rear sump vs. specific aftermarket pans)
- Intake manifold height (truck vs. car vs. aftermarket)
- Accessory drive (standard vs. high-mount)

**FR 2.3 - Library-Only Mode**
Users without LiDAR capability (web users, older phones) can use existing scans from the database to plan builds without scanning their own vehicle.

**FR 2.4 - Scan Quality Tiers**
All scans in the library carry a quality tier badge that communicates provenance and accuracy:

| Tier          | Badge      | Source                              | Quality                                                   |
| ------------- | ---------- | ----------------------------------- | --------------------------------------------------------- |
| **Verified**  | Gold       | Pro scanner (founder or contracted) | High-resolution, founder-reviewed, guaranteed accuracy    |
| **Community** | Silver     | User LiDAR contribution             | Variable quality, automated checks passed, review pending |
| **Pending**   | _(hidden)_ | User upload awaiting review         | Visible only to uploader until approved                   |

The Verified tier is the core value proposition: users pay for access to scans they could not create themselves.

---

### 3.3. The "Virtual Swap" (3D Simulation)

**FR 3.0 - Auto-Placement**
The system attempts initial engine placement based on standard driveline angles (typically 3–5 degrees down), anchored to 4 user-marked reference points collected during the scan: left frame rail, right frame rail, firewall, and radiator support. The user marks these points as a required step before analysis begins. Future ML-based automatic reference point detection is a Phase 2 enhancement.

**FR 3.1 - Manual Manipulation**
Users can drag, rotate, and tilt the engine/transmission assembly within the bay along X, Y, and Z axes with precise numeric input available.

**FR 3.2 - Clearance Visualization**

| Zone       | Meaning                                           |
| ---------- | ------------------------------------------------- |
| **Green**  | Clear (>1 inch clearance)                         |
| **Yellow** | Tight (<0.5 inch clearance) - may work but verify |
| **Red**    | Collision (parts intersecting)                    |

**FR 3.3 - Collision Detection Algorithm**
Clearance computation uses Three.js Raycaster with BVH (Bounding Volume Hierarchy) acceleration via `three-mesh-bvh` for real-time performance. Clearance is computed as the minimum distance between the engine/transmission mesh surface and the bay mesh surface at each point.

Clearance thresholds:

| Zone       | Clearance           |
| ---------- | ------------------- |
| **Red**    | < 0" (intersecting) |
| **Yellow** | 0" – 0.5"           |
| **Green**  | > 1"                |

Polygon budget requirements:

- Engine/transmission mesh: ≤ 100K triangles
- Bay scan mesh: ≤ 200K triangles
- Meshes exceeding these limits must be decimated before upload (client-side preferred, server-side fallback)

**FR 3.4 - Dynamic Clearance Check (Future Enhancement)**
Simulation of engine movement under load (torque roll) to identify clearance issues that only appear when the engine rocks on its mounts.

---

### 3.4. Conflict Detection & Reporting

**FR 4.0 - Collision Heatmap**
Visual overlay showing interference zones with color-coded severity (green/yellow/red).

**FR 4.1 - Fabrication Alerts**
The system generates specific, actionable alerts describing conflicts:

- "Alternator interferes with passenger shock tower - high-mount accessory drive required"
- "Oil pan contacts front crossmember - Holley 302-1 rear sump pan resolves this"
- "OEM motor mounts incompatible - custom mounts required"

**FR 4.2 - Drivetrain Integration Alerts**
Identifies custom work required for complete drivetrain function:

- Engine-to-transmission adapter plate requirements
- Custom driveshaft specifications
- Transfer case retention for 4WD applications
- ECU/wiring integration considerations

**FR 4.3 - Supporting Upgrade Recommendations**
Identifies components that may need upgrading to support the new drivetrain:

- Cooling system (radiator capacity, auxiliary fans)
- Fuel system (pump flow rate, fuel pressure requirements)
- Axles and driveshaft strength ratings
- Brake upgrades for increased vehicle performance
- Suspension considerations for different engine weight

---

### 3.5. User Content & Licensing

**FR 5.0 - Scan Contribution Agreement**
Upon account creation, users agree that any vehicle or engine scans they upload may be added to the public library for use by other SwapSpec users.

**FR 5.1 - Scan Attribution**
Users who contribute scans receive credit (username) on that scan's library entry.

**FR 5.2 - Scan Quality Standards**
Before a user-submitted scan enters the public library, it must pass automated checks and manual review:

Minimum automated thresholds:

- **Mesh completeness:** ≥ 80% of bounding volume filled (no large holes)
- **Triangle count:** ≥ 10K (minimum detail) and ≤ 500K (maximum before decimation required)
- **Scan coverage:** must cover ≥ 70% of the engine bay opening

Manual review: Phase 1 — founder reviews via Supabase dashboard. Phase 2 — admin review interface built into product.

Scans that fail review remain usable by the uploader but are not published publicly (Community tier).

---

### 3.6. AI Build Advisor

**FR 6.0 - Conversational Interface**
An AI-powered chat interface where users can ask questions about their build in natural language. The advisor uses an **agentic tool-use loop**: rather than generating from static context, Claude actively searches service manuals and analyzes diagrams mid-conversation — calling tools as many times as needed before composing a response.

**FR 6.1 - Structured Data Integration**
The AI advisor draws on three data sources to provide accurate technical information:

**Spec Database** (structured, verified):

- Fuel pressure and flow requirements
- Cooling capacity recommendations
- Power output and torque characteristics
- Physical dimensions and weight
- Common swap considerations

**Service Manual RAG** (Operation CHARM indexed content):

- OEM wiring diagrams and connector pinouts
- Factory torque specs, clearances, and procedures
- Electrical system schematics for the donor vehicle and the target chassis
- Sensor locations and signal specifications
- **Agentic retrieval**: Claude autonomously decides what to search and when — not a blind pre-fetch. It calls `search_manual` 1–5 times per turn with targeted queries before composing its response.
- **Scoped indexing**: Manuals are indexed per build component — chassis (target vehicle), engine (donor vehicle), and transmission (donor vehicle). Claude selects which component's manual to search via a `component` parameter.
- **Donor vehicle concept**: Engine and transmission manuals come from the origin vehicle where that component was documented (e.g., an LS1 index points to the 1998 Chevrolet Camaro service manual). This is set via `origin_year/make/model` fields on the engine/transmission records.
- **Diagram analysis**: Image-heavy manual pages are uploaded to Supabase Storage. The `fetch_diagram` tool fetches a diagram and sends it to a vision model for analysis, returning a plain-text description back to the main model.

**3D Fitment Context** (live from current build session):

Collision detection results are serialized as JSON and injected into the advisor system prompt. Example payload:

```json
{
  "collision_zones": [
    {
      "region": "steering shaft",
      "clearance_inches": 0.3,
      "severity": "yellow"
    },
    {
      "region": "oil pan / crossmember",
      "clearance_inches": -0.2,
      "severity": "red"
    }
  ],
  "engine_position": { "x": 0, "y": 0, "z": 0, "rotation_deg": 3.5 }
}
```

Additional context injected:

- Selected engine/transmission position and orientation
- User-configured accessory variants (oil pan, headers, intake)

**FR 6.2 - Context-Aware Responses**
The AI advisor has access to:

- The user's selected vehicle scan
- The user's selected engine/transmission
- Current collision detection results
- The user's previous questions in the session
- Scoped service manuals for all 3 build components: chassis (target vehicle), engine donor, and transmission donor — searchable on demand via `search_manual`
- Visual diagram analysis: image-only manual pages stored in Supabase Storage can be fetched and interpreted via `fetch_diagram` using a vision model

**FR 6.3 - Advisory Scope**
The AI advisor can assist with:

_Physical Fitment_

- Explaining why a collision is occurring and potential solutions
- Recommending specific parts that resolve fitment issues (oil pans, motor mounts, headers, accessory drives)
- Interpreting clearance measurements from the 3D model in practical terms

_Wiring & Electrical Integration_

- OEM harness integration: identifying which connectors, sensors, and circuits from the donor engine harness must be retained, spliced, or relocated into the target chassis
- Standalone ECU setup: advising on sensor wiring, grounds, power feeds, and CAN/serial integration when the user is running an aftermarket ECU (e.g., Holley Terminator X, AEM Infinity, MegaSquirt)
- Body electronics compatibility: identifying conflicts between the swap and the target car's existing body control modules, immobilizers, or instrument cluster signals
- Referencing specific pinouts and wiring diagrams from indexed service manuals where available

_Supporting System Upgrades (Required)_

- Fuel system requirements (pump flow rate, pressure, return vs. returnless)
- Cooling system capacity (radiator BTU rating, fan CFM, auxiliary coolers)
- Drivetrain compatibility (engine-to-transmission adapter, driveshaft, transfer case, axle strength)

_Performance & Desired Upgrades (Optional)_

- Camshaft selection, valve spring recommendations, and expected power trade-offs
- Intake, exhaust, and forced induction options for the selected engine
- Transmission shifter, clutch, and torque converter recommendations
- Tune strategy and supporting sensor/datalog requirements
- General "what else should I do while it's out" guidance based on the build context

**FR 6.4 - Accuracy Safeguards**

- Technical specifications come from the structured database, not LLM generation
- AI responses include disclaimers for critical safety items
- Users are encouraged to verify recommendations with manufacturer specs

---

### 3.7. Build Export

**FR 7.0 - Build Summary Report**
Users can export a "Build Sheet" containing:

- Selected vehicle and drivetrain
- List of identified conflicts and recommended solutions
- Required modifications (fabrication work)
- Recommended supporting upgrades
- Parts list with specific part numbers where available

**FR 7.1 - Export Formats**

- PDF download
- Shareable link (view-only)

---

## 4. Technical Architecture

### 4.1. Mobile Application (React Native / Expo)

The mobile app is built in **React Native (Expo SDK 54)** targeting iOS and Android from a single TypeScript codebase.

| Component          | Technology                                                |
| ------------------ | --------------------------------------------------------- |
| Framework          | React Native (Expo SDK 54)                                |
| Routing            | Expo Router v6 (file-based)                               |
| LiDAR Scanning     | Custom Expo native module (ARKit on iOS, ARCore fallback) |
| Mesh Format        | glTF (.glb) — validated, Three.js native support          |
| 3D Viewer (mobile) | expo-gl + Three.js                                        |
| 3D Viewer (web)    | React Three Fiber (R3F)                                   |
| UI                 | React Native StyleSheet + lucide-react-native             |

**Scan-to-viewer pipeline:**

```
ARKit ARMeshAnchor (iOS)
  → extract vertex + index buffer from mesh anchor
  → convert to glTF (.glb) format on-device
  → upload to Supabase Storage (meshes bucket)
  → web viewer: React Three Fiber loads .glb via useGLTF()
  → mobile viewer: expo-gl + Three.js loads .glb via GLTFLoader
```

> **Important:** `expo-camera` does not expose ARKit mesh scanning natively. This requires a **custom Expo native module** wrapping `ARMeshAnchor` APIs — the highest-risk item in Phase 1. Prototype this first.

**Rationale for React Native / Expo:**

- Cross-platform iOS + Android from one TypeScript codebase
- Shares types, API client, and hooks directly with the web frontend
- glTF (.glb) mesh format works natively in Three.js (web and mobile)
- Faster iteration and larger developer ecosystem than Unity
- No Unity Editor required — fully code-driven, enabling AI-assisted development

> **Note:** The `unity/` directory is retained for reference but superseded by the React Native app.

### 4.2. Backend Services (Cloud)

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (web / Next.js)         Mobile App (React Native)   │
│  ┌──────────────────────────┐  ┌──────────────────────────┐  │
│  │ 3D Viewer (R3F)          │  │ LiDAR Scanning           │  │
│  │ Build Workflow           │  │ 3D Viewer                │  │
│  │ AI Chat Interface        │  │ AI Chat Interface        │  │
│  └────────────┬─────────────┘  └────────────┬─────────────┘  │
└───────────────┼────────────────────────────-┼────────────────┘
                │ REST API                     │ REST API
                └──────────────┬──────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Services                        │
│  ┌──────────────┐  ┌─────────────────────┐                  │
│  │ Engine/Car   │  │ Claude AI API       │                  │
│  │ Spec Database│  │ (Anthropic)         │                  │
│  └──────────────┘  └─────────────────────┘                  │
│  ┌──────────────┐  ┌─────────────────────┐                  │
│  │ User Auth &  │  │ 3D Scan Storage     │                  │
│  │ Accounts     │  │ (Supabase Storage)  │                  │
│  └──────────────┘  └─────────────────────┘                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Manual Ingestion Pipeline                           │    │
│  │  ┌────────────────┐   ┌──────────────────────────┐  │    │
│  │  │ Operation CHARM │──→│ ManualChunk DB (FTS)     │  │    │
│  │  │ (charm.li ZIPs) │   │ scope: chassis/engine/   │  │    │
│  │  └────────────────┘   │         transmission      │  │    │
│  │  ┌────────────────┐   └──────────────────────────┘  │    │
│  │  │ User PDF/ZIP   │──→ (same ManualChunk table)     │    │
│  │  │ Upload         │                                  │    │
│  │  └────────────────┘                                  │    │
│  │  ↑ Build creation triggers 3 background ingests:     │    │
│  │    1. Chassis manual (target vehicle)                │    │
│  │    2. Engine donor vehicle manual                    │    │
│  │    3. Transmission donor vehicle manual              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

Both clients (web and mobile) share the same FastAPI backend and use identical TypeScript type definitions (`lib/types.ts` is a direct copy between the two frontends).

### 4.3. AI Advisor Architecture

The AI Build Advisor uses an **agentic tool-use model** powered by two Claude models working together:

**Data layers:**

1. **Structured Spec Database:** Verified specifications for engines, transmissions, and vehicles (fuel requirements, cooling needs, dimensions, weights, bellhousing patterns). Values sourced from manufacturer data, CarQuery API, and NHTSA — never LLM-generated. Injected into every system prompt as structured context with source tags (`[MANUFACTURER]`, `[API]`, `[USER]`).

2. **Service Manual RAG (Operation CHARM):** Manuals are downloaded from charm.li, extracted, and indexed into a full-text search database (`ManualChunk` table with PostgreSQL GIN index). Each chunk is scoped to a specific build component (chassis, engine, or transmission). Rather than a blind pre-fetch, **Claude autonomously searches these manuals** using the `search_manual` tool — choosing what to look up, in which component's manual, and how many times based on the question.

3. **Diagram Vision Pipeline:** Image-heavy manual pages (wiring schematics, assembly diagrams) are uploaded to Supabase Storage during indexing. The `fetch_diagram` tool fetches a stored image and sends it to **Claude Haiku** for visual analysis, returning a plain-text description. This enables the main model to answer questions about visual content without receiving raw images itself.

**Two-model architecture:**

| Model           | Role                                                                                   |
| --------------- | -------------------------------------------------------------------------------------- |
| Claude Sonnet 4 | Orchestrator — reasons about the question, calls tools, synthesizes the final response |
| Claude Haiku    | Vision worker — analyzes diagram images cheaply when `fetch_diagram` is invoked        |

**Agentic tool-use loop (Anthropic path):**

```
User Question
     │
     ▼
Claude Sonnet (with build context + spec database in system prompt)
     │
     ├── [tool_use] search_manual(query, component="chassis"|"engine"|"transmission"|"any")
     │        └──→ PostgreSQL FTS → top-5 ManualChunk rows
     │                  └──→ tool_result returned to Claude
     │
     ├── [tool_use] fetch_diagram(image_url, question)   ← if chunk has a stored image
     │        └──→ httpx fetch from Supabase Storage
     │                  └──→ Claude Haiku vision analysis
     │                            └──→ text description returned as tool_result
     │
     ├── [tool_use] search_manual(...)   ← Claude may call tools 1–5 times total
     │
     └── [end_turn] Final response synthesized from:
               - Spec DB context (system prompt)
               - Tool results (manual excerpts + diagram descriptions)
               - Build context (vehicle, engine, transmission, collisions)
               - Conversation history
```

**Build-scoped manual search:** Each call to `search_manual` is constrained to chunks belonging to the active build's components — the chassis vehicle, the engine's donor vehicle, or the transmission's donor vehicle. Claude cannot accidentally retrieve manual content from a different build or an unrelated vehicle.

**Fallback (Gemini path):** When using the Gemini model, a traditional pre-fetch RAG approach is used instead (one FTS query → inject context → generate). Tool-use and diagram vision are not available on this path.

### 4.4. Database Schema (Simplified)

**Engines Table:**

- EngineID, Make, Model, Variant
- Dimensions (H, W, L), Weight
- Fuel pressure requirement, Fuel flow requirement
- Cooling capacity recommendation
- Power output, Torque output
- MeshFileURL, MountPointData

**Transmissions Table:**

- TransmissionID, Make, Model
- Dimensions, Weight
- BellhousingPattern
- MeshFileURL

**Vehicles Table:**

- VehicleID, Year, Make, Model, Trim
- VIN pattern
- BayScanMeshURL
- ContributorUserID
- QualityReviewStatus

**Users Table:**

- UserID, Email, AccountType (hobbyist/professional)
- SubscriptionStatus
- ContributedScans[]

---

## 5. User Experience (UX) Workflow

### 5.1. New User Flow

1. **Onboarding:** User creates account, selects account type (hobbyist or professional shop)
2. **Vehicle Entry:** User enters year, make, model (or scans VIN)
3. **Library Search:** System searches scan library for a matching vehicle
   - **Match found → Library path:** User selects the existing scan (Verified or Community tier) and proceeds to Step 5
   - **No match → Scan path:** User sees "No scan available yet" with options to (a) scan their own vehicle using LiDAR, or (b) request this vehicle be added to the library
4. **Scan Cleanup (scan path only):** User marks and removes non-permanent items (hoses, wires) using tap-to-select
5. **Drivetrain Selection:** User selects target engine and transmission from library
6. **Accessory Configuration:** User toggles relevant options (oil pan type, headers, intake)
7. **Analysis:** App processes fitment and displays collision heatmap
8. **Exploration:** User manipulates engine position, toggles accessories, chats with AI advisor
9. **Export:** User generates build sheet with parts list and modification requirements

The library is the default path. LiDAR scanning is the fallback when no scan exists.

### 5.2. Returning User Flow

1. **Login:** Access existing projects
2. **Continue or New:** Resume a saved build or start a new project
3. **Library Contribution:** Review and approve any pending scan submissions

---

## 6. Non-Functional Requirements

**NFR 1.0 - Scan Accuracy**
LiDAR scans should be accurate within ±1-2 cm, sufficient for planning-level fitment decisions. Users are advised to verify critical dimensions before fabrication.

**NFR 2.0 - Rendering Performance**
3D rendering must maintain 30fps on mid-range mobile devices (iPhone 12, Pixel 6 equivalent). Requirements:

- Total scene polygon budget: ≤ 200K triangles (engine + transmission + bay mesh combined)
- LOD (Level of Detail) strategy: 3 levels — full (close), 50% (mid), 25% (far) — implemented for engine/transmission meshes
- Meshes exceeding polygon budget must be decimated before scene load
- Note: `expo-gl` + Three.js has a lower performance ceiling than native Metal/Vulkan rendering. Test on target devices during prototype — may require additional optimization.

**NFR 3.0 - Offline Capability**
Users can view downloaded engine models and their saved scans without an active internet connection. AI advisor requires connectivity.

**NFR 4.0 - Data Security**
User account data and payment information handled via industry-standard encryption. Scan data stored securely with user access controls.

---

## 7. Business Model

### 7.1. Pricing Tiers

| Tier             | Target User        | Model                                | Features                                                                      |
| ---------------- | ------------------ | ------------------------------------ | ----------------------------------------------------------------------------- |
| **Free**         | All users          | $0                                   | Account creation, browse library, view community builds (view-only)           |
| **Per-Project**  | Hobbyist           | One-time fee per build (pricing TBD) | Full access to one build project: scanning, visualization, AI advisor, export |
| **Subscription** | Professional Shops | Monthly or annual (pricing TBD)      | Unlimited projects, multiple concurrent builds, priority support              |

### 7.2. Pricing Research

Pricing will be determined through market research:

- Surveys of target users (hobbyists and shops)
- Willingness-to-pay interviews
- Competitive analysis of related tools and services

### 7.3. Future Revenue Streams

- **Affiliate Links:** "Buy this part" links on recommended components (Phase 3)
- **B2B Licensing:** White-label or API access for crate engine retailers
- **Premium Scan Library:** High-quality, verified scans of rare or desirable platforms

---

## 8. Go-To-Market Strategy

### 8.1. Credibility Building

- Founder to work at a high-end restomod shop during development
- Validate real-world needs and build industry relationships
- Document real engine swap builds using SwapSpec

### 8.2. Content Marketing

- Instagram documentation of app development process
- Video content showing real engine swap planned and executed using SwapSpec
- Before/after comparisons: "What we predicted vs. what we found"

### 8.3. Shop Trials

- Offer 1-2 free project trials to professional shops
- Gather feedback and testimonials
- Convert successful trials to paid subscriptions

### 8.4. Community Building

- Early users contribute scans, building library through network effect
- Contributor recognition and attribution incentivizes quality submissions
- Active community helps identify desired vehicles/engines to prioritize

### 8.5. Scan Library Seeding

The library must have content before launch. Strategy:

- **Founder scans (5–10 vehicles):** Using a professional 3D scanner, founder personally scans the most common swap platforms. These become the initial Verified tier library.
- **Contracted scans (5–10 vehicles):** Pay shops or freelancers with access to target platforms to scan and submit via a defined process. Target: ~$X per scan.
- **Priority platforms:** LS swap candidates (Fox Body Mustang, S10, first-gen Camaro), S-chassis (240SX), E36/E46 BMW, JZA80 Supra — highest demand based on community signal.
- **Quality gate:** All pro scans reviewed by founder before publishing as Verified.
- **Launch target:** ≥ 10 Verified scans live at launch, covering the most common swap combinations.

---

## 9. Roadmap & Phasing

### Phase 1: Proof of Concept MVP

**Goal:** Demonstrate core value proposition with minimal but functional scope

**Completed:**

- ✅ User accounts (hobbyist/professional), auth, subscription tiers
- ✅ AI Build Advisor with structured spec database
- ✅ VIN-based vehicle classification
- ✅ Spec database (engines, transmissions, vehicles) with data provenance
- ✅ Build workflow (select vehicle + engine + transmission, save build)
- ✅ PDF build export
- ✅ Web frontend (co-primary platform, Next.js)
- ✅ Mobile app scaffold (React Native/Expo — screens and API integration)
- ✅ Manual ingestion pipeline (Operation CHARM / charm.li download, extraction, FTS indexing)
- ✅ Scoped manual indexing: chassis, engine donor, and transmission donor manuals per build
- ✅ Build creation auto-triggers 3 background ingests (chassis + engine + transmission manuals)
- ✅ Agentic tool-use RAG (Anthropic path): `search_manual` + `fetch_diagram` tools — Claude autonomously decides what to retrieve
- ✅ Vision-based diagram extraction: image-only manual pages uploaded to Supabase Storage, analyzed via Claude Haiku
- ✅ User PDF/ZIP upload for custom spec sheets (`POST /api/manuals/upload`, scoped to component)
- ✅ Donor vehicle concept: `origin_year/make/model` on Engine + Transmission models maps each component to its source manual
- ✅ glTF (.glb) validated as mesh format — renders in React Three Fiber (pipeline test complete)
- ✅ CORS fix: explicit origin allowlist (was wildcard + credentials, which browsers reject)

**Remaining (in dependency order):**

1. **ARKit LiDAR → glTF prototype** (custom native module — highest risk, build first)
2. **3D viewer with mesh loading + orbit controls** (web first via React Three Fiber, then mobile via expo-gl)
3. **Reference point marking UX** (user marks 4 points: left/right frame rails, firewall, radiator support)
4. **Auto-placement algorithm** (anchors engine to reference points at standard driveline angle)
5. **Collision detection** (Three.js Raycaster + `three-mesh-bvh`)
6. **Collision heatmap rendering** (vertex coloring on bay mesh)
7. **Scan cleanup UX** (tap-to-select mesh regions for removal)
8. **3D context → AI advisor integration** (serialize collision JSON into advisor system prompt)
9. **Build summary driven by collision data** (conflict list from 3D results)

**Success Criteria:**

- User can scan a vehicle, place an engine, identify collisions, and receive AI guidance
- End-to-end workflow functions on iOS device

### Phase 2: Library Expansion

**Goal:** Build out content library and refine user experience

**Deliverables:**

- Expanded vehicle scan library (10+ common platforms)
- Expanded engine library (LS, Coyote, Hemi, 2JZ)
- Transmission library with bellhousing compatibility data
- Android support
- User scan contribution workflow with quality review
- Accessory configurator (oil pans, headers, intakes)
- Improved AI advisor with expanded specification database

### Phase 3: Monetization & Scale

**Goal:** Launch commercially and establish revenue

**Deliverables:**

- Payment integration (per-project and subscription)
- Web-based 3D viewer enhancement (library browsing, build planning without scanning)
- Affiliate integration for parts purchasing
- B2B API exploration with crate engine retailers
- Advanced LiDAR calibration tools
- Advanced features: dynamic clearance simulation, detailed fabrication specs

---

## 10. Risks & Mitigation

| Risk                                         | Mitigation                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User scans are low quality or inaccurate     | AR-guided scanning tutorial; automated quality checks; warning system for low-density meshes; clear disclaimer that scans are for planning                                                                                                                                                                                                                 |
| Scan library is too small to be useful       | Founder commits to scanning 10+ common platforms; user contribution agreement builds library; focus marketing on users who will scan their own vehicles initially                                                                                                                                                                                          |
| AI advisor gives inaccurate technical advice | Technical specs pulled from structured database, not generated; agentic `search_manual` tool grounds wiring/procedure answers in OEM service manual content rather than model training data; `fetch_diagram` vision provides visual context for schematic questions; disclaimers on safety-critical recommendations; user feedback loop to identify errors |
| LiDAR accuracy insufficient for planning     | Testing with real fabrication to validate; calibration option for improved accuracy; clear communication that this is planning tool, not fabrication drawing                                                                                                                                                                                               |
| React Native LiDAR integration complexity    | iOS-first strategy — ARKit LiDAR is most mature platform. Requires a **custom Expo native module** (not expo-camera); `ARMeshAnchor` APIs must be wrapped in Swift and bridged to React Native. Prototype this before any other 3D work — it is the highest technical risk in Phase 1. Android (ARCore depth) is Phase 2+ only.                            |

---

## 11. Success Metrics

### 11.1. Product Metrics

| Metric                            | Target (MVP)                 | Target (Scale)              |
| --------------------------------- | ---------------------------- | --------------------------- |
| Scan completion rate              | >70% of started scans        | >85%                        |
| Build projects completed          | Track baseline               | 50% month-over-month growth |
| AI advisor usage                  | >50% of users engage         | >80%                        |
| Collision identification accuracy | Validate with 3+ real builds | >95% accuracy               |

### 11.2. Business Metrics

| Metric                      | Target                            |
| --------------------------- | --------------------------------- |
| User registrations          | Track and grow                    |
| Conversion (free to paid)   | Establish baseline, then optimize |
| Scan library growth         | 10+ vehicles in Year 1            |
| Shop subscription retention | >80% annual renewal               |

### 11.3. Validation Metric (Critical)

**Real-world accuracy:** Founder completes at least one engine swap planned entirely in SwapSpec. All predicted clearance issues and modifications should match reality. This validates the core value proposition.

---

## 12. Open Questions

1. **Specific pricing:** What price point for per-project and subscription tiers? (Requires market research)
2. **Engine spec data source:** Where to source verified fuel/cooling/dimension specs for engine database?

_Resolved: Scan file format → **glTF (.glb)**. Validated by pipeline test — renders correctly in React Three Fiber. Supports vertex coloring for collision heatmaps. Three.js native support on both web and mobile._

---

## Appendix A: Competitive Landscape

**Current alternatives:**

- Generic CAD software (SolidWorks, Fusion 360) - powerful but requires expertise and manual modeling
- Community forums and spreadsheets - fragmented, no visualization
- Trial and error with physical mockups - expensive and time-consuming

**SwapSpec differentiation:**

- Purpose-built for engine swaps (not generic CAD)
- LiDAR scanning eliminates need to model from scratch
- AI advisor provides expert guidance without expert knowledge
- Growing library means less scanning over time

---

## Appendix B: Example AI Advisor Interactions

**Example 1: Fuel System Query**

> **User:** "Will my stock fuel pump work with the LS3?"
>
> **Advisor:** "The LS3 requires 58 psi fuel pressure and approximately 450 lph flow at peak demand. Stock Fox Body Mustang fuel pumps typically deliver 88 lph at 40 psi—significantly under the LS3's requirements. You'll need a high-flow fuel pump upgrade. Common options include the Walbro 525 (525 lph) or DeatschWerks DW400 (415 lph). You'll also need a fuel pressure regulator capable of 58 psi if your current setup is lower pressure."

**Example 2: Clearance Issue**

> **User:** "Why is there a red zone near my steering shaft?"
>
> **Advisor:** "The current engine position places the driver-side exhaust manifold within 0.3 inches of your steering shaft. Under engine torque, this could cause contact. You have a few options:
>
> 1. Reposition the engine 0.5" toward passenger side (check other clearances)
> 2. Use a different header design—Hooker 2466 mid-length headers route away from the steering shaft
> 3. Relocate the steering shaft with an aftermarket column drop kit
>
> Would you like me to explain any of these options in more detail?"

**Example 3: Cooling Recommendation**

> **User:** "Do I need a bigger radiator?"
>
> **Advisor:** "The LS3 produces 430 hp and generates approximately 4,300 BTU/min of heat at full load. Your stock Fox Body radiator is rated for roughly 2,800 BTU/min. For street driving with occasional spirited use, you'll want at minimum a 3-row aluminum radiator (like the Mishimoto MMRAD-MUS-79). If you plan to track the car, consider a 4-row or adding an auxiliary transmission cooler and dual electric fans."
