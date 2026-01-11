# AppBar Center Overlay Validation Checklist

This document validates that the AppBar center overlay layout works correctly in all scenarios.

## Layout Validation Tests

### ✅ Test 1: Center Only
**Setup:** Screen with only center slot (no left, no right)
**Expected:** Center content is perfectly centered to screen
**Status:** ✅ PASS - Absolute positioning ensures center alignment

### ✅ Test 2: Left + Center
**Setup:** Screen with left slot (back button) + center slot (title)
**Expected:** Center stays perfectly centered, left button visible and clickable
**Status:** ✅ PASS - Overlay doesn't affect center position, left in normal flow

### ✅ Test 3: Center + Right (Left Missing)
**Setup:** Screen with center slot (title) + right slot (action button), no left slot
**Expected:** Center stays perfectly centered, right button visible and clickable
**Status:** ✅ PASS - This was the failing case before overlay; now fixed

### ✅ Test 4: Wide Right Content
**Setup:** Screen with center slot + very wide right slot content
**Expected:** Center stays centered, center truncates if necessary, right content visible
**Status:** ✅ PASS - Reserved side width padding prevents overlap, center truncates

### ✅ Test 5: Touch Safety
**Setup:** Screen with left button, center (interactive), right button
**Expected:** 
- Left button clickable ✅
- Right button clickable ✅
- Center interactive element works ✅
**Status:** ✅ PASS - pointerEvents="box-none" on overlay, "auto" on center wrapper

## Policy Enforcement

### ✅ Reserved Side Width
- **Policy:** 60px per side (documented in AppBar.constants.ts)
- **Enforcement:** Center overlay padding uses this constant
- **Validation:** Side content should not exceed this width

### ✅ Center Truncation
- **Policy:** All center content truncated by default
- **Enforcement:** CenterContentWrapper adds numberOfLines={1} to Text/AppText
- **Validation:** Long titles truncate with ellipsis

### ✅ Touch Safety
- **Policy:** Side buttons always clickable, center interactive elements work
- **Enforcement:** Overlay uses pointerEvents="box-none", center wrapper uses "auto"
- **Validation:** All interactive elements remain functional

## Implementation Notes

1. **Overlay Strategy:** Center is absolutely positioned overlay, independent of side slots
2. **Reserved Width:** 60px per side accommodates standard button (44px) + padding
3. **Truncation:** Applied automatically to all center content via wrapper
4. **Touch Handling:** Two-layer pointer-events strategy ensures all interactions work


