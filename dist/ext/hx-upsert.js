//==========================================================
// hx-upsert.js
//
// An extension to add 'upsert' swap style that updates
// existing elements by ID and inserts new ones.
//
// Modifiers:
//   key:attr - attribute name for sorting (default: id)
//   version:attr - attribute name for rejecting duplicate or stale replacements
//   morph - patch same-ID elements in place instead of replacing them
//   sort - sort ascending
//   sort:desc - sort descending
//   prepend - prepend elements without keys (default: append)
//
// Locality guarantee:
//   An already ordered target only mutates rows supplied by the response.
//   Stale and duplicate rows are true no-ops. Initially malformed targets
//   are repaired with the minimum number of sibling moves.
//==========================================================
(() => {
    let api;

    let compareValues = (a, b) => {
        let result;
        if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
            let normalizedA = a.replace(/^0+(?=\d)/, '');
            let normalizedB = b.replace(/^0+(?=\d)/, '');
            result = normalizedA.length - normalizedB.length ||
                normalizedA.localeCompare(normalizedB);
        } else {
            result = a.localeCompare(b, undefined, {numeric: true});
        }
        return result;
    };

    let longestIncreasingSubsequence = (values) => {
        let predecessors = new Array(values.length).fill(-1);
        let tails = [];
        for (let index = 0; index < values.length; index++) {
            let low = 0;
            let high = tails.length;
            while (low < high) {
                let middle = (low + high) >> 1;
                if (values[tails[middle]] < values[index]) {
                    low = middle + 1;
                } else {
                    high = middle;
                }
            }
            if (low > 0) predecessors[index] = tails[low - 1];
            tails[low] = index;
        }

        let result = [];
        let cursor = tails.at(-1);
        while (cursor !== undefined && cursor >= 0) {
            result.push(cursor);
            cursor = predecessors[cursor];
        }
        return result.reverse();
    };

    let reconcileOrder = (target, desired) => {
        let current = Array.from(target.children);
        if (current.every((node, index) => node === desired[index])) return;

        let desiredIndex = new Map(desired.map((node, index) => [node, index]));
        let keep = new Set(longestIncreasingSubsequence(
            current.map(node => desiredIndex.get(node))
        ).map(index => current[index]));
        let anchor = null;
        for (let index = desired.length - 1; index >= 0; index--) {
            let node = desired[index];
            if (!keep.has(node)) target.insertBefore(node, anchor);
            anchor = node;
        }
    };
    
    htmx.registerExtension('upsert', {
        init: (internalAPI) => {
            api = internalAPI;
        },
        htmx_process_upsert: (templateElt, detail) => {
            let {ctx, tasks} = detail;
            let swapSpec = {style: 'upsert'};
            let key = templateElt.getAttribute('key');
            let version = templateElt.getAttribute('version');
            let sort = templateElt.getAttribute('sort');
            let prepend = templateElt.hasAttribute('prepend');
            if (key) swapSpec.key = key;
            if (version) swapSpec.version = version;
            if (sort !== null) swapSpec.sort = sort || true;
            if (prepend) swapSpec.prepend = true;
            tasks.push({
                type: 'partial',
                fragment: templateElt.content.cloneNode(true),
                target: api.attributeValue(templateElt, 'hx-target'),
                swapSpec,
                sourceElement: ctx.sourceElement
            });
        },
        handle_swap: (style, target, fragment, swapSpec) => {
            if (style === 'upsert') {
                let keyAttr = swapSpec.key || 'id';
                let versionAttr = swapSpec.version;
                let morph = swapSpec.morph === true;
                let desc = swapSpec.sort === 'desc';
                let ordered = !!(swapSpec.key || swapSpec.sort);
                let getKey = (el) => keyAttr === 'id' ? el.id : el.getAttribute(keyAttr);
                let compare = (a, b) => desc ? -compareValues(a, b) : compareValues(a, b);
                let changed = [];

                let insertionAnchor = (newKey, excluded) => {
                    for (let child of target.children) {
                        if (child === excluded) continue;
                        let childKey = getKey(child);
                        if (!childKey || compare(newKey, childKey) < 0) return child;
                    }
                    return null;
                };

                let insert = (newEl, excluded = null) => {
                    let newKey = getKey(newEl);
                    if (!ordered || !newKey) {
                        if (swapSpec.prepend) {
                            target.insertBefore(newEl, target.firstChild);
                        } else {
                            target.appendChild(newEl);
                        }
                        return;
                    }
                    target.insertBefore(newEl, insertionAnchor(newKey, excluded));
                };

                for (let newEl of Array.from(fragment.children)) {
                    let id = newEl.id;
                    let existing = id ?
                        Array.from(target.children).find(child => child.id === id) :
                        null;
                    if (existing && versionAttr) {
                        let existingVersion = existing.getAttribute(versionAttr);
                        let newVersion = newEl.getAttribute(versionAttr);
                        if (existingVersion && newVersion &&
                            compareValues(newVersion, existingVersion) <= 0) {
                            continue;
                        }
                    }

                    if (existing) {
                        let existingKey = getKey(existing);
                        let newKey = getKey(newEl);
                        if (morph) {
                            let replacement = document.createDocumentFragment();
                            replacement.append(newEl);
                            api.morph(existing, replacement, false);
                            if (ordered && existingKey !== newKey) {
                                insert(existing, existing);
                            }
                            changed.push(existing);
                            continue;
                        } else if (!ordered || existingKey === newKey) {
                            existing.replaceWith(newEl);
                        } else {
                            // Insert first so replacing a pending row never briefly
                            // collapses the document and disturbs its scroll anchor.
                            insert(newEl, existing);
                            existing.remove();
                        }
                    } else {
                        insert(newEl);
                    }
                    changed.push(newEl);
                }

                if (ordered) {
                    let children = Array.from(target.children);
                    let keyed = children
                        .map((node, index) => ({node, index, key: getKey(node)}))
                        .filter(item => item.key)
                        .sort((a, b) => compare(a.key, b.key) || a.index - b.index)
                        .map(item => item.node);
                    let unkeyed = children.filter(child => !getKey(child));
                    reconcileOrder(
                        target,
                        swapSpec.prepend ? [...unkeyed, ...keyed] : [...keyed, ...unkeyed]
                    );
                }
                return changed;
            }
            return false;
        }
    });
})();
