import { IDeliveryTimeLineBusinessLogic, IDeliveryTimeLineBusinessLogicResult } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineBusinessLogicInterfaces";
import {
    IDeliveryTimeLineStoreData, ITeamBacklog, ITimeLineRequest, IInterval, ITeam,
    IDeliveryTimeLineViewData, ICalendarMonth, IDateSet,
    HorizontalDirection,
    FocusElement, TeamFocusType, CardFocusIdentifier, LoadMoreFocusIdentifier, ExpandCollapseAllFocusIdentifier, TeamAnchorFocusIdentifier, PanFocusIdentifier, IntervalFocusIdentifier, BacklogFocusIdentifier
} from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { Movement } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { CalendarMonth, TimeLineRequest, TeamBacklog } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineImplementations";
import { IItem } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { DateManipulationFunctions } from "ScaledAgile/Scripts/Shared/Utils/DateManipulationFunctions";
import { CardUtils } from "ScaledAgile/Scripts/Shared/Card/Utils/CardUtils";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { IntervalHelperFunctions } from "ScaledAgile/Scripts/Shared/Utils/IntervalHelperFunctions";
import { DeliveryTimelineLayoutUtils, RelativeViewPositioning } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineLayoutUtils";
import { DeliveryTimelineFocusUtils } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineFocusUtils";
import { ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { IReorderOperation } from "Agile/Scripts/Common/Agile";
import { TimelineIterationStatusCode, TimelineTeamStatusCode } from "TFS/Work/Contracts";

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import moment = require("Presentation/Scripts/moment");
import { CardComponentConstants } from "ScaledAgile/Scripts/Shared/Card/Models/CardConstants";

/**
 * Simple IDeliveryTimeLineBusinessLogicResult impl.
 */
export class DeliveryTimeLineBusinessLogicResult implements IDeliveryTimeLineBusinessLogicResult {
    public updatedWorld: IDeliveryTimeLineStoreData;
    public neededTimeLineData: ITimeLineRequest[];

    constructor(updatedWorld: IDeliveryTimeLineStoreData, neededTimeLineData: ITimeLineRequest[]) {
        this.updatedWorld = updatedWorld;

        if (!neededTimeLineData) {
            this.neededTimeLineData = [];
        } else {
            this.neededTimeLineData = neededTimeLineData;
        }
    }
}

/**
 * Handle all logic about time line.
 */
export class DeliveryTimeLineBusinessLogic implements IDeliveryTimeLineBusinessLogic {
    private _worldState: IDeliveryTimeLineStoreData;
    private _neededData: ITimeLineRequest[];

    // maxDateRangeInDays = DeliveryTimelineSetting.MaxDateRangeInDays (defined on server) - 1. We should read this value from server (not in the current payload)
    // This value subtract 1 from the server value due to our date calculation using Moment, and it does not account for day light saving on add or diff operations.
    // Hence when there is no day light saving in the requested date range, it will request for 62 days.
    // When there is day light saving in the requested date range, it will request for 63 days reaching the server limit.
    public static maxDateRangeInDays = 62;

    /**
     * Threshold to know when to request more data.
     * About half of the maxDateRangsInDays
     */
    public static requestMoreDataDaysThreshold = 32;

    public constructor(worldState: IDeliveryTimeLineStoreData) {
        if (!worldState) {
            throw new Error("worldState must be defined");
        }
        if (worldState.zoomLevelInPixelPerDay <= 0) {
            throw new Error("zoomLevelInPixelPerDay must be positive");
        }

        this._neededData = [] as ITimeLineRequest[];
        this._worldState = worldState;
    }

    /*************************************************************************************************
     * Public interface methods
     *************************************************************************************************/

    /**
     * See IDeliveryTimeLineBusinessLogic.initializeWorld.
     */
    public initializeWorld(): IDeliveryTimeLineBusinessLogicResult {
        // Measure the world (height will be set after measuring teams).
        this._worldState.worldWidth = this._getPixel(this._worldState.worldEndDate);

        // Initialize the maximum number of items to display.
        this._initializeMaxNumberOfCardsToDisplay();

        this._handleViewportOutsideOfWorld();
        var result = this._updateWorldLayout();
        this.focusFirstObject();
        return result;
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.viewportDimensionsChanged.
     */
    public viewportDimensionsChanged(viewportLeft: number, viewportWidth: number, viewportHeight: number): IDeliveryTimeLineBusinessLogicResult {
        // If there is no viewport change just return.
        if (this._worldState.viewportLeft === viewportLeft && this._worldState.viewportWidth === viewportWidth && this._worldState.viewportHeight === viewportHeight) {
            return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
        }

        // Update the viewport bounds.
        this._worldState.viewportLeft = viewportLeft;
        this._worldState.viewportWidth = viewportWidth;
        this._worldState.viewportHeight = viewportHeight;

        this._handleViewportOutsideOfWorld();
        return this._updateWorldLayout();
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.viewportMoved.
     */
    public viewportMoved(horizontalMovement: number, verticalMovement: number): IDeliveryTimeLineBusinessLogicResult {
        // Update left - we will calculate if we need more data to display the new left position below.
        this._worldState.viewportLeft += horizontalMovement;
        // Clamp the viewport position to the top and bottom of the plan.
        this._worldState.viewportTop = Math.max(0, Math.min(this._worldState.viewportTop + verticalMovement, this._worldState.worldHeight - this._worldState.viewportHeight));

        // Re-layout the world.
        this._handleViewportOutsideOfWorld();
        return this._updateWorldLayout();
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.setViewportTop.
     */
    public setViewportTop(top: number): IDeliveryTimeLineBusinessLogicResult {
        this._worldState.viewportTop = Math.max(0, Math.min(top, this._worldState.worldHeight - this._worldState.viewportHeight));
        return this._updateWorldLayout();
    }

    /**
     * See IDeliveryTimelineBusinessLogic.getIntervalsInViewport.
     */
    public getIntervalsInViewport(team: ITeam): IInterval[] {
        if (!team) {
            throw new Error("team must be defined");
        }

        // Load more does not change the viewport or layout/size of any items so no need to re-layout the world.
        // Intervals are all up to date already. Just use their isInViewport property.
        if (team.intervals) {
            return team.intervals.filter(x => x.isInViewport);
        } else {
            return [];
        }
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.refreshViewport
     */
    public refreshViewport(): IDeliveryTimeLineBusinessLogicResult {
        // re-calculate the size of the viewport items
        this._updateWorldLayout();

        // update the contents displayed in the viewport
        const result = this.viewportMoved(0, 0);
        return result;
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.toggleExpandCollapseTeam.
     */
    public toggleExpandCollapseTeam(team: ITeam): IDeliveryTimeLineStoreData {
        // toggle the collapsed state of the team
        team.isCollapsed = !team.isCollapsed;
        // re-calculate and reset the viewport so we aren't looking outside of the world
        const result = this.refreshViewport();
        return result.updatedWorld;
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.collapseAllTeams.
     */
    public collapseAllTeams(): IDeliveryTimeLineStoreData {
        for (let i = 0, len = this._worldState.teams.length; i < len; i++) {
            this._worldState.teams[i].isCollapsed = true;
        }

        // Force focus to move to the expand/collapse all button - this is mostly because, if the user was focused on a card, their focus would be lost.
        DeliveryTimelineFocusUtils.setCurrentExpandCollapseAllFocusIdentifier(this._worldState, {} as ExpandCollapseAllFocusIdentifier);

        // re-calculate and reset the viewport so we aren't looking outside of the world
        const result = this.refreshViewport();
        return result.updatedWorld;
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.expandAllTeams.
     */
    public expandAllTeams(): IDeliveryTimeLineStoreData {
        for (let i = 0, len = this._worldState.teams.length; i < len; i++) {
            this._worldState.teams[i].isCollapsed = false;
        }

        // Force focus to move to the expand/collapse all button - this is mostly so we don't need to remember where the user's focus is and attempt to reapply it.
        DeliveryTimelineFocusUtils.setCurrentExpandCollapseAllFocusIdentifier(this._worldState, {} as ExpandCollapseAllFocusIdentifier);

        return this._updateWorldLayout().updatedWorld;
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.changeZoomLevel.
     */
    public changeZoomLevel(zoomLevel: number): IDeliveryTimeLineBusinessLogicResult {
        if (zoomLevel < 0) {
            throw new Error("zoomLevel must be positive");
        }

        // Update the viewport left position to the new world. Viewport width (or top/height) doesn't change.
        this._worldState.viewportLeft += this._getLeftShift(zoomLevel, this._worldState.zoomLevelInPixelPerDay, this._worldState.viewportLeft, this._worldState.viewportWidth);

        // Set the zoom level and recalculate the world width (depends on the zoom level)
        this._worldState.zoomLevelInPixelPerDay = zoomLevel;
        this._worldState.worldWidth = this._getPixel(this._worldState.worldEndDate);

        this._handleViewportOutsideOfWorld();
        return this._updateWorldLayout();
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.moveItemBetweenIntervals.
     */
    public moveItemBetweenIntervals(itemId: number, sourceInterval: IInterval, targetInterval: IInterval, targetTeam: ITeam): IDeliveryTimeLineStoreData {
        // move item
        const item = sourceInterval.moveItem(itemId, targetInterval, targetTeam.orderField);

        // Adjust the target team max # of items to display to allow this item to be shown.
        if (targetInterval.items) {
            targetTeam.setMaxNumberOfCardsToDisplay(targetInterval.items.length);
        }

        const result = this._updateWorldLayout();

        // Focus to the moved item.
        if (item) {
            this.focusItem(targetTeam, targetInterval, item);
        }

        return result.updatedWorld;
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.moveItemToTeamsAndInterval.
     */
    public moveItemToTeamsAndInterval(item: IItem, teamBacklogKeys: string[], iterationPath: string): IDeliveryTimeLineStoreData {
        let teams = this._worldState.teams;

        // First, remove given item from every team/interval it might be in
        this._removeItemFromAllTeams(teams, item.id);

        // Then, add item to all new teams + intervals
        let matchingTeams = teams.filter(t => Utils_Array.contains(teamBacklogKeys, t.key, Utils_String.ignoreCaseComparer));
        for (let team of matchingTeams) {
            // Try to find interval for team. Since it might not be in view at the moment, ignore if not found
            let interval = Utils_Array.first(team.intervals, i => Utils_String.equals(i.id, iterationPath, true));
            if (interval) {
                if (interval.hasInlineAddItem) {
                    // If the interval has inline added item place holder, place the card on the top and remove the placeholder.
                    interval.addItemOnTop(item);
                    interval.hasInlineAddItem = false;
                }
                else {
                    // This case happen when user trying to add item through "New work item" from the work hub.
                    interval.addItemByOrderField(item, team.orderField);
                }
                if (interval.items) {
                    team.setMaxNumberOfCardsToDisplay(interval.items.length);
                }
            }
        }

        return this._updateWorldLayout().updatedWorld;
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.moveItemWithinInterval.
     */
    public moveItemWithinInterval(interval: IInterval, itemId: number, newIndex: number): IReorderOperation {
        const result = interval.reorderItem(itemId, newIndex);
        if (result) {
            // Need to re-layout the card.
            this._updateWorldLayout();
        }
        return result;
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.removeItem.
     */
    public removeItem(id: number): IDeliveryTimeLineStoreData {
        this._removeItemFromAllTeams(this._worldState.teams, id);

        return this._updateWorldLayout().updatedWorld;
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.mergeItemData.
     */
    public mergeItemData(team: ITeam, interval: IInterval, incomingItemsData: IItem[]): void {
        // Merge the items into the given interval.
        let incomingItemIds: number[] = [];
        incomingItemsData.forEach((card: IItem) => {
            interval.items.push(card);
            incomingItemIds.push(card.id);
        });

        // Remove the new items from the unpaged items.
        interval.unpagedItems = interval.unpagedItems.filter((item) => !Utils_Array.contains(incomingItemIds, item.id));

        // Update the max number of cards to display to the # of items... this will expand the interval to max height.
        if (interval.items) {
            team.setMaxNumberOfCardsToDisplay(interval.items.length);
        }
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.mergeViewData.
     */
    public mergeViewData(incomingViewData: IDeliveryTimeLineViewData): void {
        // Merge the incoming teams into the existing world date.
        if (incomingViewData && incomingViewData.teams) {
            this._worldState.teams.forEach((existingTeam: ITeam) => {
                incomingViewData.teams.forEach((newTeamData: ITeam) => {
                    if (newTeamData.key === existingTeam.key) {
                        existingTeam.intervals = IntervalHelperFunctions.mergeIntervals(newTeamData.intervals, existingTeam.intervals);
                    }
                });
            });
        }
    }

    public focusAdjacentObjectToInterval(team: ITeam, interval: IInterval, direction: Movement): IDeliveryTimeLineBusinessLogicResult {
        if (direction === Movement.Left) {
            // Move to the previous interval
            const prevNonEmptyInterval: IInterval = this._findPreviousFocusableInterval(team, interval);
            if (prevNonEmptyInterval) {
                return this.focusInterval(team, prevNonEmptyInterval);
            }
        }
        else if (direction === Movement.Right) {
            // Move to the first displayed card in the next non-empty interval.
            const nextNonEmptyInterval: IInterval = this._findNextFocusableInterval(team, interval);
            if (nextNonEmptyInterval) {
                return this.focusInterval(team, nextNonEmptyInterval);
            }
        }
        else if (direction === Movement.Up) {
            const numberOfHiddenCards: number = interval.unpagedItems.length + interval.items.length - IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(team, interval);
            if (numberOfHiddenCards > 0) {
                return this._focusLoadMore(team, interval);
            }
            else if (interval.items.length > 0) {
                return this.focusItem(team, interval, interval.items[interval.items.length - 1]);
            }
        }
        else if (direction === Movement.Down) {
            if (interval.items.length > 0) {
                return this.focusItem(team, interval, interval.items[0]);
            }
        }

        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.focusAdjacentObjectToLoadMore.
     */
    public focusAdjacentObjectToLoadMore(team: ITeam, interval: IInterval, direction: Movement): IDeliveryTimeLineBusinessLogicResult {
        if (direction === Movement.Up) {
            // If there are any displayed cards then move to the last card, otherwise select the interval itself
            const numberOfDisplayedCards = IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(team, interval);
            if (numberOfDisplayedCards > 0) {
                this.focusItem(team, interval, interval.items[numberOfDisplayedCards - 1]);
                return this._updateWorldLayout();
            }
            else {
                return this.focusInterval(team, interval);
            }
        }
        else if (direction === Movement.Down) {
            return this.focusInterval(team, interval);
        }
        else if (direction === Movement.Left) {
            // Focus on the previous interval
            const prevNonEmptyInterval: IInterval = this._findPreviousFocusableInterval(team, interval);
            if (prevNonEmptyInterval) {
                return this.focusInterval(team, prevNonEmptyInterval);
            }
        }
        else if (direction === Movement.Right) {
            // Focus on the next interval
            const nextNonEmptyInterval: IInterval = this._findNextFocusableInterval(team, interval);
            if (nextNonEmptyInterval) {
                return this.focusInterval(team, nextNonEmptyInterval);
            }
        }

        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.focusAdjacentObjectToItem
     */
    public focusAdjacentObjectToItem(team: ITeam, interval: IInterval, relativeItem: IItem, direction: Movement): IDeliveryTimeLineBusinessLogicResult {
        // Find the adjacent item.
        if (direction === Movement.Up) {
            const itemPosition = interval.items.indexOf(relativeItem);
            // Move to the next item above this unless we are at the top of the iteration, then move to the iteration itself
            if (itemPosition > 0) {
                return this.focusItem(team, interval, interval.items[itemPosition - 1]);
            }
            else {
                return this.focusInterval(team, interval);
            }
        }
        else if (direction === Movement.Down) {
            const itemPosition = interval.items.indexOf(relativeItem);
            // Move to the next item below this item unless we are at the end of the iteration then don't move anywhere.
            if (itemPosition >= 0) {
                // If this is the last item displayed and there are hidden items then move to the "load more" button.
                const numberOfDisplayedCards = IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(team, interval);
                if (itemPosition === numberOfDisplayedCards - 1) {
                    const numberOfHiddenCards: number = interval.unpagedItems.length + interval.items.length - numberOfDisplayedCards;
                    if (numberOfHiddenCards > 0) {
                        return this._focusLoadMore(team, interval);
                    }
                    else {
                        return this.focusInterval(team, interval);
                    }
                }
                else {
                    return this.focusItem(team, interval, interval.items[itemPosition + 1]);
                }
            }
        }
        else if (direction === Movement.Left) {
            // Move to the next iteration within this team to the left of this one that has cards in it.
            const prevNonEmptyInterval: IInterval = this._findPreviousFocusableInterval(team, interval);

            if (prevNonEmptyInterval) {
                return this.focusInterval(team, prevNonEmptyInterval);
            }
        }
        else if (direction === Movement.Right) {
            // Move to the next iteration within this team to the right of this one that has cards in it.
            let nextNonEmptyInterval: IInterval = this._findNextFocusableInterval(team, interval);

            if (nextNonEmptyInterval) {
                return this.focusInterval(team, nextNonEmptyInterval);
            }
        }

        // If we are here leave things unchanged.
        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    public focusAdjacentObjectToTeam(team: ITeam, direction: Movement): IDeliveryTimeLineBusinessLogicResult {
        if (direction === Movement.None || direction === Movement.Left) {
            return;
        }

        if (direction === Movement.Right) {
            return this._focusOnFirstIntervalInTeam(team);
        }

        const teams = this._worldState.teams;
        const teamIndex = teams.indexOf(team);
        const adjacentTeamIndex = direction === Movement.Down ? teamIndex + 1 : teamIndex - 1;

        if (adjacentTeamIndex >= 0 && adjacentTeamIndex < teams.length) {
            const teamfocusKind = teams[adjacentTeamIndex].hasError() ? TeamFocusType.BacklogLink : TeamFocusType.TeamToggle;
            return this.focusTeam(teams[adjacentTeamIndex], teamfocusKind);
        }

        // If we are here leave things unchanged.
        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    public focusTeam(team: ITeam, teamFocusKind: TeamFocusType): IDeliveryTimeLineBusinessLogicResult {
        const distanceToEdges = DeliveryTimelineLayoutUtils.getOffsetFromViewForTeam(this._worldState, team);

        if (teamFocusKind === TeamFocusType.BacklogLink) {
            DeliveryTimelineFocusUtils.setCurrentBacklogFocusIdentifier(this._worldState, { teamKey: team.key } as BacklogFocusIdentifier);
        }
        else if (teamFocusKind === TeamFocusType.TeamToggle) {
            DeliveryTimelineFocusUtils.setCurrentTeamFocusIdentifier(this._worldState, { teamKey: team.key } as TeamAnchorFocusIdentifier);
        }

        // Will only move vertically, teams are always visible horizontally so no horizontal movement is needed there.
        // We want to move so the entire team is in view so the user can use the right arrow to move to the 1st item - however, if the team is taller than the view
        // then we want to put the top of the teat at the top of the view so the link is visible.

        let verticalMovement = 0;

        // Vertical
        if (distanceToEdges.topToViewTop < 0 || team.height > this._worldState.viewportHeight) {
            verticalMovement = distanceToEdges.topToViewTop;
        }
        else if (distanceToEdges.bottomToViewBottom > 0) {
            verticalMovement = distanceToEdges.bottomToViewBottom + DeliveryTimeLineViewConstants.cardMargin;
        }

        return this.viewportMoved(0, verticalMovement);
    }

    /**
     * See IDeliveryTimeLineBusinessLogic.focusItem
     */
    public focusItem(team: ITeam, interval: IInterval, item: IItem): IDeliveryTimeLineBusinessLogicResult {
        const distanceToEdges = DeliveryTimelineLayoutUtils.getOffsetFromViewForItem(this._worldState, interval, item);

        DeliveryTimelineFocusUtils.setCurrentItemFocusIdentifier(this._worldState, { itemId: item.id, teamKey: team.key } as CardFocusIdentifier);

        // If this is the top item then move the interval header into the viewport also.
        if (interval.items[0] === item) {
            distanceToEdges.topToViewTop -= (DeliveryTimeLineViewConstants.intervalHeaderHeight + 2 * DeliveryTimeLineViewConstants.intervalPadding);
        }

        return this._moveToShowItemWithRelativePositioning(distanceToEdges);
    }

    public focusFirstObject(): DeliveryTimeLineBusinessLogicResult {
        if (this._worldState.teams && this._worldState.teams.length > 0) {
            for (let i = 0, len = this._worldState.teams.length; i < len; i++) {
                const team = this._worldState.teams[i];
                if ((team.top >= this._worldState.viewportTop) && !team.isCollapsed) {
                    // Bit of a hack but, if the focus element changes then we know we have found something to focus on.
                    const focusResult = this._focusOnFirstIntervalInTeam(team);
                    if (focusResult.updatedWorld.focusElement) {
                        return focusResult;
                    }
                }
            }

            // There are teams but nothing was found in those teams to focus on. Switch focus to the 1st team.
            const team = this._worldState.teams[0];
            const teamFocusType = team.hasError() ? TeamFocusType.BacklogLink : TeamFocusType.TeamToggle;
            return this.focusTeam(this._worldState.teams[0], teamFocusType);
        }

        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    private _focusOnFirstIntervalInTeam(team: ITeam): IDeliveryTimeLineBusinessLogicResult {
        // Look through intervals until we find one with something that is in the view.
        if (team.intervals && !team.isCollapsed) {
            const viewLeft = this._worldState.viewportLeft + DeliveryTimeLineViewConstants.teamSidebarWidth;
            const viewRight = this._worldState.viewportLeft + this._worldState.viewportWidth;
            for (let i = 0, len = team.intervals.length; i < len; ++i) {
                const interval = team.intervals[i];
                if (interval.leftPosition >= viewLeft) {
                    return this.focusInterval(team, interval);
                }
                else if (interval.leftPosition + interval.width > viewRight) {
                    // intervals are ordered by date so past this we won't find any more intervals in the view.
                    break;
                }
            }
        }

        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    public focusAfterLoadMore(team: ITeam, interval: IInterval, itemToFocusIndex: number): IDeliveryTimeLineBusinessLogicResult {
        if (itemToFocusIndex >= 0) {
            const itemToFocus = interval.items[itemToFocusIndex];
            return this.focusItem(team, interval, itemToFocus);
        }
        const teamFocusType = team.hasError() ? TeamFocusType.BacklogLink : TeamFocusType.TeamToggle;
        // No items - switch to focus on the team.
        return this.focusTeam(team, teamFocusType);
    }

    public focusRightPanButton(): IDeliveryTimeLineBusinessLogicResult {
        DeliveryTimelineFocusUtils.setCurrentPanFocusIdentifier(this._worldState, { direction: HorizontalDirection.Right } as PanFocusIdentifier);
        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    public focusInterval(team: ITeam, interval: IInterval): IDeliveryTimeLineBusinessLogicResult {
        const distanceToEdges = DeliveryTimelineLayoutUtils.getOffsetFromViewForInterval(this._worldState, team, interval);

        DeliveryTimelineFocusUtils.setCurrentIntervalFocusIdentifier(this._worldState, { teamKey: team.key, intervalId: interval.id } as IntervalFocusIdentifier);

        return this.moveIntervalIntoView(team, interval, distanceToEdges) || new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    public moveIntervalIntoView(team: ITeam, interval: IInterval, distanceToEdges: RelativeViewPositioning): IDeliveryTimeLineBusinessLogicResult {
        const horizontalMovement = this._getHorizontalShiftToFocusInterval(team, interval, distanceToEdges);
        const verticalMovement = this._getVerticalShiftToFocusInterval(team, interval, distanceToEdges);

        if (horizontalMovement !== 0 || verticalMovement !== 0) {
            return this.viewportMoved(horizontalMovement, verticalMovement);
        }

        return null;
    }

    public focusAddNewItemMenu(team: ITeam, interval: IInterval): IDeliveryTimeLineBusinessLogicResult {
        const distanceToEdges = DeliveryTimelineLayoutUtils.getOffsetFromViewForAddNewItemMenu(this._worldState, team, interval);

        DeliveryTimelineFocusUtils.setCurrentAddNewItemFocusIdentifier(this._worldState, { teamKey: team.key, intervalId: interval.id });

        return this._moveToShowItemWithRelativePositioning(distanceToEdges);
    }

    public focusInlineAddCard(team: ITeam, interval: IInterval): IDeliveryTimeLineBusinessLogicResult {
        const distanceToEdges = DeliveryTimelineLayoutUtils.getOffsetFromViewForInlineAddCard(this._worldState, team, interval);

        DeliveryTimelineFocusUtils.setCurrentInlineAddCardFocusIdentifier(this._worldState, { teamKey: team.key, intervalId: interval.id });

        return this._moveToShowItemWithRelativePositioning(distanceToEdges);
    }

    public clearFocus(): IDeliveryTimeLineBusinessLogicResult {
        DeliveryTimelineFocusUtils.clearCurrentFocusIdentifier(this._worldState);

        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    /*************************************************************************************************
     * Private methods (or public for testing )
     *************************************************************************************************/

    /**
     * Get the number of pixel that need to be reach before we get more data
     * @returns {number} Pixels 
     */
    public _getRequestMorePixelThreshold(): number {
        return this._worldState.zoomLevelInPixelPerDay * DeliveryTimeLineBusinessLogic.requestMoreDataDaysThreshold;
    }

    /**
     * When the viewport is outside the world create requests for more data and redefine the world to include the viewport.
     */
    public _handleViewportOutsideOfWorld() {
        // Note: Moving vertically we don't need to page in more data and world layout cannot change so we don't need to recalculate any of that here.
        let requestMorePixelThreshold: number = this._getRequestMorePixelThreshold();

        // If needed handle the viewport being to the left of the world.
        if (this._worldState.viewportLeft < requestMorePixelThreshold) {
            this._handleViewportLeftSide(this._worldState.viewportLeft, requestMorePixelThreshold);
        }

        // If needed handle the viewport being to the right of the world.
        let viewportRight = this._worldState.viewportLeft + this._worldState.viewportWidth;
        if (viewportRight > (this._worldState.worldWidth - requestMorePixelThreshold)) {
            this._handleViewportRightSide(viewportRight, requestMorePixelThreshold);
        }
    }

    /**
     * Handle the outside world for the left side
     * @param {number} viewportLeft - The actual view port left
     * @param {number} requestMorePixelThresholdInDays - Threshold in day to request more data
     */
    public _handleViewportLeftSide(viewportLeft: number, requestMorePixelThresholdInDays: number): void {
        let requestEndDate = moment(this._worldState.worldStartDate).add(-1, "days").toDate();
        let requestStartDate = this._getDate(viewportLeft - requestMorePixelThresholdInDays);

        let leftDates = DeliveryTimeLineBusinessLogic._getAdjustedDateForLeftMovement(requestStartDate, requestEndDate);
        let leftArrayTimeLines = this._createTimelineRequestsForAllTeams(leftDates);
        this._neededData.push(...leftArrayTimeLines); // Add the needed data for this timespan.

        // Determine how large the new world will be and then recalculate the viewport left based on the difference between new and old.
        this._worldState.worldStartDate = leftDates.start; // Must be set before using getPixel which rely on the worldStartDate to find any other date's pixel
        let newWorldWidth = this._getPixel(this._worldState.worldEndDate);
        this._worldState.viewportLeft = (newWorldWidth - this._worldState.worldWidth) + viewportLeft;
        this._worldState.worldWidth = newWorldWidth;
    }

    /**
     * Handle the outside world for the right side
     * @param {number} viewportLeft - The actual view port right
     * @param {number} requestMorePixelThresholdInDays - Threshold in day to request more data
     */
    public _handleViewportRightSide(viewportRight: number, requestMorePixelThresholdInDays: number): void {
        let requestStartDate = moment(this._worldState.worldEndDate).add(1, "days").toDate(); // Request 1 day after the current end date (since we load inclusively) to new scrollOffset date.
        let requestEndDate = this._getDate(viewportRight + requestMorePixelThresholdInDays);

        let rightDates = DeliveryTimeLineBusinessLogic._getAdjustedDateForRightMovement(requestStartDate, requestEndDate);
        let rightArrayTimeLines = this._createTimelineRequestsForAllTeams(rightDates);
        this._neededData.push(...rightArrayTimeLines);

        this._worldState.worldEndDate = rightDates.end;
        this._worldState.worldWidth = this._getPixel(this._worldState.worldEndDate);
    }

    /**
     * Get the date for a left movement with the optimization of always getting the most of the request.
     * For example, if you move left and you need 11 days and we request in chunk of 10 days, we will request for
     * 20 days instead of 11. This way we do 2 full requests.
     * @param {Date} startDate - Requested start date
     * @param {Date} endDate - Requested end date
     * @return {IDateSet} - A start and end date optimized for left movement. Cannot be null.
     */
    public static _getAdjustedDateForLeftMovement(startDate: Date, endDate: Date): IDateSet {
        // Request at least the max interval chunk. 
        let nextIntervalStartDate = moment(endDate).add(-DeliveryTimeLineBusinessLogic.maxDateRangeInDays, "days").toDate();
        if (nextIntervalStartDate < startDate) {
            startDate = nextIntervalStartDate;
        }

        //Make sure we request the maximum of days possible (the max allowed per request)
        let numberOfDaysRequested = moment(endDate).diff(moment(startDate), "days");
        let remaining = numberOfDaysRequested % DeliveryTimeLineBusinessLogic.maxDateRangeInDays;
        if (remaining !== 0) {
            let toAddMore = DeliveryTimeLineBusinessLogic.maxDateRangeInDays - remaining;
            startDate = moment(startDate).add(-1 * toAddMore, "days").toDate();
        }

        return { start: startDate, end: endDate };
    }

    /**
     * Get the date for a right movement with the optimization of always getting the most of the request.
     * For example, if you move right and you need 11 days and we request in chunk of 10 days, we will request for
     * 20 days instead of 11. This way we do 2 full requests.
     * @param {Date} startDate - Requested start date
     * @param {Date} endDate - Requested end date
     * @return {IDateSet} - A start and end date optimized for right movement. Cannot be null.
     */
    public static _getAdjustedDateForRightMovement(startDate: Date, endDate: Date): IDateSet {
        // Request at least the max interval chunk.
        let nextIntervalEndDate = moment(startDate).add(DeliveryTimeLineBusinessLogic.maxDateRangeInDays, "days").toDate();
        if (nextIntervalEndDate > endDate) {
            endDate = nextIntervalEndDate;
        }

        //Make sure we request the maximum of days possible (the max allowed per request)
        let numberOfDaysRequested = moment(endDate).diff(moment(startDate), "days");
        let remaining = numberOfDaysRequested % DeliveryTimeLineBusinessLogic.maxDateRangeInDays;
        if (remaining !== 0) {
            let toAddMore = DeliveryTimeLineBusinessLogic.maxDateRangeInDays - remaining;
            endDate = moment(endDate).add(toAddMore, "days").toDate();
        }

        return { start: startDate, end: endDate };
    }


    /**
     * Create a number of timeline requests to accomodate the given date range.
     * @return {ITimeLineRequest[]} Cannot return null
     */
    public _createTimelineRequestsForAllTeams(dates: IDateSet): ITimeLineRequest[] {
        let requests: ITimeLineRequest[] = [];

        if (this._worldState.teams) {
            let backlogRowIds: ITeamBacklog[] = this._worldState.teams.map((team: ITeam) => { return new TeamBacklog(team.id, team.backlog.categoryReferenceName); });

            let dateIndex = dates.start;
            while (dateIndex <= dates.end) {
                // End date is max date range ahead of start date or the given end date... whichever is smaller.
                let nextEndDate: Date = moment(dateIndex).add(DeliveryTimeLineBusinessLogic.maxDateRangeInDays, "days").toDate();
                if (nextEndDate > dates.end) {
                    nextEndDate = dates.end;
                }

                requests.push(new TimeLineRequest(this._worldState.id, this._worldState.revision, backlogRowIds, dateIndex, nextEndDate));
                dateIndex = moment(nextEndDate).add(1, "days").toDate();
            }
        }

        return requests;
    }

    /**
     * Get the calculus result on how many pixel we need to shift the viewport left to be center from a new zoom level
     * @param {number} newZoomLevel - New zoom level
     * @param {number} oldZoomLevel - Existing zoom level
     * @param {number} currentViewportLeft - Existing viewport left position in pixel
     * @param {number} currentViewportWidth - Existing viewport width
     * @return {number} Number of pixel to change the viewportleft. This can be negative or positive.
     */
    public _getLeftShift(newZoomLevel: number, oldZoomLevel: number, currentViewportLeft: number, currentViewportWidth: number): number {
        let currentCenterOfViewport: number = currentViewportLeft + (currentViewportWidth / 2);
        let scaleFactor: number = newZoomLevel / oldZoomLevel;
        let newCenterOfViewport: number = currentCenterOfViewport * scaleFactor;
        let leftShift: number = Math.floor(newCenterOfViewport - currentCenterOfViewport);
        return leftShift;
    }

    /**
    * Get the height of a collapsed team
    * @return Number of pixel that represent the height
    */
    public _getTeamHeightCollapsed(): number {
        return DeliveryTimeLineViewConstants.intervalHeaderHeight
            + DeliveryTimeLineViewConstants.intervalSummaryHeight
            + 2 * DeliveryTimeLineViewConstants.intervalPadding // Padding top and bottom of the interval container
            + DeliveryTimeLineViewConstants.intervalPadding;    // Space between the header and the number of items
    }

    /**
     * Get the height of the team row if it was uncollapsed.
     * @param {team} team - team to set the height
     * @param {ICardRenderingOptions} cardRenderingOptions - card rendering options
     * @return {number} - Team height in pixel
     */
    public _getTeamHeightUncollapsed(team: ITeam, cardRenderingOptions: ICardRenderingOptions): number {
        // Height is MAX(collapsedHeight, MAX(interval_height)).
        let teamHeight = this._getTeamHeightCollapsed();
        team.intervals.forEach((interval: IInterval) => {
            let intervalHeight = this._getIntervalHeightAndSetItemsHeight(interval, IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(team, interval), cardRenderingOptions);
            if (intervalHeight > teamHeight) {
                teamHeight = intervalHeight;
            }
        });
        return teamHeight;
    }

    /**
     * Calculate the height of the interval and sets items height
     * @param {IInterval} interval - The interval to get the height
     * @param {number} maxNumberOfCardsToDisplay - The maximum number of cards that will be displayed. This value should be [0, interval.items.length].
     * @param {ICardRenderingOptions} cardRenderingOptions - card rendering options
     * @return {number} - Height in pixel of the interval.
     */
    public _getIntervalHeightAndSetItemsHeight(interval: IInterval, maxNumberOfCardsToDisplay: number, cardRenderingOptions: ICardRenderingOptions): number {
        let cardsHeight = 0;

        if (interval.hasInlineAddItem) {
            cardsHeight += CardUtils.getCardHeight(null, null, cardRenderingOptions) + DeliveryTimeLineViewConstants.cardMargin;
        }

        if (interval.items) {
            let cardWidth = interval.width - (DeliveryTimeLineViewConstants.intervalPadding * 2);
            let visibleItems = interval.getVisibleItems();
            let count = 0;
            for (let i = 0; i < visibleItems.length && count < maxNumberOfCardsToDisplay; i++) {
                let item: IItem = visibleItems[i];
                item.height = CardUtils.getCardHeight(item, cardWidth, cardRenderingOptions);
                cardsHeight += item.height + DeliveryTimeLineViewConstants.cardMargin;
                count++;
            }
        }

        return DeliveryTimeLineViewConstants.intervalPadding +
            DeliveryTimeLineViewConstants.intervalHeaderHeight +
            cardsHeight +
            DeliveryTimeLineViewConstants.cardMargin +
            DeliveryTimeLineViewConstants.loadMoreHeight +
            DeliveryTimeLineViewConstants.intervalPadding;
    }

    /**
     * Sets vertical position properties of all items in visible intervals for a given team
     * @param team - team to set items vertical positions
     * @param teamTopPosition - team's top position
     */
    public _updateItemsVerticalPosition(team: ITeam, teamTopPosition: number) {
        const visibleIntervals = team.intervals.filter(interval => interval.isInViewport);
        const worldViewPortBottom = this._worldState.viewportTop + this._worldState.viewportHeight;
        const worldViewPortTop = this._worldState.viewportTop;

        visibleIntervals.forEach((interval: IInterval) => {
            let maxNumberOfCardsToDisplay = IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(team, interval);
            let cardsHeight = DeliveryTimeLineViewConstants.intervalPadding + DeliveryTimeLineViewConstants.intervalHeaderHeight;

            if (interval.hasInlineAddItem) {
                cardsHeight += CardUtils.getCardHeight(null, null, this._worldState.cardRenderingOptions) + DeliveryTimeLineViewConstants.cardMargin;
            }

            if (interval.items) {
                for (let i = 0; i < maxNumberOfCardsToDisplay; i++) {
                    const item: IItem = interval.items[i];
                    if (!item.isHidden) {
                        const cardHeightWithMargin = item.height + DeliveryTimeLineViewConstants.cardMargin;
                        const cardTop = teamTopPosition + cardsHeight;
                        const cardBottom = cardTop + cardHeightWithMargin;
                        cardsHeight += cardHeightWithMargin;

                        item.top = cardTop;
                    }
                }

                const loadMoreHeight = DeliveryTimeLineViewConstants.loadMoreHeight + DeliveryTimeLineViewConstants.cardMargin;
                const loadMoreTop = teamTopPosition + cardsHeight;
                const loadMoreBottom = loadMoreTop + loadMoreHeight;
                interval.isLoadMoreInViewport = (loadMoreTop < worldViewPortBottom) && (loadMoreBottom > worldViewPortTop);
            }
        });
    }

    /**
     * Calculate the width of the interval by using the time between the starting and ending date of this one. This does not set any world state.
     * @param {Date} worldStartDate - Delivery time line startdate
     * @param {number} zoomLevelInPixelPerDay - Number of pixel for a single day
     * @param {IInterval} interval - The interval to get the width
     * @return Width in pixel of the interval. It takes the zoom in consideration
     */
    public _getIntervalWidth(interval: IInterval): number {
        if (interval.startDate > interval.endDate) {
            throw Error("Interval start date must be under the interval end date");
        }

        let intervalStartPixel = this._getPixel(interval.startDate);
        let intervalEndPixel = this._getPixel(interval.endDate);
        let spacer = DateManipulationFunctions.isLastDayOfMonthInUTC(interval.endDate) ? 0 : DeliveryTimeLineViewConstants.spaceBetweenIntervalInPixel; // We have the spacer only if not last day of month (we have natural space)
        return intervalEndPixel - intervalStartPixel + this._worldState.zoomLevelInPixelPerDay - spacer;
    }

    /**
     * Calculate from the data we receive the pixel between a start date and a desired date.
     * - Take in consideration the actual zoom
     * - Calculate the pixel from absolute number, nothing relative to past information.
     * - Contain the team side panel width because the viewport doesn't have the team side panel.
     * 
     * @param {Date} startDate - Initial date, always smaller than the desired date
     * @param {Date} desiredDateToGetPixel - Date to get the pixel.
     * @param {number} zoomLevelInPixelPerDay - Pixel number for 1 day
     * @return {number} The number of pixel between the startDate and desired date. Can be negative if the value is before the start date. Has the teamSideBar included
     */
    public static getPixelFromDates(startDate: Date, desiredDateToGetPixel: Date, zoomLevelInPixelPerDay: number): number {
        if (startDate == null) {
            throw Error("Start time must be defined");
        }
        if (desiredDateToGetPixel == null) {
            throw Error("Desired time must be defined");
        }
        let numberOfDays = DateManipulationFunctions.getDaysBetween(startDate, desiredDateToGetPixel); 
        let months: number;
        if (numberOfDays >= 0) {
            months = DateManipulationFunctions.getMonthsCountBetweenDates(startDate, desiredDateToGetPixel);
        } else {
            months = DateManipulationFunctions.getMonthsCountBetweenDates(desiredDateToGetPixel, startDate); //We invert the date here
        }
        return numberOfDays * zoomLevelInPixelPerDay + months * DeliveryTimeLineViewConstants.spaceBetweenMonthInPixel + DeliveryTimeLineViewConstants.teamSidebarWidth; //No need to take the teamSide bar or months position. It's hidden if negative
    }

    /**
     * Returns the horizontal pixel position for a given date.
     *  - Uses the current world state to determine the position.
     *  - Contain the team side panel width because the viewport doesn't have the team side panel.
     * @param {Date} date - Date to get the pixel.
     * @return {number} The number of pixel between the startDate and desired date. Can be negative if the value is before the start date. Has the teamSideBar included
     */
    public _getPixel(date: Date): number {
        return DeliveryTimeLineBusinessLogic.getPixelFromDates(this._worldState.worldStartDate, date, this._worldState.zoomLevelInPixelPerDay);
    }

    /**
     * Returns the date corresponding to a given pixel (see getDateFromPixel).
     *  - Uses the current world state to determine the position.
     * @param {number} pixel - Pixel horizontal position.
     * @return {Date} - The startDate + pixel = this date without time. We return a DATE not a DateTime.
     */
    public _getDate(pixel: number): Date {
        return DeliveryTimeLineBusinessLogic.getDateFromPixel(this._worldState.worldStartDate, pixel, this._worldState.zoomLevelInPixelPerDay);
    }

    /**
     * From the start date, we add a number of pixel which return end date. This works with negative pixel too.
     *  - Add 0 day, return save date
     *  - Add full month of day, will return the last day (Dec is 31 days, if you add 31 days of pixel (310 pixel if zoom is 10) it should return Jan 1 if the start date is Dec 1)
     *  - If x pixel is not a round number, we got the the earlier date. For example, zoom of 10 but pixel is parameter is 11, we move of 1 day until we reach 20.
     * @param {Date} startDate - Starting date of the delivery time line
     * @param {number} pixel - number of pixel to add to the start date (can be negative). Contain the team side bar, it's from the viewport Start date.
     * @param {number} zoomLevelInPixelPerDay - 1 day in pixel
     * @return {Date} - The startDate + pixel = this date without time. We return a DATE not a DateTime.
     */
    public static getDateFromPixel(startDate: Date, pixel: number, zoomLevelInPixelPerDay: number): Date {
        let days = (pixel - DeliveryTimeLineViewConstants.teamSidebarWidth) / zoomLevelInPixelPerDay; //When decimal values are passed for days, they are rounded to the nearest integer in moment in the next line
        let estimatedDateFromStartDate = moment(startDate).clone().add(days, "days");
        let numberOfMonthBetween = estimatedDateFromStartDate.diff(moment(startDate), "months");
        let numberOfMonthPixel = numberOfMonthBetween * DeliveryTimeLineViewConstants.spaceBetweenMonthInPixel;
        days = Math.floor((pixel - DeliveryTimeLineViewConstants.teamSidebarWidth - numberOfMonthPixel) / zoomLevelInPixelPerDay);
        let dateFromStartDate = moment(startDate).clone().add(days, "days");
        let dateWithoutTime = dateFromStartDate.toDate();
        dateWithoutTime.setHours(0, 0, 0, 0);
        return dateWithoutTime;
    }

    /**
     * Update the today marker left pixel offset from viewport start date.
     * This method was originally in the ActionsCreator. It needs to end, like any update method, in the store.
     */
    public _updateTodayMarkerPosition(): void {
        // Today marker is positioned relative to the viewport.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this._worldState.todayMarkerPosition = this._getPixel(today) - this._worldState.viewportLeft;
    }

    /**
     * Update the calendar marker left pixel offset from viewport start date.
     */
    public _updateCalendarMarkerPositions(): void {
        // Calendar markers are positioned relative to the viewport.
        const elements = this._worldState.calendarMarkers;
        if (elements) {
            for (let i = 0, len = elements.length; i < len; ++i) {
                const element = elements[i];
                element.leftOffset = this._getPixel(element.date) - this._worldState.viewportLeft;
            }
        }
    }

    /**
     * Update the view's calendar months to have appropriate dates and left values.
     */
    public _updateCalendarMonths(): void {
        let worldStartDate = this._worldState.worldStartDate;
        let worldEndDate = this._worldState.worldEndDate;

        let calendarMonths: ICalendarMonth[] = [];
        let months = DateManipulationFunctions.getMonthsInclusive(worldStartDate, worldEndDate);
        for (let i = 0; i < months.length; i++) {
            calendarMonths[i] = new CalendarMonth();
            calendarMonths[i].date = months[i];

            // Months are positioned relative the viewport.
            calendarMonths[i].left = this._getPixel(months[i]) - this._worldState.viewportLeft;
        }

        this._worldState.calendarMonths = calendarMonths;
    }

    /**
     * Initialize the max number of items to display for the teams - for each team this will be max(all_intervals_min(defaultValue, interval.items.length)).
     */
    public _initializeMaxNumberOfCardsToDisplay() {
        const teams: ITeam[] = this._worldState.teams;
        if (teams) {
            // If we have one team we want to display the default max number of cards otherwise display max for the loaded data so the viewport doesn't jump when more data is loaded.
            if (teams.length === 1) {
                teams[0].setMaxNumberOfCardsToDisplay(DeliveryTimeLineViewConstants.defaultMaxDisplayedCardsPerIteration);
            }
            else {
                for (let i = 0, len = teams.length; i < len; ++i) {
                    const team = teams[i];
                    team.setMaxNumberOfCardsToDisplay(this._getInitialMaxNumberOfCardsToDisplay(team));
                }
            }
        }
    }

    /**
     * Get the initial maximum number of items we should display for a given team. Assumes the team max number of cards has not yet been initialized.
     * @param ITeam team The team to calculate the max for.
     * @returns Initial max number of cards to display for this team.
     */
    public _getInitialMaxNumberOfCardsToDisplay(team: ITeam): number {
        let maxNumberOfCardsToDisplay = 0;
        if (team.intervals) {
            for (let i = 0; i < team.intervals.length; ++i) {
                let interval: IInterval = team.intervals[i];
                if (interval.items && interval.items.length > maxNumberOfCardsToDisplay) {
                    maxNumberOfCardsToDisplay = Math.min(interval.items.length, DeliveryTimeLineViewConstants.defaultMaxDisplayedCardsPerIteration);
                    if (maxNumberOfCardsToDisplay === DeliveryTimeLineViewConstants.defaultMaxDisplayedCardsPerIteration) {
                        break;
                    }
                }
            }
        }
        return maxNumberOfCardsToDisplay;
    }

    /**
     * Update the world measure/layout (all the elements, teams, intervals, etc...).
     * [[ This method is only public for testing purposes. ]]
     */
    public _updateWorldLayout(): IDeliveryTimeLineBusinessLogicResult {
        // Update teams -> intervals -> items
        let totalHeight = 0;
        if (this._worldState.teams != null) {
            this._worldState.teams.forEach((team: ITeam) => {
                this._updateTeamLayout(team, totalHeight);
                totalHeight += team.height + DeliveryTimeLineViewConstants.teamMargin;
            });

            if (this._worldState.teams.length === 1) {
                // For a single team row, set a min-height.
                const singleTeam = this._worldState.teams[0];
                if (!singleTeam.isCollapsed && singleTeam.status && singleTeam.status.type === TimelineTeamStatusCode.OK) {
                    singleTeam.height = Math.max(singleTeam.height, DeliveryTimeLineViewConstants.minHeightForSingleTeamRow);
                    totalHeight = singleTeam.height + DeliveryTimeLineViewConstants.teamMargin;
                }
            }
        }

        this._worldState.worldHeight = totalHeight;

        // Update calendar and today marker.
        this._updateTodayMarkerPosition();
        this._updateCalendarMonths();
        this._updateCalendarMarkerPositions();

        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    /**
     * Update a team measure/layout.
     * [[ This method is only public for testing purposes. ]]
     * @param {ITeam} team - The team.
     * @param {number} teamTopPosition - Top start position for this team.
     */
    public _updateTeamLayout(team: ITeam, teamTopPosition: number) {
        // Sligtly optimized path for when the team isCollapsed. We don't need to measure the interval heights because we know their height will be the collapsed team height.
        if (team.isCollapsed) {
            team.top = teamTopPosition;
            team.height = this._getTeamHeightCollapsed();
            // Teams span the full width so just check for vertical bounds.
            team.isInViewport = (this._worldState.viewportHeight === undefined) || (teamTopPosition <= (this._worldState.viewportTop + this._worldState.viewportHeight) && (teamTopPosition + team.height) >= this._worldState.viewportTop);

            // Update the interval isInViewport" - if the team is in viewport just need to check the viewport dates.
            if (team.intervals) {
                team.intervals.forEach((interval: IInterval) => {
                    // Update the layout (width and left).
                    this._updateIntervalLayout(interval);

                    //  Is in viewport - if the team is in viewport just need to check the interval position relative the viewport otherwise it isn't in the viewport.
                    interval.isInViewport = team.isInViewport && interval.leftPosition <= (this._worldState.viewportLeft + this._worldState.viewportWidth) && (interval.leftPosition + interval.width) >= this._worldState.viewportLeft;
                });
            }
        } else {
            // Min team height == collapsed height.
            let teamHeight = this._getTeamHeightCollapsed();
            if (team.intervals) {
                team.intervals.forEach((interval: IInterval) => {
                    // Update the layout (width and left).
                    this._updateIntervalLayout(interval);

                    // Calculate Height = title + dates + sum of all cards + some card padding.
                    // Note: Card height (and therefore interval height) depends on the card's width (which is bound by the interval width). So we must calculate the interval width before its height.
                    //       getIntervalHeight uses interval.width so be sure this is set before invoking this method.
                    let currentIntervalHeight = this._getIntervalHeightAndSetItemsHeight(interval, IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(team, interval), this._worldState.cardRenderingOptions);
                    if (currentIntervalHeight > teamHeight) {
                        teamHeight = currentIntervalHeight;
                    }
                });

                // After Determining the team height we can now check to see what intervals are in the viewport. We cannot do this before because the interval take up the full team height.
                team.intervals.forEach((interval: IInterval) => {
                    // Is in viewport - check if horizontally & vertically in viewport.
                    interval.isInViewport = (interval.leftPosition <= (this._worldState.viewportLeft + this._worldState.viewportWidth) && (interval.leftPosition + interval.width) >= this._worldState.viewportLeft) &&
                        ((this._worldState.viewportHeight === undefined) || (teamTopPosition <= (this._worldState.viewportTop + this._worldState.viewportHeight) && (teamTopPosition + teamHeight) >= this._worldState.viewportTop));
                });

                // Go through all items in visible intervals and update their vertical positions
                // This is done to support rendering only visible cards
                this._updateItemsVerticalPosition(team, teamTopPosition);
            }
            team.top = teamTopPosition;
            team.height = teamHeight;
            team.isInViewport = (this._worldState.viewportHeight === undefined) || (teamTopPosition <= (this._worldState.viewportTop + this._worldState.viewportHeight) && (teamTopPosition + team.height) >= this._worldState.viewportTop);
        }
    }

    /**
     * Update an interval measure/layout.
     * [[ This method is only public for testing purposes.]]
     * @param {IInterval} interval - The interval.
     */
    public _updateIntervalLayout(interval: IInterval) {
        if (interval.teamStatus.type !== TimelineTeamStatusCode.OK) {
            interval.width = this._worldState.viewportWidth - DeliveryTimeLineViewConstants.teamSidebarWidth;
            interval.leftPosition = this._worldState.viewportLeft + DeliveryTimeLineViewConstants.teamSidebarWidth;
        }
        else {
            // Width = interval start/end span + spacer if not at the end of the month.
            interval.width = this._getIntervalWidth(interval);

            // Left Position - pixel offset of interval start date from world start date.
            interval.leftPosition = this._getPixel(interval.startDate);
        }
    }

    /**
     * Remove given iteam from every team and interval in the current store
     * @param teams Teams to remove item from
     * @param id Id of item to remove
     */
    private _removeItemFromAllTeams(teams: ITeam[], id: number) {
        for (let team of teams) {
            for (let interval of team.intervals) {
                interval.removeItem(id);
            }
        }
    }

    private _moveToIntervalOrObjectInInterval(team: ITeam, interval: IInterval, moveToObject: (numberOfDisplayedCards: number) => IDeliveryTimeLineBusinessLogicResult): IDeliveryTimeLineBusinessLogicResult {
        // If the interval has an error, focus to the interval.
        if (interval.hasError() && interval.status.type === TimelineIterationStatusCode.IsOverlapping) {
            return this.focusInterval(team, interval);
        }

        // If there are no cards then focus the load more.
        const numberOfDisplayedCards = IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(team, interval);
        if (numberOfDisplayedCards === 0) {
            return this._focusLoadMore(team, interval);
        }

        // Otherwise...
        return moveToObject(numberOfDisplayedCards);
    }

    /**
     * Move the given load more button into the viewport and, optionally, set focus to it.
     * @param {ITeam} team Team where the load more button is located.
     * @param {IInterval} interval Interval where the load more button is located.
     */
    private _focusLoadMore(team: ITeam, interval: IInterval): IDeliveryTimeLineBusinessLogicResult {
        const distanceToEdges = DeliveryTimelineLayoutUtils.getOffsetFromViewForLoadMoreButton(this._worldState, team, interval);

        DeliveryTimelineFocusUtils.setCurrentLoadMoreFocusIdentifier(this._worldState, { teamKey: team.key, intervalId: interval.id } as LoadMoreFocusIdentifier);

        return this._moveToShowItemWithRelativePositioning(distanceToEdges);
    }

    /**
     * Move the viewport to show an element with the given positioning. Positioning is measured relative the view bounds.
     */
    private _moveToShowItemWithRelativePositioning(positioning: RelativeViewPositioning): IDeliveryTimeLineBusinessLogicResult {
        let verticalMovement = 0;
        let horizontalMovement = 0;

        if (positioning.topToViewTop < 0) {
            verticalMovement = positioning.topToViewTop;
        }
        else if (positioning.bottomToViewBottom > 0) {
            verticalMovement = positioning.bottomToViewBottom + DeliveryTimeLineViewConstants.cardMargin;
        }

        if (positioning.leftToViewLeft < 0) {
            horizontalMovement = positioning.leftToViewLeft;
        }
        else if (positioning.rightToViewRight > 0) {
            horizontalMovement = positioning.rightToViewRight;
        }

        if (verticalMovement !== 0 || horizontalMovement !== 0) {
            return this.viewportMoved(horizontalMovement, verticalMovement);
        }

        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }

    /**
     * Find the nearest focusable interval before the given interval. Return null if there are none.
     */
    private _findPreviousFocusableInterval(team: ITeam, interval: IInterval): IInterval {
        let prevFocusableInterval: IInterval = null;
        const currentIntervalIndex = team.intervals.indexOf(interval);

        const backwardScanResult = this._scanToPreviousFocusableInterval(team, currentIntervalIndex - 1);
        if (backwardScanResult) {
            return backwardScanResult;
        }
        // If we didn't find it in the initial scan, wrap and scan from the other side
        return this._scanToPreviousFocusableInterval(team, team.intervals.length - 1, currentIntervalIndex);
    }

    /**
     * Find the nearest focusable interval after the given interval. Return null if there are none.
     */
    private _findNextFocusableInterval(team: ITeam, interval: IInterval): IInterval {
        let nextFocusableInterval: IInterval = null;
        const currentIntervalIndex = team.intervals.indexOf(interval);

        const forwardScanResult = this._scanToNextFocusableInterval(team, currentIntervalIndex + 1);
        if (forwardScanResult) {
            return forwardScanResult;
        }
        // If we didn't find it in the initial scan, wrap and scan from the other side
        return this._scanToNextFocusableInterval(team, 0, currentIntervalIndex);
    }

    private _scanToNextFocusableInterval(team: ITeam, startIndex: number, endIndexExclusive?: number): IInterval {
        if (!team || !team.intervals) {
            return null;
        }
        if (typeof endIndexExclusive !== "number") {
            endIndexExclusive = team.intervals.length;
        }

        for (let i = startIndex; i < endIndexExclusive; i++) {
            const currentInterval = team.intervals[i];
            if (this._isIntervalFocusable(team, currentInterval)) {
                return currentInterval;
            }
        }

        return null;
    }

    private _scanToPreviousFocusableInterval(team: ITeam, startIndex: number, endIndexExclusive?: number): IInterval {
        if (!team || !team.intervals) {
            return null;
        }
        if (typeof endIndexExclusive !== "number") {
            endIndexExclusive = -1;
        }

        for (let i = startIndex; i > endIndexExclusive; i--) {
            const currentInterval = team.intervals[i];
            if (this._isIntervalFocusable(team, currentInterval)) {
                return currentInterval;
            }
        }

        return null;
    }

    private _isIntervalFocusable(team: ITeam, interval: IInterval): boolean {
        return !team.isCollapsed || (interval.hasError() && interval.status.type === TimelineIterationStatusCode.IsOverlapping);
    }

    private _getHorizontalShiftToFocusInterval(team: ITeam, interval: IInterval, distanceToEdges: RelativeViewPositioning) {
        if (interval.width > (this._worldState.viewportWidth - DeliveryTimeLineViewConstants.teamSidebarWidth)) {
            return Math.floor((distanceToEdges.rightToViewRight + distanceToEdges.leftToViewLeft) / 2);
        }
        else {
            if (distanceToEdges.leftToViewLeft < 0) {
                return distanceToEdges.leftToViewLeft;
            }
            else if (distanceToEdges.rightToViewRight > 0) {
                return distanceToEdges.rightToViewRight;
            }
        }

        return 0;
    }

    private _getVerticalShiftToFocusInterval(team: ITeam, interval: IInterval, distanceToEdges: RelativeViewPositioning) {
        if (team.height > this._worldState.viewportHeight) {
            if (distanceToEdges.topToViewTop > 0) {
                // If we can't fit the whole thing into the viewport, align the top to the top of the viewport
                return distanceToEdges.topToViewTop;
            }
        }
        else {
            if (distanceToEdges.topToViewTop < 0) {
                return distanceToEdges.topToViewTop;
            }
            else if (distanceToEdges.bottomToViewBottom > 0) {
                return distanceToEdges.bottomToViewBottom + DeliveryTimeLineViewConstants.cardMargin;
            }
        }

        return 0;
    }

    /**
     * Get the current IDeliveryTimeLineBusinessLogicResult - this is only used by tests.
     */
    public _getCurrentDeliveryTimeLineBusinessLogicResult(): IDeliveryTimeLineBusinessLogicResult {
        return new DeliveryTimeLineBusinessLogicResult(this._worldState, this._neededData);
    }
}
