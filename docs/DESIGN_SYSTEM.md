# Godavari Field Design System

Source of truth: [Brief §2](brief/UI_BRIEF.md). The tokens live in `src/styles/tokens.css` (web) and `tokens/tokens.json` (W3C DTCG, for Figma variables and React Native `tokens/*.ts`). `tests/tokens.test.mjs` keeps the two files in sync.

## Colour: measured contrast on `--color-bg-primary` #0D1117

| Token | Hex | Ratio | Used as |
|---|---|---|---|
| text-primary | #F0F6FC | 17.4:1 | All primary text |
| text-secondary | #8B949E | 6.2:1 | Metadata, labels |
| text-tertiary | #6E7681 | 4.1:1 | Placeholders and disabled text only (decorative per brief) |
| brand-primary | #1F6FEB | 4.1:1 | **Fills only** (buttons, active pill, focus ring), always with white text on top |
| brand-secondary | #388BFD | 5.7:1 | Brand-coloured **text and icons** (outlined button label, active tab) |
| status-normal | #3FB950 | 7.4:1 | Pass, complete, online |
| status-warning | #D29922 | 7.5:1 | Pending, offline bar, conditional |
| status-critical | #F85149 | 5.6:1 | Urgent, SOS, fail |
| status-info | #58A6FF | 7.5:1 | Informational, syncing |
| status-radar *(added)* | #A371F7 | — | Radar-zone overlay (“purple overlay” in §4.2) |

**Implementation decisions** (where the brief left room for interpretation or where its numbers differed from measurement):

- The brief lists `brand-primary` at 4.8:1. Measured, it is 4.1:1, so brand-coloured text uses `brand-secondary` (5.7:1) and `brand-primary` is kept for fills.
- Text on a status-coloured fill uses a dark ink (#04260C on green, #1F1400 on amber) instead of white, which gives at least 7:1 in sunlight. White is kept on critical red.
- Status is never shown by colour alone. Every status has an icon, a colour and a text label (§1.2).

## Type
Inter, with JetBrains Mono for IDs, coordinates and timestamps, and Noto Sans Telugu/Devanagari for regional names. The scale follows §2.2 exactly (`.t-display` … `.t-tab`). Body text is 16px for outdoor legibility.

## Spacing, radius, elevation, motion
4px base grid (`--space-1` … `--space-12`). Radius scale is 6/10/16/20/full. Shadows: card, sheet, FAB and toast. Motion uses `--ease-default` and `--ease-spring` at 100/200/300/500ms. Reduced motion sets every duration to 0.

## Z-layers (§2.8)
Base 0 · header 4 · FAB 6 · tab bar 8 · sheet 12 · toast 16 · modal 20 · emergency 24. Sheets opened from the dispatch overlay stack above it.

## Interaction patterns
| Pattern | Spec |
|---|---|
| Hold-to-confirm | Completing a task, accepting a dispatch and SOS need a 1s hold (1.5s for SOS) with a left-to-right fill. Releasing early shows a hint toast. |
| Swipe card | 80px threshold. The underlay fades from 0 to 1 and the icon scales from 0.5 to 1. A medium haptic fires at the threshold. Below the threshold the card springs back. |
| Long-press | 1s on the active card opens quick actions. On a checklist row, holding toggles fail. Movement over 12px cancels (tolerant of gloves). |
| Haptics | light 10 · medium 30 · heavy 50 · alert 200-100-200-100-400ms |

## Components → React Native mapping
`Header`, `TabBar`, `OfflineBar`, `ActiveTaskCard`, `IncomingTaskCard` (+`TaskSwipeActions`), `CompletedTaskCard`, `BottomSheet`/`TaskDetailSheet`, `DispatchOverlay`, `ReportTypeSelector`, `SeveritySelector`, `LocationPicker`, `PhotoCapture`, `VoiceNote`, `VendorInfo`, `ChecklistSection`/`ChecklistItem`, `GradeSelector`, `KPICard`, `SettingsRow`, `Toast`, `Badge`, `StatusDot`. Each corresponds to a class block in `components.css` and a render function in `src/js`.
