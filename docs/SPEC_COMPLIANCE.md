# Spec Compliance — UI Brief Part A

✅ implemented · ◐ simulated in web prototype (needs native module in RN) · ➕ addition beyond brief

## §1 Principles & accessibility
- ✅ P1 3-tap max: accept (swipe), complete (hold), report (tab → fill → send), inspection (card → open checklist)
- ✅ P2 7:1 critical text (17.4:1), status icon + colour + label everywhere
- ✅ P3 primary actions in bottom 60% (card buttons, sheet footer, map strip, dispatch actions); no multi-finger gestures required
- ✅ P4 offline queue, queued chips, service-worker shell cache, cached tasks
- ✅ P5 ≥48px targets (44px header icons per §3.2), 8px gaps, 80px swipe threshold (>40px)
- ✅ P6 dark default; no background polling in UI
- ✅ ARIA roles/labels on interactive elements, `role=switch|radio|checkbox|alertdialog`, live regions for sync + toasts
- ✅ `prefers-reduced-motion` zeroes durations · ◐ haptics via `navigator.vibrate` · ◐ dispatch tone via WebAudio
- ✅ §1.3 privacy: no ghat imagery; radar = counts + arrows; smart-glasses shows results only; staff positions supervisor-only

## §2 Tokens — ✅ all colour, type, spacing, elevation, radius, motion, icon, z-index tokens

## §3 Shell
- ✅ 3.1 status bar (device frame), header, scroll content, tab bar + safe area
- ✅ 3.2 header: ☰/← 44px, centred h2, bell with count badge (99+), gear
- ✅ 3.3 tab bar: 4 equal tabs, inactive tertiary 24px, active brand 28px + filled + 3px pill, uppercase 13/600 labels, Tasks badge
- ✅ 3.4 offline bar 36px, warning 15%, animated chevrons 2s, → “Syncing…” spinner → “All synced ✓” 2s, slide animation

## §4 Screens
- ✅ 4.1 Tasks — active card (urgent pill, h2 title 2-line clamp, location, mono timestamp, 6px animated progress, Navigate outline / Complete filled 48px, swipe-right details, 1s long-press quick actions: Escalate / Add Note / Request Backup); incoming (priority left border, swipe accept/decline w/ reason sheet Busy/Too Far/Needs Specialist, tap → sheet, due time coloured by urgency); completed (60% bg, check icon, time + duration, read-only sheet); section headers w/ count badges; ✅ pull-to-refresh
- ✅ 4.2 Map — ◐ vector zone map standing in for Mapbox offline tiles; pulsing user dot + accuracy circle; red task pin w/ bounce; category facility icons 32px; radar dashed purple + shield + “Radar only” + counts; 40% heatmap; zoom ± / re-centre 48px; layer dropdown (Crowd/Facilities/Radar on, Staff supervisor-only, Traffic off); 80px active strip w/ drag-up to sheet, Navigate + Call
- ✅ 4.3 Report — 72px type tiles (8 categories, horizontal scroll, selected 15% brand + 2px border); 44px segmented severity; auto-detect location + mono coords, Use Current (outlined) / Choose on Map (ghost) 40px, tap text → search; description 96–200px, focus ring, 500 counter; photos 72px dashed add, ✕ remove, max 5, full-screen preview; ◐ voice note 60s (record → waveform → play/delete); Send disabled until valid → Sending…/Queued → success → Tasks
- ✅ 4.4 Inspection — vendor card (+ Telugu ➕); 52px rows, 28px checkbox, pass/fail states, long-press fail, failed row red border/tint + Add Photo; 36px section headers w/ counters; grade selector w/ auto-suggest (>2 failed); notes; Submit
- ✅ 4.5 Profile — avatar 64px, shift, status; 3×80px KPI cards; stats rows; 52px settings rows with 51×31 switches, language chevron, offline data Clear; End Shift

## §5 Components
- ✅ 5.1 Task detail sheet — handle 36×4, 20px radius, scrim, snaps 30/60/85, drag/swipe-dismiss, spring; urgent header, dispatcher, IST timestamp, instructions, 200px mini-map, nearby resources, Navigate/Call/Escalate, timestamped notes (tap to add), 56px hold-1s COMPLETE TASK → toast → Tasks
- ✅ 5.2 Dispatch — z24, radial red/amber pulse, alert haptic, h1 critical title, 56px hold-to-accept with fill, outlined decline (with reason), 30s countdown auto-accept + toast
- ✅ 5.3 Swipe — thresholds, 20% reveal colours, 32px icons, opacity/scale ramp, spring snap-back

## §6–§9
- ✅ 6.1 multiline no-autosuggest, single-line note w/ “Done” (`enterkeyhint`), debounced search 300ms, numeric PIN keypad
- ✅ 6.2 all listed gestures (map pan/double-tap/wheel zoom; pinch via native)
- ✅ 7.2 Queued / Syncing / Synced / (Retry pattern in toasts)
- ✅ 8.2 bell panel: badge, list, swipe-right dismiss, Clear All, unread tint
- ✅ 9.1 small/medium/large via container queries · ✅ 9.2 landscape map sidebar

## ➕ Additions
Login (Staff ID + PIN + biometric, language chips) · SOS FAB + emergency screen · ☰ menu with QR scan, Smart-Glasses results, demo controls · Up Next queue for accepted tasks · desktop showcase frame.
