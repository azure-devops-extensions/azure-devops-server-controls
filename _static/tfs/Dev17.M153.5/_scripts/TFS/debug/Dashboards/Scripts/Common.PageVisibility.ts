export module PageVisibility {
    /**
     * Encapsulates properties of the page (event handler names, direct member properties) that are of interest for visibility.
     */
    interface VisibilityProperties {
        /**
        * name of the property on the document that indicates whether the page is visible or not. 
        */
        hidden: string;
        /**
        * event fired on the document when the visibility changes. 
        */
        visibilityChangeEventName: string;
    }

    var pageVisibilityProperties: VisibilityProperties;
    var isVisible: boolean;

    /**
     * set visibility properties
     * @param hidden
     * @param visibilityChange
     */
    function setPageVisibilityProperties(
        hidden: string, 
        visibilityChange: string
    ): void {
        pageVisibilityProperties = {
            hidden: hidden,
            visibilityChangeEventName: visibilityChange
        };
    }

    /**
     * test if the page visibility apis are supported on the page
     */
    function isPageVisibilitySupported(): boolean {
        if (typeof document.addEventListener === "undefined" || typeof document[pageVisibilityProperties.hidden] === "undefined") {
            return false;
        }

        return true;
    }

    /**
     * evaluates the document to  identify visibility properties available to it. 
     */
    function initialize(): void {
        // supported in Chrome 33+, Firefox 18+, IE 10+. 
        if (typeof document.hidden !== "undefined") {
            setPageVisibilityProperties("hidden", "visibilitychange");
        }
        // supported in Firefox  before 18.
        else if (typeof (<any>document).mozHidden !== "undefined") {
            setPageVisibilityProperties("mozHidden", "mozvisibilitychange");
        }
        // supported in IE 9+
        else if (typeof (<any>document).msHidden !== "undefined") {
            setPageVisibilityProperties("msHidden", "msvisibilitychange");
        }
        // supported in Chrome 13+ to Chrome 33
        else if (typeof (<any>document).webkitHidden !== "undefined") {
            setPageVisibilityProperties("webkitHidden", "webkitvisibilitychange");
        }
    }

    (() => {
        initialize();
        if (isPageVisibilitySupported()) {
            isVisible = !document[pageVisibilityProperties.hidden];
            document.addEventListener(
                pageVisibilityProperties.visibilityChangeEventName,
                () => {
                    isVisible = !document[pageVisibilityProperties.hidden];
                },
                false);
        }
    })();

    /**
     * qualify if the page is visible. Note that if the support doesnt exist on the page for these apis,
     * we assume that the page is always visible.
     */
    export function isPageVisible(): boolean {
        return isPageVisibilitySupported() ? isVisible : true;
    }
}