//==========================================================
// hx-upsert.js
//
// An extension to add 'upsert' swap style that updates
// existing elements by ID and inserts new ones.
//
// Modifiers:
//   key:attr - attribute name for sorting (default: id)
//   version:attr - attribute name for rejecting duplicate or stale replacements
//   sort - sort ascending
//   sort:desc - sort descending
//   prepend - prepend elements without keys (default: append)
//==========================================================
(() => {
    let api;
    
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
                let desc = swapSpec.sort === 'desc';
                let getKey = (el) => el.getAttribute(keyAttr) || el.id;

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
                let compare = (a, b) => desc ? -compareValues(a, b) : compareValues(a, b);

                let insert = (newEl) => {
                    let newKey = getKey(newEl);
                    if (!newKey) {
                        if (swapSpec.prepend) {
                            target.insertBefore(newEl, target.firstChild);
                        } else {
                            target.appendChild(newEl);
                        }
                        return;
                    }

                    for (let child of target.children) {
                        let childKey = getKey(child);
                        if (!childKey || compare(newKey, childKey) < 0) {
                            target.insertBefore(newEl, child);
                            return;
                        }
                    }
                    target.appendChild(newEl);
                };

                for (let newEl of Array.from(fragment.children)) {
                    let id = newEl.id;
                    if (id) {
                        let existing = Array.from(target.children).find(child => child.id === id);
                        if (existing) {
                            if (versionAttr) {
                                let existingVersion = existing.getAttribute(versionAttr);
                                let newVersion = newEl.getAttribute(versionAttr);
                                if (existingVersion && newVersion &&
                                    compareValues(newVersion, existingVersion) <= 0) {
                                    continue;
                                }
                            }
                            existing.remove();
                        }
                    }
                    insert(newEl);
                }
                if (swapSpec.key) {
                    let children = Array.from(target.children);
                    let canonical = children.filter(child => getKey(child));
                    let pending = children.filter(child => !getKey(child));
                    canonical.sort((a, b) => compare(getKey(a), getKey(b)));
                    target.append(...canonical, ...pending);
                }
                return true;
            }
            return false;
        }
    });
})();
