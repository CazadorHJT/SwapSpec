# Product Requirements Document (PRD): SwapSpec

| Field | Value |
|-------|-------|
| **Project Name** | SwapSpec |
| **Version** | 2.0 |
| **Status** | Draft |
| **Target Platform** | Mobile App (iOS/Android) with future Web Dashboard |
| **Core Focus** | AI-Driven Engine Swap Planning & 3D Visualization |

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
The app must utilize mobile LiDAR (iPhone Pro, iPad Pro, or Android devices with LiDAR) to generate a 3D mesh scan of the user's engine bay and chassis.

**FR 1.1 - User-Guided Scan Cleanup**
Users manually mark removable components (hoses, wiring, accessories, non-permanent items). The AI assists by:
- Highlighting the marked regions
- Cleanly removing them from the mesh upon user confirmation
- The system will NOT auto-delete any geometry without explicit user approval

**FR 1.2 - Manual Dimension Override**
Users can manually input specific measurements (e.g., frame rail width, firewall-to-radiator support distance) to calibrate scale if scanning produces unexpected results.

**FR 1.3 - Vehicle Classification**
To upload a scan, users must input the vehicle's VIN. The VIN is used to categorize the scan by exact year, make, model, and trim level. If the vehicle is modified, users must specify what modifications have been made (e.g., "tubbed rear wheel wells," "aftermarket K-member").

**FR 1.4 - Scan Accuracy Disclaimer**
All scans include a disclaimer: "Scans are for planning purposes. Verify critical dimensions before fabrication." Future enhancement: optional calibration step using a known-dimension reference object.

---

### 3.2. Engine & Parts Database (Library)

**FR 2.0 - 3D Vehicle Scan Library**
A database of 3D scans of vehicle engine bays and undersides, sourced from:
- Founder-sourced scans of common platforms
- User-contributed scans (see Section 3.5)

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

---

### 3.3. The "Virtual Swap" (3D Simulation)

**FR 3.0 - Auto-Placement**
The system attempts initial engine placement based on standard driveline angles (typically 3-5 degrees down) and centered between frame rails.

**FR 3.1 - Manual Manipulation**
Users can drag, rotate, and tilt the engine/transmission assembly within the bay along X, Y, and Z axes with precise numeric input available.

**FR 3.2 - Clearance Visualization**

| Zone | Meaning |
|------|---------|
| **Green** | Clear (>1 inch clearance) |
| **Yellow** | Tight (<0.5 inch clearance) - may work but verify |
| **Red** | Collision (parts intersecting) |

**FR 3.3 - Dynamic Clearance Check (Future Enhancement)**
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
Before a user-submitted scan enters the public library, it must pass:
- Automated quality checks (mesh completeness, point density)
- Manual review for accuracy and proper classification
- Scans that fail review remain usable by the uploader but are not published publicly

---

### 3.6. AI Build Advisor

**FR 6.0 - Conversational Interface**
An AI-powered chat interface where users can ask questions about their build in natural language.

**FR 6.1 - Structured Data Integration**
The AI advisor queries a structured database of engine specifications to provide accurate technical information:
- Fuel pressure and flow requirements
- Cooling capacity recommendations
- Power output and torque characteristics
- Physical dimensions and weight
- Common swap considerations

**FR 6.2 - Context-Aware Responses**
The AI advisor has access to:
- The user's selected vehicle scan
- The user's selected engine/transmission
- Current collision detection results
- The user's previous questions in the session

**FR 6.3 - Advisory Scope**
The AI advisor can assist with:
- Explaining why a collision is occurring and potential solutions
- Recommending specific parts that resolve fitment issues
- Advising on fuel system requirements for the selected engine
- Recommending cooling system upgrades
- Explaining drivetrain compatibility (engine + transmission + transfer case)
- Discussing axle and driveshaft strength requirements
- General engine swap guidance and best practices

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

### 4.1. Mobile Application (Unity)

The mobile app will be built in **Unity** targeting iOS and Android from a single codebase.

| Component | Technology |
|-----------|------------|
| 3D Engine | Unity |
| AR/LiDAR Scanning | ARKit (iOS), ARCore (Android) via Unity plugins |
| 3D Mesh Processing | Unity mesh tools + custom processing |
| UI Framework | Unity UI Toolkit |

**Rationale for Unity:**
- Cross-platform (iOS + Android) from day one
- Excellent 3D rendering and manipulation capabilities
- Strong AR/LiDAR plugin ecosystem
- Large developer talent pool for future scaling
- WebGL export option for future web version

### 4.2. Backend Services (Cloud)

```
┌─────────────────────────────────────────────┐
│              Mobile App (Unity)             │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ LiDAR        │  │ 3D Viewer           │  │
│  │ Scanning     │  │ (Engine in Bay)     │  │
│  └──────────────┘  └─────────────────────┘  │
│  ┌──────────────────────────────────────┐   │
│  │ AI Chat Interface                    │   │
│  └──────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │ REST API
                  ▼
┌─────────────────────────────────────────────┐
│              Backend Services               │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Engine/Car   │  │ LLM API             │  │
│  │ Spec Database│  │ (Claude or GPT)     │  │
│  └──────────────┘  └─────────────────────┘  │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ User Auth &  │  │ 3D Scan Storage     │  │
│  │ Accounts     │  │ (S3 or similar)     │  │
│  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 4.3. AI Advisor Architecture

The AI Build Advisor uses a hybrid approach:

1. **Structured Database:** Contains verified specifications for engines, transmissions, and common components (fuel requirements, cooling needs, dimensions, weights)

2. **LLM Layer:** Provides natural language understanding and response generation, retrieves data from the structured database rather than generating technical specs

3. **Context Injection:** Each AI query includes relevant context (selected vehicle, selected engine, current conflicts) so responses are specific to the user's build

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
2. **Vehicle Selection:** User either:
   - Selects their vehicle from the existing scan library, OR
   - Scans their own vehicle using LiDAR
3. **Scan Cleanup (if scanning):** User marks and removes non-permanent items (hoses, wires)
4. **Drivetrain Selection:** User selects target engine and transmission from library
5. **Accessory Configuration:** User toggles relevant options (oil pan type, headers, intake)
6. **Analysis:** App processes fitment and displays collision heatmap
7. **Exploration:** User manipulates engine position, toggles accessories, chats with AI advisor
8. **Export:** User generates build sheet with parts list and modification requirements

### 5.2. Returning User Flow

1. **Login:** Access existing projects
2. **Continue or New:** Resume a saved build or start a new project
3. **Library Contribution:** Review and approve any pending scan submissions

---

## 6. Non-Functional Requirements

**NFR 1.0 - Scan Accuracy**
LiDAR scans should be accurate within ±1-2 cm, sufficient for planning-level fitment decisions. Users are advised to verify critical dimensions before fabrication.

**NFR 2.0 - Rendering Performance**
3D rendering must maintain 30fps on mid-range mobile devices (iPhone 12, Pixel 6 equivalent).

**NFR 3.0 - Offline Capability**
Users can view downloaded engine models and their saved scans without an active internet connection. AI advisor requires connectivity.

**NFR 4.0 - Data Security**
User account data and payment information handled via industry-standard encryption. Scan data stored securely with user access controls.

---

## 7. Business Model

### 7.1. Pricing Tiers

| Tier | Target User | Model | Features |
|------|-------------|-------|----------|
| **Free** | All users | $0 | Account creation, browse library, view community builds (view-only) |
| **Per-Project** | Hobbyist | One-time fee per build (pricing TBD) | Full access to one build project: scanning, visualization, AI advisor, export |
| **Subscription** | Professional Shops | Monthly or annual (pricing TBD) | Unlimited projects, multiple concurrent builds, priority support |

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

---

## 9. Roadmap & Phasing

### Phase 1: Proof of Concept MVP

**Goal:** Demonstrate core value proposition with minimal but functional scope

**Deliverables:**
- 1 founder-scanned vehicle (common platform, e.g., Fox Body Mustang or S10)
- 1-2 scanned engines/transmissions (LS-based, sourced or scanned)
- Functional LiDAR scanning workflow with user-guided cleanup
- 3D visualization with manual engine positioning
- Basic collision detection (red/green/yellow)
- AI Build Advisor with conversational guidance
- Basic build summary export

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
- Web application (library browsing, build planning without scanning)
- Affiliate integration for parts purchasing
- B2B API exploration with crate engine retailers
- Advanced features: dynamic clearance simulation, detailed fabrication specs

---

## 10. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| User scans are low quality or inaccurate | AR-guided scanning tutorial; automated quality checks; warning system for low-density meshes; clear disclaimer that scans are for planning |
| Scan library is too small to be useful | Founder commits to scanning 10+ common platforms; user contribution agreement builds library; focus marketing on users who will scan their own vehicles initially |
| AI advisor gives inaccurate technical advice | Technical specs pulled from structured database, not generated; disclaimers on safety-critical recommendations; user feedback loop to identify errors |
| LiDAR accuracy insufficient for planning | Testing with real fabrication to validate; calibration option for improved accuracy; clear communication that this is planning tool, not fabrication drawing |
| Unity development complexity | Start with focused MVP scope; leverage Unity asset store and existing AR plugins; consider contractor support for complex 3D features |

---

## 11. Success Metrics

### 11.1. Product Metrics

| Metric | Target (MVP) | Target (Scale) |
|--------|--------------|----------------|
| Scan completion rate | >70% of started scans | >85% |
| Build projects completed | Track baseline | 50% month-over-month growth |
| AI advisor usage | >50% of users engage | >80% |
| Collision identification accuracy | Validate with 3+ real builds | >95% accuracy |

### 11.2. Business Metrics

| Metric | Target |
|--------|--------|
| User registrations | Track and grow |
| Conversion (free to paid) | Establish baseline, then optimize |
| Scan library growth | 10+ vehicles in Year 1 |
| Shop subscription retention | >80% annual renewal |

### 11.3. Validation Metric (Critical)

**Real-world accuracy:** Founder completes at least one engine swap planned entirely in SwapSpec. All predicted clearance issues and modifications should match reality. This validates the core value proposition.

---

## 12. Open Questions

1. **Specific pricing:** What price point for per-project and subscription tiers? (Requires market research)
2. **Engine spec data source:** Where to source verified fuel/cooling/dimension specs for engine database?
3. **Scan file format:** What mesh format balances quality and file size? (glTF, OBJ, FBX, proprietary?)
4. **LLM provider:** Claude API vs. OpenAI vs. other for AI advisor? (Cost, capability, terms of service)

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
> 1. Reposition the engine 0.5" toward passenger side (check other clearances)
> 2. Use a different header design—Hooker 2466 mid-length headers route away from the steering shaft
> 3. Relocate the steering shaft with an aftermarket column drop kit
>
> Would you like me to explain any of these options in more detail?"

**Example 3: Cooling Recommendation**
> **User:** "Do I need a bigger radiator?"
>
> **Advisor:** "The LS3 produces 430 hp and generates approximately 4,300 BTU/min of heat at full load. Your stock Fox Body radiator is rated for roughly 2,800 BTU/min. For street driving with occasional spirited use, you'll want at minimum a 3-row aluminum radiator (like the Mishimoto MMRAD-MUS-79). If you plan to track the car, consider a 4-row or adding an auxiliary transmission cooler and dual electric fans."
