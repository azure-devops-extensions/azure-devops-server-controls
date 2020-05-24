
/**
 * This class ought to be clean and respect its current goal which is to have only functions that
 * have result that changing depending of the support of specific function by browser. It's a
 * ScaledAgile Modernizr-ish kind of class
 */
export class BrowserFeatures {
    /**
     * Allow to know if the passive attribute is supported by the browser
     *
     * Strongly inspired by : https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
     */
    public static isSupportPassiveEvent(): boolean {
        let isPassive = false;
        try {
            let opts = Object.defineProperty({}, "passive", {
                get: () => {
                    isPassive = true;
                }
            });
            window.addEventListener("isPassive", null, opts);
        } catch (e) { }
        return isPassive;
    }

    /**
     * Return the property mousewheel event depending of what it's supported by the browser
     * @return {string} - Event name
     */
    public static getMouseWheelEvent(): string {
        return "onwheel" in document.createElement("div") ? "wheel" :
            document.onmousewheel !== undefined ? "mousewheel" :
                "DOMMouseScroll";
    }

    /**
     * Get the proper option depending of the browser. If the browser is modern, it will return the listener
     * to be passive. This allow to have a better scrolling experience. If it's not, it return false because
     * it fallbacks to the "userCapture" instead of the options object.
     * @return {object | boolean} : Passive if it's supported; False if not.
     */
    public static getAddEventListenerOptions(): any {
        return BrowserFeatures.isSupportPassiveEvent() ? { passive: true } : false;
    }

    private static isTouchDeviceCache: boolean = undefined;
    /**
     * Determine if touch is enabled. 
     */
    public static isTouchDevice(): boolean {
        if (BrowserFeatures.isTouchDeviceCache === undefined) {
            try {
                document.createEvent("TouchEvent");
                BrowserFeatures.isTouchDeviceCache = true;
            } catch (e) {
                BrowserFeatures.isTouchDeviceCache = false;
            }
        }
        return BrowserFeatures.isTouchDeviceCache;
    }

}