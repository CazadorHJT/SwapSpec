Product Requirements Document (PRD): SwapSpec
Project Name
SwapSpec
Version
1.0
Status
Draft
Target Platform
Mobile App (iOS/Android) & Web Dashboard
Core Focus
AI-driven Engine Swap Compatibility & 3D Visualization

1. Executive Summary
SwapSpec is a digital tool designed to de-risk automotive engine swaps. By utilizing AI-enhanced photogrammetry and LiDAR scanning, the application analyzes the 3D volume of a classic car's engine bay and compares it against a library of digital crate engines. The system visualizes the fitment, highlights interference points (collisions), and identifies required modifications (e.g., "requires transmission tunnel widening" or "oil pan conflict"), turning weeks of trial-and-error fabrication into minutes of digital planning. Once the database of most common cars/engine bays and engines/transmissions is developed with all high quality scans, most users won’t need to scan their car and will just be able to use existing scans to plan builds unless they have a very rare or heavily modified car.

2. Target Audience (Personas)
2.1. The "Garage Fabricator" (Primary)
Profile: Hobbyist working on a project car (e.g., '69 Camaro, '92 240SX) on weekends.
Pain Point: Buys an engine, realizes the oil pan hits the subframe, has to weld custom mounts or resell the engine at a loss.
Goal: Wants to know if an LS3 fits before spending $10,000.
2.2. The "Restomod Shop" (Secondary)
Profile: Professional custom car builder.
Pain Point: Wasted labor hours mocking up engines and ordering parts that don't fit.
Goal: Precise planning to quote customers accurately for fabrication work.
2.3. The "Crate Engine Retailer" (B2B)
Profile: Companies like Summit Racing, Jegs, or GM Performance.
Goal: Wants to reduce returns due to fitment issues by offering a "Verified Fit" badge on their website.
3. Functional Requirements
3.1. Engine Bay Analysis (Input)
FR 1.0 - Mobile LiDAR Scanning: The app must utilize mobile LiDAR (e.g., iPhone Pro) to generate a point-cloud scan of the user's empty engine bay.
FR 1.1 - AI Feature Recognition: The AI must parse the 3D scan to identify and label critical "Hard Points":
Firewall
Subframe / K-Member
Steering column/rack
Shock towers
Brake booster/Master cylinder
Hood clearance line
FR 1.2 - Manual Dimension Override: Users must be able to manually input specific measurements (frame rail width) to calibrate the scale if scanning is unavailable.
FR 1.3 - Chassis/ Car Classification: To scan and upload a car, the user must also input the car’s VIN, the VIN is used to file the scan under the exact year, make, model, and tier option of the car so that when others use the scan they know the exact car it represents. If the car is not stock, the user must specify what modifications have been done.

3.2. Engine & Parts Database (Library)
FR 2.0 - 3D Car Scans Library: A  database of 3D scans of classic cars, more specifically the engine bay and underside, sourced from other users scans.
FR 2.1 - Digital Asset Library: A database of common swap engines (LS, Coyote, Hemi, 2JZ, K-Series, B58) and transmissions (T56, TR6060, 4L80E).
FR 2.2 - Accessory Configurator: Users can toggle engine accessories that affect dimensions:
Headers (Stock manifolds vs. Long-tubes vs. Turbo logs)
Oil Pan (Front sump vs. Rear sump)
Intake Manifold heights (Truck intake vs. Car intake)
FR 2.3 - Chassis and engine matching (without scanning): For app users on the web application or with a phone/ device with no lidar camera capabilities, they can still use existing scans in the database to model swaps and plan a build.
3.3. The "Virtual Swap" (Simulation)
FR 3.0 - Auto-Placement: The AI attempts to place the engine in the bay based on standard driveline angles (typically 3-5 degrees down).
FR 3.1 - Manual Manipulation: Users can drag, rotate, and tilt the engine model within the bay along X, Y, and Z axes.
FR 3.2 - Dynamic Clearance Check:
Static: Does it fit with the hood closed?
Dynamic (Delighter): Simulation of engine rock/torque to see if headers hit the steering shaft under load.
3.4. Conflict Detection & Reporting
FR 4.0 - Heatmap Visualization:
Green: Clear (>1 inch clearance).
Yellow: Tight/Warning (<0.5 inch clearance).
Red: Collision (Parts intersecting).
FR 4.1 - Fabrication Alerts: The system generates a text report describing the conflict (e.g., "Alternator interferes with passenger shock tower - High Mount Accessory Drive required", “OEM motor mounts will not work for new engine - custom motor mounts will need to be fabricated”).
FR 4.2 - Functionality of All Parts Together: Highlights custom/ adaption work required to make the build work, (engine and transmission to work together needs an adapter plate, transmission to axel via custom driveshaft, retain 4wd via transfercase, ECM connecting to oem wiring).
FR 4.3 - Durability of Engine/Transmission with supporting components: Highlights the supporting components that will need to be upgraded to support increased HP and torque from new engine, (upgraded radiator for improved cooling, upgraded axels/ cam shafts/ driveshafts to handle more power, upgraded brakes/rotor sizes for increased braking capability, upgraded suspension for heavier engine).
4. Technical Architecture (High Level)
4.1. The AI/ML Layer
Input Processing: Photogrammetry software (e.g., RealityCapture API) converts user video/photos into 3D meshes.
Segmentation: Computer Vision models (trained on automotive chassis data) segment the "Keep Out" zones (areas that cannot be easily cut, like frame rails).
Fitment Algorithm: A physics-based collision detection engine (similar to Unity or Unreal Engine logic).
4.2. Database Schema (Simplified)
Engines: EngineID, Model, MeshFile, MountPoints, Dimensions(H,W,L), AccessoryVariants.
Vehicles: VehicleID, Year, Make, Model, BayScanData (User generated or stock library).
5. User Experience (UX) Workflow
Onboarding: User selects their vehicle (e.g., 1967 Ford Mustang).
Capture: User follows an AR-guided tutorial to scan their open engine bay using their phone camera.
Clean Up: The AI removes "noise" (hoses, wires that can be moved) and solidifies the hard surfaces.
Selection: User selects the drivetrain (e.g., "Ford Godzilla 7.3L" + "10R80 Trans").
Analysis: The app processes the fitment.
Results View:
User sees a 3D model of the engine inside their scan.
Red bounding boxes appear where the transmission tunnel is too narrow.
User toggles "Aftermarket Headers" to see if that resolves a steering clearance issue.
Export: User generates a "Build Sheet" listing compatible parts (e.g., "Requires Holley 302-1 Oil Pan").
6. Non-Functional Requirements
Accuracy: Measurements must be accurate within ±5mm to be viable for fabrication planning.
Performance: 3D rendering must maintain 30fps on mid-range mobile devices.
Offline Mode: Users can view downloaded engine models and their local scan without an active connection (useful in metal workshops with bad signal).
7. Roadmap & Phasing
Phase 1: The MVP (Minimum Viable Product)
Manual dimension input (no scanning yet) or selection from a pre-scanned library of popular cars (Camaro, Mustang, C10).
Library of top 3 engines (LS, Coyote, Hemi).
Basic visual collision detection (Red/Green).
Phase 2: The "Scanner" Update
Integration of mobile LiDAR scanning for custom user engine bays.
Expanded library of aftermarket parts (turbos, superchargers).
Phase 3: The Marketplace (Monetization)
To gain access to the software you can purchase one off models and  scan your own or if it is a professional shop doing multiple scans often it is a subscription model.
"Buy this Build": If the AI says it fits with specific mounts and headers, link directly to buy those parts with affiliate links.

8. Potential Risks & Mitigation
Risk: User scan is messy/inaccurate.
Mitigation: AR guidance overlays during scanning to ensure coverage; Warning system if point cloud density is too low.
Have SwapSpec approved scans in the database that are reviewed and high quality.
Risk: Aftermarket variations (e.g., a user has a custom steering rack not in the database).
Mitigation: Allow users to place "Generic Keep-Out Zones" (red blocks) in the 3D viewer to represent custom parts they have installed.
