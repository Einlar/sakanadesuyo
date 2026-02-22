/**
 * Svelte action to portal a node to a target element (default: body)
 */
export function portal(
    node: HTMLElement,
    target: string | HTMLElement = 'body'
) {
    let targetEl: HTMLElement | null;

    function update(newTarget: string | HTMLElement) {
        target = newTarget;
        targetEl =
            typeof target === 'string'
                ? document.querySelector(target)
                : target;
        if (targetEl) {
            targetEl.appendChild(node);
        }
    }

    function destroy() {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    update(target);

    return {
        update,
        destroy
    };
}
