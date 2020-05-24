


import WidgetHost = require("Dashboards/Scripts/WidgetHost");

import TFS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");

/**
 * Allows the first party widgets to bump / reset the z-index value of the widget host so that drop 
 * downs appear above other widgets. Z-index value is increased by just 10. This assumes
 * that there is no disparity in z-index values between widget host elements(other than the 1 element elevation of currently mouse-focused widget, is not always the menu host).
 */
export interface IWidgetHostZIndexModifier {
    bump(): void;
    reset(): void;
    /** Indicates if the bump() has been called ever.  Reset does not clear this state. */
    isBumped(): boolean;
}

/**
 * This class allows a widget to raise the z-index of its container, the widget host.
 * NOTE: The use of this class is intended to be limited as widgets should avoid modifying their host element.
 *
 * WidgetHostZIndexModifier is single-use only.
 * Create an instance when a drop down menu is opened and call bump.
 * Then call reset when the menu is closed.
 *
 * Widgets that have popup menus that extend outside the bounds of those widgets have z-index issues. The menus
 * can end up hidden underneath other widgets. Because the popup menus are relatively/absolutely positioned, their
 * z-index only stacks them against other elements within the same container. Because the widget hosts are absolutely positioned,
 * they are containers meaning the menus cannot be z-indexed higher than the widget hosts that contain them. Since all
 * widget hosts have the same index, any overflowing menus may end up being drawn underneath a neighboring widget host. The only
 * way to remedy this is to raise the z-index of the widget host containing the popup menu relative to other hosts.
 */
export class WidgetHostZIndexModifier implements IWidgetHostZIndexModifier {
    /**
     * Creates a single-use instance of the z-index modifier for the host of the widget passed in as an argument
     * @param {TFS_Control_BaseWidget.BaseWidgetControl<any>} widget - The widget whose host needs z-index modification
     */
    public static create<T>(widget: TFS_Control_BaseWidget.BaseWidgetControl<any>): WidgetHostZIndexModifier {
        var hostElement = widget.getElement().closest(WidgetHost.WidgetHostClassSelector);

        if (!hostElement) {
            throw new Error("Could not find widget host element");
        }

        return new WidgetHostZIndexModifier(hostElement);
    }

    private hostElement: JQuery;

    private bumpCalled: boolean;
    private resetCalled: boolean;

    constructor(hostElement: JQuery) {
        this.bumpCalled = this.resetCalled = false;
        this.hostElement = hostElement;
    }
    
    /**
     * Raises the z-index of the widget host to one-above the original value. Can only be called once.
     */
    public bump(): void {
        if (this.isBumped()) {
            throw new Error("Cannot call bump() twice");
        }

        if (this.resetCalled) {
            throw new Error("Cannot call bump() after reset()");
        }

        this.bumpCalled = true;

        //Obtain implicit z-index.
        var originalHostElementZIndex = +this.hostElement.css("z-index");

        // This value allows a step which allows us to clearly show the widget above any other elements which are in foreground 
        // (otherwise, focal widget can gain focus when mousing outside the menu host widget)
        var moderateZIndexIncrease = 10;
        this.hostElement.css("z-index", originalHostElementZIndex + moderateZIndexIncrease);
    }
    
    /**
     * Restores the z-index of the widget host. Once called, the modifier is no longer usable.
     */
    public reset(): void {
        if (!this.isBumped()) {
            throw new Error("reset() called before bump()");
        }

        if (this.resetCalled) {
            throw new Error("Cannot call reset() twice");
        }

        this.resetCalled = true;

        //Unset explicitly assigned z-index value, so that global styles can regain precedence
        this.hostElement.css("z-index", "");
    }

    /**
     * Exposes the current bump state of the Z-Index Modifier.
     */
    public isBumped(): boolean {
        return this.bumpCalled;
    }
}
