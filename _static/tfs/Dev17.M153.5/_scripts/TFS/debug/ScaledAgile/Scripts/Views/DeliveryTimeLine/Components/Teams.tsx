/// <reference types="react" />

import * as React from "react";
import Diag = require("VSS/Diag");

import { autobind } from "OfficeFabric/Utilities";
import { Team } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Team";
import { DeliveryTimeLineViewConstants, DeliveryTimeLineViewClassNameConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { IDeliveryTimeLineStoreData, ITeam, ICalendarMonth } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import Utils_UI = require("VSS/Utils/UI");
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { BrowserFeatures } from "ScaledAgile/Scripts/Shared/Utils/BrowserFeatures";
import { ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { DelayedQueue } from "ScaledAgile/Scripts/Shared/Utils/DelayedQueue";
import { IViewportMovedDelta, Movement, MovementType } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { DeliveryTimelineFocusUtils } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineFocusUtils";
import { TooltipHost } from "VSSUI/Tooltip";

export interface ITeamsProps {
    actionsCreator: IDeliveryTimeLineActionsCreator;
    scrollingLeftOffset: number;
    currentTimeline: IDeliveryTimeLineStoreData;
    numberOfMonthsRendered: ICalendarMonth[];
    invokeVerticalChange: (movement: number) => void;
    zoomLevelInPixelPerDay: number;
    top: number;
    worldWidth: number;
    cardRenderingOptions: ICardRenderingOptions;
    isCardBeingDragged?: (isDragged: boolean) => void;

    /**
     * Callback when the mouseWheel is "done"
     */
    mouseWheelDone: (movement: Movement, movementType: MovementType) => void;
}

export interface ITeamsState {
    /**
     * Flag to indicate if the state of the expand/collapse all toggle button
     */
    areAnyExpanded: boolean;
}

/**
 * Collection of team. This component is responsible for the vertical navigation.
 */
export class Teams extends React.Component<ITeamsProps, ITeamsState> {
    /**
     * Initial Y position of the press
     */
    private mouseDownContainerPositionY: number = 0;

    /**
     * This wouldn't be required if Edge with touch would use the touch capability. Since Edge doesn't use touch, we
     * fall back to mouse move. The problem is that Edge can start the mouseMove before mouseDown which will use the
     * last mouseDownX coordinnate, thus make the screen appears to jump because of a wrong delta between the mouse
     * coordinate and the initial mouseDownContainerPositionX.
     * 
     */
    private isMousePressed: boolean = false;
    private isCardBeingDragged: boolean = false;
    private _focusExpandCollapseAllTeams: boolean = false;
    private _expandCollapseAllElement: HTMLDivElement;

    private static mouseWheelScrollSpeed = 100;
    private _mouseDownHandler: (e: MouseEvent) => void;
    private _mouseUpHandler: (e: MouseEvent) => void;
    private _mouseMoveHandler: (e: MouseEvent) => void;
    private _mouseWheelHandler: (e: MouseEvent) => void;
    private _touchStartHandler: (e: TouchEvent) => void;
    private _touchMoveHandler: (e: TouchEvent) => void;
    private _mouseWheelQueue: DelayedQueue<IViewportMovedDelta>;

    constructor(props: ITeamsProps) {
        super(props);
        this.state = { areAnyExpanded: true };
        this._mouseWheelQueue = new DelayedQueue<IViewportMovedDelta>((e) => this._notifyTelemetry(e), 2000); //This is set to a bigger tempo to not spam the telemetry
    }

    /**
     * Reference to the DOM
     */
    public refs: {
        [key: string]: (Element);
        teamsDom: HTMLDivElement;
    };


    /**
     * Setup the listeners (move) to Team
     *
     * Setup vertical movement
     */
    public componentDidMount() {

        let teamsDom = this.refs.teamsDom;

        this._attachMousePanSupport(teamsDom);
        this._attachWheelScroll(teamsDom);
    }

    /**
     * On component update handler.
     */
    public componentDidUpdate(prevProps: ITeamsProps, prevState: ITeamsState) {
        // A team in error is "expanded".  For the purposes of the expand/collapse all, 
        // we want to treat error rows as collapsed. Check if all rows are collapsed or in error.         
        let allAreCollapsed = this.props.currentTimeline.teams.every(t => t.isCollapsed || t.hasError()); 
        let anyExpanded = !allAreCollapsed; 
        if (this.state.areAnyExpanded !== anyExpanded) { 
            this.setState({ areAnyExpanded: anyExpanded });
        }

        if (this._expandCollapseAllElement && this._focusExpandCollapseAllTeams) {
            window.requestAnimationFrame(() => {
                if (this._expandCollapseAllElement && this._focusExpandCollapseAllTeams) {
                    this._expandCollapseAllElement.focus();
                    this._focusExpandCollapseAllTeams = false;
                }
            });
        }
    }

    /**
     * Remove the control when unmounting the React wrapper
     */
    public componentWillUnmount() {
        this.refs.teamsDom.removeEventListener("mousedown", this._mouseDownHandler);
        this._mouseDownHandler = null;
        this.refs.teamsDom.removeEventListener("mouseup", this._mouseUpHandler);
        this._mouseUpHandler = null;
        this.refs.teamsDom.removeEventListener("mousemove", this._mouseMoveHandler);
        this._mouseMoveHandler = null;
        this.refs.teamsDom.removeEventListener(BrowserFeatures.getMouseWheelEvent(), this._mouseWheelHandler);
        this._mouseWheelHandler = null;
        if (this._touchStartHandler) {
            this.refs.teamsDom.removeEventListener("touchstart", this._touchStartHandler);
            this._touchStartHandler = null;
        }
        if (this._touchMoveHandler) {
            this.refs.teamsDom.removeEventListener("touchmove", this._touchMoveHandler);
            this._touchMoveHandler = null;
        }
        this._mouseWheelQueue.end();
    }

    /**
     * Attach mouse pan support depending if the device is touch or not.
     * @param {HTMLDivElement} teamsDom - The teams container
     */
    private _attachMousePanSupport(teamsDom: HTMLDivElement) {
        if (BrowserFeatures.isTouchDevice()) {
            this._componentDidMountTouchDevice(teamsDom);
        }
        this._componentDidMountNotTouchDevice(teamsDom);
    }

    /**
     * Handle the vertical movement of a touch movement
     * @param {HTMLDivElement} teamsDom - The teams container
     */
    private _componentDidMountTouchDevice(teamsDom: HTMLDivElement): void {
        let options = BrowserFeatures.getAddEventListenerOptions();
        this._touchStartHandler = (e: TouchEvent) => {
            this.mouseDownContainerPositionY = e.touches[0].pageY;
        };
        teamsDom.addEventListener("touchstart", this._touchStartHandler, options);

        this._touchMoveHandler = (e: TouchEvent) => {
            let verticalMovement = (this.mouseDownContainerPositionY - e.touches[0].pageY);
            this._handleVerticalMovement(verticalMovement);
            this.mouseDownContainerPositionY = e.touches[0].pageY; //Adjust the Y position to avoid adding movement from last evaluation
        };
        teamsDom.addEventListener("touchmove", this._touchMoveHandler, options);
    }

    /**
     * Handle the vertical movement of a not touch movement (mouse).
     *
     * See https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
     *  for information about the passive
     * @param {HTMLDivElement} teamsDom - The teams container
     */
    private _componentDidMountNotTouchDevice(teamsDom: HTMLDivElement): void {
        let options = BrowserFeatures.getAddEventListenerOptions();
        this._mouseDownHandler = (e) => {
            this.mouseDown(e);
        };
        teamsDom.addEventListener("mousedown", this._mouseDownHandler, options);
        this._mouseUpHandler = (e) => {
            this.mouseUp(e);
        };
        teamsDom.addEventListener("mouseup", this._mouseUpHandler, options);
        this._mouseMoveHandler = (e) => {
            this.mouseMove(e);
        };
        teamsDom.addEventListener("mousemove", this._mouseMoveHandler, options);
    }

    private _attachWheelScroll(teamsDom: HTMLDivElement) {
        this._mouseWheelHandler = (e) => {
            this.mouseWheel(e);
        };
        teamsDom.addEventListener(BrowserFeatures.getMouseWheelEvent(), this._mouseWheelHandler, BrowserFeatures.getAddEventListenerOptions());
    }


    /**
     * Save the beginning Y position. This way we can later do the difference and calculate what is needed to display.
     * @param {MouseEvent} event - Allow to get the Y position
     */
    public mouseDown(event: MouseEvent): void {
        this.mouseDownContainerPositionY = event.pageY;
        this.isMousePressed = true;
    }

    /**
     * Only because of Edge with touch. See comment on isMousePressed field.
     * @param {MouseEvent} event - Not used
     */
    public mouseUp(event: MouseEvent): void {
        this.isMousePressed = false;
        // We do not send telemetry like in DeliveryTimeLineMain.tsx on the mouseUp to no create double entry. We expect that the user to move more horizontally
    }

    /**
      * Detect the number of pixel moved vertically
      * @param {MouseEvent} event - Get the current Y position of the container
      */
    public mouseMove(event: MouseEvent): void {
        if (this._cancelPanning()) {
            //Prevent mousepan to allow dragging an item.
            return;
        }

        if (((event.buttons && event.buttons === DeliveryTimeLineViewConstants.leftButton)
            || (event.buttons === undefined && event.which && event.which === DeliveryTimeLineViewConstants.leftButton))
            && this.isMousePressed) {
            let verticalMovement = (this.mouseDownContainerPositionY - event.pageY);
            Diag.Debug.logVerbose("Teams: Vertical Movement: " + verticalMovement);
            if (verticalMovement > DeliveryTimeLineViewConstants.mousemoveDelta || verticalMovement < -1 * DeliveryTimeLineViewConstants.mousemoveDelta) {
                this._handleVerticalMovement(verticalMovement);
                this.mouseDownContainerPositionY = event.pageY; //Adjust the Y position to avoid adding movement from last evaluation
            }
        }
    }

    /**
     * This is a hack to prevent mouse move when dragging. The best solution would be to not depend of Dom element + class and just handling correctly the events.
     */
    private _cancelPanning(): boolean {
        return this.isCardBeingDragged || this.props.currentTimeline.isInlineAddEditing();
    }

    /**
     * Handles mouse wheel movement
     * @param {Event} event
     */
    public mouseWheel(event: Event): void {
        let delta = Utils_UI.getWheelDelta(event);

        // transform the raw event to vertical movement data
        let verticalMovement = delta * -1 * Teams.mouseWheelScrollSpeed;
        this._handleVerticalMovement(verticalMovement);
        this._mouseWheelQueue.add({ horizontal: 0, vertical: verticalMovement } as IViewportMovedDelta);
    }

    private _handleVerticalMovement(verticalMovement: number) {
        if (verticalMovement !== 0) {
            this.props.invokeVerticalChange(verticalMovement);
        }
    }

    /**
     * This is called with a big delay on the onScroll to avoid spamming the telemetry
     */
    private _notifyTelemetry(queueData: IViewportMovedDelta[]): void {
        if (queueData) {
            const len = queueData.length;
            if (len > 0) {
                let sumMovement = 0;
                for (let i = 0; i < len; i++) {
                    sumMovement += queueData[i].vertical;
                }
                const movement = sumMovement >= 0 ? Movement.Down : Movement.Up;
                this.props.mouseWheelDone(movement, MovementType.MouseWheel);
            }
        }
    }

    public render() {
        let renderTeam = (value: ITeam, index: number) => {
            return <Team
                actionsCreator={this.props.actionsCreator}
                key={value.key}
                team={value}
                storeData={this.props.currentTimeline}
                scrollingLeftOffset={this.props.scrollingLeftOffset}
                worldStartDate={this.props.currentTimeline.worldStartDate}
                zoomLevelInPixelPerDay={this.props.currentTimeline.zoomLevelInPixelPerDay}
                cardRenderingOptions={this.props.cardRenderingOptions}
                isCardBeingDragged={this._isCardBeingDragged}
            />;
        };

        //Initial load may not have team loaded. Make sure to always pass as a minimum an empty list.
        let teamList: ITeam[] = [];
        if (this.props.currentTimeline && this.props.currentTimeline.teams) {
            teamList = this.props.currentTimeline.teams;
        }

        return <div ref="teamsDom" className="teams" style={{ marginTop: DeliveryTimeLineViewConstants.teamsMarginTop, marginBottom: DeliveryTimeLineViewConstants.teamMargin + "px", width: this.props.currentTimeline.worldWidth }}>
            <SprintsCurtain />
            {this._renderExpandCollapseAll(teamList)}
            <div className="teams-scroll-container" style={{ top: -this.props.top }} onKeyDown={this._onKeyDown}> {teamList.map(renderTeam)} </div>
        </div>;
    }

    private _isCardBeingDragged = (isDragged: boolean): void => {
        this.isCardBeingDragged = isDragged;
        if ($.isFunction(this.props.isCardBeingDragged)) {
            this.props.isCardBeingDragged(isDragged);
        }
    }


    /**
     * Renders a set of collapse/expand all buttons absolutely positioned over the sprint curtain component
     */
    private _renderExpandCollapseAll(teams: ITeam[]): JSX.Element {
        if (teams.length <= 1) {
            return null;
        }

        let iconName = "bowtie-icon bowtie-chevron-down-all";
        let toolTip = ScaledAgileResources.ExpandAllTeamsTooltip;
        if (this.state.areAnyExpanded) {
            iconName = "bowtie-icon bowtie-chevron-up-all";
            toolTip = ScaledAgileResources.CollapseAllTeamsTooltip;
        }

        let divStyle = {
            height: DeliveryTimeLineViewConstants.calendarPanWidthAndHeight,
            width: DeliveryTimeLineViewConstants.teamSidebarWidth - DeliveryTimeLineViewConstants.timelineSeperationMargin - DeliveryTimeLineViewConstants.leftCurtainMarginRight,
            left: DeliveryTimeLineViewConstants.timelineSeperationMargin,
        };

        const currentExpandCollapseFocusElement = DeliveryTimelineFocusUtils.getCurrentExpandCollapseAllFocusIdentifier(this.props.currentTimeline);
        this._focusExpandCollapseAllTeams = currentExpandCollapseFocusElement != null;

        // Plan-tab-handler is the tabbable entrance to the plan view. The plan view has custom keyboard naviagation 
        // based off up/down arrows and not tabs. This invisible tab stop will catch the tab event and then route it to 
        // the first focusable element in our plan (determined by DeliveryTimelineBusinesssLogic).  
        // Tab and Shift + Tab both work with this method, and it prevents us from having to dynamically change tabIndex values. 
        let planTabHandler = <div className="plan-tab-handler" tabIndex={0} onFocus={this._onPlanTabHandlerFocus} />;

        return <div
            ref={(element: HTMLDivElement) => { this._expandCollapseAllElement = element; }}
            className="expand-collapse-teams-container" style={divStyle} onClick={() => { this._toggleExpandCollapseAll(); }} tabIndex={-1} onKeyUp={(e: React.KeyboardEvent<HTMLElement>) => { this._onKeyUp(e); }}>
            <TooltipHost content={toolTip}>
                <header>
                    <i className={iconName} role="button"></i>
                    <span className="expand-collapse-label">{ScaledAgileResources.TeamsCollapseAllExpandAllLabel}</span>
                    {planTabHandler}
                </header>
            </TooltipHost>
        </div>;
    }

    private _toggleExpandCollapseAll() {
        if (this.state.areAnyExpanded) {
            this.props.actionsCreator.collapseAllTeams();
            this.setState({ areAnyExpanded: false });
        }
        else {
            this.props.actionsCreator.expandAllTeams();
            this.setState({ areAnyExpanded: true });
        }
    }

    private _onKeyUp(e: React.KeyboardEvent<HTMLElement>) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
            this._toggleExpandCollapseAll();
        }
    }

    private _onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.shiftKey && e.keyCode === Utils_UI.KeyCode.TAB) {
            e.stopPropagation();
            e.preventDefault();
            this.props.actionsCreator.focusRightPanButton();
        }
    }

    // Catch tab event and send focus to first-focusable object (as determined by our keyboard navigation logic)
    private _onPlanTabHandlerFocus = (event: React.FocusEvent<HTMLButtonElement | HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        this.props.actionsCreator.focusFirstObject();
    }
}


export class SprintsCurtain extends React.Component<{}, {}> {
    constructor(props: {}) { super(props); }

    public render() {
        let divStyle = { width: DeliveryTimeLineViewConstants.teamSidebarWidth };
        return <div className={DeliveryTimeLineViewClassNameConstants.scrollingIntervalsCurtain} style={divStyle} ></div>;
    }
}
