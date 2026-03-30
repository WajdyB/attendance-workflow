# Button Style Guide

## Overview
All buttons in the project should provide interactive visual feedback on hover. This guide ensures consistent styling and user experience across all components.

---

## Button Types & Hover Styles

### 1. **Primary Action Buttons** (Main CTAs)
**Use for:** Main actions like Submit, Save, Approve, etc.

```tsx
// Orange Primary Button
className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"

// Green Positive Action
className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"

// Red Destructive Action
className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
```

**Hover Behavior:** Background color darkens (e.g., `orange-600` → `orange-700`)
**Disabled State:** `opacity-50 cursor-not-allowed`

---

### 2. **Secondary Buttons** (Outlined/Ghost style)
**Use for:** Secondary actions like filters, load more, cancel, etc.

```tsx
// Orange Secondary Button
className="rounded-lg border border-orange-300/30 bg-orange-100/20 px-4 py-2 text-sm font-medium text-orange-300 hover:bg-orange-100/40 hover:border-orange-300/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"

// Stone Secondary Button
className="rounded-lg border border-stone-600/50 bg-stone-700/20 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700/40 hover:border-stone-600/70 hover:text-stone-200 transition-all cursor-pointer"
```

**Hover Behavior:** Background and border opacity increase
**Disabled State:** `opacity-50 cursor-not-allowed`

---

### 3. **Icon Buttons**
**Use for:** Edit, delete, view, navigation icons, etc.

```tsx
// Icon Button (View/Edit)
className="p-2 text-stone-300 hover:text-orange-300 hover:bg-orange-500/15 rounded-lg transition-all cursor-pointer"

// Icon Button (Delete)
className="p-2 text-stone-300 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
```

**Hover Behavior:** Text color changes + background tint appears
**Transition:** Smooth 150-200ms transition

---

### 4. **Text/Link Buttons**
**Use for:** Links, navigation, subtle actions

```tsx
// Text Button
className="text-sm font-medium text-orange-300 hover:text-orange-200 transition-colors cursor-pointer"

// Tab Button
className="pb-3 text-sm font-medium transition cursor-pointer text-stone-500 hover:text-stone-700 hover:border-b-2 hover:border-stone-300"
```

**Hover Behavior:** Text color lightens
**Transition:** `transition-colors` for text-only changes

---

### 5. **Toggle/Visibility Buttons**
**Use for:** Show/hide password, expand/collapse, etc.

```tsx
// Toggle Button
className="text-stone-400 hover:text-stone-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
```

**Hover Behavior:** Text color brightens
**Disabled State:** `opacity-50 cursor-not-allowed`

---

## Common Classes & Patterns

### Required Classes (for every button):
- `transition-all` or `transition-colors` - Smooth hover effect
- `cursor-pointer` - Visual indicator that element is clickable
- `disabled:cursor-not-allowed` - Disabled state indicator

### Optional Enhancements:
- `hover:shadow-md` - Subtle elevation on hover (for emphasis)
- `hover:scale-105` - Mild zoom effect (use sparingly)
- `font-medium` - Button text weight for clarity

### Disabled State Pattern:
```tsx
disabled={isLoading || isDisabled}
className="... disabled:opacity-50 disabled:cursor-not-allowed"
```

---

## Color Reference

### Orange Theme (Primary)
- Rest: `bg-orange-600` or `text-orange-300`
- Hover: `bg-orange-700` or `text-orange-200`
- Light Background: `bg-orange-100/20` → Hover: `bg-orange-100/40`

### Green (Success/Approve)
- Rest: `bg-green-600`
- Hover: `bg-green-700`

### Red (Destructive/Reject)
- Rest: `bg-red-600` or `text-red-500`
- Hover: `bg-red-700` or `text-red-400`

### Stone (Secondary)
- Rest: `text-stone-300` or `bg-stone-700/20`
- Hover: `text-stone-200` or `bg-stone-700/40`

---

## Implementation Checklist

When creating a new button, ensure:

- [ ] Has `transition-all` or `transition-colors` class
- [ ] Has `cursor-pointer` class
- [ ] Has visible hover state (color/background change)
- [ ] If disabled: has `disabled:opacity-50 disabled:cursor-not-allowed`
- [ ] Uses appropriate color for button type (primary/secondary/danger)
- [ ] Has consistent padding with similar buttons
- [ ] Has `rounded-lg` for consistency
- [ ] Uses responsive sizing if needed (e.g., `px-4 py-2 text-sm`)

---

## Component Template

```tsx
<button
  type="button"
  onClick={handleClick}
  disabled={isLoading}
  className="rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-all cursor-pointer disabled:cursor-not-allowed"
>
  {isLoading ? "Loading..." : "Click Me"}
</button>
```

---

## Quick Reference Snippets

### Primary Button
```
bg-orange-600 hover:bg-orange-700
```

### Secondary Button
```
border border-orange-300/30 bg-orange-100/20 hover:bg-orange-100/40 hover:border-orange-300/50
```

### Icon Button
```
hover:text-orange-300 hover:bg-orange-500/15
```

### Disabled State
```
disabled:opacity-50 disabled:cursor-not-allowed
```

---

## Examples in Components

**Good Example:**
```tsx
<button
  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
>
  Submit
</button>
```

**Avoid:**
```tsx
<button className="bg-orange-600"> <!-- Missing hover effect -->
  Submit
</button>
```

---

## Testing Hover Effects

1. Hover over each button - should see immediate visual feedback
2. Disabled buttons - should show reduced opacity and not-allowed cursor
3. All buttons - should have smooth transition animations
4. Mobile - buttons should remain responsive and large enough to tap

---

*Last Updated: March 25, 2026*
*Apply these styles to all new buttons going forward*
