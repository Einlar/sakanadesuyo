/**
 * Svelte action to detect clicks outside an element.
 * Usage: <div use:clickOutside={{ callback: () => void, ignore: HTMLElement }}>
 */
export function clickOutside(
    node: HTMLElement,
    params: { callback: () => void; ignore?: HTMLElement }
) {
    let { callback, ignore } = params;

    function handleClick(event: MouseEvent) {
        if (
            node &&
            !node.contains(event.target as Node) &&
            (!ignore || !ignore.contains(event.target as Node))
        ) {
            event.stopPropagation();
            callback();
        }
    }

    document.addEventListener('click', handleClick, true);

    return {
        update(newParams: { callback: () => void; ignore?: HTMLElement }) {
            callback = newParams.callback;
            ignore = newParams.ignore;
        },
        destroy() {
            document.removeEventListener('click', handleClick, true);
        }
    };
}
