const noScrollClassName = "no-scroll";

/**
 * Prevents body scrolling on mobile devices, for example, when an overlay is active.
 * See body.no-scroll in Mobile.scss
 * NOTE: Since we don't do ref counting here, be careful using this if you have nested controls
 * calling this functions.
 */
export function disableBodyScroll() {
    document.body.classList.add(noScrollClassName);
}

/**
 * Enables back body scrolling.
 * NOTE: Since we don't do ref counting here, be careful using this if you have nested controls
 * calling this functions.
 */
export function enableBodyScroll() {
    document.body.classList.remove(noScrollClassName);
}
