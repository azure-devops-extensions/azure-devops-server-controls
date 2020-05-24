import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";

import { IntervalHelperFunctions } from "ScaledAgile/Scripts/Shared/Utils/IntervalHelperFunctions";

import { IDeliveryTimeLineStoreData, ITeam, IInterval } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IItem } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { CardComponentConstants } from "../../../Shared/Card/Models/CardConstants";

export class RelativeViewPositioning {
    public constructor(public topToViewTop: number, public rightToViewRight: number, public bottomToViewBottom: number, public leftToViewLeft: number) { }
}

/**
 * General layout helpers. All in-params here should be considered read-only.
 */
export class DeliveryTimelineLayoutUtils {
    /**
     * Calculate the distance between the top/bottom of the item relative to the viewport top/bottom and the interval left/right to the view left/right.
     * Assumes item is being displayed.
     * @param {IDeliveryTimeLineStoreData} worldState Current world state, only positioning is used.
     * @param {IInterval} interval Interval to measure relative to.
     * @param {IItem} item Item to measure relative to.
     */
    public static getOffsetFromViewForItem(worldState: IDeliveryTimeLineStoreData, interval: IInterval, item: IItem): RelativeViewPositioning {
        return DeliveryTimelineLayoutUtils.getOffsetFromView(worldState,
            item.top,
            interval.leftPosition + interval.width,
            item.top + item.height + DeliveryTimeLineViewConstants.cardMargin,
            interval.leftPosition);
    }

    /**
     * Calculate the distance between the top/bottom of the load more button relative to the viewport top/bottom and the interval left/right to the view left/right.
     * Throws if the load more button is not being displayed.
     */
    public static getOffsetFromViewForLoadMoreButton(worldState: IDeliveryTimeLineStoreData, team: ITeam, interval: IInterval): RelativeViewPositioning {
        if (team.isCollapsed) {
            throw new Error("No load more button on collapsed teams.");
        }

        const numberOfDisplayedCards = IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(team, interval);
        const numberOfHiddenCards: number = interval.unpagedItems.length + interval.items.length - numberOfDisplayedCards;
        if (numberOfHiddenCards === 0) {
            throw new Error("No load more button when there are no hidden cards.");
        }

        // If there are no displayed cards go off the team positioning.
        if (numberOfDisplayedCards === 0) {
            return DeliveryTimelineLayoutUtils.getOffsetFromView(worldState,
                team.top,
                interval.leftPosition + interval.width,
                team.top + DeliveryTimeLineViewConstants.loadMoreHeight + (DeliveryTimeLineViewConstants.intervalHeaderHeight + 2 * DeliveryTimeLineViewConstants.intervalPadding),
                interval.leftPosition);
        }
        else {  // Otherwise go off the last displayed item positioning.
            const lastDisplayedItem = interval.items[numberOfDisplayedCards - 1];
            const lastDisplayedItemBottom = lastDisplayedItem.top + lastDisplayedItem.height + DeliveryTimeLineViewConstants.cardMargin;
            return DeliveryTimelineLayoutUtils.getOffsetFromView(worldState, lastDisplayedItemBottom, (interval.leftPosition + interval.width), (lastDisplayedItemBottom + DeliveryTimeLineViewConstants.loadMoreHeight), interval.leftPosition);
        }
    }

    /**
     * Calculate the distance between the top/bottom of the item relative to the viewport top/bottom.
     * Assumes item is being displayed.
     * @param {IDeliveryTimeLineStoreData} worldState Current world state, only positioning is used.
     * @param {ITeam} team Team to measure relative to.
     */
    public static getOffsetFromViewForTeam(worldState: IDeliveryTimeLineStoreData, team: ITeam): RelativeViewPositioning {
        return new RelativeViewPositioning(
            team.top - worldState.viewportTop,
            0,
            (team.top + team.height) - (worldState.viewportTop + worldState.viewportHeight),
            0
        );
    }

    public static getOffsetFromViewForInterval(worldState: IDeliveryTimeLineStoreData, team: ITeam, interval: IInterval): RelativeViewPositioning {
        return DeliveryTimelineLayoutUtils.getOffsetFromView(worldState, team.top, (interval.leftPosition + interval.width), (team.top + team.height), interval.leftPosition);
    }

    public static getOffsetFromViewForAddNewItemMenu(worldState: IDeliveryTimeLineStoreData, team: ITeam, interval: IInterval): RelativeViewPositioning {
        return DeliveryTimelineLayoutUtils.getOffsetFromView(worldState, team.top, (interval.leftPosition + interval.width), team.top + DeliveryTimeLineViewConstants.intervalHeaderHeight, interval.leftPosition);
    }

    public static getOffsetFromViewForInlineAddCard(worldState: IDeliveryTimeLineStoreData, team: ITeam, interval: IInterval): RelativeViewPositioning {
        return DeliveryTimelineLayoutUtils.getOffsetFromView(
            worldState,
            team.top + DeliveryTimeLineViewConstants.intervalHeaderHeight,
            interval.leftPosition + interval.width,
            team.top + DeliveryTimeLineViewConstants.intervalHeaderHeight + CardComponentConstants.inlineEditTitleHeight + CardComponentConstants.contentPaddingTopBottom,
            interval.leftPosition);
    }

    public static getOffsetFromView(worldState: IDeliveryTimeLineStoreData, top: number, right: number, bottom: number, left: number): RelativeViewPositioning {
        return new RelativeViewPositioning(
            // relative top = distance between viewport top and top
            top - worldState.viewportTop,
            // relative right = distance between viewport right and right
            right - (worldState.viewportLeft + worldState.viewportWidth),
            // relative bottom = distance beween viewport bottom & load more bottom
            bottom - (worldState.viewportTop + worldState.viewportHeight),
            // relative left = distance between right side of the team curtain and the interval left
            left - (worldState.viewportLeft + DeliveryTimeLineViewConstants.teamSidebarWidth)
        );
    }
}