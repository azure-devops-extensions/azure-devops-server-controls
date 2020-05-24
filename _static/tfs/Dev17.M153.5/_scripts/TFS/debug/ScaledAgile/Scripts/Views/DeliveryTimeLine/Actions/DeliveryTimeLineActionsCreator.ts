
import * as VSS from "VSS/VSS";

import * as Diag from "VSS/Diag";
import * as Utils_Array from "VSS/Utils/Array";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Q from "q";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import UtilsString = require("VSS/Utils/String");
import UtilsCore = require("VSS/Utils/Core");
import { MessageBarType } from "OfficeFabric/MessageBar";
import { TimelineCriteriaStatusCode, TimelineTeamStatusCode } from "TFS/Work/Contracts";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { Message, StateChangeParams } from "ScaledAgile/Scripts/Shared/Models/PageImplementations";
import { DeliveryTimelineErrorMapper } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineErrorMapper";
import { DeliveryTimelineFocusUtils } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineFocusUtils";
import { IntervalHelperFunctions } from "ScaledAgile/Scripts/Shared/Utils/IntervalHelperFunctions";
import { DeliveryTimelinePreferences } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/DeliveryTimelinePreferences";
import { DeliveryTimeLineActions } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActions";
import { IDeliveryTimeLineBusinessLogic, IDeliveryTimeLineBusinessLogicResult } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineBusinessLogicInterfaces";
import { Movement, MovementType } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { DeliveryTimeLineBusinessLogic } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineBusinessLogic";
import { IDeliveryTimeLinesDataProvider } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/DataProviders/DeliveryTimelinesInterfaces";
import {
    IDeliveryTimeLineStoreWorldStateProvider, IDragDropParams, IDeliveryTimeLineViewData, IDeliveryTimeLineStoreData, ITimeLineRequest, ITeam,
    IInterval, ISortUpdateParams, IMoveItemParams, ICollapseTeamParams, IZoomLevelParams,
    PanFocusIdentifier, HorizontalDirection, TeamFocusType, IIntervalInlineAddProps
} from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IItems, IItem, UpdateMode, ItemSaveStatus } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IItemStoreData } from "ScaledAgile/Scripts/Shared/Stores/ItemStoreInterface";
import { IItemManager, ItemManager, ICreateWorkItemResult } from "ScaledAgile/Scripts/Shared/DataProviders/ItemManager";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { ItemActions } from "ScaledAgile/Scripts/Shared/Actions/ItemActions";
import { WorkItemStatesColorProvider } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { PageLoadingState } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { IReorderAjaxResponse } from "Agile/Scripts/Common/Agile";
import { ViewPerfScenarioManager } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";
import { IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { IDeliveryTimeLineTelemetry } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimeLineTelemetry";
import { IWorkItemDialogOptions } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls";
import { RelativeViewPositioning } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineLayoutUtils";
import { getPlansDirectoryUrl } from "ScaledAgile/Scripts/Shared/Utils/PlanXhrNavigationUtils";

/**
 * Actions creation for the delivery timeline view
 */
export interface IDeliveryTimeLineActionsCreator {
    /**
     * Dispose the action creator
     */
    dispose(): void;

    /**
     * Initialize the delivery time line loading the data for the given planId. The plan data that can come from the Data Island or from an Http call.
     * @param {string} viewId - The id of the view to load.
     */
    initializeStore(viewStoreData: IViewsStoreData): void;

    /**
     * Viewport dimensions changed.
     * @param {number} viewportLeft - New left offset of the viewport.
     * @param {number} viewportWidth - New width of the viewport.
     * @param {number} viewportHeight - New height of the viewport.
     */
    viewportDimensionsChanged(viewportLeft: number, viewportWidth: number, viewportHeight: number): void;

    /**
     * Called when the view port move is done (on mouse release for example or mouse wheel or scroll)
     * @param {Movement} Movement direction
     * @param {MouvementType} Type of movement
     */
    viewportMovedDone(movement: Movement, movementType: MovementType);

    /**
     * Viewport position changed.
     * @param {number} horizontalMovement - Change in position horizontally.
     * @param {number} verticalMovement - Change in position vertically.
     * @param {MovementType} movementType - How the movement was generated
     */
    viewportMoved(horizontalMovement: number, verticalMovement: number): void;

    /**
     * Set the viewport top position directly.
     * This is intended to be used by the vertical scroll bar to reduce jitter on scroll.
     * @param {number} top - The new viewport top.
     */
    setViewportTop(top: number);

    /**
     * User right clicked. Bring some data to have an idea where the user right clicked
     * @param {string} domId - Dom unique identifier
     * @param {string} domClasses - Dom classes
     */
    rightClick(domId: string, domClasses: string): void;

    /**
     * Load more items for all intervals within the viewport for a specific team row (team + backlog).
     * @param {ITeam} team - The team for which to invoke load more.
     * @param {IInterval} interval - The interval where the load more belongs to.
     */
    loadMore(team: ITeam, interval: IInterval): void;

    /**
     * Toggle expand/collapse state of the given team.
     * @param {ITeam} team - The team to toggle.
     */
    toggleExpandCollapseTeam(team: ITeam): void;

    /**
     * Collapse all the team rows (regardless of its current state) and invoke display changed action.
     */
    collapseAllTeams(): void;

    /**
     * Expand all the team rows (regardless of its current state) and invoke display changed action.
     */
    expandAllTeams(): void;

    /**
     * Change the zoom level.
     * @param {number} zoomLevel - new level to zoom to (in pixels)
     */
    changeZoomLevel(zoomLevel: number): void;

    /**
     * Trigger once the zoom level is done being changed
     * @param {number} zoomLevel - new level to zoom to (in pixels)
     */
    changeZoomLevelStop(zoomLevel: number): void;

    /**
     * Increase the zoom level by one step.
     */
    increaseZoomLevel(): void;

    /**
     * Decrease the zoom level by one step.
     */
    decreaseZoomLevel(): void;

    /**
     * Open the item in the WIT form.
     * Note: If we decide to move Item.tsx to a shared location rather than keeping it under "DeliveryTimeLine,
     * this method should also be refactored out to a shared location.
     * @param {number} itemId - The id of the item to be opened.
     */
    openItem(itemId: number, options?: IWorkItemDialogOptions): void;

    /**
     * Move an item between team and intervals
     * @param viewportChangePayload The world.
     * @param item Item to move
     * @param teamIds Ids of teams to move item to
     * @param intervalId Id of interval to move item to
     */
    moveItemToTeamsAndInterval(item: IItem, teamIds: string[], iterationPath: string): void;

    /**
     * Remove an item from the timeline
     * @param viewportChangePayload The world.
     * @param item Item to remove
     */
    removeItem(item: IItem, message?: Message): void;

    /**
     * On item drag start. Either within the same interval (sort end) or between interval (drop end).
     * @param {ISortUpdateParams} 
     */
    itemDragStart(payload: ISortUpdateParams): void;

    /**
     * On item drop. Either within the same interval (sort end) or between interval (drop end).
     * @param {IDragDropParams} 
     */
    itemDrop(payload: IDragDropParams): void;

    /**
     * If possible move the given item to the adjacent interval.
     */
    moveItem(itemId: number, sourceInterval: IInterval, sourceTeam: ITeam, direction: Movement);

    /**
     * Called after the item sorted has stopped. The payload will include the index the item should move to.
     * @param {IDragDropParams} 
     */
    onSortUpdate(payload: ISortUpdateParams): void;

    /**
     * A drop is valid between interval. If we drop within the same interval, it's not considered a drop but a sort.
     * @param {ITeam} sourceTeam - team of drag source.
     * @param {ITeam} targetTeam - team of drop target.
     * @param {IInterval} sourceInterval - interval of drag source.
     * @param {IInterval} targetInterval - interval of drop target.
     * @return {boolean} - Return true if the drop target is valid. Return false otherwise.
     */
    canMoveItemBetweenIntervals(sourceTeam: ITeam, targetTeam: ITeam, sourceInterval: IInterval, targetInterval: IInterval): boolean;

    /**
     * Update the card settings for the timeline (toggles between current and title only)
     */
    toggleCardTitleOnly(): void;

    /**
     * Pan the timeline left or right
     * @param {Movement} direction the direction to pan
     * @param {number} duration the duration time to animate the translation (must be greater than 0)
     * @param {MovementType} The way the pan was done
     * @return {IPromise<void>} a promise for when the translation is complete
     */
    panViewportHorizontal(direction: HorizontalDirection, movementType: MovementType, duration?: number): IPromise<void>;

    /**
     * Move the adjacent object into the viewport and flag it get focus. The object can be another item but it can also be another element (ie the Load more button).
     * Assumes current focus element is the given item.
     * @param {ITeam} team Team this item is located in.
     * @param {IInterval} interval Interval this item is located in.
     * @param {IItem} item Root item (the one we want to find the adjacent object to).
     * @param {Movement} direction Direction to move.
     */
    focusAdjacentObjectToItem(team: ITeam, interval: IInterval, item: IItem, direction: Movement): void;

    /**
     * Move the adjacent object into the viewport and flag it get focus. The object can be another item but it can also be another element (ie the Load more button).
     * Assumes current focus element is the Load More button in the given team/interval.
     * @param {ITeam} team Team this item is located in.
     * @param {IInterval} interval Interval this item is located in.
     * @param {Movement} direction Direction to move.
     */
    focusAdjacentObjectToLoadMore(team: ITeam, interval: IInterval, direction: Movement): void;

    /**
     * Move the adjacent object into the viewport and flag it get focus. The object can be another item but it can also be another element (ie the Load more button).
     * Assumes current focus element is an Interval (only overlapping error intervals are supported).
     * @param {ITeam} team Team this item is located in.
     * @param {IInterval} interval Interval this item is located in.
     * @param {Movement} direction Direction to move.
     */
    focusAdjacentObjectToInterval(team: ITeam, interval: IInterval, direction: Movement): void;

    /**
     * Move the given team into the viewport and flag it to get focus.
     * @param {ITeam} team Team this item is located in.
    *  @param {Movement} direction Direction to move.
     */
    focusAdjacentObjectToTeam(team: ITeam, direction: Movement): void;

    /**
     * Move the given item into the viewport and flag it to get focus.
     * @param {ITeam} team Team this item is located in.
     * @param {IInterval} interval Interval this item is located in.
     * @param {IItem} item Item to move into the viewport.
     */
    focusItem(team: ITeam, interval: IInterval, item: IItem): void;

    /**
     * Set the focus to the given team.
     * @param {ITeam} team Team where to set the focus to.
     * @param {TeamFocusType} teamFocusType What kind of element we want to set focus to (team toggle or the backlog link).
     */
    focusTeam(team: ITeam, teamFocusType: TeamFocusType): void;

    /**
     * Set the focus to the calendar right pan button.
     */
    focusRightPanButton(): void;

    /**
     * Set the focus to the available item to focus on the view.
     */
    focusFirstObject(): void;

    /**
     * Set the focus to the specified interval
     */
    focusInterval(team: ITeam, interval: IInterval): void;

    /**
     * Moves the specified interval into view, using the given pre-acquired measurements
     */
    moveIntervalIntoView(team: ITeam, interval: IInterval, distanceToEdges: RelativeViewPositioning);

    /**
     * Create a new work item with the given info
     */
    createNewItem(team: ITeam, interval: IInterval, title: string): IPromise<ICreateWorkItemResult>;

    /**
     * Sets information about this interval's "add" card state.
     */
    setInlineAddItemInfo(interval: IInterval, hasInlineAddItem: boolean, inlineAddProps?: IIntervalInlineAddProps);

    /**
     * Set the focus to the specified interval's "add new item" menu
     */
    focusAddNewItemMenu(team: ITeam, interval: IInterval);

    /**
     * Set the focus to the specified interval's inline add card
     */
    focusInlineAddCard(team: ITeam, interval: IInterval);

    /**
     * Clears stored focus state. For when user focus leaves the delivery timeline.
     */
    clearFocus();

    /**
     * Apply filter to plan and update items visibility
     * @param {FilterState} filter Filter state for update
     */
    updateFilter(filter: FilterState);
}

/**
 * Actions creation for the delivery timeline view
 */
export class DeliveryTimeLineActionsCreator implements IDeliveryTimeLineActionsCreator {
    private _worldStateProvider: IDeliveryTimeLineStoreWorldStateProvider;
    private _dataProvider: IDeliveryTimeLinesDataProvider;
    private _actions: DeliveryTimeLineActions;
    private _itemActions: ItemActions;
    private _pageActions: PageActions;
    private _itemManager: IItemManager;
    private _preferences: DeliveryTimelinePreferences;
    private _previousCardSettings: ICardRenderingOptions;
    private _telemetry: IDeliveryTimeLineTelemetry;

    constructor(dataProvider: IDeliveryTimeLinesDataProvider,
        actions: DeliveryTimeLineActions,
        itemActions: ItemActions,
        pageActions: PageActions,
        worldStateProvider: IDeliveryTimeLineStoreWorldStateProvider,
        preferences: DeliveryTimelinePreferences,
        telemetry: IDeliveryTimeLineTelemetry) {

        if (!worldStateProvider) {
            throw new Error("worldStateProvider must be defined");
        }

        this._dataProvider = dataProvider;
        this._actions = actions;
        this._itemActions = itemActions;
        this._pageActions = pageActions;
        this._itemManager = new ItemManager(itemActions);
        this._worldStateProvider = worldStateProvider;
        this._preferences = preferences;
        this._telemetry = telemetry;
    }

    /*************************************************************************************************
     * Public interface methods
     *************************************************************************************************/

    /**
     * See IDeliveryTimeLineActionsCreator.initializeStore.
     */
    public initializeStore(viewStoreData: IViewsStoreData): void {
        ViewPerfScenarioManager.split("GetDeliveryTimelineDataStart");

        // We need to get the plan data in order to render the plan.
        // If either of those calls fails, we shouldn't proceed.
        const getDataPromise = this._dataProvider.getInitialDataByDateRangeAndTeams(viewStoreData);

        Q(getDataPromise).done(
            (view: IDeliveryTimeLineViewData) => {
                ViewPerfScenarioManager.split("GetDeliveryTimelineDataEnd");
                this._onInitializeStoreSucceeded(viewStoreData.view.id, view);

                if (view.criteriaStatus && view.criteriaStatus.type != null && view.criteriaStatus.type !== TimelineCriteriaStatusCode.OK) {
                    // if the criteria has error status, then display error message on the plan.
                    const errorMessage = UtilsString.format(ScaledAgileResources.CriteriaServerError, view.criteriaStatus.message);
                    this._onInitializeStoreFailed(viewStoreData.view.id, { message: errorMessage } as TfsError);
                }
            },
            (error: TfsError) => {
                this._onInitializeStoreFailed(viewStoreData.view.id, error);
            });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.viewportDimensionsChanged.
     */
    public viewportDimensionsChanged(viewportLeft: number, viewportWidth: number, viewportHeight: number): void {
        Diag.Debug.logVerbose("Enter viewportDimensionsChanged");

        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.viewportDimensionsChanged(viewportLeft, viewportWidth, viewportHeight);
        });
    }

    public viewportMovedDone(movement: Movement, movementType: MovementType) {
        const currentWorldState: IDeliveryTimeLineStoreData = this._worldStateProvider.getValue();
        if (this._telemetry) {
            this._telemetry.move(currentWorldState.id, movement, movementType);
        }
    }

    /**
     * See IDeliveryTimeLineActionsCreator.viewportMoved.
     */
    public viewportMoved(horizontalMovement: number, verticalMovement: number): void {
        Diag.Debug.logVerbose("Enter viewportMoved");

        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            Diag.Debug.logInfo("Viewport Delta: (" + horizontalMovement + ", " + verticalMovement + ")");

            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.viewportMoved(horizontalMovement, verticalMovement);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.setViewportTop.
     */
    public setViewportTop(top: number) {
        Diag.Debug.logVerbose("Enter setViewportTop");

        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            Diag.Debug.logInfo(`Viewport Top: ${top}`);

            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.setViewportTop(top);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.rightClick.
     */
    public rightClick(domId: string, domClasses: string): void {
        const currentWorldState: IDeliveryTimeLineStoreData = this._worldStateProvider.getValue();
        if (this._telemetry) {
            this._telemetry.rightClick(currentWorldState.id, domId, domClasses);
        }
    }

    /**
     * See IDeliveryTimeLineActionsCreator.loadMore.
     */
    public loadMore(team: ITeam, intervalContainsLoadMore: IInterval) {
        Diag.Debug.logVerbose("Enter loadMore");

        // Set Focus to the item above the load more link.
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            const worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);

            let intervalsInViewPort: IInterval[] = worldUpdater.getIntervalsInViewport(team);
            let itemToFocusIndex = IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(team, intervalContainsLoadMore) - 1;

            // Notify the UI to disable the button + loading spinner. Note: The layout does not depend on this so the world is not re-rendered.
            intervalsInViewPort.forEach((interval: IInterval) => { interval.isWaitingForItems = true; });
            this._actions.viewportChanged.invoke(worldState);

            // Prioritize the interval they clicked.
            let workItemsIds = intervalContainsLoadMore.getWorkItemIdsNotLoaded();
            if (workItemsIds.canLoadMoreItems()) {
                // More work item data is needed.
                Q(this._dataProvider.getDataForIds(workItemsIds, team.workItemTypeColorAndIcons)).done(
                    (itemsMappedFromServer: IItems) => this._onLoadMoreIntervalSucceeded(team, intervalContainsLoadMore, itemsMappedFromServer),
                    (error: TfsError) => this._onLoadMoreIntervalFailed(error));
            } else {
                // All items have already been loaded. Just invoke the completion method ourselves.
                this._onLoadMoreIntervalSucceeded(team, intervalContainsLoadMore, { cards: [] } as IItems);

                // Move focus down to the first new item - this item is closest to the load more button.
                if (intervalContainsLoadMore.items.length > itemToFocusIndex + 1) {
                    ++itemToFocusIndex;
                }
            }

            // The rest of the intervals.
            intervalsInViewPort.forEach((interval: IInterval) => {
                if (interval !== intervalContainsLoadMore) {
                    let workItemsIds = interval.getWorkItemIdsNotLoaded();
                    if (workItemsIds.canLoadMoreItems()) {
                        // More work item data is needed.
                        Q(this._dataProvider.getDataForIds(workItemsIds, team.workItemTypeColorAndIcons)).done(
                            (itemsMappedFromServer: IItems) => this._onLoadMoreIntervalSucceeded(team, interval, itemsMappedFromServer),
                            (error: TfsError) => this._onLoadMoreIntervalFailed(error));
                    } else {
                        // All items have already been loaded. Just invoke the completion method ourselves.
                        this._onLoadMoreIntervalSucceeded(team, interval, { cards: [] } as IItems);
                    }
                }
            });

            return worldUpdater.focusAfterLoadMore(team, intervalContainsLoadMore, itemToFocusIndex);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.toggleExpandCollapseTeam.
     */
    public toggleExpandCollapseTeam(team: ITeam) {
        Diag.Debug.logVerbose("Enter toggleExpandCollapseTeam");

        this._invokeBusinessLogicAction((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            let result = worldUpdater.toggleExpandCollapseTeam(team);
            this._updatePreferences(result);
            this._actions.collapseTeam.invoke({ planId: worldState.id, teamId: team.id, isCollapsed: team.isCollapsed } as ICollapseTeamParams);
            return result;
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.collapseAllTeams.
     */
    public collapseAllTeams() {
        Diag.Debug.logVerbose("Enter collapseAllTeams");

        this._invokeBusinessLogicAction((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            let result = worldUpdater.collapseAllTeams();
            this._updatePreferences(result);
            this._actions.collapseTeam.invoke({ planId: worldState.id, teamId: null, isCollapsed: true } as ICollapseTeamParams);
            return result;
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.expandAllTeams.
     */
    public expandAllTeams() {
        Diag.Debug.logVerbose("Enter expandAllTeams");

        this._invokeBusinessLogicAction((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            let result = worldUpdater.expandAllTeams();
            this._updatePreferences(result);
            this._actions.collapseTeam.invoke({ planId: worldState.id, teamId: null, isCollapsed: false } as ICollapseTeamParams);
            return result;
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.changeZoomLevel.
     */
    public changeZoomLevel(zoomLevel: number) {
        Diag.Debug.logVerbose("Enter changeZoomLevel");

        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            let result = worldUpdater.changeZoomLevel(zoomLevel);
            this._updatePreferences(result.updatedWorld);
            return result;
        });
    }

    /**
    * See IDeliveryTimeLineActionsCreator.changeZoomLevelStop.
    */
    public changeZoomLevelStop(zoomLevel: number) {
        this._actions.zoomLevelChanged.invoke({ planId: this._worldStateProvider.getValue().id, zoomLevel: zoomLevel } as IZoomLevelParams);
    }

    /**
     * See IDeliveryTimeLineActionsCreator.increaseZoomLevel.
     */
    public increaseZoomLevel() {
        Diag.Debug.logVerbose("Enter increaseZoomLevel");

        let zoomLevel = this._worldStateProvider.getValue().zoomLevelInPixelPerDay - DeliveryTimeLineViewConstants.zoomStep;
        this.changeZoomLevel(Math.max(zoomLevel, DeliveryTimeLineViewConstants.zoomLevelMin));
    }

    /**
     * See IDeliveryTimeLineActionsCreator.decreaseZoomLevel.
     */
    public decreaseZoomLevel() {
        Diag.Debug.logVerbose("Enter decreaseZoomLevel");

        let zoomLevel = this._worldStateProvider.getValue().zoomLevelInPixelPerDay + DeliveryTimeLineViewConstants.zoomStep;
        this.changeZoomLevel(Math.min(zoomLevel, DeliveryTimeLineViewConstants.zoomLevelMax));
    }

    /**
     * See IDeliveryTimeLineActionsCreator.openItem.
     */
    public openItem(itemId: number, options?: IWorkItemDialogOptions): void {
        this._itemManager.openWITForm(itemId, options);
    }

    /**
     * See IDeliveryTimeLineActionsCreator.dispose.
     */
    public dispose() {
        if (this._itemManager) {
            this._itemManager.dispose();
            this._itemManager = null;
        }
    }

    /**
     * See IDeliveryTimeLineActionsCreator.moveItemToTeamsAndInterval.
     */
    public moveItemToTeamsAndInterval(item: IItem, teamBacklogKeys: string[], iterationPath: string): void {
        Diag.Debug.logVerbose("Enter moveItemToTeamsAndInterval");

        this._invokeBusinessLogicAction((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.moveItemToTeamsAndInterval(item, teamBacklogKeys, iterationPath);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.removeItem.
     */
    public removeItem(item: IItem, message?: Message) {
        Diag.Debug.logVerbose("Enter removeItem");

        this._invokeBusinessLogicAction((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);

            return worldUpdater.removeItem(item.id);
        });

        if (message) {
            this._pageActions.setPageMessage.invoke(message);
        }
    }

    /**
     * See IDeliveryTimeLineActionsCreator.itemDragStart.
     */
    public itemDragStart(payload: ISortUpdateParams) {
        payload.sourceInterval.isDragging = true;
        this._actions.itemDragStart.invoke(payload);
    }

    /**
     * See IDeliveryTimeLineActionsCreator.moveItemToAdjacentInterval.
     */
    public moveItem(itemId: number, sourceInterval: IInterval, sourceTeam: ITeam, direction: Movement) {
        if (direction === Movement.Left || direction === Movement.Right) {
            const sourceIndex = sourceTeam.intervals.indexOf(sourceInterval);
            if (sourceIndex >= 0) {
                const targetIndex = (direction === Movement.Left) ? sourceIndex - 1 : sourceIndex + 1;

                if (targetIndex >= 0 && targetIndex < sourceTeam.intervals.length) {
                    this._moveItemBetweenIntervals(itemId, sourceInterval, sourceTeam, sourceTeam.intervals[targetIndex], sourceTeam);
                }
            }
        }
        else if (direction === Movement.Up || direction === Movement.Down) {
            const sourceIndex = Utils_Array.findIndex(sourceInterval.items, x => x.id === itemId);
            if (sourceIndex >= 0) {
                const targetIndex = (direction === Movement.Up) ? sourceIndex - 1 : sourceIndex + 1;

                if (targetIndex >= 0 && targetIndex < sourceInterval.items.length) {
                    this._reorderItem(itemId, sourceInterval, sourceTeam, targetIndex, true);
                }
            }
        }
    }

    /**
     * See IDeliveryTimeLineActionsCreator.itemDrop.
     */
    public itemDrop(payload: IDragDropParams): void {
        payload.sourceInterval.isDragging = false;
        this._moveItemBetweenIntervals(payload.itemId, payload.sourceInterval, payload.sourceTeam, payload.targetInterval, payload.targetTeam);
        this._actions.itemDrop.invoke(payload);
    }

    /**
     * See IDeliveryTimeLineActionsCreator.onSortUpdate.
     */
    public onSortUpdate(payload: ISortUpdateParams): void {
        if (this._reorderItem(payload.itemId, payload.sourceInterval, payload.sourceTeam, payload.newIndex, payload.userInitiated)) {
            this._actions.itemSortUpdate.invoke(payload);
        }
    }

    /**
     * A drop is valid between interval. If we drop within the same interval, it's not considered a drop but a sort.
     */
    public canMoveItemBetweenIntervals(sourceTeam: ITeam, targetTeam: ITeam, sourceInterval: IInterval, targetInterval: IInterval): boolean {
        if (sourceTeam && targetTeam && sourceInterval && targetInterval) {
            let isSameTeam = sourceTeam.key === targetTeam.key;
            let isDifferentInterval = sourceInterval.id !== targetInterval.id;
            return isSameTeam && isDifferentInterval;
        }
        return false;
    }

    /**
     * See IDeliveryTimeLineActionsCreator.toggleCardTitleOnly.
     */
    public toggleCardTitleOnly() {
        Diag.Debug.logVerbose("Enter toggleCardTitleOnly");

        let settings: ICardRenderingOptions = null;
        if (this._previousCardSettings) {
            settings = this._previousCardSettings;
            this._previousCardSettings = null;
        }
        else {
            this._previousCardSettings = this._worldStateProvider.getValue().cardRenderingOptions;
            // The following code shouldn't be a code that remains in our code base. We shouldn't override these methods. Potential flaw is to have to sync this method during the life of ICardRenderingOptions
            settings = $.extend({}, this._previousCardSettings, {
                showAssignedTo: (item: IItem) => { return false; },
                getAdditionalFields: (item: IItem) => { return []; },
                showTags: false
            } as ICardRenderingOptions);
        }
        this._actions.cardRenderingOptionsChanged.invoke(settings);

        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.viewportMoved(0, 0);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.panViewportHorizontal.
     */
    public panViewportHorizontal(direction: HorizontalDirection, movementType: MovementType, duration: number = 300): IPromise<void> {
        if (duration <= 0) {
            throw new Error("The duration must be greater than 0");
        }

        let deferred = Q.defer<void>();
        let worldState = this._worldStateProvider.getValue();
        let scrollSpeedFactor = worldState.zoomLevelInPixelPerDay === DeliveryTimeLineViewConstants.zoomLevelMin ? 2 : 1;
        let numPixelsToMove = scrollSpeedFactor * worldState.zoomLevelInPixelPerDay * DeliveryTimeLineViewConstants.calendarPanNumberOfDays;
        if (this._telemetry) {
            this._telemetry.move(worldState.id, direction === HorizontalDirection.Left ? Movement.Left : Movement.Right, movementType); // Not in viewportMoved because of the repetition of this method (animation or panning with mouse move)
        }

        // Set the focus element one of the left/right buttons. This is done mostly because it is easier than trying to keep focus on a card after it moves out of the viewport and is removed from the DOM.
        this._invokeBusinessLogicAction((currentWorldState: IDeliveryTimeLineStoreData) => {
            DeliveryTimelineFocusUtils.setCurrentPanFocusIdentifier(currentWorldState, { direction: direction } as PanFocusIdentifier);
            return currentWorldState;
        });

        let move = (progress: number) => {
            let deltaMovement = numPixelsToMove * progress;
            numPixelsToMove -= deltaMovement;
            let horizontalMovement = deltaMovement * ((direction === HorizontalDirection.Left) ? -1 : 1);
            this.viewportMoved(horizontalMovement, 0);
        };

        let animate = (durationInMillisecond: number) => {
            let start: number = null;
            let step = (time: number) => {
                if (start === null) {
                    start = time;
                }
                // Start at 0 and incrementally increase to 1 - linear animation
                let progress = (time - start) / durationInMillisecond;
                if (progress > 1) {
                    move(1);
                    deferred.resolve(null);
                }
                else {
                    requestAnimationFrame(step);
                    move(progress);
                }
            };
            requestAnimationFrame(step);
        };

        animate(duration);

        return deferred.promise;
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusAdjacentObjectToItem.
     */
    public focusAdjacentObjectToItem(team: ITeam, interval: IInterval, item: IItem, direction: Movement): void {
        if (direction === Movement.None) {
            return;
        }

        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusAdjacentObjectToItem(team, interval, item, direction);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusAdjacentObjectToLoadMore.
     */
    public focusAdjacentObjectToLoadMore(team: ITeam, interval: IInterval, direction: Movement): void {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusAdjacentObjectToLoadMore(team, interval, direction);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusAdjacentObjectToTeam
     */
    public focusAdjacentObjectToTeam(team: ITeam, direction: Movement): void {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusAdjacentObjectToTeam(team, direction);
        });
    }
    /**
     * See IDeliveryTimeLineActionsCreator.focusAdjacentObjectToInterval.
     */
    public focusAdjacentObjectToInterval(team: ITeam, interval: IInterval, direction: Movement): void {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusAdjacentObjectToInterval(team, interval, direction);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusItem
     */
    public focusItem(team: ITeam, interval: IInterval, item: IItem): void {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusItem(team, interval, item);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusTeam.
     */
    public focusTeam(team: ITeam, teamFocusType: TeamFocusType) {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusTeam(team, teamFocusType);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusRightPanButton.
     */
    public focusRightPanButton() {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusRightPanButton();
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusFirstObject.
     */
    public focusFirstObject() {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusFirstObject();
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusInterval.
     */
    public focusInterval(team: ITeam, interval: IInterval) {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusInterval(team, interval);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.moveIntervalIntoView.
     */
    public moveIntervalIntoView(team: ITeam, interval: IInterval, distanceToEdges: RelativeViewPositioning) {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.moveIntervalIntoView(team, interval, distanceToEdges);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.createNewItem.
     */
    public createNewItem(team: ITeam, interval: IInterval, title: string): IPromise<ICreateWorkItemResult> {
        // save work item
        const projectId = team.projectId;
        const workItemType = interval.inlineAddProps.inlineAddWorkItemType;
        const teamFieldName = team.teamFieldName;
        const teamFieldValue = team.teamFieldDefaultValue;
        const iterationPath = interval.id;

        let fieldUpdateList: IDictionaryStringTo<string> = {
            [WITConstants.CoreFieldRefNames.Title]: title,
            [WITConstants.CoreFieldRefNames.IterationPath]: iterationPath,
            [teamFieldName]: teamFieldValue
        };

        if (this._telemetry) {
            this._telemetry.newItem(projectId, teamFieldValue, iterationPath);
        }

        return this._itemManager.beginCreateNewWorkItem(projectId, workItemType, fieldUpdateList).then((newWorkItem) => newWorkItem, (error) => {
            let errorMessage = VSS.getErrorMessage(error);
            this._pageActions.setPageMessage.invoke(new Message(MessageBarType.error, errorMessage));
            throw error;
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.setInlineAddItemInfo.
     */
    public setInlineAddItemInfo(interval: IInterval, hasInlineAddItem: boolean, inlineAddProps?: IIntervalInlineAddProps) {
        if (interval.hasInlineAddItem !== hasInlineAddItem || !UtilsCore.equals(interval.inlineAddProps, inlineAddProps)) {
            interval.hasInlineAddItem = hasInlineAddItem;
            interval.inlineAddProps = inlineAddProps;

            // Force a redraw to update interval height and other layout
            this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
                let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
                return worldUpdater.viewportMoved(0, 0);
            });
        }
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusAddNewItemMenu.
     */
    public focusAddNewItemMenu(team: ITeam, interval: IInterval) {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusAddNewItemMenu(team, interval);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.focusInlineAddCard.
     */
    public focusInlineAddCard(team: ITeam, interval: IInterval) {
        this._invokeActionAndGetMoreDataIfNeeded((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.focusInlineAddCard(team, interval);
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.clearFocus.
     */
    public clearFocus() {
        this._invokeBusinessLogicAction((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.clearFocus().updatedWorld;
        });
    }

    /**
     * See IDeliveryTimeLineActionsCreator.updateFilter.
     */
    public updateFilter(filter: FilterState) {
        this._itemActions.updateFilter.invoke({ filter });
        this._invokeBusinessLogicAction((worldState: IDeliveryTimeLineStoreData) => {
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(worldState);
            return worldUpdater.refreshViewport().updatedWorld;
        });
    }

    /*************************************************************************************************
     * Private methods (or public for testing )
     *************************************************************************************************/

    /**
     * Invoke an action that returns an updated world layout and notify store of the new layout data.
     * @param method Method to invoke.
     */
    public _invokeBusinessLogicAction(method: (currentWorldState: IDeliveryTimeLineStoreData) => IDeliveryTimeLineStoreData): void {
        let currentWorldState: IDeliveryTimeLineStoreData = this._worldStateProvider.getValue();
        this._logWorldState(currentWorldState);

        let result: IDeliveryTimeLineStoreData = method(currentWorldState);

        this._logWorldState(result);

        this._actions.viewportChanged.invoke(result);
    }

    /**
     * Invoke an action that returns an updated world layout and notify store of the new layout data. Also, based on the result, get more data if needed.
     * @param method Method to invoke.
     */
    public _invokeActionAndGetMoreDataIfNeeded(method: (currentWorldState: IDeliveryTimeLineStoreData) => IDeliveryTimeLineBusinessLogicResult): IPromise<void[]> {
        let currentWorldState: IDeliveryTimeLineStoreData = this._worldStateProvider.getValue();
        this._logWorldState(currentWorldState);

        let result: IDeliveryTimeLineBusinessLogicResult = method(currentWorldState);
        if (result) {
            this._logWorldState(result.updatedWorld);
            this._actions.viewportChanged.invoke(result.updatedWorld);
        }
        if (result && result.neededTimeLineData.length > 0) {
            return this._getMoreDataForDatesTeams(result.neededTimeLineData);
        } else {
            return Q.resolve([]);
        }
    }

    /**
     * Request more data.  May send multiple requests to get full date range.
     * [[ This method is only public for testing purposes.]]
     * @param {ITimeLineRequest} neededData dates and teams needed 
     */
    public _getMoreDataForDatesTeams(neededData: ITimeLineRequest[]): IPromise<void[]> {
        Diag.Debug.logVerbose("Enter getMoreDataForDatesTeams");

        let promises: IPromise<void>[] = [];

        // create multiple requests as there is a date range limit on server-side
        for (let i = 0; i < neededData.length; i++) {
            let neededTimeSlice: ITimeLineRequest = neededData[i];
            if (neededTimeSlice.backlogRowIds && neededTimeSlice.backlogRowIds.length !== 0) {
                Diag.Debug.logInfo("Fetching data - Range: (" + neededTimeSlice.startDate + ", " + neededTimeSlice.endDate + ")");
                promises.push(
                    this._dataProvider.getDataForDatesTeamsFor(neededTimeSlice).then(
                        (viewData: IDeliveryTimeLineViewData) => this._onGetMoreDataForTeamsSucceeded(viewData),
                        (error: TfsError) => this._onGetMoreDataForTeamsFailed(error)));

            }
        }
        return Q.all(promises);
    }

    /**
     * LogInfo the viewport changed payload world parameters.
     * @param {IDeliveryTimeLineStoreData} worldState - The info to log.
     */
    private _logWorldState(worldState: IDeliveryTimeLineStoreData) {
        //if (worldState) {
        //    Diag.Debug.logVerbose("World (" + worldState.worldStartDate + ", " + worldState.worldEndDate + ") Size (" + worldState.worldWidth + ", " + worldState.worldHeight + ") Zoom: " + worldState.zoomLevelInPixelPerDay);
        //    Diag.Debug.logVerbose("Viewport Size (" + worldState.viewportWidth + ", " + worldState.viewportHeight + ") Position (" + worldState.viewportTop + ", " + worldState.viewportLeft + ")");
        //}
    }

    /**
     * Sets the colors provider at the team level to the appropriate teams, and goes and gets the colors if necessary
     * @param viewData The initial data of the view
     */
    public _initializeStateColorsProvider(viewData: IDeliveryTimeLineViewData): void {
        let teams = viewData.teams;
        for (let i = 0; i < teams.length; i++) {
            let team = teams[i];
            if (team.status && team.status.type === TimelineTeamStatusCode.OK) {
                let projectId = team.projectId;
                if (projectId && !team.workItemStateColorsProvider) {
                    let stateColorsProvider: WorkItemStatesColorProvider = WorkItemStatesColorProvider.getDefault();
                    if (stateColorsProvider.isPopulated(projectId)) {
                        // if the colors for this team have been loaded, let it know by giving it it's colors
                        team.workItemStateColorsProvider = stateColorsProvider;
                    }
                    else {
                        // otherwise we need to load the colors
                        Q(stateColorsProvider.beginGetWorkItemStateColor(projectId)).done(() => {
                            // after loading the colors, need to notify the store
                            this._actions.receivedTeamStateColorsProvider.invoke({ projectId: projectId, stateColorsProvider: stateColorsProvider });
                        });
                    }
                }
            }
        }
    }

    /**
     * Create a new business logic object. Mostly for testing.
     * @param {IDeliveryTimeLineStoreData} currentWorldState - current world state.
     */
    public _createBusinessLogic(currentWorldState: IDeliveryTimeLineStoreData): IDeliveryTimeLineBusinessLogic {
        return new DeliveryTimeLineBusinessLogic(currentWorldState);
    }

    /**
     * Updates the plan preferences.
     * @param store {IDeliveryTimeLineStoreData} the current store data
     */
    public _updatePreferences(store: IDeliveryTimeLineStoreData) {
        if (this._preferences && store && store.id) {
            this._preferences.set(store.id, (settings => {
                settings.zoomLevel = store.zoomLevelInPixelPerDay;
                settings.teams = {};
                if (store.teams && store.teams.length > 0) {
                    store.teams.forEach(t => settings.teams[t.key] = { isCollapsed: t.isCollapsed });
                }
            }));
        }
    }

    private _moveItemBetweenIntervals(itemId: number, sourceInterval: IInterval, sourceTeam: ITeam, targetInterval: IInterval, targetTeam: ITeam): void {
        const startTime = Date.now();
        if (this.canMoveItemBetweenIntervals(sourceTeam, targetTeam, sourceInterval, targetInterval)) {
            // Move the item and re-layout.
            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(this._worldStateProvider.getValue());
            let result: IDeliveryTimeLineStoreData = worldUpdater.moveItemBetweenIntervals(itemId, sourceInterval, targetInterval, targetTeam);

            this._actions.viewportChanged.invoke(result);

            // save work item
            let fieldUpdateList: IDictionaryStringTo<string> = {
                [WITConstants.CoreFieldRefNames.IterationPath]: targetInterval.id
            };

            Q(this._itemManager.beginSaveWorkItem(targetTeam.projectId, itemId, fieldUpdateList)).done(
                () => { this._onMoveSucceeded(result.id, startTime); },
                (error: any) => { this._onMoveFailed(result.id, startTime, error); });
        }
    }

    private _reorderItem(itemId: number, interval: IInterval, team: ITeam, newIndex: number, userInitiated: boolean): boolean {
        const startTime = Date.now();
        const currentWorldValue = this._worldStateProvider.getValue();
        // reorder the item on the delivery timeline store
        let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(currentWorldValue);
        let reorderOperation = worldUpdater.moveItemWithinInterval(interval, itemId, newIndex);
        if (reorderOperation) {
            // save using reorder rest api
            Q(this._itemManager.beginReorderWorkItem(team.projectId, team.id, itemId, team.orderField, reorderOperation)).done(
                () => { this._onReorderSucceeded(currentWorldValue.id, startTime, userInitiated); },
                (error: any) => { this._onReorderFailed(currentWorldValue.id, startTime, error, userInitiated); });
            return true;
        }
        return false;
    }

    /*************************************************************************************************
     * Async web callbacks
     *************************************************************************************************/

    /**
     * Initialize the world state to the given view data.
     * [[ This method is only public for testing purposes.]]
     *   This will set the world state (all the view data) to the given view data and measure/layout all the components in preperation for render.
     * @param {IDeliveryTimeLineViewData} viewData - The new view data. This object is modified in place as a result of this method call.
     */
    public _onInitializeStoreSucceeded(timelineId: string, viewData: IDeliveryTimeLineViewData): IPromise<void | any[]> {
        Diag.Debug.logVerbose("Enter _onInitializeStoreSucceeded for timeline id: " + timelineId);

        if (this._worldStateProvider.isDisposed()) {
            return Q.resolve([]);
        }

        let currentWorldState: IDeliveryTimeLineStoreData = this._worldStateProvider.getValue();

        // Set page state - this needs to be done early because other actions on _pageActions will emitChange and re-render the view. Re-render from initial
        // state will re- initialize everything causing an inf loop.
        this._pageActions.setPageLoadingState.invoke(PageLoadingState.WithMinimumData);

        // Extract the viewport attributes and merge them into the viewData. The viewData will replace the store data.
        viewData.viewportLeft = currentWorldState.viewportLeft;
        viewData.viewportTop = currentWorldState.viewportTop;
        viewData.viewportWidth = currentWorldState.viewportWidth;
        viewData.viewportHeight = currentWorldState.viewportHeight;

        // Apply preferences...
        let preferences = this._preferences.get(viewData.id);
        viewData.zoomLevelInPixelPerDay = preferences.zoomLevel;
        viewData.teams.forEach(t => t.isCollapsed = preferences.teams[t.key] ? preferences.teams[t.key].isCollapsed : false);

        // Initialize, layout, and render the view data tree (team -> iteration -> cards).
        let worldUpdater = this._createBusinessLogic(viewData);
        worldUpdater.mergeViewData(viewData);
        let result: IDeliveryTimeLineBusinessLogicResult = worldUpdater.initializeWorld();

        // Load the colors provider
        this._initializeStateColorsProvider(viewData);

        // Give the action listeners (the general timeline store and the work item store) the initialized view data.
        this._actions.initialize.invoke(result.updatedWorld);
        this._itemActions.itemStoreInitialize.invoke(viewData as IItemStoreData);

        let promise: IPromise<void[]>;
        if (result.neededTimeLineData.length > 0) {
            promise = this._getMoreDataForDatesTeams(result.neededTimeLineData);
        } else {
            promise = Q.resolve([]);
        }

        return promise.then(() => {
            this._pageActions.setPageLoadingState.invoke(PageLoadingState.FullyLoaded);
        });
    }

    /**
     * Initialize store failed (failed response from svc).
     * @param {Error} error - Details of the error.
     */
    public _onInitializeStoreFailed(timelineId: string, error: TfsError) {
        Diag.Debug.logVerbose("Enter _onInitializeStoreFailed for timeline id: " + timelineId);
        this._pageActions.setPageLoadingStateWithMessage.invoke(
            new StateChangeParams(PageLoadingState.Fail,
                new Message(
                    MessageBarType.error,
                    error.message,
                    false,
                    {
                        href: getPlansDirectoryUrl(),
                        text: ScaledAgileResources.PlanErrorBannerBackToDirectoryLinkText
                    }
                )
            )
        );
    }

    /**
     * Load more items callback.
     *  Merges the incoming item data into the given team.
     * [[ This method is only public for testing purposes.]]
     * @param team - Team these items belong to.
     * @param interval - Interval within the team these items belong to.
     * @param items - The new items returned from the web call.
     */
    public _onLoadMoreIntervalSucceeded(team: ITeam, interval: IInterval, items: IItems) {
        Diag.Debug.logVerbose("Enter _onLoadMoreIntervalComplete");

        this._onHandleSucceededCallback((currentWorldState) => {
            this._logWorldState(currentWorldState);

            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(currentWorldState);
            worldUpdater.mergeItemData(team, interval, items.cards);

            // Give the action listeners (the general timeline store and the work item store) the new view data.
            this._itemActions.addItemsAction.invoke(items.cards);

            // Call viewportMoved to re-calculate the number and size of objects in the viewport
            let result: IDeliveryTimeLineStoreData = worldUpdater.viewportMoved(0, 0).updatedWorld;

            this._logWorldState(result);
            this._actions.viewportChanged.invoke(result);
        });
    }

    /**
     * Load more items callback for failed web calls.
     * @param error - The error.
     */
    public _onLoadMoreIntervalFailed(error: TfsError) {
        Diag.Debug.logVerbose("Enter _onLoadMoreIntervalFailed");

        this._onHandleFailedCallback(error, (innerError: TfsError) => {
            this._pageActions.setPageLoadingStateWithMessage.invoke(new StateChangeParams(PageLoadingState.Fail,
                new Message(MessageBarType.error, innerError.message)));
        });
    }

    /**
     * Get more team iteration data callback for successful calls.
     *  Merges the incoming team data (iterations in a time range) into the existing world data.
     * [[ This method is only public for testing purposes.]]
     * @param incomingViewData - The new team data returned from the web call.
     */
    public _onGetMoreDataForTeamsSucceeded(incomingViewData: IDeliveryTimeLineViewData) {
        Diag.Debug.logVerbose("Enter _onGetMoreDataForTeamsComplete");

        this._onHandleSucceededCallback((currentWorldState) => {
            this._logWorldState(currentWorldState);

            if (!incomingViewData) {
                return;
            }

            let worldUpdater: IDeliveryTimeLineBusinessLogic = this._createBusinessLogic(currentWorldState);
            worldUpdater.mergeViewData(incomingViewData);
            this._itemActions.updateItemsAction.invoke({
                itemMap: incomingViewData.itemMap,
                updateMode: UpdateMode.FullItemOverride
            });

            // After the data has been added, re-calculate the items in the viewport

            let result: IDeliveryTimeLineStoreData = worldUpdater.viewportMoved(0, 0).updatedWorld;
            // Load the colors provider
            this._initializeStateColorsProvider(incomingViewData);

            this._logWorldState(result);

            // Give the action listeners (the general timeline store and the work item store) the new view data.
            this._actions.viewportChanged.invoke(result);
        });
    }

    /**
     * Get more team iteration data callback for failed calls.
     * @param {Error} error - The error.
     */
    public _onGetMoreDataForTeamsFailed(error: TfsError) {
        Diag.Debug.logVerbose("Enter _onGetMoreDataForTeamsFailed");

        this._onHandleFailedCallback(error, (innerError: TfsError) => {
            this._pageActions.setPageLoadingStateWithMessage.invoke(new StateChangeParams(PageLoadingState.Fail, DeliveryTimelineErrorMapper.mapErrorToMessage(innerError)));
        });
    }

    /**
     * Simple wrapper for handling async web responses. Will not call the handler if the plan has changed.
     * @param method - The actual callback handler.
     */
    public _onHandleSucceededCallback(method: (currentWorldState: IDeliveryTimeLineStoreData) => void) {
        if (this._worldStateProvider.isDisposed()) {
            return;
        }

        let currentWorldState: IDeliveryTimeLineStoreData = this._worldStateProvider.getValue();
        method(currentWorldState);
    }

    /**
     * Simple wrapper for handling failed async web responses. Will not call the handler if the plan has changed.
     * @param {Error} error - The error.
     * @param method - The actual callback handler.
     */
    public _onHandleFailedCallback(error: TfsError, method: (error: TfsError) => void) {
        if (this._worldStateProvider.isDisposed()) {
            return;
        }

        method(error);
    }

    private _onMoveSucceeded(planId: string, startTime: number) {
        this._actions.moveItemBetweenIntervals.invoke({ planId: planId, isSuccessful: true, errorMessage: null, startTime: startTime, userInitiated: true });
    }

    private _onMoveFailed(planId: string, startTime: number, error: any) {
        let errorMessage = VSS.getErrorMessage(error);
        this._actions.moveItemBetweenIntervals.invoke({ planId: planId, isSuccessful: false, errorMessage: errorMessage, startTime: startTime, userInitiated: true });
        this._pageActions.setPageMessage.invoke(new Message(MessageBarType.error, errorMessage));
    }

    private _onReorderSucceeded(planId: string, startTime: number, userInitiated: boolean) {
        this._actions.reorderItemInsideInterval.invoke({ planId: planId, isSuccessful: true, errorMessage: null, startTime: startTime, userInitiated: userInitiated });
    }

    private _onReorderFailed(planId: string, startTime: number, error: any, userInitiated: boolean) {
        let errorMessage = VSS.getErrorMessage(error);
        this._actions.reorderItemInsideInterval.invoke({ planId: planId, isSuccessful: false, errorMessage: errorMessage, startTime: startTime, userInitiated: userInitiated });
        this._pageActions.setPageMessage.invoke(new Message(MessageBarType.error, errorMessage));
    }
}
