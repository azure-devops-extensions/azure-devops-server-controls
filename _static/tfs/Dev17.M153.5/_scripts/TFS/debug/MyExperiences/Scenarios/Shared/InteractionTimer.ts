/// <reference types="jquery" />
import * as PageEvents from "VSS/Events/Page";
import * as EventsServices from "VSS/Events/Services";
import { HubEventNames } from "VSS/Navigation/HubsService";
import * as Handlers from "VSS/Events/Handlers";

/** 
 * Provides timings for interacting with the page
 */
export class InteractionTimer {
        
    private pageInteractiveTime: Date = null;
        
    private firstInteractionEvent = new Handlers.Event<InteractionTimer, void>();

    private $body = $('body');

    constructor() {
        this.$body.on('click', this.clickHandler);
        this.$body.on('keypress', this.keypressHandler);
        PageEvents.getService().subscribe(PageEvents.CommonPageEvents.PageInteractive,
            (event: PageEvents.IPageEvent) => {
                this.pageInteractiveTime = new Date();
            });

        EventsServices.getService().attachEvent(HubEventNames.PostXHRNavigate, () => {
            this.pageInteractiveTime = new Date();
        });
    }

    /** Provides the time it takes for the user to interact with the current page.
     *  This excludes navigational interactions, such as scrolling and tabbing.
     *
     *  Caveats:
     *     - If you middle-click on scrollable content, you can invoke the browser's
     *       auto-scroller (the circle with four arrows). This a navigation interaction.
     *       However we incorrectly count it as an interaction because we're unable to
     *       differentiate between this, and middle-clicking on an element to open a new
     *       tab (the target isn't always a link tab).
     *     - If an element uses event.stopPropagation(), we will not detect it. If we 
     *       need to address this, we'll have to move this class into the framework and
     *       override EventTarget.addEventListener so that we can record all events and
     *       then pass on the event to the actual listeners.
     * 
     * @param {callback} invoked when the first interaction occurs
     */
    public RegisterForFirstInteraction(callback: () => void) {
        this.firstInteractionEvent.getHandlers().subscribe(callback);
    }

    /**
     * Provides the time that has elapsed since the page became interactive
     * @return -1 if the page is not interactive as yet. 
     */
    public getElapsedTimeInMilliseconds() {
        if (this.pageInteractiveTime === null) {
            return -1;
        }
        return new Date().getTime() - this.pageInteractiveTime.getTime();
    }
    
    private onFirstInteraction = () => {        
        if (this.pageInteractiveTime === null) {
            // Ignore interactions that happen before the page is interactive, as they have no effect.
            return;
        }
        let voidValue = (function () {})();
        this.firstInteractionEvent.invokeHandlers(this, voidValue);        
        this.$body.off("click", this.clickHandler);
        this.$body.off("keypress", this.keypressHandler);
    }

    private clickHandler = (event: JQueryEventObject) => {
        this.onFirstInteraction();
    }

    private keypressHandler = (event: JQueryEventObject) => {
        let navigationKeys = [
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "End",
            "Home",
            "PageDown",
            "PageUp",
            " ",
        ];
        if (navigationKeys.indexOf(event.key) === -1) {
            this.onFirstInteraction();
        }
    }
}