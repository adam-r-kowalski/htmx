(() =>{

    function normalizeSwapStyle(style) {
        return style === 'before' ? 'beforebegin' :
            style === 'after' ? 'afterend' :
                style === 'prepend' ? 'afterbegin' :
                    style === 'append' ? 'beforeend' : style;
    }

    function swapStyle(ctx) {
        let [style = 'innerHTML'] = (ctx.swap || '').trim().split(/\s+/);
        return normalizeSwapStyle(style);
    }

    function usesViewTransition(ctx) {
        return ctx.transition === true || /\btransition\s*:\s*true\b/.test(ctx.swap || '');
    }

    function updateWithViewTransition(ctx, update) {
        if (usesViewTransition(ctx) && document.startViewTransition) {
            return document.startViewTransition(update);
        }
        update();
    }

    let api;

    function insertOptimisticContent(ctx) {
        ctx.optimistic = api.attributeValue(ctx.sourceElement, "hx-optimistic");
        if (!ctx.optimistic) {
            return
        }

        let sourceElt = document.querySelector(ctx.optimistic);
        if (!sourceElt) return;

        let target = ctx.target;

        if (typeof target === 'string') {
            target = document.querySelector(target);
        }
        if (!target) return;

        // Create optimistic div with reset styling
        let optimisticDiv = document.createElement('div');
        optimisticDiv.style.cssText = 'all: initial';
        optimisticDiv.classList.add('hx-optimistic');
        let sourceNodes = sourceElt instanceof HTMLTemplateElement ? sourceElt.content.childNodes : sourceElt.childNodes;
        for (let child of sourceNodes) optimisticDiv.appendChild(child.cloneNode(true));

        // Set data-* for each request param
        if (ctx.optimisticBody) {
            let keys = new Set(ctx.optimisticBody.keys());
            for (let k of keys) {
                let values = ctx.optimisticBody.getAll(k).filter(v => typeof v === 'string');
                if (!values.length) continue;
                let val = values.length === 1 ? values[0] : JSON.stringify(values);
                try {
                    optimisticDiv.dataset[k] = val;
                } catch (e) {
                    try {
                        optimisticDiv.setAttribute('data-' + k, val);
                    } catch (e2) { /* truly invalid name, skip */ }
                }
            }
        }

        let style = swapStyle(ctx);
        ctx.optHidden = [];
        ctx.optimisticDiv = optimisticDiv;
        ctx.optimisticTarget = target;

        let insert = () => {
            if (style === 'innerHTML') {
                // Hide children of target
                for (let child of target.children) {
                    child.style.display = 'none';
                    ctx.optHidden.push(child);
                }
                target.appendChild(optimisticDiv);
            } else if (['beforebegin', 'afterbegin', 'beforeend', 'afterend'].includes(style)) {
                target.insertAdjacentElement(style, optimisticDiv);
            } else {
                // Assume outerHTML-like behavior, Hide target and insert div after it
                target.style.display = 'none';
                ctx.optHidden.push(target);
                target.after(optimisticDiv);
            }
            htmx.process(optimisticDiv);
        };
        ctx.optimisticTransition = updateWithViewTransition(ctx, insert);
    }

    function removeOptimisticContent(ctx) {
        if (!ctx.optimisticDiv) return;

        // Remove optimistic div
        ctx.optimisticDiv.remove();

        // Unhide any hidden elements
        for (let elt of ctx.optHidden) {
            elt.style.display = '';
        }
    }

    function rollbackOptimisticContent(ctx) {
        let rollback = () => updateWithViewTransition(ctx, () => removeOptimisticContent(ctx));
        if (ctx.optimisticTransition?.updateCallbackDone) {
            ctx.optimisticTransition.updateCallbackDone.then(rollback, rollback);
        } else {
            rollback();
        }
    }

    function optimisticContentWillBeReplaced(ctx, tasks) {
        return tasks?.some(task =>
            task.type === 'main' &&
            task.target === ctx.optimisticTarget &&
            task.swapSpec?.style === 'innerHTML'
        );
    }

    htmx.registerExtension('hx-optimistic', {
        init: (internalAPI) => { api = internalAPI; },
        htmx_config_request: (elt, detail) => {
            let body = detail.ctx.request.body;
            if (body?.entries) detail.ctx.optimisticBody = body;
        },
        htmx_before_request: (elt, detail) => {
            insertOptimisticContent(detail.ctx);
        },
        htmx_error : (elt, detail) => {
            rollbackOptimisticContent(detail.ctx)
        },
        htmx_before_swap : (elt, detail) => {
            if (!optimisticContentWillBeReplaced(detail.ctx, detail.tasks)) {
                removeOptimisticContent(detail.ctx)
            }
        }
    });
})();
