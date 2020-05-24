import { Movement } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { IDeliveryTimeLineStoreData, ITimeLineRequest, IInterval, ITeam, IDeliveryTimeLineViewData, TeamFocusType } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import {IItem} from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IReorderOperation } from "Agile/Scripts/Common/Agile";
import { RelativeViewPositioning } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineLayoutUtils";

/**
 * Result of executing a method on the Business Logic.
 */
export interface IDeliveryTimeLineBusinessLogicResult {
    /**
     * The fully updated world.
     */
    updatedWorld: IDeliveryTimeLineStoreData;

    /**
     * Any requests for timeline data. Will not be null/undefined but can be empty.
     */
    neededTimeLineData: ITimeLineRequest[];
}

/**
 * Public methods for the business logic
 */
export interface IDeliveryTimeLineBusinessLogic {
    /**
     * Initialize the delivery time line world data.
     * @param {string} viewId - The id of the view to load.
     * @returns {IDeliveryTimeLineBusinessLogicResult} - The resultant rendered world + any additional data that should be loaded.
     */
    initializeWorld(): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Viewport dimensions changed.
     * @param {number} viewportLeft - New left offset of the viewport.
     * @param {number} viewportWidth - New width of the viewport.
     * @param {number} viewportHeight - New height of the viewport.
     * @returns {IDeliveryTimeLineBusinessLogicResult} - The resultant rendered world + any additional data that should be loaded.
     */
    viewportDimensionsChanged(viewportLeft: number, viewportWidth: number, viewportHeight: number): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Viewport position changed.
     * @param {number} horizontalMovement - Change in position horizontally.
     * @param {number} verticalMovement - Change in position vertically.
     * @returns {IDeliveryTimeLineBusinessLogicResult} - The resultant rendered world + any additional data that should be loaded.
     */
    viewportMoved(horizontalMovement: number, verticalMovement: number): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Set the viewport top position directly.
     * This is intended to be used by the vertical scroll bar to reduce jitter on scroll.
     * @param {number} top - The new viewport top.
     * @returns {IDeliveryTimeLineBusinessLogicResult} - The resultant rendered world + any additional data that should be loaded.
     */
    setViewportTop(top: number): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Get all the intervals for a given team that are within the viewport.
     * @param {ITeam} team - The team.
     * @returns {IInterval[]} - The intervals in the viewport.
     */
    getIntervalsInViewport(team: ITeam): IInterval[];

    /**
     * Re-calculates and refreshes the display of items in the viewport.
     * Intended for changes that update the contents and location of the viewport simultaneously
     * @returns {IDeliveryTimeLineBusinessLogicResult} - The resultant rendered world + any additional data that should be loaded.
     */
    refreshViewport(): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Toggle expand/collapse state of the given team. This should update team positions as well.
     * @param team team whose collapsed state will be toggled
     * @returns {IDeliveryTimeLineStoreData} - The resultant rendered world.
     */
    toggleExpandCollapseTeam(team: ITeam): IDeliveryTimeLineStoreData;

    /**
     * Collapse all the team rows (regardless of its current state)
     * @returns {IDeliveryTimeLineStoreData} - The resultant rendered world.
     */
    collapseAllTeams(): IDeliveryTimeLineStoreData;

    /**
     * Expand all the team rows (regardless of its current state)
     * @returns {IDeliveryTimeLineStoreData} - The resultant rendered world.
     */
    expandAllTeams(): IDeliveryTimeLineStoreData;

    /**
     * Change the zoom level.
     * @param {number} zoomLevel - new level to zoom to (in pixels)
     * @returns {IDeliveryTimeLineBusinessLogicResult} - The resultant rendered world + any additional data that should be loaded.
     */
    changeZoomLevel(zoomLevel: number): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Move item from this interval to the target interval.
     * @param {number} itemId - Item id to be move from this interval
     * @param {IInterval} targetInterval - Target interval to place the item to.
     * @param {ITeam} targetTeam - Target team owning this interval.
     * @returns {IDeliveryTimeLineStoreData} - The resultant rendered world.
     */
    moveItemBetweenIntervals(itemId: number, sourceInterval: IInterval, targetInterval: IInterval, targetTeam: ITeam): IDeliveryTimeLineStoreData;

    /**
     * Move an item to teams and an interval
     * @param viewportChangePayload The world.
     * @param item Item to move
     * @param teamBacklogKeys Keys of team-backlog entries to move to
     * @param iterationPath Id of interval to move to
     * @returns {IDeliveryTimeLineStoreData} - The resultant rendered world.
     */
    moveItemToTeamsAndInterval(item: IItem, teamBacklogKeys: string[], iterationPath: string): IDeliveryTimeLineStoreData;

    /**
     * Move an item to the new position within its interval.
     * @param {IInterval} interval - the interval to move the item.
     * @param {number} itemId - id of the item to be moved.
     * @param {number} newIndex - new index to move to.
     * @returns {IReorderOperation} - The resultant changes of the reorder, which can be used as param for reorder api.
     */
    moveItemWithinInterval(interval: IInterval, itemId: number, newIndex: number): IReorderOperation;

    /**
     * Remove an item from the current plan view
     * @param viewportChangePayload The world.
     * @param id Id of item to remove
     * @returns {IDeliveryTimeLineStoreData} - The resultant rendered world.
     */
    removeItem(id: number): IDeliveryTimeLineStoreData;

    /**
     * Merge the given item data into the team/interval.
     * @param {ITeam} team - The team in which to merge the data.
     * @param {IInterval} interval - The interval in which to merge the data (part of the team).
     * @param {IItem[]} incomingItemsData - The items to merge.
     */
    mergeItemData(team: ITeam, interval: IInterval, incomingItemsData: IItem[]): void;

    /**
     * Merge the given slice of plan data into the current plan.
     * @param {IDeliveryTimeLineViewData} incomingViewData - The incoming slice of plan data.
     */
    mergeViewData(incomingViewData: IDeliveryTimeLineViewData): void;

    /**
     * Move the adjacent object into the viewport and, optionally, flag it get focus.
     * See IDeliveryTimeLineActionsCreator.focusAdjacentObjectToItem
     */
    focusAdjacentObjectToItem(team: ITeam, interval: IInterval, item: IItem, direction: Movement): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Move the adjacent object into the viewport and, optionally, flag it get focus.
     * See IDeliveryTimeLineActionsCreator.focusAdjacentObjectToLoadMore
     */
    focusAdjacentObjectToLoadMore(team: ITeam, interval: IInterval, direction: Movement): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Move the given team into the viewport and, optionally, flag it to get focus.
     * See IDeliveryTimeLineActionsCreator.focusAdjacentObjectToTeam
     */
    focusAdjacentObjectToTeam(team: ITeam, direction: Movement): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Move the adjacent object into the viewport and, optionally, flag it get focus.
     * See IDeliveryTimeLineActionsCreator.focusAdjacentObjectToInterval
     */
    focusAdjacentObjectToInterval(team: ITeam, interval: IInterval, direction: Movement): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Move the given item into the viewport and, optionally, flag it to get focus.
     * See IDeliveryTimeLineActionsCreator.focusItem
     */
    focusItem(team: ITeam, interval: IInterval, item: IItem): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Move the given team into the viewport and flag it to get focus.
     * @param {ITeam} team Team where to set focus to.
     * @param {TeamFocusType} teamFocusType What kind of element we want to set focus to (team toggle or the backlog link).
     */
    focusTeam(team: ITeam, teamFocusType: TeamFocusType): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Set focus to element after load more.
     * @param {ITeam} team - The team for which to invoke load more.
     * @param {IInterval} interval - The interval where the load more belongs to.
     * @param {number} itemToFocusIndex - The index of item in the interval that we should set focus to.
     */
    focusAfterLoadMore(team: ITeam, interval: IInterval, itemToFocusIndex: number): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Set the focus to the calendar right pan button.
     */
    focusRightPanButton(): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Set the focus to the available item to focus on the view.
     */
    focusFirstObject(): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Set the focus to the specified interval.
     */
    focusInterval(team: ITeam, interval: IInterval): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Moves the viewport so that the specified interval is visible, using the given pre-acquired measurements
     */
    moveIntervalIntoView(team: ITeam, interval: IInterval, distanceToEdges: RelativeViewPositioning): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Set the focus to the specified interval's "add new item" menu
     */
    focusAddNewItemMenu(team: ITeam, interval: IInterval): IDeliveryTimeLineBusinessLogicResult;


    /**
     * Set the focus to the specified interval's inline add card
     */
    focusInlineAddCard(team: ITeam, interval: IInterval): IDeliveryTimeLineBusinessLogicResult;

    /**
     * Clears stored focus state. For when user focus leaves the delivery timeline.
     */
    clearFocus(): IDeliveryTimeLineBusinessLogicResult;
}
