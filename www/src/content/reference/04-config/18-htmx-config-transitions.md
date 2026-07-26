---
title: "htmx.config.transitions"
description: "Enables View Transitions API support"
---

The `htmx.config.transitions` option, when set to `true`, causes htmx to use
document-scoped View Transitions for swaps that do not specify a transition
modifier. Document transitions are serialized through htmx's global transition
queue.

**Default:** `false`

## Example

```javascript
htmx.config.transitions = false;
```

```html
<meta name="htmx-config" content='{"transitions":false}'>
```

For high-frequency updates within one persistent element, use
`hx-swap="... transition:target"` instead. Target-scoped transitions rely on
native same-target supersession and do not enter the document queue. Browsers
without the corresponding View Transitions API apply the identical update
immediately without animation.
