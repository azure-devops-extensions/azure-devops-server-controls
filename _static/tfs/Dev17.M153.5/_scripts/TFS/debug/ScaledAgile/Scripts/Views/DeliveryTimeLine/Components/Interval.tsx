/// <reference types="react" />
/// <reference types="jqueryui" />

import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import * as Diag from "VSS/Diag";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";

import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import { KeyCode } from "VSS/Utils/UI";
import { Card } from "ScaledAgile/Scripts/Shared/Card/Components/Card";
import { InlineAddCard } from "ScaledAgile/Scripts/Shared/Card/Components/InlineAddCard";
import {
    ITeam, IInterval, ISortUpdateParams, IDragDropParams, IDragSourceParams,
    TeamFocusType, CardFocusIdentifier, LoadMoreFocusIdentifier, IntervalFocusIdentifier
} from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { Movement, MovementType, IViewportMovedDelta, ViewportMovedDelta, KeyToMovementMap } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { IItem, ItemSaveStatus } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { IDeliveryTimeLineStoreData } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { TimelineIterationStatusCode } from "TFS/Work/Contracts";
import { DeliveryTimelineLayoutUtils, RelativeViewPositioning } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineLayoutUtils";
import { DeliveryTimelineFocusUtils } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineFocusUtils";

import { DateManipulationFunctions } from "ScaledAgile/Scripts/Shared/Utils/DateManipulationFunctions";
import UtilsString = require("VSS/Utils/String");
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { DeliveryTimeLineViewConstants, DeliveryTimeLineViewClassNameConstants, DragDropZoneEnclosureConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { FeatureEnablement } from "ScaledAgile/Scripts/Shared/Utils/FeatureEnablement";
import { DelayedQueue } from "ScaledAgile/Scripts/Shared/Utils/DelayedQueue";
import { IntervalHelperFunctions } from "ScaledAgile/Scripts/Shared/Utils/IntervalHelperFunctions";
import ScaledAgileResources = require("ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile");
import { IUnpagedItem } from "ScaledAgile/Scripts/Shared/Models/IUnpagedItem";
import { ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import ColorPickerControl = require("Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker");
import { IntervalMessage } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/IntervalMessage";
import { WorkItemTypeIcon } from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

import { DropZone } from "Presentation/Scripts/TFS/Components/DragDropZone/DropZone";
import { DragZone } from "Presentation/Scripts/TFS/Components/DragDropZone/DragZone";
import { DragAndDropZoneEnclosure } from "Presentation/Scripts/TFS/Components/DragDropZone/DragAndDropZoneEnclosure";
import { DragDropContext } from "Presentation/Scripts/TFS/Components/DragDropZone/DragDropContext";
import * as Utils_Date from "VSS/Utils/Date";

import { AddNewItemComponent } from "Presentation/Scripts/TFS/Components/AddNewItem";

export interface IIntervalProps {
    actionsCreator: IDeliveryTimeLineActionsCreator;
    storeData: IDeliveryTimeLineStoreData;
    key: string;
    interval: IInterval;
    team: ITeam;
    zoomLevelInPixelPerDay: number;
    onKeyDown?: (interval: Interval, e: React.KeyboardEvent<HTMLElement>) => void;
    cardRenderingOptions?: ICardRenderingOptions;
    isCardBeingDragged?: (isDragged: boolean) => void;
    focusContainerOnRender?: boolean;
    focusLoadMoreOnRender?: boolean;
    focusNewItemMenuOnRender?: boolean;
}

/**
 * Below properties are used during drag operation 
 * to store the top, bottom, left, right threshold for drag area on the edge of the delivery timeline viewport.
 */
interface IViewportTreshold {
    viewportHeight: number;
    viewportWidth: number;
    topMinTreshold: number;
    topMaxTreshold: number;
    bottomMaxTreshold: number;
    bottomMinTreshold: number;
    leftMinTreshold: number;
    leftMaxTreshold: number;
    rightMaxTreshold: number;
    rightMinTreshold: number;
}

/**
 * This is a division of the time, for a team. A team contains multiple interval which can be sprint or iteration.
 * If an iteration has an error it will not render.
 */
export class Interval extends React.Component<IIntervalProps, {}> {
    public static INTERVAL_CLASS = "interval";

    /**
     * The value is fine between 10px and 25px. The actual value of 15 allows a sweet spot where the user can
     * do some little movement and still be in drag-waiting-mode.
     */
    public static THRESHOLD_DRAG_CARD_PIXEL = 15;
    private static sourceTeam = "sourceTeam";
    private static sourceInterval = "sourceInterval";
    private static itemId = "itemId";

    private _viewportChangeQueue: DelayedQueue<IViewportMovedDelta>;
    private _viewportTreshold: IViewportTreshold;

    /**
     * Allow to give 1 render after the isInViewPort is false. This is required to
     * stop showing the interval at its last position. This way, moving in the past, when
     * changing the start date and thus changing the x pixel axis won't create
     * future interval to jump in the past.
     */
    private isInViewport: boolean = true;

    private _loadMoreDomElement: HTMLAnchorElement;
    private _focusLoadMore: boolean = false;
    private _focusIntervalMessage: boolean = false;
    private _focusNewItemMenu: boolean = false;
    private _shouldFocusInterval: boolean = false;

    private _intervalMessageElement: IntervalMessage;
    private _intervalContainer: HTMLDivElement;
    private _focusTarget: HTMLDivElement;
    private _addNewItemButtonRef: AddNewItemComponent = null;

    private _isFocused = false;

    constructor(props: IIntervalProps) {
        super(props);
        this._viewportChangeQueue = new DelayedQueue<IViewportMovedDelta>((e) => this._mergeAndInvokeViewportChange(e));

        if (props) {
            this._shouldFocusInterval = props.focusContainerOnRender;
            this._focusLoadMore = props.focusLoadMoreOnRender;
            this._focusNewItemMenu = props.focusNewItemMenuOnRender;
        }
    }

    public componentWillUpdate(nextProps: IIntervalProps, nextState: any) {
        // Update focus requests; we only want to focus if we didn't previously do so
        this._shouldFocusInterval = (nextProps.focusContainerOnRender && (!this.props || !this.props.focusContainerOnRender)) || (nextProps.focusContainerOnRender && !this._isFocused);
        this._focusLoadMore = nextProps.focusLoadMoreOnRender && (!this.props || !this.props.focusLoadMoreOnRender);
        this._focusNewItemMenu = nextProps.focusNewItemMenuOnRender && (!this.props || !this.props.focusNewItemMenuOnRender);
    }

    public render(): JSX.Element {
        if (!this._shouldRender()) {
            return null;
        }

        if (this.props.team.hasError() || this.props.interval.status && this.props.interval.status.type === TimelineIterationStatusCode.IsOverlapping) {
            const intervalToFocus: IntervalFocusIdentifier = DeliveryTimelineFocusUtils.getCurrentIntervalFocusIdentifier(this.props.storeData);
            this._focusIntervalMessage = (intervalToFocus && intervalToFocus.teamKey === this.props.team.key && intervalToFocus.intervalId === this.props.interval.id);

            const styles = this.getComponentStyle();
            styles.padding = 0;

            return <div className={Interval.INTERVAL_CLASS} style={styles} onKeyDown={this._onIntervalMessageKeyDown}><IntervalMessage ref={(e) => this._intervalMessageElement = e} {...this.props} /></div>;
        }

        // Render interval
        return this._renderIntervalContainer();
    }

    /**
     * What: Create a unique intervals connection between interval of the same team
     * Why: We only allow to drag and drop between intervals of the same team 
     * Example: team_ddeac3e6-bf15-4a81-8846-b01339fa61b7_Microsoft-RequirementCategory_card
     */
    private _getIntervalZoneType(): string {
        return "team_" + this.props.team.id + "_" + this.props.team.backlog.categoryReferenceName.replace(/\./g, "-") + "_card";
    }

    private _renderHeader(): JSX.Element {
        // show date ranges in UTC.  All dates should be passed in as UTC time. 
        const datePattern = DateManipulationFunctions.getShortDayMonthPattern();
        const timespan = `${Utils_Date.format(this.props.interval.startDate, datePattern)} - ${Utils_Date.format(this.props.interval.endDate, datePattern)}`;
        const headerStyles = { height: DeliveryTimeLineViewConstants.intervalHeaderHeight };
        const collapseIcon = "bowtie-icon " + (this.props.team.isCollapsed ? "bowtie-chevron-down" : "bowtie-chevron-up");
        const collapseTooltip = this.props.team.isCollapsed ? ScaledAgileResources.ExpandTooltip : ScaledAgileResources.CollapseTooltip;
        const addButton = this._renderAddButton();
        return <header style={headerStyles}
            onMouseDown={() => { this._headerOnMouseDown(); }}
            onMouseUp={(evt) => { this._headerOnMouseUp(evt); }}>
            <div className="title">
                <TooltipHost content={this.props.interval.id} overflowMode={TooltipOverflowMode.Parent}>
                    {this.props.interval.name}
                </TooltipHost>
            </div>

            <div className="subtitle-row">
                <div className="subtitle">{timespan}</div>
                {addButton}
            </div>

            <div className="collapse-hint">
                <TooltipHost content={collapseTooltip}>
                    <i className={collapseIcon} />
                </TooltipHost>
            </div>
        </header>;
    }

    private _renderAddButton(): JSX.Element {
        const items: IContextualMenuItem[] = this.props.team.backlog.workItemTypes.map(t => {
            const colorAndIcon = this.props.team.workItemTypeColorAndIcons.getColorAndIcon(t);
            return {
                name: t,
                key: t,
                iconProps: {
                    className: `bowtie-icon ${colorAndIcon.icon}`,
                    style: { color: colorAndIcon.color }
                },
                onClick: () => this._initiateInlineAdd(t)
            } as IContextualMenuItem;
        });

        return <AddNewItemComponent
            displayText={ScaledAgileResources.AddNewCardButtonLabel}
            items={items}
            isCollapsed={this.props.interval.width <= DeliveryTimeLineViewConstants.minIntervalWidthCollapsedNewButton}
            className="add-item-button"
            onDropdownToggled={this._onAddNewDropdownToggled}
            preventTabFocus={true}
            ref={(ref) => this._addNewItemButtonRef = ref} />;
    }

    /**
     * Return the interval container that can be used or not within a droppable component
     */
    private _renderIntervalContainer(): JSX.Element {
        const focusedAddNewItemMenu = DeliveryTimelineFocusUtils.getCurrentAddNewItemFocusIdentifier(this.props.storeData);
        this._focusNewItemMenu = focusedAddNewItemMenu && focusedAddNewItemMenu.intervalId == this.props.interval.id && focusedAddNewItemMenu.teamKey == this.props.team.key;

        const header = this._renderHeader();

        // We use a zero-height element as the focus target instead of the entire interval so we can always keep it
        // filly in view whenever the interval is partially visible. If you focus an element that's partially off
        // the screen the browser shifts the DOM in a way that we can't recover from.
        const focusTargetTop = Math.min(this.props.team.height, Math.max(0, -(this.props.team.top - this.props.storeData.viewportTop)));
        const focusTarget = <div
            className="interval-focus-target"
            aria-label={this._generateAriaLabel()}
            style={{ top: focusTargetTop }}
            ref={(ref) => this._focusTarget = ref}
            onKeyDown={this._onKeyDown}
            onFocus={this._onContainerFocus}
            onBlur={this._onContainerBlur}
            tabIndex={-1}>
        </div>;

        let containerClassName = Interval.INTERVAL_CLASS;

        if (this.props.team.isCollapsed) {
            containerClassName += " collapsed";
        }

        if (this.props.focusContainerOnRender || this.props.focusNewItemMenuOnRender) {
            containerClassName += " focus";
        }

        return <div className={containerClassName} style={this.getComponentStyle()} ref={(ref) => this._intervalContainer = ref} onMouseDown={this._onContainerMouseDown} >
            {focusTarget}
            <DropZone
                idContext={DragDropZoneEnclosureConstants.CONTEXT_ID_DELIVERY}
                zoneTypes={[this._getIntervalZoneType()]}
                onDrop={this._onDrop}
                isValidDropTarget={this._isValidDropTarget}
                isMovementAnimated={FeatureEnablement.isCardMovementAnimated()}
                onSortStart={this._onSortStart}
                onSortMove={this._onMove}
                onSortStop={this._onSortStop}
                onSortCompleted={this._onSortUpdate}
                blockingDomSelectors={"." + Card.ITEM_PROCESSING_CLASS}
            >
                {header}
                {this.renderIntervalBody()}
            </DropZone>
        </div>;
    }

    private _headerOnMouseDown() {
        if (!this.props.team.isCollapsed) {
            this._focusThisInterval();
        }
    }

    private _headerOnMouseUp(evt: React.MouseEvent<HTMLElement>) {
        if (!evt.defaultPrevented && !(this._addNewItemButtonRef && this._addNewItemButtonRef.isMenuActive)) {
            this.toggleExpandCollapseClick();
        }
    }

    public getComponentStyle(): React.CSSProperties {
        return {
            left: this.props.interval.leftPosition,
            width: this.props.interval.width,
            flex: "0 0 " + this.props.interval.width + "px", //Grow, Shrink, Sprint column width
            padding: DeliveryTimeLineViewConstants.intervalPadding,
            height: "100%",
            visibility: !this.props.interval.isInViewport && this.props.interval.isDragging ? "hidden" : "visible" //If the element is dragging and is outside of viewport, render and hide the element.
        };
    }

    /**
     * Render the content of the interval.
     *  - Error container
     *  - Cards container
     *  - Bottom button (load more)
     */
    public renderIntervalBody(): JSX.Element[] {
        let result: JSX.Element[];
        if (!this._shouldRender()) {
            return null;
        }
        if (this.props.team.isCollapsed) {
            result = [];
            result.push(this.renderWorkItemCounts());
        } else {
            result = this.renderCards();
            let loadMoreButton = this.renderLoadMore();
            if (loadMoreButton) {
                result.push(loadMoreButton);
            }
        }
        return result;
    }

    private _shouldRender(): boolean {
        return this.props.interval.isInViewport || this.props.interval.isDragging;
    }

    /**
     * Render maxNumberCardsToDisplay cards
     */
    public renderCards(): JSX.Element[] {
        let result: JSX.Element[] = [];

        if (this.props.interval.hasInlineAddItem) {
            result.push(this._renderInlineAddCard());
        }

        const itemToFocus: CardFocusIdentifier = DeliveryTimelineFocusUtils.getCurrentItemFocusIdentifier(this.props.storeData);
        if (this.props.interval) {
            // render visible items upto max number of items to display
            const maxNumberOfItemsToDisplay: number = IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(this.props.team, this.props.interval);
            const visibleItemsToRender = this.props.interval.getVisibleItems().slice(0, maxNumberOfItemsToDisplay);
            visibleItemsToRender.forEach((item) => {
                const focus = itemToFocus != null && (itemToFocus.itemId === item.id && itemToFocus.teamKey === this.props.team.key);
                result.push(this.renderCard(item, focus));
            });
        }

        return result;
    }

    public componentDidUpdate() {
        if (this._intervalMessageElement && this._focusIntervalMessage) {
            this._intervalMessageElement.focus();
        }
        this._focusIntervalMessage = false;

        if (this._focusNewItemMenu) {
            this._addNewItemButtonRef.activateMenu();
        }

        this._focusElementsIfRequested();

        if (!this.props.interval.isInViewport) {
            this._isFocused = false;
        }
    }

    public componentDidMount() {
        if (this._intervalMessageElement && this._focusIntervalMessage) {
            this._intervalMessageElement.focus();
        }
        this._focusIntervalMessage = false;
        this._focusElementsIfRequested();
    }

    private _focusElementsIfRequested() {
        if (!this.props.interval.isInViewport) {
            return;
        }

        const start = Date.now();
        const distanceToEdges = DeliveryTimelineLayoutUtils.getOffsetFromViewForInterval(this.props.storeData, this.props.team, this.props.interval);

        // Note: if we're in inline add mode, we don't want to request focus because the new editable card needs it
        if (this._focusTarget && this._shouldFocusInterval && !this.props.interval.isInlineAddEditing() && this._isFocusedOnCurrentInterval()) {
            this.props.actionsCreator.moveIntervalIntoView(this.props.team, this.props.interval, distanceToEdges);
            this._focusTarget.focus();
        }

        if (this._loadMoreDomElement && this._focusLoadMore && !this.props.interval.hasInlineAddItem) {
            this._loadMoreDomElement.focus();
        }
    }

    /**
     * Show a load more button if required
     */
    public renderLoadMore(): JSX.Element {
        if (this.props.interval) {
            const interval = this.props.interval;
            const visibleItems = interval.getVisibleItems();
            const cardsNotShownCount = interval.unpagedItems.length + visibleItems.length - IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(this.props.team, this.props.interval);

            if (cardsNotShownCount > 0) {
                const loadMoreButtonStyles = {
                    height: DeliveryTimeLineViewConstants.loadMoreHeight,
                    marginTop: DeliveryTimeLineViewConstants.cardMargin,
                    display: "inline-block",
                    maxWidth: this.props.interval.width - 2 * DeliveryTimeLineViewConstants.intervalPadding
                };

                let showMoreText = this.props.storeData.isFiltered ? ScaledAgileResources.ShowMoreButtonNoCountCaption : UtilsString.format(ScaledAgileResources.ShowMoreButtonCaption, cardsNotShownCount);
                let loadMoreClassName = "load-more";
                if (interval.isWaitingForItems) {
                    showMoreText = ScaledAgileResources.LoadingMoreButtonCaption;
                    loadMoreClassName = "loading";
                }

                return <a
                    tabIndex={-1}
                    ref={(element: HTMLAnchorElement) => { this._loadMoreDomElement = element; }}
                    role="button"
                    className={loadMoreClassName}
                    key={"loadmore-" + this.props.interval.id}
                    style={loadMoreButtonStyles}
                    onClick={() => this.loadMoreItemsClick()}
                    onKeyDown={this._onLoadMoreKeyDown}
                    onDragStart={e => { e.preventDefault(); return false; }}>
                    {showMoreText}
                </a>;
            }
        }
        return null;
    }

    /**
     * Render a single item into the interval
     * @param value the item to render as card 
     * @param focus whether to place focus on this card on render
     */
    private _renderCardInternal(value: IItem, focus?: boolean): JSX.Element {
        const open = (id: number) => {
            this.props.actionsCreator.clearFocus();
            this.props.actionsCreator.openItem(id, {
                close: () => {
                    if (this.props.interval.items.some(item => item.id == value.id))
                    {
                        this.props.actionsCreator.focusItem(this.props.team, this.props.interval, value);
                    }
                    else
                    {
                        // If the user deleted the item from the edit dialog, move focus to the whole interval instead
                        this.props.actionsCreator.focusInterval(this.props.team, this.props.interval);
                    }
                }
            });
        };
        const cardMaxWidth = this.props.interval.width - (DeliveryTimeLineViewConstants.intervalPadding * 2);
        // This entire interval won't be rendered if we are out of the viewport horizontally, so we only worry about vertical placement here.
        const isFiltering = this.props.storeData.isFiltered;
        const isNotInViewportVertically = isFiltering ? false : value.top > (this.props.storeData.viewportTop + this.props.storeData.viewportHeight) || (value.top + value.height + DeliveryTimeLineViewConstants.cardMargin) < this.props.storeData.viewportTop;

        return <DragZone
            key={value.id}
            id={value.id.toString()}
            idContext={DragDropZoneEnclosureConstants.CONTEXT_ID_DELIVERY}
            zoneTypes={[this._getIntervalZoneType()]}
            payload={value}
            shouldCancelStartDrag={() => { return this._isCardOutOfThreshold(); }}
            className="card-zone">
            <Card
                stateColorsProvider={this.props.team.workItemStateColorsProvider}
                key={value.id}
                item={value}
                renderPlaceholder={isNotInViewportVertically}
                maxWidth={cardMaxWidth}
                focusAfterRender={focus}
                open={open}
                renderingOptions={this.props.cardRenderingOptions}
                workItemTypeColorAndIcons={this.props.team.workItemTypeColorAndIcons}
                onMouseDown={this._onCardMouseDown}
                onMouseUp={this._onCardMouseUp}
                onKeyDown={this._onCardKeyDown}
                contextDescription={this._generateAriaLabel()}
            />
        </DragZone>;
    }

    private _generateAriaLabel(): string {
        return `${this.props.interval.name}, ${this.props.team.name} ${this.props.team.backlog.pluralName || ""}`;
    }

    private _renderInlineAddCard(): JSX.Element {
        const cardMaxWidth = this.props.interval.width - (DeliveryTimeLineViewConstants.intervalPadding * 2);
        return <InlineAddCard
            stateColorsProvider={this.props.team.workItemStateColorsProvider}
            key="inline-add"
            maxWidth={cardMaxWidth}
            renderingOptions={this.props.cardRenderingOptions}
            workItemTypeColorAndIcons={this.props.team.workItemTypeColorAndIcons}
            onAbort={this._abortInlineAdd}
            onSubmit={this._submitInlineAdd}
            workItemType={this.props.interval.inlineAddProps.inlineAddWorkItemType}
            saveStatus={this.props.interval.inlineAddProps.inlineAddSaveStatus}
            title={this.props.interval.inlineAddProps.inlineAddTitle}

        />;
    }

    /**
     * Render a single item into the interval
     * @param value
     * @param focus
     */
    public renderCard(value: IItem, focus: boolean): JSX.Element {
        return this._renderCardInternal(value, focus);
    }

    private _sumWorkItemTypes(allWorkItems: IUnpagedItem[]): { workItemTypeToCountMap: IDictionaryStringTo<number>, workItemTypeLabelsLength: number, workItemTypeCounts: number } {
        let workItemTypeToCountMap: IDictionaryStringTo<number> = {};
        let workItemTypeLabelsLength = 0;
        let workItemTypeCounts = 0;
        for (let i = 0; i < allWorkItems.length; i++) {
            let workItem = allWorkItems[i];
            let workItemType = workItem.getFieldValue(CoreFieldRefNames.WorkItemType);
            if (!workItemTypeToCountMap[workItemType]) {
                workItemTypeLabelsLength += (workItemType.length * DeliveryTimeLineViewConstants.intervalSummaryWITTypeLabelLetterSize);
                workItemTypeCounts++;
            }
            workItemTypeToCountMap[workItemType] = (workItemTypeToCountMap[workItemType] || 0) + 1;
        }

        return {
            workItemTypeToCountMap: workItemTypeToCountMap,
            workItemTypeLabelsLength: workItemTypeLabelsLength,
            workItemTypeCounts: workItemTypeCounts
        };
    }

    private _buildWITRollupSummary(witName: string, count: number, showLabel: boolean): JSX.Element {
        const colorAndIcon = this.props.team.workItemTypeColorAndIcons.getColorAndIcon(witName);

        let styles: React.CSSProperties = {
            height: DeliveryTimeLineViewConstants.intervalSummaryHeight,
            marginRight: DeliveryTimeLineViewConstants.intervalSummaryMarginRight,
            maxWidth: DeliveryTimeLineViewConstants.intervalSummaryMaxWidth // Specify max width to ensure that we can accommodate upto 3 digits in the workitem count
        };
        let labelDiv = showLabel ? <label className="wit-name-label" style={{ marginRight: DeliveryTimeLineViewConstants.intervalSummaryLabelMarginRight }}>{witName}</label > : null;
        let className = "work-item-count-interval";

        const workItemTypeIcon = <WorkItemTypeIcon
            workItemTypeName={witName}
            projectName=""
            customInput={{
                color: colorAndIcon.color,
                icon: colorAndIcon.icon
            }} />;

        return <div style={{ display: "inline" }} key={this.props.interval.id + "-" + this.props.team.key + "-" + witName + "-work-item-count"}>
            {workItemTypeIcon}
            <div style={styles} className={className}>
                {count}
            </div>
            {labelDiv}
        </div>;
    }

    /**
     * Render the number of items in the interval. Used when the team is collapsed
     */
    public renderWorkItemCounts(): JSX.Element {
        // Only render non-zero counts.
        const visibleItems = this.props.interval.getVisibleItems();
        const isFiltering = this.props.storeData.isFiltered;
        const totalNumber = isFiltering ? visibleItems.length : this.props.interval.unpagedItems.length + visibleItems.length;
        if (totalNumber === 0) {
            return null;
        }
        // buid work item type mapping
        const allWorkItems: IUnpagedItem[] = isFiltering ? visibleItems : this.props.interval.unpagedItems.concat(visibleItems);

        // build work item type parameters
        const { workItemTypeToCountMap, workItemTypeLabelsLength, workItemTypeCounts } = this._sumWorkItemTypes(allWorkItems);

        // if we are not going to be able to show just the colored boxes, return one grey box
        const rollUpSummaryWidth = this.props.interval.width - (DeliveryTimeLineViewConstants.intervalPadding * 2);

        // Using intervalSummaryMaxWidth means we would switch to rollUpSummary a few pixels sooner,
        // since summary with 2 digits would have width = intervalSummaryMinWidth (22).
        // However, reading the actual width using JQuery might not be performant,
        // thus doing a best case attempt to limit the supported counts to 3 digits and
        // assuming the width of the interval summary to be = intervalSummaryMaxWidth (25).
        const intervalSummaryMaxWidth = DeliveryTimeLineViewConstants.intervalSummaryWithIconMaxWidth;
        if (rollUpSummaryWidth < (workItemTypeCounts * (intervalSummaryMaxWidth + DeliveryTimeLineViewConstants.intervalSummaryMarginRight))) {
            const styles: React.CSSProperties = {
                height: DeliveryTimeLineViewConstants.intervalSummaryHeight,
                minWidth: DeliveryTimeLineViewConstants.intervalSummaryMinWidth,
                maxWidth: DeliveryTimeLineViewConstants.intervalSummaryMaxWidth
            };

            return <div key={this.props.interval.id + "-" + this.props.team.key + "-work-item-count"}
                style={styles}
                className="work-item-count-interval no-wit-icon">
                <TooltipHost content={ScaledAgileResources.AllWorkItems}>{totalNumber}</TooltipHost>
            </div>;
        }

        // determine the expected width of the roll up summary
        const showLabel = ((workItemTypeCounts * (intervalSummaryMaxWidth + DeliveryTimeLineViewConstants.intervalSummaryMarginRight + DeliveryTimeLineViewConstants.intervalSummaryLabelMarginRight)) + workItemTypeLabelsLength) < rollUpSummaryWidth;
        let workItemTypeDivs: JSX.Element[] = [];
        Object.keys(workItemTypeToCountMap).sort() // sort
            .forEach((witName, i) => {
                if (workItemTypeToCountMap.hasOwnProperty(witName)) {
                    workItemTypeDivs.push(this._buildWITRollupSummary(witName, workItemTypeToCountMap[witName], showLabel));
                }
            });
        return <div key={this.props.interval.id + "-" + this.props.team.key}>{workItemTypeDivs}</div>;
    }

    /**
     * Lifecycle override to stop unneccessary re-rendering
     *
     * @param nextProps the props the component will receive
     * @param nextState the state the component will receive
     */
    public shouldComponentUpdate(nextProps: IIntervalProps, nextState: any): boolean {
        let shouldUpdate = nextProps.team.isInViewport || this.isInViewport;
        this.isInViewport = nextProps.team.isInViewport;
        return shouldUpdate;
    }

    @autobind
    private _initiateInlineAdd(workItemType: string) {
        this.props.actionsCreator.setInlineAddItemInfo(this.props.interval, true, {
            inlineAddWorkItemType: workItemType
        });
        this.props.actionsCreator.focusInlineAddCard(this.props.team, this.props.interval);
    }

    /**
     * Returns a value indicating whether the current plans focus ID points to this interval's "inline add" card.
     */
    private _isFocusedOnInlineAddCard(): boolean {
        // When restoring focus after "inline add" submit, this is used to confirm that the user didn't intend on focusing
        // elsewhere when they submitted the card. Without this check, we may steal focus from something the user clicked on.
        const currentInlineAddCardFocus = DeliveryTimelineFocusUtils.getCurrentInlineAddCardFocusIdentifier(this.props.storeData);
        return currentInlineAddCardFocus
            && currentInlineAddCardFocus.intervalId == this.props.interval.id
            && currentInlineAddCardFocus.teamKey == this.props.team.key;
    }

    private _isFocusedOnCurrentInterval(): boolean {
        const currentFocusedInterval = DeliveryTimelineFocusUtils.getCurrentIntervalFocusIdentifier(this.props.storeData);
        return currentFocusedInterval
            && currentFocusedInterval.intervalId == this.props.interval.id
            && currentFocusedInterval.teamKey == this.props.team.key;
    }

    private _isFocusedOnCurrentAddNewItemMenu(): boolean {
        const currentFocusedMenu = DeliveryTimelineFocusUtils.getCurrentAddNewItemFocusIdentifier(this.props.storeData);
        return currentFocusedMenu
            && currentFocusedMenu.intervalId == this.props.interval.id
            && currentFocusedMenu.teamKey == this.props.team.key;
    }

    @autobind
    private _abortInlineAdd() {
        this.props.actionsCreator.setInlineAddItemInfo(this.props.interval, false, null);

        if (this._isFocusedOnInlineAddCard()) {
            this.props.actionsCreator.focusInterval(this.props.team, this.props.interval);
        }
    }

    @autobind
    private _submitInlineAdd(newTitle: string) {
        this.props.actionsCreator.setInlineAddItemInfo(this.props.interval, true, {
            inlineAddWorkItemType: this.props.interval.inlineAddProps.inlineAddWorkItemType,
            inlineAddTitle: newTitle,
            inlineAddSaveStatus: ItemSaveStatus.IsSaving
        });

        const onSaveComplete = (newItemId?: number) => {
            this.props.actionsCreator.setInlineAddItemInfo(this.props.interval, false);

            if (newItemId) {
                if (this._isFocusedOnInlineAddCard()) {
                    // Focus on new item
                    for (const item of this.props.interval.items) {
                        if (item.id == newItemId) {
                            this.props.actionsCreator.focusItem(this.props.team, this.props.interval, item);
                            break;
                        }
                    }
                }
            }
        };

        this.props.actionsCreator.createNewItem(this.props.team, this.props.interval, newTitle).then((result) => {
            if (result.saveSuccess) {
                onSaveComplete(result.createdItem.id);
            }
            else {
                let newId;
                this.props.actionsCreator.openItem(result.createdItem.id, {
                    save: (newItem) => {
                        newId = newItem.id;
                        onSaveComplete(newItem.id);
                    },
                    close: () => {
                        // We must pass the ID here so that if the user chose "Save & close" the reorder action can run
                        // *after* the save operation; doing that in the "save" callback doesn't work because the item hasn't
                        // propagated yet.
                        onSaveComplete(newId);
                    }
                });
            }
        }, (error) => {
            this.props.actionsCreator.setInlineAddItemInfo(this.props.interval, true, {
                inlineAddSaveStatus: ItemSaveStatus.Error,
                inlineAddWorkItemType: this.props.interval.inlineAddProps.inlineAddWorkItemType,
                inlineAddTitle: this.props.interval.inlineAddProps.inlineAddTitle
            });
            if (this._isFocusedOnInlineAddCard()) {
                this.props.actionsCreator.focusInterval(this.props.team, this.props.interval);
            }
        });
    }

    public loadMoreItemsClick() {
        this.props.actionsCreator.focusInterval(this.props.team, this.props.interval);
        this.props.actionsCreator.loadMore(this.props.team, this.props.interval);
    }

    private _onLoadMoreKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        this._handleFocusIntervalKeydownEvent(e);

        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isPropagationStopped()) {
            return;
        }

        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this.loadMoreItemsClick();
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const direction: Movement = KeyToMovementMap[e.keyCode] || Movement.None;
        if (direction !== Movement.None) {
            e.stopPropagation();
            e.preventDefault();
            this.props.actionsCreator.focusAdjacentObjectToLoadMore(this.props.team, this.props.interval, direction);
            return;
        }
    }

    /**
     * What: Indicate if the card has move out of a specific vertical or horizontal threshold
     * Why: A minimum movement is required to cancel the drag of a card. Can be used to determine if we can click a link (not yet implemented)
     */
    private _isCardOutOfThreshold(): boolean {
        if (FeatureEnablement.isCardDragDropDelayed()) {
            //Diag.Debug.logVerbose("Interval > X = " + Interval._currentMouseX + ", StartX = " + Interval._dragStartMouseX + " ---- Interval > Y = " + Interval._currentMouseY + ", StartY = " + Interval._dragStartMouseY);
            if (DragDropContext.lastMouseDownCoordinate.x && DragDropContext.currentMouseCoordinate.x) {
                const diff = Math.abs(DragDropContext.currentMouseCoordinate.x - DragDropContext.lastMouseDownCoordinate.x);
                if (diff >= Interval.THRESHOLD_DRAG_CARD_PIXEL) {
                    return true;
                }
            }
            if (DragDropContext.lastMouseDownCoordinate.y && DragDropContext.currentMouseCoordinate.y) {
                const diff = Math.abs(DragDropContext.currentMouseCoordinate.y - DragDropContext.lastMouseDownCoordinate.y);
                if (diff >= Interval.THRESHOLD_DRAG_CARD_PIXEL) {
                    return true;
                }
            }
            return false;
        } else {
            return false;
        }
    }

    private _setViewportTreshold() {
        // Store the top, bottom, left, right threshold for drag area on the edge of the delivery timeline viewport.
        let pageHeight = $("." + DeliveryTimeLineViewClassNameConstants.main).height();
        let pageWidth = $("." + DeliveryTimeLineViewClassNameConstants.main).width();
        let topMinTreshold = $("." + DeliveryTimeLineViewClassNameConstants.deliveryTimeline).offset().top;
        let topMaxTreshold = topMinTreshold + DeliveryTimeLineViewConstants.dragAndPanAreaThresholdPixel;
        let bottomMaxTreshold = pageHeight;
        let bottomMinTreshold = bottomMaxTreshold - DeliveryTimeLineViewConstants.dragAndPanAreaThresholdPixel;
        let leftMinTreshold = 0;
        let leftMaxTreshold = leftMinTreshold + DeliveryTimeLineViewConstants.teamSidebarWidth + DeliveryTimeLineViewConstants.dragAndPanAreaThresholdPixel;
        let rightMaxTreshold = pageWidth;
        let rightMinTreshold = rightMaxTreshold - DeliveryTimeLineViewConstants.dragAndPanAreaThresholdPixel - DeliveryTimeLineViewConstants.dragAndPanAreaThresholdPixel;
        this._viewportTreshold = {
            viewportHeight: pageHeight,
            viewportWidth: pageWidth,
            topMinTreshold: topMinTreshold,
            topMaxTreshold: topMaxTreshold,
            bottomMinTreshold: bottomMinTreshold,
            bottomMaxTreshold: bottomMaxTreshold,
            leftMinTreshold: leftMinTreshold,
            leftMaxTreshold: leftMaxTreshold,
            rightMinTreshold: rightMinTreshold,
            rightMaxTreshold: rightMaxTreshold,
        };
    }

    /**
     * Drop handler
     */
    private _onDrop = (data: IDragSourceParams) => {
        Diag.Debug.logInfo("onDrop interval id " + this.props.interval.id);
        if (data.hasOwnProperty(Interval.itemId) && data.hasOwnProperty(Interval.sourceTeam) && data.hasOwnProperty(Interval.sourceInterval)) {
            let payload = {
                itemId: data.itemId,
                sourceTeam: data.sourceTeam,
                sourceInterval: data.sourceInterval,
                targetTeam: this.props.team,
                targetInterval: this.props.interval,
            };
            this.props.actionsCreator.itemDrop(payload);
        }
        this._clearDragData();
    }

    /**
     * What: Handling the case when the element is dragging near the edge of the viewport.
     * Why: We need to manually move the view port when we are dragging a card next to the edge of the browser.
     */
    private _onDragMove = (e: any) => {

        let pageX = e.pageX;
        let pageY = e.pageY;

        if (pageX === 0 && pageY === 0) {
            // mouse is outside the browser.
            return;
        }

        let movement: Movement;
        if (this._viewportTreshold) {
            if (pageX > this._viewportTreshold.rightMinTreshold && pageX < this._viewportTreshold.rightMaxTreshold) {
                Diag.Debug.logInfo("Interval: move right");
                movement = Movement.Right;
            }
            else if (pageX > this._viewportTreshold.leftMinTreshold && pageX < this._viewportTreshold.leftMaxTreshold) {
                Diag.Debug.logInfo("Interval: move left");
                movement = Movement.Left;
            }
            else if (pageY > this._viewportTreshold.bottomMinTreshold && pageY < this._viewportTreshold.bottomMaxTreshold) {
                Diag.Debug.logInfo("Interval: move down");
                movement = Movement.Down;
            }
            else if (pageY > this._viewportTreshold.topMinTreshold && pageY < this._viewportTreshold.topMaxTreshold) {
                Diag.Debug.logInfo("Interval: move up");
                movement = Movement.Up;
            }
            else {
                //Diag.Debug.logInfo("Interval: move none");
            }
        }

        if (movement) {
            this._queueMovement(movement);
        }
    }

    /**
     * Add the viewport change in pixel to the queue based on the given movement direction.
     * @param {Movement} direction - the direction of the mouse movement
     */
    private _queueMovement(direction: Movement): void {
        let numPixelsToMove = this.props.zoomLevelInPixelPerDay * DeliveryTimeLineViewConstants.dragAndPanViewportChangeNumberOfDays;
        if (direction === Movement.Left || direction === Movement.Right) {
            numPixelsToMove = direction === Movement.Left ? numPixelsToMove * -1 : numPixelsToMove;
            this._queueHorizontalViewportChange(numPixelsToMove);
        }
        else {
            numPixelsToMove = direction === Movement.Up ? numPixelsToMove * -1 : numPixelsToMove;
            this._queueVerticalViewportChange(numPixelsToMove);
        }
    }

    /**
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
    private _queueVerticalViewportChange(verticalPixelChange: number): void {
        if (verticalPixelChange !== 0) {
            this._viewportChangeQueue.add(new ViewportMovedDelta(0, verticalPixelChange));
        }
    }

    /**
     * Take the last viewport change data which contain the last values for the user but
     * merge all vertical and horizontal movement
     * @param {IViewportMovedDelta[]} queueData - List of all changes in the last few millisecond
     */
    private _mergeAndInvokeViewportChange(queueData: IViewportMovedDelta[]): void {
        if (queueData) {
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
                this.props.actionsCreator.viewportMovedDone(horizontalMovement > 0 ? Movement.Right : Movement.Left, MovementType.DragCard); // We could bitwise for also top/down movement here later if needed
            }
        }
    }

    private _isValidDropTarget = (data: IDragSourceParams): boolean => {
        if (data) {
            return this.props.actionsCreator.canMoveItemBetweenIntervals(data.sourceTeam, this.props.team, data.sourceInterval, this.props.interval);
        }
        return false;
    }

    // Clear any data stored during drag operation.
    private _clearDragData() {
        this._viewportTreshold = null;
    }

    public toggleExpandCollapseClick() {
        if (this.props.team.isCollapsed) {
            this.props.actionsCreator.focusInterval(this.props.team, this.props.interval);
        }
        else {
            this.props.actionsCreator.focusTeam(this.props.team, TeamFocusType.TeamToggle);
        }
        this.props.actionsCreator.toggleExpandCollapseTeam(this.props.team);
    }

    private _onSortStart = (itemId: string, setDragData: (value: ISortUpdateParams) => void) => {
        Diag.Debug.logInfo("Interval: _onSortStart [Root of isCardBeingDragged true]");
        const actualItemId = parseInt(itemId);
        if (actualItemId > -1) {
            let payload = {
                sourceTeam: this.props.team,
                sourceInterval: this.props.interval,
                itemId: actualItemId,
            } as ISortUpdateParams;
            setDragData(payload);
            this._setViewportTreshold();
            if ($.isFunction(this.props.isCardBeingDragged)) {
                this.props.isCardBeingDragged(true);
            }
            this.props.actionsCreator.itemDragStart(payload);
        }
    }

    private _onMove = (itemId: string, setDragData: (value: ISortUpdateParams) => void, e: Event): void => {
        this._onDragMove(e);
    }

    private _onSortStop = (itemId: string, setDragData: (value: ISortUpdateParams) => void) => {
        if (FeatureEnablement.isCardDragDropDelayed()) {
            this._stopProgressionAnimation();
        }
        this._viewportChangeQueue.end();
        this._clearDragData();
        if ($.isFunction(this.props.isCardBeingDragged)) {
            this.props.isCardBeingDragged(false);
        }
        let payload = {
            sourceTeam: this.props.team,
            targetTeam: this.props.team,
            sourceInterval: this.props.interval,
            targetInterval: this.props.interval,
            itemId: parseInt(itemId),
        } as IDragDropParams;
        this.props.actionsCreator.itemDrop(payload);
    }

    private _onSortUpdate = (itemId: string, newIndex: number, dragData: ISortUpdateParams) => {
        const payload: ISortUpdateParams = {
            itemId: parseInt(itemId),
            sourceTeam: this.props.team,
            sourceInterval: this.props.interval,
            newIndex: newIndex,
            userInitiated: true
        };
        this.props.actionsCreator.onSortUpdate(payload);
    }

    @autobind
    private _onCardMouseDown(card: Card, e: React.MouseEvent<HTMLDivElement>): void {
        this.props.actionsCreator.focusItem(this.props.team, this.props.interval, card.props.item);
        e.stopPropagation();

        // Start drag/drop animation.
        if (DragDropContext.getInstance(DragDropZoneEnclosureConstants.CONTEXT_ID_DELIVERY).isDelayEnabled()) {
            card.startProgressionAnimation(DragDropContext.getInstance(DragDropZoneEnclosureConstants.CONTEXT_ID_DELIVERY).delayIsMsBeforeDrag);
        }
    }

    @autobind
    private _onCardMouseUp(card: Card, e: React.MouseEvent<HTMLDivElement>): void {
        if (DragDropContext.getInstance(DragDropZoneEnclosureConstants.CONTEXT_ID_DELIVERY).isDelayEnabled()) {
            card.stopProgressionAnimation();
        }
    }

    private _handleIntervalOrCardKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        if (e.keyCode === KeyCode.N) {
            e.stopPropagation();
            e.preventDefault();

            const allWits = this.props.team.backlog.workItemTypes;
            if ($.isArray(allWits) && allWits.length > 0 && !this.props.team.isCollapsed) {
                if (allWits.length == 1) {
                    this._initiateInlineAdd(allWits[0]);
                }
                else {
                    this.props.actionsCreator.focusAddNewItemMenu(this.props.team, this.props.interval);
                }
            }
        }
    }

    @autobind
    private _onCardKeyDown(card: Card, e: React.KeyboardEvent<HTMLElement>): void {
        this._handleFocusIntervalKeydownEvent(e);
        if (e.isPropagationStopped()) {
            return;
        }

        this._handleCardMoveKeydownEvent(card, e);
        if (e.isPropagationStopped()) {
            return;
        }

        this._handleIntervalOrCardKeyDown(e);
        if (e.isPropagationStopped()) {
            return;
        }

        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }

        const direction: Movement = KeyToMovementMap[e.keyCode] || Movement.None;
        if (direction !== Movement.None) {
            e.stopPropagation();
            this.props.actionsCreator.focusAdjacentObjectToItem(this.props.team, this.props.interval, card.props.item, direction);
        }
    }

    @autobind
    private _onIntervalMessageKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        this._handleFocusIntervalKeydownEvent(e);
    }

    private _handleCardMoveKeydownEvent(card: Card, e: React.KeyboardEvent<HTMLElement>) {
        const direction: Movement = KeyToMovementMap[e.keyCode] || Movement.None;
        if (e.ctrlKey && direction !== Movement.None) {
            e.stopPropagation();
            if (!card.props.item.saveStatus || card.props.item.saveStatus === ItemSaveStatus.Saved) {
                this.props.actionsCreator.moveItem(card.props.item.id, this.props.interval, this.props.team, direction);
            }
        }
    }

    private _handleFocusIntervalKeydownEvent(e: React.KeyboardEvent<HTMLElement>) {
        if (e.shiftKey && e.keyCode === KeyCode.PAGE_UP) {
            e.stopPropagation();
            e.preventDefault();
            this.props.actionsCreator.focusTeam(this.props.team, this.props.team.hasError() ? TeamFocusType.BacklogLink : TeamFocusType.TeamToggle);
        }
        else if (e.shiftKey && e.keyCode === KeyCode.PAGE_DOWN) {
            e.stopPropagation();
            e.preventDefault();
            this.props.actionsCreator.focusAdjacentObjectToTeam(this.props.team, Movement.Down);
        }
    }

    @autobind
    private _onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        if (e.isPropagationStopped()) {
            return;
        }

        if ($.isFunction(this.props.onKeyDown)) {
            this.props.onKeyDown(this, e);
            if (e.isPropagationStopped()) {
                return;
            }
        }

        this._handleIntervalOrCardKeyDown(e);
        if (e.isPropagationStopped()) {
            return;
        }
    }

    private _focusThisInterval() {
        // Shift viewport to interval and flag to set focus.
        this.props.actionsCreator.focusInterval(this.props.team, this.props.interval);
    }

    @autobind
    private _onContainerMouseDown(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();
        e.stopPropagation();

        this._focusThisInterval();
    }

    @autobind
    private _onContainerFocus(e: React.FocusEvent<HTMLElement>) {
        // Deny focus on this interval if the team is collapsed
        if (this.props.team.isCollapsed) {
            this.props.actionsCreator.focusTeam(this.props.team, TeamFocusType.TeamToggle);
        }
        else {
            this._isFocused = true;
        }
    }

    @autobind
    private _onContainerBlur() {
        if (this._isFocusedOnCurrentInterval()) {
            DeliveryTimelineFocusUtils.clearCurrentFocusIdentifier(this.props.storeData);
        }

        this._isFocused = false;
    }

    @autobind
    private _onAddNewDropdownToggled(isOpen: boolean) {
        if (isOpen) {
            this.props.actionsCreator.focusAddNewItemMenu(this.props.team, this.props.interval)
        }
        else if (this._isFocusedOnCurrentAddNewItemMenu()) {
            // Transfer focus back to the interval itself if the user didn't intentionally redirect focus
            this.props.actionsCreator.focusInterval(this.props.team, this.props.interval);
        }
    }

    /**
     * [P] Fix the bug that onMouseUp not called from the card when drag started. Ideally, would call : card.stopProgressionAnimation()
     * The actual problem is that we do not have access to the concrete type of what is dragged. If SortableComponent could return cancelStartDrag with a Card as parameter we would be good.
     */
    private _stopProgressionAnimation(): void {
        $("." + Card.CSS_ITEM_ANIMATION_ON).removeClass(Card.CSS_ITEM_ANIMATION_ON);
        $("." + Card.CSS_ITEM_ANIMATION_ON).css("background-image", "");
    }
}
