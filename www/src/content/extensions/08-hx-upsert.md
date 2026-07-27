---
title: "hx-upsert"
description: "Update or insert elements with `hx-swap='upsert'`"
category: "Swaps"
icon: "icon-[mdi--update]"
keywords: ["upsert", "swap", "list", "update", "insert"]
---

The `upsert` extension adds a new swap style that updates existing elements by ID and inserts new ones while preserving elements not in the response. It is useful for event streams and dynamic lists where a response contains only the rows that changed.

## Installing

```html
<script src="https://cdn.jsdelivr.net/npm/htmx.org@__VERSION__/dist/htmx.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/htmx.org@__VERSION__/dist/ext/hx-upsert.js"></script>
```

## Usage

Use [`hx-swap`](/reference/attributes/hx-swap)`="upsert"` to apply the upsert behavior:

```html
<button hx-get="/items" hx-swap="upsert" hx-target="#item-list">
    Refresh Items
</button>

<div id="item-list">
    <div id="item-1">Original Item 1</div>
    <div id="item-2">Original Item 2</div>
</div>
```

When the server responds with:

```html
<div id="item-2">Updated Item 2</div>
<div id="item-3">New Item 3</div>
```

The result will be:

```html
<div id="item-list">
    <div id="item-1">Original Item 1</div>
    <div id="item-2">Updated Item 2</div>
    <div id="item-3">New Item 3</div>
</div>
```

## How It Works

The upsert swap style:

1. **Updates** elements with matching IDs (replaces them by default or patches them in place with `morph`)
2. **Inserts** new elements that don't have matching IDs
3. **Preserves** existing elements not present in the response
4. **Rejects** duplicate or stale replacements when a version attribute is configured

An already ordered target has a strict mutation-locality guarantee: applying a
patch mutates only rows supplied by that patch. Unrelated siblings remain
connected to the same parent, and a duplicate or stale patch performs no DOM
mutation at all. This lets the browser preserve focus, selection, component
state, and its native scroll anchor.

## Configuration

### Morphing Same-ID Elements

Add `morph` to patch a same-ID element in place with htmx's built-in morph
engine instead of replacing it:

```html
<ol hx-swap="upsert version:data-update-version morph">
```

The row and every matching descendant ID retain their exact DOM nodes. New
descendants are inserted, removed descendants are cleaned up, and attributes
and text are synchronized from the authoritative response. This is useful for
streamed server-rendered regions whose unchanged controls, disclosure state,
animations, focus, and selection should remain stable between versions.

### Sorting

Add `sort` to maintain elements in ascending order by ID:

```html
<div hx-get="/items" hx-swap="upsert sort">
```

Use `sort:desc` for descending order:

```html
<div hx-get="/items" hx-swap="upsert sort:desc">
```

### Custom Key Attribute

Use `key:attr` to maintain canonical order by a different attribute:

```html
<div hx-get="/items" hx-swap="upsert key:data-priority sort">
    <div id="task-2" data-priority="1">High Priority</div>
    <div id="task-1" data-priority="5">Low Priority</div>
</div>
```

Decimal keys are compared as arbitrary-length integers, so values such as
unsigned 64-bit event-store versions are ordered without JavaScript-number
precision loss. Rows without the configured key are pending: they retain their
relative order after canonical rows.

### Freshness Attribute

Use `version:attr` to reject a same-ID replacement whose version is equal to or
older than the row already in the target:

```html
<ol
    hx-swap="upsert key:data-stream-version version:data-update-version"
>
    <li
        id="task-42"
        data-stream-version="12"
        data-update-version="19"
    >
        Current task
    </li>
</ol>
```

This makes duplicate delivery and races between transports true no-ops.

### Repairing Existing Order

If the target begins out of order, `upsert` reconciles it to canonical keyed
order followed by pending rows. Reconciliation preserves the longest already
ordered sequence and moves only siblings that are genuinely misplaced; it
never detaches and re-appends the whole target.

### Prepend Unkeyed Elements

By default, elements without IDs are appended. Use `prepend` to insert them at the beginning:

```html
<div hx-get="/items" hx-swap="upsert prepend">
```

### Combined Modifiers

```html
<div hx-get="/items" hx-swap="upsert sort:desc prepend morph">
```

## Using with [`<hx-partial>`](/docs#partials-hx-partial)

You can use `<hx-partial>` with `hx-swap="upsert"` for targeted upserts in a single response:

```html
<hx-partial hx-target="#main" hx-swap="innerHTML">
    <div>Updated main content</div>
</hx-partial>
<hx-partial hx-target="#item-list" hx-swap="upsert sort">
    <div id="item-2">Updated Item 2</div>
    <div id="item-5">New Item 5</div>
</hx-partial>
```

## Limitations

- Only elements with `id` attributes can be matched and updated
- IDs must be unique across the entire document
- Sorting uses numeric-aware `localeCompare`, which may have performance implications for very large lists
