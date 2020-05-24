/// <reference types="react" />

import * as React from "react";
import * as Diag from "VSS/Diag";
import * as Q from "q";

import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import Utils_Core = require("VSS/Utils/Core");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import { autobind } from "OfficeFabric/Utilities";

import { IViewBounds } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { ViewBounds } from "ScaledAgile/Scripts/Main/Models/ViewsImplementations";
import { IViewActionsCreator } from "ScaledAgile/Scripts/Main/Actions/ViewActionsCreator";

import { CalendarElement } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/CalendarElement";
import { Teams } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Teams";
import { TeamsVerticalScrollbar } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/TeamsVerticalScrollbar";
import { FavoriteStar } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/FavoriteStar";
import { IViewportMovedDelta, ViewportMovedDelta, Movement, MovementType } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { ItemStore } from "ScaledAgile/Scripts/Shared/Stores/ItemStore";
import { Mapper } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineMappers";
import { IDeliveryTimeLineStoreData, ICalendarMonth } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IDeliveryTimeLineActionsCreator, DeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { DeliveryTimelinePreferences } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/DeliveryTimelinePreferences";
import { DeliveryTimelineShortcutGroup } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/DeliveryTimelineShortcutGroup";
import { DeliveryTimelinesDataProvider } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/DataProviders/DeliveryTimelinesDataProvider";
import { DeliveryTimeLineStore } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Stores/DeliveryTimeLineStore";
import { DeliveryTimeLineActions } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActions";
import { DeliveryTimeLineTelemetry } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimeLineTelemetry";
import { DeliveryTimelineFocusUtils } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineFocusUtils";
import { DeliveryTimeLineViewConstants, DeliveryTimeLineViewClassNameConstants, DragDropZoneEnclosureConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { FeatureEnablement } from "ScaledAgile/Scripts/Shared/Utils/FeatureEnablement";
import { IViewContentElements } from "ScaledAgile/Scripts/PlanPage";
import { DelayedQueue } from "ScaledAgile/Scripts/Shared/Utils/DelayedQueue";
import { KeyCode } from "VSS/Utils/UI";

import { ItemActions } from "ScaledAgile/Scripts/Shared/Actions/ItemActions";
import { DeliveryTimeLineMembershipEvaluator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineMembershipEvaluator";

import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { BrowserFeatures } from "ScaledAgile/Scripts/Shared/Utils/BrowserFeatures";
import { IViewsStore } from "ScaledAgile/Scripts/Main/Stores/ViewsStore";
import { IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { DragAndDropZoneEnclosure } from "Presentation/Scripts/TFS/Components/DragDropZone/DragAndDropZoneEnclosure";
import { DragDropContext } from "Presentation/Scripts/TFS/Components/DragDropZone/DragDropContext";
import { PlanFilter } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/PlanFilter";
import { IFilter } from "VSSUI/Utilities/Filter";

import * as VSS from "VSS/VSS";
import * as Async_ConfigurationLauncher from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/ConfigurationLauncher";

export interface IDeliveryTimeLineProps {
    /**
     * Store facade for DeliveryTimeLine, has instances of DeliveryTimeLineStore and ItemStore
     */
    deliveryTimeLineStore: DeliveryTimeLineStore;

    /**
     * Instance of delivery timeline actions creator
     */
    actionsCreator: IDeliveryTimeLineActionsCreator;

    /**
     * The outer container of the entire component tree
     */
    container: Element;

    /**
     * Control unique identifier
     */
    key: string;
}

/**
 * The interface defining the state for the DeliveryTimeLine
 */
export interface IDeliveryTimeLineStates {
    /**
     * The instance of the IDeliveryTimeLineStoreData
     */
    deliveryTimeLineStoreData: IDeliveryTimeLineStoreData;
}

class ViewportChangedParameters {
    constructor(public left: number, public width: number, public height: number) { }
}

/**
 * This is the whole delivery time line view. It is responsible of the horizontal scrolling (the time) and
 * is the one that propagate all the information to its team.
 */
export class DeliveryTimeLine extends React.Component<IDeliveryTimeLineProps, IDeliveryTimeLineStates> {
    private _deliveryTimeLineStoreChangedHandler: IEventHandler;
    private _resizeThrottleDelegate: IArgsFunctionR<any>;
    private _viewportChangeQueue: DelayedQueue<IViewportMovedDelta>;
    private _scrollLeft: number;
    private _scrollTop: number;
    private _mouseDownHandler: (e: MouseEvent) => void;
    private _mouseUpHandler: (e: MouseEvent) => void;
    private _mouseMoveHandler: (e: MouseEvent) => void;
    private _touchStartHandler: (e: TouchEvent) => void;
    private _touchEndHandler: (e: TouchEvent) => void;
    private _touchMoveHandler: (e: TouchEvent) => void;

    /**
     * This wouldn't be required if Edge with touch would use the touch capability. Since Edge doesn't use touch, we
     * fall back to mouse move. The problem is that Edge can start the mouseMove before mouseDown which will use the
     * last mouseDownX coordinnate, thus make the screen appears to jump because of a wrong delta between the mouse
     * coordinate and the initial mouseDownContainerPositionX.
     * 
     */
    public static isMousePressed: boolean = false;

    /**
     * Know if a card ie being dragged
     */
    private isCardBeingDragged: boolean = false;

    /**
     * X position of the press which will be updated on every call to the action creator
     */
    private mouseDownContainerPositionX: number = 0;

    /**
     * Initial X position of the press which is captured when the mouse down occurs. Never updated on mouse move.
     */
    private initialMouseDownContainerPositionX: number = 0;

    /**
    * resize throttle time in milliseconds
    */
    private static resizeThrottleTimeInMilliseconds = 20;

    /**
     * Pointer to the Html Div (to use with parsimony because of performance reason)
     */
    private _mainDom: HTMLDivElement;

    /**
     * What: Callback used by React to get a reference to the DOM element of the main div of this component
     * Why: Allow to have a single instance of this function created in the render (performance reason)
     */
    private domReferenceAssignationCallback = (input: HTMLDivElement) => this._mainDom = input;

    constructor(props: IDeliveryTimeLineProps, context?: any) {
        super(props, context);

        this._viewportChangeQueue = new DelayedQueue<IViewportMovedDelta>((e) => this._mergeAndInvokeViewportChange(e));
        this._initializeChangeHandlers();
        this._resizeThrottleDelegate = Utils_Core.throttledDelegate(this, DeliveryTimeLine.resizeThrottleTimeInMilliseconds, this._resizeHandler);

        this.state = {
            deliveryTimeLineStoreData: this.props.deliveryTimeLineStore.getValue()
        } as IDeliveryTimeLineStates;
    }

    /**
     * Remove the control when unmounting the React wrapper
     */
    public componentWillUnmount() {
        this._mainDom.removeEventListener("mousedown", this._mouseDownHandler);
        this._mouseDownHandler = null;
        this._mainDom.removeEventListener("mouseup", this._mouseUpHandler);
        this._mouseUpHandler = null;
        this._mainDom.removeEventListener("mousemove", this._mouseMoveHandler);
        this._mouseMoveHandler = null;
        window.removeEventListener("resize", this._resizeThrottleDelegate);
        this._resizeThrottleDelegate = null;
        this.props.deliveryTimeLineStore.removeChangedListener(this._deliveryTimeLineStoreChangedHandler);
        this._deliveryTimeLineStoreChangedHandler = null;
        this.props.actionsCreator.dispose();

        if (this._touchStartHandler) {
            this._mainDom.removeEventListener("touchstart", this._touchStartHandler);
            this._touchStartHandler = null;
        }

        if (this._touchEndHandler) {
            this._mainDom.removeEventListener("touchend", this._touchEndHandler);
            this._touchEndHandler = null;
        }

        if (this._touchMoveHandler) {
            this._mainDom.removeEventListener("touchmove", this._touchMoveHandler);
            this._touchMoveHandler = null;
        }
    }

    /**
     * Setup the listener to the Delivery Time Line view store
     *
     * Setup horizontal movement
     */
    public componentDidMount() {
        this.props.deliveryTimeLineStore.addChangedListener(this._deliveryTimeLineStoreChangedHandler);

        this._attachMousePanSupport(this._mainDom);
        window.addEventListener("resize", this._resizeThrottleDelegate);

        this._mainDom.scrollLeft = this.state.deliveryTimeLineStoreData.viewportLeft; // When loading new month, we keep the horizontal in sync to avoid jitter
    }

    private _attachMousePanSupport(timeLineDom: HTMLDivElement) {
        if (BrowserFeatures.isTouchDevice()) {
            this._componentDidMountTouchDevice(timeLineDom);
        }
        this._componentDidMountNotTouchDevice(timeLineDom);
    }

    private _resizeHandler(e: UIEvent) {
        if (this.state.deliveryTimeLineStoreData) {
            this._raiseViewportDimensionsChanged();
        }
    }

    /**
     * Handle the horizontal movement of a touch movement
     *
     * See https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
     *  for information about the passive
     * @param {HTMLDivElement} timeLineDom - The delivery timeline container
     */
    private _componentDidMountTouchDevice(timeLineDom: HTMLDivElement): void {
        let options = BrowserFeatures.getAddEventListenerOptions();
        this._touchStartHandler = (e: TouchEvent) => {
            DeliveryTimeLine.isMousePressed = true;
            this.mouseDownContainerPositionX = e.touches[0].pageX;
        };
        timeLineDom.addEventListener("touchstart", this._touchStartHandler, options);

        this._touchEndHandler = (e: TouchEvent) => {
            const x = (e.changedTouches.length > 0 && e.changedTouches[e.changedTouches.length - 1].pageX) || this.mouseDownContainerPositionX;
            this._onPressReleased(x, event.target, MovementType.Touch);
        };
        timeLineDom.addEventListener("touchend", this._touchEndHandler, options);

        this._touchMoveHandler = (e: TouchEvent) => {
            if (this._cancelPanning()) {
                //Prevent mousepan to allow dragging an item.
                Diag.Debug.logVerbose("Cancel panning");
                return;
            }

            Diag.Debug.logVerbose("Touch move");
            this._queueHorizontalViewportChange((this.mouseDownContainerPositionX - e.touches[0].pageX));
            this.mouseDownContainerPositionX = e.touches[0].pageX; //Adjust the X position to avoid adding movement from last evaluation
            return false;
        };
        timeLineDom.addEventListener("touchmove", this._touchMoveHandler, options);
    }

    /**
     * Handle the horizontal movement of a not touch movement (mouse)
     *
     * See https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
     *  for information about the passive
     * @param {HTMLDivElement} timeLineDom - The delivery timeline container
     */
    private _componentDidMountNotTouchDevice(timeLineDom: HTMLDivElement): void {
        let options = BrowserFeatures.getAddEventListenerOptions();

        this._mouseDownHandler = (e) => {
            this._mouseDown(e);
        };
        timeLineDom.addEventListener("mousedown", this._mouseDownHandler);

        this._mouseUpHandler = (e) => {
            this._mouseUp(e);
        };
        timeLineDom.addEventListener("mouseup", this._mouseUpHandler, options);

        this._mouseMoveHandler = (e) => {
            this._mouseMove(e);
        };
        timeLineDom.addEventListener("mousemove", this._mouseMoveHandler, options);
    }

    /**
     * What: Setup the handler that will be called when the store change
     * Why: - Need to change the root component state to render the components
     *      - This method can be called often in operation like panning or scrolling, the requestAnimationFrame
     *        allow to do all the rendering more smoothly.
     */
    private _initializeChangeHandlers(): void {
        this._deliveryTimeLineStoreChangedHandler = (data: DeliveryTimeLineStore) => {
            window.requestAnimationFrame(() => {
                this.setState($.extend({}, this.state, { deliveryTimeLineStoreData: data.getValue() }));
            });
        };
    }

    /**
     * Save the beginning X position. This way we can later do the difference and calculate what is needed to display.
     * @param {MouseEvent} event - Allow to get the X position
     */
    private _mouseDown(event: MouseEvent): void {
        this.initialMouseDownContainerPositionX = this.mouseDownContainerPositionX = event.pageX;
        DeliveryTimeLine.isMousePressed = true;
        DragDropContext.lastMouseDownCoordinate.x = event.pageX;
        DragDropContext.lastMouseDownCoordinate.y = event.pageY;

        // We need to prevent loss of focus on our elements while panning, so we generally preventDefault. However,
        // focus loss is a cue to submit the "inline add" card and dismiss the "add" menu, so we explicitly allow that.
        if (!DeliveryTimelineFocusUtils.getCurrentInlineAddCardFocusIdentifier(this.state.deliveryTimeLineStoreData)
            && !DeliveryTimelineFocusUtils.getCurrentAddNewItemFocusIdentifier(this.state.deliveryTimeLineStoreData)) {
            event.preventDefault();
        }
    }

    /**
     * 
     * @param {MouseEvent} event - Not used
    */
    private _mouseUp(event: MouseEvent): void {
        if (event.which === 1) {
            this._onPressReleased(event.pageX, event.target, MovementType.Mouse);
        }
        else if (event.which === 3) { //Right click
            const $target = $(event.target);
            this.props.actionsCreator.rightClick($target.attr("id"), $target.attr("class"));
        }
    }

    /**
     * Send telemetry about how to user moved and make the pressed flag to false. Invoked by the mouse up and touchend
     * @param {number} xMovement - x position for the movement
     * @param {EventTarget} target - What has been touched on the up event (mouse up or touch end)
     * @param {MovementType} movementType - If the move is a mouse or touch
     */
    private _onPressReleased(xMovement: number, target: EventTarget, movementType: MovementType): void {
        DeliveryTimeLine.isMousePressed = false; // Only because of Edge with touch. See comment on isMousePressed field.
        const difference = xMovement - this.mouseDownContainerPositionX;
        const differenceSinceMouseDown = xMovement - this.initialMouseDownContainerPositionX;

        // Avoid to collect telemetry on a single click without really panning
        if (Math.abs(differenceSinceMouseDown) <= 5) {
            return;
        }

        // We do not want to have a move done when we click on the scrollbar, the 2 pans buttons or a card
        const $target = $(target);
        if ($target.hasClass("vertical-scrollbar-container") || $target.hasClass("bowtie-chevron-right") || $target.hasClass("bowtie-chevron-left") || $target.closest(".card").length > 0) {
            return;
        }
        let movement = difference >= 0 ? Movement.Right : Movement.Left;
        this.props.actionsCreator.viewportMovedDone(movement, movementType);
    }

    /**
     * Detect the number of pixel moved horizontally
     * @param {MouseEvent} event - Get the current X position of the container
     */
    private _mouseMove(event: MouseEvent): void {
        DragDropContext.currentMouseCoordinate.x = event.pageX;
        DragDropContext.currentMouseCoordinate.y = event.pageY;
        if (this._cancelPanning()) {
            //Prevent mousepan to allow dragging an item.
            return;
        }

        if (((event.buttons && event.buttons === DeliveryTimeLineViewConstants.leftButton)
            || (event.buttons === undefined && event.which && event.which === DeliveryTimeLineViewConstants.leftButton))
            && DeliveryTimeLine.isMousePressed) {
            let horizontalMovement = (this.mouseDownContainerPositionX - event.pageX);
            if (horizontalMovement > DeliveryTimeLineViewConstants.mousemoveDelta || horizontalMovement < -1 * DeliveryTimeLineViewConstants.mousemoveDelta) {
                // This horizontal movement delta helps identify whether the movement is dragging timeline or a drag action.
                this.mouseDownContainerPositionX = event.pageX; //Adjust the X position to avoid adding movement from last evaluation
                this._queueHorizontalViewportChange(horizontalMovement);
            }
        }
    }

    /**
     * This is a hack to prevent mouse move when dragging. The best solution would be to not depend of Dom element + class and just handling correctly the events.
     */
    private _cancelPanning(): boolean {
        return this.isCardBeingDragged || this.state.deliveryTimeLineStoreData.isInlineAddEditing();
    }

    /**
     * This methods calculates the viewport dimensions.
     * @return {ViewportChangedParameters} Null can be returned in the scenario that the timeline dom is not present (this can happen when plans are switching).
     */
    private _getViewportChangedParameters(): ViewportChangedParameters {
        if (this._mainDom) {
            let left = this._mainDom.scrollLeft;
            let width = this._mainDom.clientWidth; /*Visible width*/
            // Don't remove without a better solution that you have tested in IE AND EDGE AND CHROME, what this does is calculate the height of the visible timleine by taking the height of the right content
            // and then subtracting the top value of the timeline dom from the right content and then the calendar month height and margin to get the accurate height for the scrollbar
            let pageHeight = this.props.container.clientHeight + this.props.container.getBoundingClientRect().top;
            let height = pageHeight - this._mainDom.getBoundingClientRect().top - DeliveryTimeLineViewConstants.calendarPanWidthAndHeight - DeliveryTimeLineViewConstants.timelineSeperationMargin;  /*Visible height*/

            return new ViewportChangedParameters(left, width, height);
        }
        return null;
    }

    /**
     * Invokes the viewportDimensionsChanged action 
     */
    private _raiseViewportDimensionsChanged(): void {
        let params = this._getViewportChangedParameters();
        if (params) {
            this.props.actionsCreator.viewportDimensionsChanged(params.left, params.width, params.height);
        }
    }

    /*
     * Add the horizontal change in pixel to the queue to have the action creator notified
     * @param {number} horizontalPixelChange - Number of pixel moved
     */
    private _queueHorizontalViewportChange(horizontalPixelChange: number): void {
        if (horizontalPixelChange !== 0) {
            this._viewportChangeQueue.add(new ViewportMovedDelta(horizontalPixelChange, 0));
        }
    }

    /**
     * Add the vertical change in pixel to the queue to have the action creator notified
     * @param {number} horizontalPixelChange - Number of pixel moved
     */
    private _queueVerticalViewportChange = (verticalPixelChange: number): void => {
        if (verticalPixelChange !== 0) {
            this._viewportChangeQueue.add(new ViewportMovedDelta(0, verticalPixelChange));
        }
    }

    /**
     * Sets the viewport top in alignment with the vertical scroll bar.
     * This is invoked when the scrollbar it being adjusted by the user.
     * @param {number} top - The new viewport top
     */
    private _setViewportTopFromScrollbar = (top: number) => {
        this.props.actionsCreator.setViewportTop(top);
    };

    /**
     * Take the last viewport change data which contain the last values for the user but
     * merge all vertical and horizontal movement
     * @param {IViewportMovedDelta[]} queueData - List of all changes in the last few millisecond
     */
    private _mergeAndInvokeViewportChange(queueData: IViewportMovedDelta[]): void {
        if (queueData) {
            Diag.Debug.logVerbose("_mergeAndInvokeViewportChange");
            let horizontalMovement = 0;
            let verticalMovement = 0;
            let len = queueData.length;
            Diag.Debug.logVerbose("Send to action creator the merge of " + len + " request");
            for (let i = 0; i < len; i++) {
                horizontalMovement += queueData[i].horizontal;
                verticalMovement += queueData[i].vertical;
            }

            if (horizontalMovement !== 0 || verticalMovement !== 0) {
                this.props.actionsCreator.viewportMoved(horizontalMovement, verticalMovement);
            }
        }
    }

    @autobind
    private _scrollDone(movement: Movement, movementType: MovementType): void {
        this.props.actionsCreator.viewportMovedDone(movement, movementType);
    }

    @autobind
    private _teamMouseWheelDone(movement: Movement, movementType: MovementType): void {
        this.props.actionsCreator.viewportMovedDone(movement, movementType);
    }

    /**
     * Render the delivery time line. This is the main (root) component.
     */
    public render(): JSX.Element {
        const data = this.state.deliveryTimeLineStoreData;
        if (data) {
            const months: ICalendarMonth[] = data.calendarMonths || [];

            let verticalScrollBar: JSX.Element = null;
            if (data.worldHeight && data.viewportHeight) {

                verticalScrollBar = <TeamsVerticalScrollbar
                    onScroll={this._setViewportTopFromScrollbar}
                    viewportHeight={data.viewportHeight}
                    worldHeight={data.worldHeight}
                    top={data.viewportTop}
                    scrollDone={this._scrollDone}
                />;
            }


            const delay = FeatureEnablement.isCardDragDropDelayed() ? 265 : 0;

            return <div ref={this.domReferenceAssignationCallback} className={DeliveryTimeLineViewClassNameConstants.deliveryTimeline}>
                <CalendarElement
                    actionsCreator={this.props.actionsCreator}
                    months={months}
                    calendarMarkers={data.calendarMarkers}
                    zoomLevelInPixelPerDay={data.zoomLevelInPixelPerDay}
                    todayMarkerPosition={data.todayMarkerPosition}
                    worldStartDate={data.worldStartDate}
                    viewportWidth={data.viewportWidth}
                    worldState={data}
                />
                <DragAndDropZoneEnclosure
                    idContext={DragDropZoneEnclosureConstants.CONTEXT_ID_DELIVERY}
                    showPossibleDropOnDragStart={true}
                    showPlaceHolderOnHover={true}
                    delayInMsBeforeDrag={delay}
                >
                    <Teams
                        actionsCreator={this.props.actionsCreator}
                        scrollingLeftOffset={data.viewportLeft}
                        worldWidth={data.worldWidth}
                        currentTimeline={data}
                        numberOfMonthsRendered={months}
                        zoomLevelInPixelPerDay={data.zoomLevelInPixelPerDay}
                        top={data.viewportTop}
                        invokeVerticalChange={this._queueVerticalViewportChange}
                        cardRenderingOptions={data.cardRenderingOptions}
                        isCardBeingDragged={this._isCardBeingDragged}
                        mouseWheelDone={this._teamMouseWheelDone}
                    />
                </DragAndDropZoneEnclosure>
                {verticalScrollBar}
            </div>;
        }
        else {
            return null; // This must never happening. We loss all events attached to ref=timelineDom
        }
    }

    /**
    * Adjust the scroll position on every update
    * @param {IDeliveryTimeLineProps} prevProps - The previous props of the component
    * @param {IDeliveryTimeLineStates} prevState - The previous state of the component
    */
    public componentDidUpdate(prevProps: IDeliveryTimeLineProps, prevState: IDeliveryTimeLineStates) {
        if (this.state.deliveryTimeLineStoreData) {
            // If the view has been changed, dispose the previous action creator
            if (prevProps.actionsCreator !== this.props.actionsCreator) {
                prevProps.actionsCreator.dispose();
            }
            else {
                Diag.Debug.logVerbose("Left before " + this._mainDom.scrollLeft + ", Left after " + this.state.deliveryTimeLineStoreData.viewportLeft);
                if (this._mainDom.scrollLeft !== this.state.deliveryTimeLineStoreData.viewportLeft) {
                    this._mainDom.scrollLeft = this.state.deliveryTimeLineStoreData.viewportLeft; // When loading new month, we keep the horizontal in sync to avoid jitter // [Warning]: This is expensive in term of performance
                }
            }
        }
    }

    private _isCardBeingDragged = (isDragged: boolean): void => {
        this.isCardBeingDragged = isDragged;
    }

}

/**
 * Entry point to load the view.
 * @param {IViewData} view - The current view
 * @param {Element} container - The containing element of the Main react component used to get viewport dimensions when resizing.
 * @param {PageActions} pageActions - Callback methods the plan can use to communicate with its parents.
 * @param {ViewActionsCreator} viewActionsCreator - the view's actions creator
 * @return {IViewContentElements} - The view and settings 
 */
export function init(view: IViewsStoreData, dimensions: IViewBounds, container: Element, pageActions: PageActions, viewActionsCreator: IViewActionsCreator, viewsStore: IViewsStore, preferences: DeliveryTimelinePreferences, filter?: IFilter): IViewContentElements {
    const itemActions = new ItemActions();
    const itemStore = new ItemStore(itemActions);
    const deliveryTimelineActions = new DeliveryTimeLineActions();
    let planFilterRef: PlanFilter;


    // The render/layout code needs the viewport dimensions minus headers etc so we subtract them out here.
    const viewportDimensions = new ViewBounds(dimensions.width, dimensions.height - DeliveryTimeLineViewConstants.timelineSeperationMargin - DeliveryTimeLineViewConstants.calendarPanWidthAndHeight);
    const deliveryTimelineStore = new DeliveryTimeLineStore(deliveryTimelineActions, itemStore, viewportDimensions);

    // Initialize the telemetry helper to listen to deliveryTimelineActions and record relemetry, as appropriate
    const deliveryTimeLineTelemetry = new DeliveryTimeLineTelemetry(deliveryTimelineActions);

    const actionsCreator = new DeliveryTimeLineActionsCreator(new DeliveryTimelinesDataProvider(new Mapper()), deliveryTimelineActions, itemActions, pageActions, deliveryTimelineStore, preferences, deliveryTimeLineTelemetry);
    const membershipEvaluator = new DeliveryTimeLineMembershipEvaluator(actionsCreator, itemStore, deliveryTimelineStore);

    //We create the DeliveryTimeLine with a unique key every time to ensure that this one get destroyed instead of reused.
    //We do not use the delivery timeline ID because we want to have this one deleted if we click again on the same plan.
    const deliveryTimelineView = React.createElement(DeliveryTimeLine,
        {
            deliveryTimeLineStore: deliveryTimelineStore,
            actionsCreator: actionsCreator,
            container: container,
            key: TFS_Core_Utils.GUIDUtils.newGuid()
        } as IDeliveryTimeLineProps
    );

    const settingsAction = () => {
        VSS.using(["ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/ConfigurationLauncher"],
            (ConfigurationLauncher: typeof Async_ConfigurationLauncher) => {
                Q(deliveryTimelineStore.getValue()).done(storeData => {
                    ConfigurationLauncher.open(storeData);
                });
            });
    }

    const zoomFinishedDelay: Utils_Core.DelayedFunction = new Utils_Core.DelayedFunction(
        /* context: */ null,
        DeliveryTimeLineViewConstants.delayBeforeZoomFinishedMs,
        "zoomFinishedDelay",
        () => actionsCreator.changeZoomLevelStop(deliveryTimelineStore.getValue().zoomLevelInPixelPerDay)
    );
    const zoomChanged = (zoom) => {
        actionsCreator.changeZoomLevel(zoom);

        // Start/reset the timeout
        zoomFinishedDelay.reset();
    }

    const shortcuts = new DeliveryTimelineShortcutGroup(actionsCreator, viewActionsCreator, pageActions);

    const _resolvePlanFilter = (planFilter: PlanFilter) => {
        planFilterRef = planFilter;
    }

    const onSetFilterBarFocus = () => {
        if (planFilterRef) {
            planFilterRef.focusFilterBar();
        }
    }

    const planFilter = FeatureEnablement.isDeliveryTimelineFilterEnabled() ?
        <PlanFilter
            deliveryTimeLineStore={deliveryTimelineStore}
            dataSource={itemStore.getDataSource()}
            actionsCreator={actionsCreator}
            filter={filter}
            ref={_resolvePlanFilter} /> : null;

    this.initStore(actionsCreator, view); //This use "this" otherwise break an existing unit test to be mocked    

    return {
        view: deliveryTimelineView,
        settingsAction: settingsAction,
        zoomChanged: zoomChanged,
        onSetFilterBarFocus: onSetFilterBarFocus,
        filter: planFilter,
        dispose: () => {
            membershipEvaluator.dispose();
            deliveryTimelineStore.dispose();
            itemStore.dispose();
            shortcuts.dispose();
            deliveryTimeLineTelemetry.dispose();
        }
    } as IViewContentElements;
}

export function initStore(actionsCreator: DeliveryTimeLineActionsCreator, view: IViewsStoreData) {
    actionsCreator.initializeStore(view);
}
