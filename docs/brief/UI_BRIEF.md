Table of Contents

# **RTIH AP Godavari Pushkaralu 2027 — Staff & Vendor Mobile App UI Brief**

## **Comprehensive Design & Development Specification**

**Document Purpose:** This document serves as a direct, machine-readable input for ChatGPT-to-Figma UI design generation. Every screen, component, interaction state, spacing token, animation curve, and responsive breakpoint is specified to the pixel level. The document also includes a complete development plan for building the functional solution.

**Target Platform:** Native Mobile Application (React Native — iOS & Android) **Primary Users:** Field Staff (Zone Marshals, Traffic Controllers, Medical Teams), Vendor Inspectors, Shift Supervisors **Operating Context:** Outdoor use under direct sunlight, one-handed operation, unreliable network, 8–12 hour shifts, gloved hands possible **Design System:** Custom — “Godavari Field” design system

---

# **PART A — UI DESIGN SPECIFICATION**

---

## **1\. Design Philosophy & Principles**

### **1.1 Core Design Tenets**

| \# | Principle | Rule | Rationale |
| :---- | :---- | :---- | :---- |
| P1 | 3-Tap Maximum | Any primary action must be completable in 3 taps or fewer from the home screen | Field staff cannot spend time navigating deep hierarchies during incidents |
| P2 | Outdoor Legibility | Minimum contrast 7:1 for critical text; large bold type; high-saturation status colours | Bright sunlight washes out low-contrast UI; operators may be squinting |
| P3 | One-Handed Operation | All primary actions reachable with thumb in the bottom 60% of the screen; no pinch or two-finger gestures required | Staff carry radios, torches, or equipment in the other hand |
| P4 | Offline-First | All core workflows (task acceptance, inspection forms, field reports) function without network; sync transparently when connection returns | Network coverage at ghats is intermittent; dead zones exist |
| P5 | Glove-Friendly Targets | Minimum touch target 48×48px with 8px inter-target gap; swipe gestures have generous thresholds (\>40px) | Some staff wear work gloves; sweaty/wet hands reduce touch precision |
| P6 | Battery Conservation | Dark-default theme; minimal background polling; GPS sampling at 30-second intervals (not continuous) | 8–12 hour shifts; phone battery must last the full shift |

### **1.2 Accessibility Requirements**

* **WCAG 2.1 AA** compliance minimum; AAA for status indicators and emergency UI

* All colour pairs pass 7:1 contrast ratio (optimised for sunlight)

* Status indicators use icon \+ colour \+ text label (never colour alone)

* Full VoiceOver/TalkBack support for all interactive elements

* Font scaling tested up to 150% without layout breakage

* Haptic feedback for critical alerts (strong vibration pattern: 200ms-pause-200ms-pause-400ms)

* Audio alerts for incoming dispatches (distinct notification sound)

* All animations respect prefers-reduced-motion

### **1.3 Privacy-First Design Consideration**

* Staff app never displays camera feeds from bathing ghat zones

* Radar zone data appears as numerical crowd counts and directional flow arrows — no visual imagery

* Smart Glasses image uploads are routed directly to S1 for AI processing; staff app shows only analysis results, not raw images

* Staff location is tracked for dispatch purposes; staff can see their own GPS dot but not other staff unless they hold Supervisor role

---

## **2\. Design Token System**

### **2.1 Colour Tokens**

#### **Dark Theme (Default — Battery Conservation & Outdoor Readability)**

| Token Name | Hex | RGB | Usage | WCAG vs \#0D1117 |
| :---- | :---- | :---- | :---- | :---- |
| \--color-bg-primary | \#0D1117 | 13, 17, 23 | App background | — |
| \--color-bg-secondary | \#161B22 | 22, 27, 34 | Card surfaces, input backgrounds | — |
| \--color-bg-tertiary | \#21262D | 33, 38, 45 | Hover/pressed states, dividers | — |
| \--color-bg-elevated | \#1C2128 | 28, 33, 40 | Modals, bottom sheets | — |
| \--color-text-primary | \#F0F6FC | 240, 246, 252 | Headings, body text, primary labels | 17.1:1 |
| \--color-text-secondary | \#8B949E | 139, 148, 158 | Timestamps, metadata, secondary labels | 5.3:1 |
| \--color-text-tertiary | \#6E7681 | 110, 118, 129 | Disabled text, placeholders | 3.5:1 (decorative) |
| \--color-text-inverse | \#0D1117 | 13, 17, 23 | Text on light/coloured buttons | — |
| \--color-brand-primary | \#1F6FEB | 31, 111, 235 | Primary action buttons, active tab indicators | 4.8:1 |
| \--color-brand-secondary | \#388BFD | 56, 139, 253 | Links, interactive highlights | 5.5:1 |
| \--color-status-normal | \#3FB950 | 63, 185, 80 | Completed tasks, online status, healthy | 7.2:1 |
| \--color-status-warning | \#D29922 | 210, 153, 34 | Pending tasks, degraded, attention needed | 6.1:1 |
| \--color-status-critical | \#F85149 | 248, 81, 73 | Urgent dispatch, SOS, offline | 5.1:1 |
| \--color-status-info | \#58A6FF | 88, 166, 255 | Informational, new assignment | 6.4:1 |
| \--color-surface-task-urgent | \#2D1B1B | 45, 27, 27 | Urgent task card background tint | — |
| \--color-surface-task-active | \#1B2D1E | 27, 45, 30 | Active task card background tint | — |
| \--color-surface-task-pending | \#2D2B1B | 45, 43, 27 | Pending task card background tint | — |
| \--color-border-default | \#30363D | 48, 54, 61 | Card borders, dividers | — |
| \--color-border-focus | \#1F6FEB | 31, 111, 235 | Focus ring colour | — |
| \--color-overlay-scrim | rgba(0,0,0,0.6) | — | Bottom sheet backdrop | — |

#### **Light Theme (Optional — User Toggle)**

| Token Name | Hex | Usage |
| :---- | :---- | :---- |
| \--color-bg-primary | \#FFFFFF | App background |
| \--color-bg-secondary | \#F6F8FA | Card surfaces |
| \--color-bg-tertiary | \#EAEEF2 | Hover/pressed |
| \--color-text-primary | \#1F2328 | All primary text |
| \--color-text-secondary | \#656D76 | Secondary labels |
| \--color-border-default | \#D0D7DE | Card borders |
| Status colours | Same hex values | High-sat works on both themes |

#### **Semantic Colour Rules**

* **Task Priority Border:** 4px left border — Urgent: \#F85149, High: \#D29922, Normal: \#3FB950, Low: \#8B949E

* **Vendor Inspection Grade:** Pass: \#3FB950, Conditional: \#D29922, Fail: \#F85149

* **Offline Indicator Bar:** Full-width 4px top bar \#D29922 with animated chevron pattern

* **GPS Signal Strength:** Strong (3 bars green), Medium (2 bars amber), Weak (1 bar red), None (X red)

### **2.2 Typography Tokens**

**Font Stack:** \- Primary: 'Inter', system-ui, \-apple-system, sans-serif \- Monospace: 'JetBrains Mono', 'Courier New', monospace \- Regional: Noto Sans Telugu (Telugu), Noto Sans Devanagari (Hindi) — for vendor names, location labels

**Type Scale:**

| Token | Font | Size | Line Height | Weight | Letter Spacing | Usage |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| \--type-display | Inter | 32px | 40px | 700 | \-0.02em | KPI numbers, large counters |
| \--type-h1 | Inter | 22px | 28px | 700 | \-0.01em | Screen titles |
| \--type-h2 | Inter | 18px | 24px | 600 | 0 | Section headers, card titles |
| \--type-h3 | Inter | 16px | 22px | 600 | 0 | Subsection labels |
| \--type-body | Inter | 16px | 24px | 400 | 0 | Body text, descriptions (deliberately larger for outdoor legibility) |
| \--type-body-strong | Inter | 16px | 24px | 600 | 0 | Emphasized body, active labels |
| \--type-caption | Inter | 13px | 18px | 400 | 0.01em | Timestamps, metadata |
| \--type-caption-strong | Inter | 13px | 18px | 600 | 0.01em | Badge labels, tab labels |
| \--type-mono | JetBrains Mono | 13px | 18px | 400 | 0 | Coordinates, task IDs, timestamps |
| \--type-button | Inter | 16px | 20px | 600 | 0.02em | Button labels, uppercase |
| \--type-tab | Inter | 13px | 16px | 600 | 0.04em | Bottom tab bar labels, uppercase |

### **2.3 Spacing Tokens**

**Base Unit:** 4px

| Token | Value | Usage |
| :---- | :---- | :---- |
| \--space-1 | 4px | Icon-to-text inline gap |
| \--space-2 | 8px | Badge padding, list item gap |
| \--space-3 | 12px | Card internal padding (compact) |
| \--space-4 | 16px | Standard padding, screen edge gutters |
| \--space-5 | 20px | Section vertical spacing |
| \--space-6 | 24px | Card-to-card vertical gap, major breaks |
| \--space-8 | 32px | Large section padding |
| \--space-10 | 40px | Screen top padding (below header) |
| \--space-12 | 48px | Bottom tab bar height padding |

### **2.4 Elevation & Shadow Tokens**

| Token | Value | Usage |
| :---- | :---- | :---- |
| \--shadow-card | 0 2px 8px rgba(0,0,0,0.3) | Cards, elevated surfaces |
| \--shadow-bottom-sheet | 0 \-4px 16px rgba(0,0,0,0.4) | Bottom sheets |
| \--shadow-fab | 0 4px 12px rgba(0,0,0,0.4) | Floating action buttons |
| \--shadow-toast | 0 4px 16px rgba(0,0,0,0.5) | Toast notifications |

### **2.5 Border Radius Tokens**

| Token | Value | Usage |
| :---- | :---- | :---- |
| \--radius-sm | 6px | Badges, chips, small inputs |
| \--radius-md | 10px | Cards, buttons |
| \--radius-lg | 16px | Bottom sheets, modals |
| \--radius-xl | 20px | Full-screen overlays |
| \--radius-full | 9999px | Avatar circles, status dots, pills |

### **2.6 Animation Tokens**

| Token | Value | Usage |
| :---- | :---- | :---- |
| \--ease-default | cubic-bezier(0.4, 0, 0.2, 1\) | General transitions |
| \--ease-spring | cubic-bezier(0.34, 1.56, 0.64, 1\) | Card press, button feedback |
| \--duration-instant | 100ms | Colour/opacity changes |
| \--duration-fast | 200ms | Button press, tab switch |
| \--duration-normal | 300ms | Card expand, bottom sheet slide |
| \--duration-slow | 500ms | Screen transitions |
| \--haptic-light | 10ms single | Button tap confirmation |
| \--haptic-medium | 30ms single | Task accepted |
| \--haptic-heavy | 50ms single | Action completed |
| \--haptic-alert | 200ms-100ms-200ms-100ms-400ms | Urgent dispatch received |

### **2.7 Icon System**

* **Library:** Lucide Icons (MIT license, 24×24 grid, 1.5px stroke)

* **Sizes:** 20×20px (inline), 24×24px (standard), 32×32px (large actions), 48×48px (tab bar active)

* **Stroke Width:** 2px (increased from default 1.5px for outdoor legibility)

**Key Icon Mappings:**

| Function | Lucide Name | Size |
| :---- | :---- | :---- |
| Task Inbox | inbox | 24px |
| Active Task | play-circle | 24px |
| Complete Task | check-circle-2 | 24px |
| Vendor Inspection | clipboard-check | 24px |
| Field Report | file-text | 24px |
| Zone Map | map-pin | 24px |
| Camera (for Smart Glasses upload) | camera | 24px |
| Radar Zone | shield | 24px |
| SOS Emergency | phone-call | 32px |
| Navigation | navigation | 24px |
| Offline | wifi-off | 20px |
| Sync | refresh-cw | 20px |
| Photo Capture | image | 24px |
| Scan QR | scan-line | 24px |
| Settings | settings | 24px |
| Shift Status | clock | 20px |

### **2.8 Z-Index Layers (React Native)**

| Layer | Elevation | Elements |
| :---- | :---- | :---- |
| Base Content | 0 | Screens, lists, cards |
| Sticky Header | 4 | Screen header bar |
| FAB | 6 | Floating action button |
| Bottom Tab Bar | 8 | Navigation tabs |
| Bottom Sheet | 12 | Task detail, inspection form |
| Toast | 16 | Notification toasts |
| Modal | 20 | Confirmation dialogs, alerts |
| Emergency Overlay | 24 | SOS activation, dispatch alert |

---

## **3\. Screen Architecture**

### **3.1 Application Shell**

┌─────────────────────────────────────────┐  
│ STATUS BAR (system — 44px iOS / var Android)│  
├─────────────────────────────────────────┤  
│ SCREEN HEADER (56px)                    │  
│ \[☰ or ←\]  Screen Title     \[🔔\] \[⚙\]   │  
├─────────────────────────────────────────┤  
│                                         │  
│                                         │  
│ CONTENT AREA                            │  
│ (scrollable, calc(100% \- header \- tab)) │  
│                                         │  
│                                         │  
│                                         │  
│                                         │  
│                                         │  
├─────────────────────────────────────────┤  
│ BOTTOM TAB BAR (64px \+ safe area)       │  
│ 📋Tasks  🗺Map  📝Report  👤Profile     │  
└─────────────────────────────────────────┘

**Safe Area Handling:** \- iOS: safeAreaInsets respected — content starts below notch, tabs above home indicator \- Android: Status bar padding calculated dynamically \- Bottom safe area: 34px on iPhone with home indicator, 0 on Android

### **3.2 Screen Header — Detailed Specification**

┌──────────────────────────────────────────┐  
│ \[☰\]  My Tasks                \[🔔 3\] \[⚙\] │  
└──────────────────────────────────────────┘

| Element | Position | Size | Styling |
| :---- | :---- | :---- | :---- |
| Background | Full width | 56px height | \--color-bg-secondary \+ bottom border 1px \--color-border-default |
| Menu / Back | Left, 16px from edge | 44×44px touch target (icon 24px) | Ghost button; ☰ on root screens, ← on sub-screens |
| Title | Centre-aligned | Auto | \--type-h2 (18px/600), \--color-text-primary |
| Notification Bell | Right section | 44×44px touch target | Bell icon 24px; red badge (min 18px circle) with count if \>0 |
| Settings Gear | Right edge, 16px margin | 44×44px touch target | Settings icon 24px, \--color-text-secondary |

### **3.3 Bottom Tab Bar — Detailed Specification**

┌──────────────────────────────────────────┐  
│  📋        🗺        📝        👤        │  
│ Tasks     Map     Report    Profile      │  
└──────────────────────────────────────────┘

| Element | Styling |
| :---- | :---- |
| Background | \--color-bg-secondary \+ top border 1px \--color-border-default |
| Height | 64px content \+ safe area bottom inset |
| Tabs | 4 equal-width items, centred vertically |
| Icon Size (Inactive) | 24×24px, \--color-text-tertiary |
| Icon Size (Active) | 28×28px, \--color-brand-primary, filled variant |
| Label (Inactive) | \--type-tab (13px/600), \--color-text-tertiary, uppercase |
| Label (Active) | \--type-tab (13px/600), \--color-brand-primary, uppercase |
| Active Indicator | 3px wide × 24px high rounded pill above icon, \--color-brand-primary |
| Touch Target | Full tab width × 64px |
| Badge (Tasks) | Red dot or count badge on Tasks tab when new dispatch arrives |

### **3.4 Offline Indicator Bar**

When device is offline:

┌──────────────────────────────────────────┐  
│ ⚠ OFFLINE — Tasks queued locally         │  
│ ◁◁◁◁◁◁◁◁◁◁◁◁◁◁◁◁◁ animated chevrons    │  
└──────────────────────────────────────────┘

* Position: Fixed below header, above content

* Height: 36px

* Background: \--color-status-warning at 15% opacity

* Text: \--type-caption-strong, \--color-status-warning

* Icon: wifi-off 16px

* Animated chevron pattern: moves left-to-right at 2s cycle, indicates “queued”

* Disappears with slide-up animation when online returns

* Transitions to “Syncing…” with refresh-cw spinner, then “All synced ✓” for 2 seconds

---

## **4\. Screen Specifications**

### **4.1 Screen 1: Tasks (Home Screen)**

**Purpose:** Central task management hub — view incoming dispatches, active tasks, task history.

┌──────────────────────────────────────────┐  
│ \[☰\]  My Tasks                \[🔔 3\] \[⚙\] │  
├──────────────────────────────────────────┤  
│                                          │  
│ ┌──────────────────────────────────────┐ │  
│ │ 🔴 ACTIVE TASK                       │ │  
│ │ Crowd Control — Ghat \#3, Zone A      │ │  
│ │ Dispatched 4 min ago                 │ │  
│ │ ━━━━━━━━━━━━━━━━━━━━━━ 60% ━━━━━━━  │ │  
│ │ \[📍 Navigate\]         \[✓ Complete\]   │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ INCOMING (2)                             │  
│ ┌──────────────────────────────────────┐ │  
│ │ 🟡 Vendor Inspection Due             │ │  
│ │ Stall \#47, Zone B — Food Quality     │ │  
│ │ Due in 25 min                        │ │  
│ │         ← Swipe to Accept / Decline →│ │  
│ └──────────────────────────────────────┘ │  
│ ┌──────────────────────────────────────┐ │  
│ │ 🔵 Water Sensor Alert                │ │  
│ │ Sensor WQ-03, Zone A — pH Low        │ │  
│ │ Assigned 2 min ago                   │ │  
│ │         ← Swipe to Accept / Decline →│ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ COMPLETED TODAY (5)                      │  
│ ┌──────────────────────────────────────┐ │  
│ │ ✅ Traffic Control — Parking Lot B   │ │  
│ │ Completed 45 min ago · 12 min dur.   │ │  
│ └──────────────────────────────────────┘ │  
│ ... (scrollable)                         │  
│                                          │  
├──────────────────────────────────────────┤  
│  📋        🗺        📝        👤        │  
│ Tasks     Map     Report    Profile      │  
└──────────────────────────────────────────┘

**Section Breakdown:**

#### **Active Task Card (Top — Persistent)**

| Element | Specification |
| :---- | :---- |
| Container | Full-width minus 16px gutters, \--radius-md (10px), \--color-surface-task-active bg, 4px left border \--color-status-normal, \--shadow-card |
| Priority Badge | Top-left, 20px pill, \--color-status-critical bg (if urgent) or matching priority colour, white text \--type-caption-strong |
| Title | \--type-h2 (18px/600), \--color-text-primary, max 2 lines |
| Location | \--type-body (16px/400), \--color-text-secondary, map-pin icon 16px inline |
| Timestamp | \--type-mono (13px), \--color-text-secondary, relative time |
| Progress Bar | Full width, 6px height, \--radius-full, track \--color-bg-tertiary, fill \--color-status-normal, animated |
| Navigate Button | Left, 48px height, \--radius-md, outlined \--color-brand-primary, navigation icon \+ “Navigate” label |
| Complete Button | Right, 48px height, \--radius-md, filled \--color-status-normal, check-circle-2 icon \+ “Complete” label |
| Swipe Right | Opens task detail bottom sheet |
| Long Press (1s) | Opens quick actions: Escalate, Add Note, Request Backup |

#### **Incoming Task Cards**

| Element | Specification |
| :---- | :---- |
| Container | Full-width minus 16px gutters, \--radius-md, \--color-bg-secondary bg, 4px left border (priority colour), \--shadow-card |
| Swipe Right (\>80px) | Accept — card turns green tint, slides out right, haptic medium |
| Swipe Left (\>80px) | Decline — opens “Reason” bottom sheet (Busy, Too Far, Needs Specialist), card slides out left |
| Swipe Reveal Underlays | Right: green bg \+ ✓ Accept; Left: red bg \+ ✕ Decline |
| Tap | Opens task detail bottom sheet |
| Title | \--type-h3 (16px/600), \--color-text-primary |
| Location | \--type-body (16px/400), \--color-text-secondary |
| Due Time | \--type-caption (13px/400), right-aligned, colour matches urgency |

#### **Completed Task Cards**

| Element | Specification |
| :---- | :---- |
| Container | Full-width, \--radius-md, \--color-bg-secondary bg at 60% opacity, no left border |
| Icon | check-circle-2 20px, \--color-status-normal |
| Title | \--type-body (16px/400), \--color-text-secondary |
| Metadata | Completion time \+ duration, \--type-caption, \--color-text-tertiary |
| Tap | Opens completed task detail (read-only) |

#### **Section Headers**

* Text: \--type-caption-strong (13px/600), uppercase, \--color-text-secondary

* Count badge: \--radius-full, min 20px circle, \--color-bg-tertiary bg, \--color-text-primary text

* Padding: \--space-5 (20px) top, \--space-2 (8px) bottom

### **4.2 Screen 2: Zone Map**

**Purpose:** View assigned zone, navigate to task locations, see crowd density and facility positions.

┌──────────────────────────────────────────┐  
│ \[←\]  Zone A Map              \[Layers ▾\]  │  
├──────────────────────────────────────────┤  
│                                          │  
│ ┌──────────────────────────────────────┐ │  
│ │                                      │ │  
│ │       MAPBOX OFFLINE MAP             │ │  
│ │       (Full-screen)                  │ │  
│ │                                      │ │  
│ │   📍 You are here (blue pulse dot)   │ │  
│ │   🔴 Task location (red pin)         │ │  
│ │   🟢 Facilities (green icons)        │ │  
│ │   🟣 Radar zones (purple overlay)    │ │  
│ │   🔥 Heatmap overlay (crowd)         │ │  
│ │                                      │ │  
│ │                                      │ │  
│ │                                      │ │  
│ │                                      │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ ┌──────────────────────────────────────┐ │  
│ │ Active: Crowd Control — Ghat \#3      │ │  
│ │ Distance: 120m · ETA: 2 min walking  │ │  
│ │ \[📍 Navigate\]  \[📞 Call Dispatch\]    │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
├──────────────────────────────────────────┤  
│  📋        🗺        📝        👤        │  
│ Tasks     Map     Report    Profile      │  
└──────────────────────────────────────────┘

**Map Component:**

| Element | Specification |
| :---- | :---- |
| Provider | Mapbox GL JS (React Native Mapbox) with offline tile package (50MB per zone) |
| Default View | Centered on user location, zoom level showing assigned zone |
| User Location | Blue pulsing dot (16px, 2s pulse cycle), accuracy circle at 30% opacity |
| Task Pin | Red marker with priority icon, 40×40px touch target, bounces on arrival |
| Facility Icons | Category-coloured: Medical (red cross 32px), Toilet (blue 32px), Kiosk (purple 32px), Vending (green 32px) |
| Radar Overlay | Purple dashed border \+ shield icon \+ “Radar Only” label, crowd count numbers overlaid |
| Crowd Heatmap | Same gradient as dashboard (green→amber→red), 40% opacity |
| Controls | Zoom \+/- (bottom-right, 48×48px), Re-centre (bottom-right below zoom, 48×48px compass icon) |

**Map Layer Toggle (Dropdown):**

| Layer | Toggle | Default |
| :---- | :---- | :---- |
| Crowd Density | On/Off | On |
| Facilities | On/Off | On |
| Radar Zones | On/Off | On |
| Staff Positions | On/Off | Off (Supervisor only) |
| Traffic | On/Off | Off |

**Active Task Strip (Bottom of Map):** \- Position: Fixed bottom, above tab bar \- Height: 80px \- Background: \--color-bg-elevated, \--radius-lg (16px) top corners \- Shadow: \--shadow-bottom-sheet \- Drag up to reveal full task detail bottom sheet \- Content: Task name, distance, ETA, Navigate \+ Call buttons (48px height)

### **4.3 Screen 3: Field Report**

**Purpose:** Submit manual field observations — incidents, hazards, maintenance needs, crowd situations.

┌──────────────────────────────────────────┐  
│ \[←\]  New Field Report            \[Send\]  │  
├──────────────────────────────────────────┤  
│                                          │  
│ REPORT TYPE                              │  
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │  
│ │ ⚠  │ │ 🔧 │ │ 👥 │ │ 💧 │            │  
│ │Inci│ │Maint│ │Crowd│ │Water│           │  
│ │dent│ │enance│ │    │ │    │            │  
│ └────┘ └────┘ └────┘ └────┘            │  
│                                          │  
│ SEVERITY                                 │  
│ \[  Low  \] \[ Medium \] \[  High  \] \[Urgent\] │  
│                                          │  
│ LOCATION                                 │  
│ ┌──────────────────────────────────────┐ │  
│ │ 📍 Auto-detected: Ghat \#3, Zone A   │ │  
│ │    \[Use Current\] \[Choose on Map\]     │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ DESCRIPTION                              │  
│ ┌──────────────────────────────────────┐ │  
│ │ What did you observe?                │ │  
│ │                                      │ │  
│ │                                      │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ PHOTOS (Optional)                        │  
│ ┌──────┐ ┌──────┐ ┌──────┐             │  
│ │ \+ 📷 │ │ IMG1 │ │ IMG2 │             │  
│ │ Add  │ │      │ │      │             │  
│ └──────┘ └──────┘ └──────┘             │  
│                                          │  
│ ┌──────────────────────────────────────┐ │  
│ │ 🎤 Voice Note (tap to record)       │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
├──────────────────────────────────────────┤  
│  📋        🗺        📝        👤        │  
│ Tasks     Map     Report    Profile      │  
└──────────────────────────────────────────┘

**Component Specifications:**

#### **Report Type Selector**

| Element | Specification |
| :---- | :---- |
| Layout | Horizontal scroll, 4 items visible |
| Item Size | 72×72px square \+ 16px label below |
| Icon | 32×32px, centred in square |
| Background (default) | \--color-bg-secondary, \--radius-md |
| Background (selected) | \--color-brand-primary at 15% opacity, border 2px \--color-brand-primary |
| Label | \--type-caption-strong, centred below |
| Categories | Incident, Maintenance, Crowd, Water, Vendor, Safety, Medical, Other |

#### **Severity Selector**

| Element | Specification |
| :---- | :---- |
| Layout | 4 equal-width segmented buttons |
| Height | 44px |
| Border | 1px \--color-border-default, shared borders |
| Radius | \--radius-md on outer corners only |
| Default State | \--color-bg-secondary bg, \--color-text-secondary text |
| Selected State | Priority colour bg, white text, \--type-body-strong |
| Haptic | Light on selection |

#### **Location Picker**

| Element | Specification |
| :---- | :---- |
| Auto-detect | GPS → reverse geocode → nearest named location |
| Display | map-pin icon \+ location name \+ coordinates in \--type-mono |
| “Use Current” | Primary outlined button, 40px height |
| “Choose on Map” | Secondary ghost button, 40px height → opens map picker modal |
| Manual Override | Tapping the location text opens search field |

#### **Description Input**

| Element | Specification |
| :---- | :---- |
| Container | Full-width, min-height 96px, max-height 200px |
| Border | 1px \--color-border-default, \--radius-md |
| Placeholder | \--type-body, \--color-text-tertiary, “What did you observe?” |
| Active | 2px \--color-border-focus border, \--shadow-focus |
| Character Limit | 500 chars, counter bottom-right \--type-caption |

#### **Photo Capture**

| Element | Specification |
| :---- | :---- |
| Add Button | 72×72px, dashed border 2px \--color-border-default, \--radius-md, camera icon centred |
| Thumbnail | 72×72px, \--radius-md, object-fit cover, ✕ remove button top-right (24px circle) |
| Max Photos | 5 |
| Compression | JPEG quality 70%, max dimension 1920px (to save bandwidth for offline sync) |
| Tap Thumbnail | Full-screen preview with pinch zoom |

#### **Voice Note**

| Element | Specification |
| :---- | :---- |
| Container | Full-width, 48px height, \--radius-md, \--color-bg-secondary bg |
| Default | mic icon \+ “Tap to record” label |
| Recording | Red pulsing dot \+ waveform animation \+ elapsed time counter |
| Recorded | Play/pause button \+ waveform \+ duration \+ ✕ delete |
| Max Duration | 60 seconds |
| Format | AAC, 64kbps |

#### **Send Button (Header)**

| Element | Specification |
| :---- | :---- |
| Position | Header right |
| Size | Auto width × 36px height |
| Style | Filled \--color-brand-primary, \--type-button, white text |
| Disabled | Greyed out until at least Type \+ Severity \+ Description filled |
| Loading | “Sending…” \+ spinner, or “Queued” if offline |
| Success | Checkmark animation, navigate back to Tasks |

### **4.4 Screen 4: Vendor Inspection**

**Purpose:** Conduct structured vendor inspections with checklist, photo evidence, and grading.

┌──────────────────────────────────────────┐  
│ \[←\]  Vendor Inspection          \[Submit\] │  
├──────────────────────────────────────────┤  
│                                          │  
│ VENDOR INFO                              │  
│ ┌──────────────────────────────────────┐ │  
│ │ 🏪 Stall \#47 — Sri Lakshmi Foods   │ │  
│ │ Zone B, Row 3 · License: VND-2027-47│ │  
│ │ Last Inspection: 3 days ago (Pass)   │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ CHECKLIST                                │  
│ ┌──────────────────────────────────────┐ │  
│ │ FOOD SAFETY                          │ │  
│ │ ☑ Food stored at correct temp       │ │  
│ │ ☑ Clean preparation surfaces        │ │  
│ │ ☐ Staff wearing gloves/hairnets     │ │  
│ │ ☐ Waste disposal properly managed   │ │  
│ ├──────────────────────────────────────┤ │  
│ │ HYGIENE                              │ │  
│ │ ☑ Handwashing station available     │ │  
│ │ ☐ Clean water source verified       │ │  
│ │ ☐ Pest control measures in place    │ │  
│ ├──────────────────────────────────────┤ │  
│ │ COMPLIANCE                           │ │  
│ │ ☐ License displayed                 │ │  
│ │ ☐ Price list visible                │ │  
│ │ ☐ RFID payment accepted             │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ EVIDENCE PHOTOS                          │  
│ \[+ Add Photo for flagged items\]          │  
│                                          │  
│ GRADE                                    │  
│ \[  Pass  \] \[Conditional\] \[  Fail  \]     │  
│                                          │  
│ NOTES                                    │  
│ ┌──────────────────────────────────────┐ │  
│ │ Additional observations...           │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
├──────────────────────────────────────────┤  
│  📋        🗺        📝        👤        │  
│ Tasks     Map     Report    Profile      │  
└──────────────────────────────────────────┘

**Checklist Item Specification:**

| Element | Specification |
| :---- | :---- |
| Container | Full-width row, 52px min-height, 16px horizontal padding |
| Checkbox | 28×28px custom checkbox, \--radius-sm, 2px border |
| Unchecked | \--color-border-default border, transparent fill |
| Checked (Pass) | \--color-status-normal fill, white checkmark icon |
| Checked (Fail) | \--color-status-critical fill, white ✕ icon (toggle via long-press) |
| Label | \--type-body (16px/400), \--color-text-primary, wraps |
| Tap Anywhere in Row | Toggles check (large touch target) |
| Long Press | Toggles between ✓ pass and ✕ fail for that item |
| Failed Item | Red left border 4px, tinted red background, “Add Photo” prompt appears |
| Dividers | 1px \--color-border-default between items |

**Section Headers (within checklist):**

| Element | Specification |
| :---- | :---- |
| Background | \--color-bg-tertiary |
| Text | \--type-caption-strong, uppercase, \--color-text-secondary |
| Height | 36px |
| Progress | “3/4” counter right-aligned, \--type-caption |

**Grade Selector:**

| Element | Specification |
| :---- | :---- |
| Layout | 3 equal-width buttons, same style as severity selector |
| Pass | \--color-status-normal when selected |
| Conditional | \--color-status-warning when selected |
| Fail | \--color-status-critical when selected |
| Auto-suggest | If \>2 items failed, pre-select “Conditional” or “Fail” |

### **4.5 Screen 5: Profile & Shift**

┌──────────────────────────────────────────┐  
│ \[☰\]  My Profile                          │  
├──────────────────────────────────────────┤  
│                                          │  
│ ┌──────────────────────────────────────┐ │  
│ │         \[Avatar 64px\]                │ │  
│ │       Ramesh Kumar                   │ │  
│ │       Zone Marshal — Zone A          │ │  
│ │       On Shift: 06:00–18:00 IST      │ │  
│ │       ● Online · GPS Strong          │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ SHIFT SUMMARY                            │  
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  
│ │  Tasks   │ │ Inspec- │ │ Reports │    │  
│ │ Completed│ │  tions  │ │  Filed  │    │  
│ │    12    │ │    4    │ │    3    │    │  
│ └─────────┘ └─────────┘ └─────────┘    │  
│                                          │  
│ ┌──────────────────────────────────────┐ │  
│ │ 🕐 Shift Duration: 6h 32m            │ │  
│ │ 📍 Distance Covered: 4.2 km          │ │  
│ │ ⚡ Avg Response Time: 3.8 min         │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ SETTINGS                                 │  
│ ┌──────────────────────────────────────┐ │  
│ │ 🌙 Dark Mode              \[Toggle\]  │ │  
│ │ 🌐 Language: English ▾              │ │  
│ │ 🔔 Notification Sound     \[Toggle\]  │ │  
│ │ 📳 Vibration Alerts       \[Toggle\]  │ │  
│ │ 📍 Location Sharing       \[Toggle\]  │ │  
│ │ 💾 Offline Data: 127 MB    \[Clear\]  │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ \[🚪 End Shift\]                           │  
│                                          │  
├──────────────────────────────────────────┤  
│  📋        🗺        📝        👤        │  
│ Tasks     Map     Report    Profile      │  
└──────────────────────────────────────────┘

**Shift Summary KPI Cards:**

| Element | Specification |
| :---- | :---- |
| Layout | 3 equal-width cards, 8px gap |
| Height | 80px |
| Background | \--color-bg-secondary, \--radius-md |
| Value | \--type-display (32px/700), \--color-text-primary, centred |
| Label | \--type-caption (13px/400), \--color-text-secondary, centred below |

**Settings Rows:**

| Element | Specification |
| :---- | :---- |
| Row Height | 52px |
| Icon | 24px, \--color-text-secondary, left 16px |
| Label | \--type-body (16px/400), \--color-text-primary |
| Toggle | iOS-style switch, 51×31px, \--color-brand-primary when on |
| Chevron | For selection items (Language), 20px chevron-right icon |
| Dividers | 1px \--color-border-default between rows |

---

## **5\. Component Specifications**

### **5.1 Task Detail Bottom Sheet**

Slides up from bottom when tapping a task card.

┌──────────────────────────────────────────┐  
│         ━━━━━━━━━ (drag handle)          │  
│                                          │  
│ 🔴 URGENT — Crowd Threshold Breach       │  
│ Zone A, Ghat \#3                          │  
│ Dispatched by: Command Centre            │  
│ 14:28:03 IST · 4 min ago                │  
│                                          │  
│ ─────────────────────────────────────────│  
│                                          │  
│ INSTRUCTIONS                             │  
│ Redirect crowd to Ghat \#4 via East       │  
│ Corridor. Coordinate with traffic staff  │  
│ at junction point. Use PA if available.  │  
│                                          │  
│ LOCATION                                 │  
│ ┌──────────────────────────────────────┐ │  
│ │       \[Mini-map 200px height\]        │ │  
│ │       Pin showing exact location     │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│ NEARBY RESOURCES                         │  
│ 🏥 Medical Post: 200m NE                │  
│ 🚻 Toilet Block: 80m S                  │  
│ 📡 Kiosk: 150m W                        │  
│                                          │  
│ \[📍 Navigate\]  \[📞 Call\]  \[⬆ Escalate\] │  
│                                          │  
│ NOTES (tap to add)                       │  
│ ┌──────────────────────────────────────┐ │  
│ │ 14:30 — Arrived on site              │ │  
│ │ 14:32 — Crowd redirecting via East   │ │  
│ └──────────────────────────────────────┘ │  
│                                          │  
│      \[════════ ✓ COMPLETE TASK ════════\] │  
│                                          │  
└──────────────────────────────────────────┘

**Bottom Sheet Specifications:**

| Element | Specification |
| :---- | :---- |
| Max Height | 85% of screen height |
| Min Height | 30% (peeking state) |
| Background | \--color-bg-elevated, \--radius-xl (20px) top corners |
| Shadow | \--shadow-bottom-sheet |
| Drag Handle | 36×4px, centred, \--radius-full, \--color-bg-tertiary |
| Scrim | \--color-overlay-scrim behind sheet |
| Snap Points | 30% (peek), 60% (default), 85% (full) |
| Gesture | Drag to resize, swipe down to dismiss |
| Animation | Spring physics, \--ease-spring, \--duration-normal |

**Complete Task Button:**

| Element | Specification |
| :---- | :---- |
| Width | Full-width minus 32px gutters |
| Height | 56px (extra large for glove-friendly) |
| Background | \--color-status-normal |
| Text | \--type-button, white, uppercase, “COMPLETE TASK” |
| Border Radius | \--radius-md |
| Press | Scale(0.97) → scale(1.0), \--haptic-heavy |
| Confirmation | “Task completed successfully ✓” toast \+ navigate to Tasks |
| Requires | Long-press (1 second) to confirm — prevents accidental completion |

### **5.2 Dispatch Alert Overlay**

Full-screen overlay when an urgent dispatch arrives.

┌──────────────────────────────────────────┐  
│                                          │  
│                                          │  
│          🚨 INCOMING DISPATCH            │  
│                                          │  
│     Crowd Threshold Breach               │  
│     Zone A — Ghat \#3                     │  
│     Priority: URGENT                     │  
│                                          │  
│     Distance: 120m                       │  
│     ETA: \~2 min                          │  
│                                          │  
│                                          │  
│   ┌────────────────────────────────────┐ │  
│   │       ✓ ACCEPT (hold 1s)          │ │  
│   └────────────────────────────────────┘ │  
│                                          │  
│   ┌────────────────────────────────────┐ │  
│   │       ✕ DECLINE (with reason)      │ │  
│   └────────────────────────────────────┘ │  
│                                          │  
│   Auto-accept in 30s if no response     │  
│   ━━━━━━━━━━━━━━━━━━━ countdown bar     │  
│                                          │  
└──────────────────────────────────────────┘

**Overlay Specifications:**

| Element | Specification |
| :---- | :---- |
| Background | \--color-bg-primary with radial gradient pulse (red glow for urgent, amber for high) |
| Z-Index | 24 (above everything) |
| Haptic | \--haptic-alert pattern on arrival |
| Audio | Distinct dispatch sound, plays once, respects silent mode setting |
| Title “INCOMING DISPATCH” | \--type-h1 (22px/700), \--color-status-critical, centred |
| Task Info | \--type-body (16px), centred, \--color-text-primary |
| Accept Button | 56px height, full-width minus 32px, \--color-status-normal bg, requires 1s hold |
| Accept Hold Animation | Button fills with deeper green from left-to-right during 1s hold |
| Decline Button | 56px height, full-width minus 32px, outlined \--color-status-critical |
| Countdown | 30-second bar at bottom, \--color-status-warning, shrinks left-to-right |
| Auto-accept | If no response in 30s, auto-accept and show “Auto-accepted” toast |

### **5.3 Swipe Gesture Specifications**

Used on incoming task cards:

| Direction | Threshold | Reveal Colour | Icon | Action | Haptic |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Right | \>80px | \--color-status-normal at 20% bg | ✓ Accept (white, 32px) | Accept task | \--haptic-medium at threshold |
| Left | \>80px | \--color-status-critical at 20% bg | ✕ Decline (white, 32px) | Open reason sheet | \--haptic-medium at threshold |
| Partial (\<80px) | Any | Tinted reveal | — | Snaps back with spring | None |

**Underlay Reveal:** \- Revealed content slides out from under the card \- Icon \+ text centred in the revealed area \- Opacity: 0 at 0px → 1.0 at threshold \- Scale: icon starts at 0.5 → grows to 1.0 at threshold

---

## **6\. Keyboard & Input Handling**

### **6.1 Input Behaviour**

| Context | Keyboard | Behaviour |
| :---- | :---- | :---- |
| Description fields | Multiline text, auto-suggest off | Keyboard pushes content up, not overlaps |
| Notes (quick add) | Single line, “Done” button on keyboard | Auto-timestamped on submit |
| Search fields | Text, auto-suggest on | Debounced search at 300ms |
| Numeric inputs | Number pad only | For quantities, durations |

### **6.2 Gesture Reference**

| Gesture | Context | Action |
| :---- | :---- | :---- |
| Swipe Right | Task card | Accept task |
| Swipe Left | Task card | Decline task |
| Long Press (1s) | Active task card | Quick actions menu |
| Long Press (1s) | Complete button | Confirm completion |
| Pull Down | Task list | Refresh (manual sync) |
| Drag | Bottom sheet handle | Resize sheet |
| Swipe Down | Bottom sheet | Dismiss |
| Pinch | Map | Zoom |
| Double Tap | Map | Zoom to point |
| Two-Finger Rotate | Map | Rotate bearing |

---

## **7\. Offline Behaviour Specifications**

### **7.1 Offline Capabilities**

| Feature | Offline Behaviour | Sync Strategy |
| :---- | :---- | :---- |
| View assigned tasks | Cached from last sync | Auto-sync every 60s when online |
| Accept/Decline tasks | Queued locally | Sync on reconnect (FIFO order) |
| Complete tasks | Queued locally with timestamp | Sync on reconnect |
| Field reports | Full offline creation, saved locally | Sync photos \+ data on reconnect |
| Vendor inspections | Full offline completion | Sync on reconnect |
| Map | Offline tiles pre-downloaded (50MB/zone) | Tiles updated weekly |
| GPS | Continuous (device hardware) | Position log synced on reconnect |
| Notifications | Not available offline | Push notifications resume on reconnect |
| Voice notes | Recorded locally | Uploaded with parent report on sync |

### **7.2 Offline Queue UI**

| State | Visual |
| :---- | :---- |
| Queued | cloud-off icon \+ “Queued” label, \--color-status-warning |
| Syncing | refresh-cw spinning icon \+ “Syncing…” label, \--color-status-info |
| Synced | check-circle icon \+ “Synced” label, \--color-status-normal, fades after 3s |
| Failed | alert-triangle icon \+ “Retry” button, \--color-status-critical |

### **7.3 Offline Data Storage**

| Data Type | Storage | Max Size |
| :---- | :---- | :---- |
| Tasks | SQLite (local DB) | 10MB |
| Map Tiles | File system | 200MB (all zones) |
| Pending Reports | SQLite \+ file refs | 50MB |
| Photos | JPEG files | 30MB (queue limit) |
| Voice Notes | AAC files | 10MB (queue limit) |
| Inspection Data | SQLite | 5MB |
| User Profile | SQLite | 1MB |

---

## **8\. Notification System**

### **8.1 Push Notification Types**

| Type | Title | Body | Sound | Vibration | Priority |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Urgent Dispatch | “🚨 Urgent Dispatch” | “Crowd breach — Zone A, Ghat \#3” | dispatch\_urgent.mp3 | \--haptic-alert | Critical (bypasses DND) |
| Normal Dispatch | “📋 New Task Assigned” | “Vendor inspection — Stall \#47” | dispatch\_normal.mp3 | \--haptic-medium | High |
| Task Update | “ℹ Task Updated” | “Priority changed to High” | notification.mp3 | \--haptic-light | Default |
| Shift Reminder | “🕐 Shift Ending” | “Your shift ends in 30 minutes” | reminder.mp3 | \--haptic-light | Default |
| Emergency Alert | “🆘 EMERGENCY PROTOCOL” | “Emergency activated — Zone A” | emergency.mp3 | Continuous until opened | Critical |

### **8.2 In-App Notification Bell**

* Badge: Red circle with count (max “99+”)

* Dropdown: Scrollable list of recent notifications

* Each notification: icon \+ title \+ body excerpt \+ timestamp

* Swipe right to dismiss individual

* “Clear All” button at top

* Unread: \--color-bg-secondary tint; Read: transparent

---

## **9\. Responsive Behaviour**

### **9.1 Screen Size Handling**

| Screen Size | Layout Adjustment |
| :---- | :---- |
| Small (\<360px width) | Reduce card padding to 12px, stack KPI cards 1-per-row, reduce icon sizes to 20px |
| Medium (360–414px) | Standard layout as specified |
| Large (\>414px, tablets) | 2-column task list, persistent side map on landscape, larger touch targets |

### **9.2 Orientation**

| Orientation | Behaviour |
| :---- | :---- |
| Portrait | Default and primary layout |
| Landscape | Map view only — map expands full-width, task strip moves to left sidebar |
| Rotation Lock | Respect system setting; portrait-lock option in app settings |

---

# **PART B — DEVELOPMENT PLAN**

---

## **10\. Technology Stack**

### **10.1 Mobile Application**

| Layer | Technology | Version | Justification |
| :---- | :---- | :---- | :---- |
| Framework | React Native | 0.73+ | Cross-platform (iOS \+ Android), large ecosystem, code sharing with dashboard |
| Language | TypeScript | 5.x | Type safety for reliability |
| Navigation | React Navigation | 6.x | Native stack navigation, bottom tabs, modals |
| State Management | Zustand \+ MMKV | 4.x | Lightweight state \+ encrypted persistence |
| Offline Storage | WatermelonDB | 0.27+ | SQLite-backed, reactive, syncs with server |
| Map | React Native Mapbox | 10.x | Offline tiles, custom styling |
| Camera | React Native Camera (Vision Camera) | 3.x | Photo capture, QR scanning |
| Push Notifications | Notifee \+ Firebase Messaging | Latest | Local \+ remote notifications with custom sound |
| HTTP Client | Axios | 1.x | REST API calls with interceptors |
| WebSocket | Native WebSocket \+ reconnect | — | Real-time task updates |
| Icons | Lucide React Native | Latest | Consistent icon set |
| Date/Time | date-fns | 3.x | IST timezone handling |
| Audio | React Native Audio API | Latest | Voice note recording/playback |
| Haptics | React Native Haptic Feedback | Latest | Custom vibration patterns |
| Testing | Jest \+ React Native Testing Library \+ Detox | Latest | Unit \+ integration \+ E2E |

### **10.2 Backend (Staff API Gateway)**

| Layer | Technology | Justification |
| :---- | :---- | :---- |
| Runtime | Node.js 20 LTS | Same as dashboard backend, shared code |
| Framework | Fastify | High performance, WebSocket support |
| Database | PostgreSQL 16 (S2) | Staff/task data on operations server |
| Sync Engine | CouchDB-style sync protocol | Conflict resolution for offline-first |
| Push Service | Firebase Cloud Messaging \+ APNs | Cross-platform push delivery |
| File Storage | S3-compatible (MinIO on S2) | Photo/voice note upload |
| GPS Tracking | Redis TimeSeries | High-frequency GPS position logging |

---

## **11\. Architecture**

### **11.1 Mobile App Architecture**

src/  
├── app/  
│   ├── App.tsx                    \# Root with providers  
│   ├── Navigation.tsx             \# Stack \+ Tab navigator setup  
│   └── linking.ts                 \# Deep link configuration  
├── screens/  
│   ├── TasksScreen.tsx            \# Task list (home)  
│   ├── TaskDetailSheet.tsx        \# Bottom sheet task detail  
│   ├── MapScreen.tsx              \# Zone map  
│   ├── ReportScreen.tsx           \# Field report form  
│   ├── InspectionScreen.tsx       \# Vendor inspection form  
│   ├── ProfileScreen.tsx          \# Profile & shift info  
│   ├── NotificationsScreen.tsx    \# Notification list  
│   └── LoginScreen.tsx            \# Authentication  
├── components/  
│   ├── tasks/  
│   │   ├── ActiveTaskCard.tsx  
│   │   ├── IncomingTaskCard.tsx  
│   │   ├── CompletedTaskCard.tsx  
│   │   ├── TaskSwipeActions.tsx  
│   │   └── DispatchOverlay.tsx  
│   ├── map/  
│   │   ├── ZoneMap.tsx  
│   │   ├── UserLocationMarker.tsx  
│   │   ├── TaskPinMarker.tsx  
│   │   ├── FacilityMarkers.tsx  
│   │   ├── CrowdHeatmap.tsx  
│   │   ├── RadarOverlay.tsx  
│   │   └── LayerToggle.tsx  
│   ├── report/  
│   │   ├── ReportTypeSelector.tsx  
│   │   ├── SeveritySelector.tsx  
│   │   ├── LocationPicker.tsx  
│   │   ├── PhotoCapture.tsx  
│   │   └── VoiceNote.tsx  
│   ├── inspection/  
│   │   ├── VendorInfo.tsx  
│   │   ├── ChecklistSection.tsx  
│   │   ├── ChecklistItem.tsx  
│   │   ├── GradeSelector.tsx  
│   │   └── EvidencePhotos.tsx  
│   ├── profile/  
│   │   ├── ShiftSummary.tsx  
│   │   ├── KPICard.tsx  
│   │   └── SettingsRow.tsx  
│   └── shared/  
│       ├── Button.tsx  
│       ├── Badge.tsx  
│       ├── BottomSheet.tsx  
│       ├── Toast.tsx  
│       ├── OfflineBar.tsx  
│       ├── Header.tsx  
│       ├── TabBar.tsx  
│       └── StatusDot.tsx  
├── hooks/  
│   ├── useWebSocket.ts  
│   ├── useOfflineSync.ts  
│   ├── useLocation.ts  
│   ├── useHaptics.ts  
│   ├── useNotifications.ts  
│   └── useAuth.ts  
├── stores/  
│   ├── taskStore.ts  
│   ├── mapStore.ts  
│   ├── reportStore.ts  
│   ├── inspectionStore.ts  
│   ├── profileStore.ts  
│   └── syncStore.ts  
├── services/  
│   ├── api.ts  
│   ├── websocket.ts  
│   ├── auth.ts  
│   ├── sync.ts  
│   ├── location.ts  
│   └── notifications.ts  
├── db/  
│   ├── schema.ts              \# WatermelonDB schema  
│   ├── models/  
│   │   ├── Task.ts  
│   │   ├── Report.ts  
│   │   ├── Inspection.ts  
│   │   └── SyncQueue.ts  
│   └── sync.ts               \# Sync adapter  
├── tokens/  
│   ├── colors.ts  
│   ├── typography.ts  
│   ├── spacing.ts  
│   └── animations.ts  
├── types/  
│   ├── task.ts  
│   ├── report.ts  
│   ├── inspection.ts  
│   ├── staff.ts  
│   └── vendor.ts  
└── utils/  
    ├── formatters.ts  
    ├── geo.ts  
    ├── offline.ts  
    └── haptics.ts

---

## **12\. Sprint Plan**

### **12.1 Sprint Overview (8 Sprints × 2 Weeks \= 16 Weeks)**

| Sprint | Duration | Focus | Deliverables |
| :---- | :---- | :---- | :---- |
| **Sprint 1** | Weeks 1-2 | Foundation | RN project setup, design tokens, app shell (header, tab bar, navigation), auth flow, offline DB schema, CI/CD |
| **Sprint 2** | Weeks 3-4 | Task System | Task list screen, active/incoming/completed cards, swipe gestures, task detail bottom sheet, WebSocket task updates |
| **Sprint 3** | Weeks 5-6 | Dispatch & Actions | Dispatch overlay, accept/decline flow, task completion, escalation, quick actions menu, push notifications |
| **Sprint 4** | Weeks 7-8 | Map & Navigation | Mapbox integration, offline tiles, user location, task pins, facility markers, crowd heatmap, radar overlays, navigation intent |
| **Sprint 5** | Weeks 9-10 | Field Reports | Report creation form, type/severity selectors, location picker, photo capture, voice notes, offline queue |
| **Sprint 6** | Weeks 11-12 | Vendor Inspection | Inspection form, checklist with toggle states, evidence photos, grading, vendor info, inspection history |
| **Sprint 7** | Weeks 13-14 | Profile & Polish | Profile screen, shift summary, settings, dark/light theme, offline sync indicator, battery optimisation, haptics |
| **Sprint 8** | Weeks 15-16 | Testing & Deploy | E2E testing (Detox), offline scenario testing, performance profiling, security audit, App Store/Play Store submission |

### **12.2 Sprint 1 — Foundation (Detailed)**

| ID | Story | Points | Acceptance Criteria |
| :---- | :---- | :---- | :---- |
| S1-01 | React Native project setup with TypeScript | 2 | Builds for iOS \+ Android, strict mode |
| S1-02 | Design token system (colours, typography, spacing) | 2 | All tokens defined, dark/light theme switching |
| S1-03 | React Navigation stack \+ bottom tabs | 3 | 4-tab navigation, stack for sub-screens |
| S1-04 | Header component | 2 | Back/menu, title, notification badge, settings |
| S1-05 | Bottom tab bar | 3 | Active state, badge support, safe area handling |
| S1-06 | Auth flow (login \+ JWT) | 3 | Login screen, token storage (MMKV encrypted), auto-refresh |
| S1-07 | WatermelonDB schema \+ sync adapter | 5 | Task, Report, Inspection, SyncQueue models defined |
| S1-08 | Offline detection \+ indicator bar | 2 | NetInfo listener, animated offline bar |
| S1-09 | Shared components (Button, Badge, Toast, BottomSheet) | 5 | All states per spec |
| S1-10 | CI/CD (Fastlane \+ GitHub Actions) | 3 | Lint, test, build iOS \+ Android, deploy to TestFlight/Internal Track |

**Total: 30 points**

---

## **13\. API Endpoints (Staff-Specific)**

| Endpoint | Method | Purpose |
| :---- | :---- | :---- |
| /api/v1/staff/me | GET | Current staff profile \+ shift info |
| /api/v1/staff/me/location | PUT | Update GPS position |
| /api/v1/staff/me/shift | POST/PUT | Start/end shift |
| /api/v1/tasks | GET | List assigned tasks (paginated, filtered) |
| /api/v1/tasks/{id} | GET | Task detail |
| /api/v1/tasks/{id}/accept | POST | Accept a dispatch |
| /api/v1/tasks/{id}/decline | POST | Decline with reason |
| /api/v1/tasks/{id}/complete | POST | Mark task completed |
| /api/v1/tasks/{id}/escalate | POST | Escalate to supervisor |
| /api/v1/tasks/{id}/notes | POST | Add timestamped note |
| /api/v1/reports | POST | Submit field report |
| /api/v1/reports/upload | POST | Upload photo/voice (multipart) |
| /api/v1/inspections | GET | List assigned inspections |
| /api/v1/inspections/{id} | PUT | Submit inspection result |
| /api/v1/vendors/{id} | GET | Vendor details \+ history |
| /api/v1/zones/{id}/map | GET | Zone map data \+ offline tile manifest |
| /api/v1/sync | POST | Bulk sync endpoint (offline queue) |

### **WebSocket Channels**

| Channel | Data | Rate |
| :---- | :---- | :---- |
| wss://s2.local/ws/staff/{id}/tasks | Task assignments \+ updates | Real-time push |
| wss://s2.local/ws/staff/{id}/alerts | Emergency alerts, system messages | Real-time push |
| wss://s1.local/ws/zone/{id}/crowd | Crowd density for map overlay | Every 10s |

---

## **14\. Testing Strategy**

| Level | Tool | Coverage Target | Focus |
| :---- | :---- | :---- | :---- |
| Unit | Jest | 85% | Components, stores, formatters, sync logic |
| Integration | RN Testing Library | 70% | Screen flows, gesture handling, offline DB operations |
| E2E | Detox | Critical paths | Login, task accept, inspection submit, offline→online sync |
| Offline | Custom test harness | All offline features | Network toggle during each flow, queue integrity, conflict resolution |
| Performance | Flipper \+ custom | Battery \+ memory | 8-hour simulated shift: memory stable, GPS sampling efficient |
| Accessibility | Manual \+ axe-RN | WCAG 2.1 AA | VoiceOver, TalkBack, font scaling, contrast |

### **Critical Test Scenarios**

1. **Offline Task Completion:** Accept task → go offline → complete task → add notes → go online → verify sync

2. **Dispatch Under Bad Network:** Receive dispatch → network drops during accept → verify queued → verify delivered on reconnect

3. **Photo Upload Queue:** Take 5 photos for report offline → go online → verify all 5 upload in order

4. **8-Hour Battery Simulation:** GPS tracking \+ periodic sync for 8 hours → memory stable, battery drain \<15%

5. **Concurrent Dispatch:** Two dispatches arrive within 1 second → verify both display, no race condition

6. **Map Offline Navigation:** Download zone tiles → go fully offline → verify map renders, user dot moves, facilities visible

---

## **15\. Performance Requirements**

| Metric | Target |
| :---- | :---- |
| App Launch (cold) | \<2 seconds to usable |
| Screen Transition | \<300ms |
| Task List Render (50 items) | \<100ms |
| Map Initial Load | \<1.5 seconds (offline tiles) |
| GPS Fix | \<5 seconds |
| Photo Capture to Preview | \<500ms |
| Offline Sync (50 queued items) | \<10 seconds on 3G |
| Memory (8-hour session) | \<200MB |
| APK Size | \<30MB |
| Battery Drain (8-hour shift) | \<15% attributable to app |

---

## **16\. Security Requirements**

| Requirement | Implementation |
| :---- | :---- |
| Authentication | JWT with 12-hour expiry matching shift |
| Local Storage | MMKV with encryption at rest |
| Certificate Pinning | Pin S2 server certificate |
| GPS Data | Encrypted in transit and at rest |
| Photo Data | Encrypted on device until uploaded |
| Root/Jailbreak Detection | Warn on compromised device |
| Session Lock | Auto-lock after 15 minutes inactive, biometric unlock |
| Remote Wipe | Admin can remotely clear app data |
| Audit Trail | All actions logged with device ID \+ timestamp |

---

*End of Staff & Vendor Mobile App UI Brief — Document Version 1.0* *RTIH AP Godavari Pushkaralu 2027 Innovation Challenge*