import { IDeliveryTimeLineStoreData } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { FocusKind, IntervalFocusIdentifier, CardFocusIdentifier, LoadMoreFocusIdentifier, PanFocusIdentifier, ExpandCollapseAllFocusIdentifier, TeamAnchorFocusIdentifier, BacklogFocusIdentifier, AddNewItemFocusIdentifier, InlineAddCardFocusIdentifier } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";

export class DeliveryTimelineFocusUtils {
    public static clearCurrentFocusIdentifier(worldState: IDeliveryTimeLineStoreData): void {
        worldState.focusElement = null;
    }

    public static getCurrentIntervalFocusIdentifier(worldState: IDeliveryTimeLineStoreData): IntervalFocusIdentifier {
        return DeliveryTimelineFocusUtils._getCurrentTypedFocusIdentifier(worldState, FocusKind.Interval);
    }

    public static setCurrentIntervalFocusIdentifier(worldState: IDeliveryTimeLineStoreData, identifier: IntervalFocusIdentifier) {
        DeliveryTimelineFocusUtils._setCurrentTypedFocusIdentifier(worldState, FocusKind.Interval, identifier);
    }

    public static getCurrentItemFocusIdentifier(worldState: IDeliveryTimeLineStoreData): CardFocusIdentifier {
        return DeliveryTimelineFocusUtils._getCurrentTypedFocusIdentifier(worldState, FocusKind.Card);
    }

    public static setCurrentItemFocusIdentifier(worldState: IDeliveryTimeLineStoreData, identifier: CardFocusIdentifier) {
        DeliveryTimelineFocusUtils._setCurrentTypedFocusIdentifier(worldState, FocusKind.Card, identifier);
    }

    public static getCurrentLoadMoreFocusIdentifier(worldState: IDeliveryTimeLineStoreData): LoadMoreFocusIdentifier {
        return DeliveryTimelineFocusUtils._getCurrentTypedFocusIdentifier(worldState, FocusKind.LoadMore);
    }

    public static setCurrentLoadMoreFocusIdentifier(worldState: IDeliveryTimeLineStoreData, identifier: LoadMoreFocusIdentifier) {
        DeliveryTimelineFocusUtils._setCurrentTypedFocusIdentifier(worldState, FocusKind.LoadMore, identifier);
    }

    public static getCurrentPanFocusIdentifier(worldState: IDeliveryTimeLineStoreData): PanFocusIdentifier {
        return DeliveryTimelineFocusUtils._getCurrentTypedFocusIdentifier(worldState, FocusKind.PanButton);
    }

    public static setCurrentPanFocusIdentifier(worldState: IDeliveryTimeLineStoreData, identifier: PanFocusIdentifier) {
        DeliveryTimelineFocusUtils._setCurrentTypedFocusIdentifier(worldState, FocusKind.PanButton, identifier);
    }

    public static getCurrentExpandCollapseAllFocusIdentifier(worldState: IDeliveryTimeLineStoreData): ExpandCollapseAllFocusIdentifier {
        return DeliveryTimelineFocusUtils._getCurrentTypedFocusIdentifier(worldState, FocusKind.ExpandCollapseAllButton);
    }

    public static setCurrentExpandCollapseAllFocusIdentifier(worldState: IDeliveryTimeLineStoreData, identifier: ExpandCollapseAllFocusIdentifier) {
        DeliveryTimelineFocusUtils._setCurrentTypedFocusIdentifier(worldState, FocusKind.ExpandCollapseAllButton, identifier);
    }

    public static getCurrentTeamFocusIdentifier(worldState: IDeliveryTimeLineStoreData): LoadMoreFocusIdentifier {
        return DeliveryTimelineFocusUtils._getCurrentTypedFocusIdentifier(worldState, FocusKind.TeamAnchor);
    }

    public static setCurrentTeamFocusIdentifier(worldState: IDeliveryTimeLineStoreData, identifier: TeamAnchorFocusIdentifier) {
        DeliveryTimelineFocusUtils._setCurrentTypedFocusIdentifier(worldState, FocusKind.TeamAnchor, identifier);
    }

    public static getCurrentBacklogFocusIdentifier(worldState: IDeliveryTimeLineStoreData): BacklogFocusIdentifier {
        return DeliveryTimelineFocusUtils._getCurrentTypedFocusIdentifier(worldState, FocusKind.Backlog);
    }

    public static setCurrentBacklogFocusIdentifier(worldState: IDeliveryTimeLineStoreData, identifier: BacklogFocusIdentifier) {
        DeliveryTimelineFocusUtils._setCurrentTypedFocusIdentifier(worldState, FocusKind.Backlog, identifier);
    }

    public static getCurrentAddNewItemFocusIdentifier(worldState: IDeliveryTimeLineStoreData): AddNewItemFocusIdentifier {
        return DeliveryTimelineFocusUtils._getCurrentTypedFocusIdentifier(worldState, FocusKind.AddNewItemButton);
    }

    public static setCurrentAddNewItemFocusIdentifier(worldState: IDeliveryTimeLineStoreData, identifier: AddNewItemFocusIdentifier) {
        DeliveryTimelineFocusUtils._setCurrentTypedFocusIdentifier(worldState, FocusKind.AddNewItemButton, identifier);
    }

    public static getCurrentInlineAddCardFocusIdentifier(worldState: IDeliveryTimeLineStoreData): InlineAddCardFocusIdentifier {
        return DeliveryTimelineFocusUtils._getCurrentTypedFocusIdentifier(worldState, FocusKind.InlineAddCard);
    }

    public static setCurrentInlineAddCardFocusIdentifier(worldState: IDeliveryTimeLineStoreData, identifier: InlineAddCardFocusIdentifier) {
        DeliveryTimelineFocusUtils._setCurrentTypedFocusIdentifier(worldState, FocusKind.InlineAddCard, identifier);
    }

    /**
     * If the current focus identifier is of the given kind return it otherwise return null.
     */
    private static _getCurrentTypedFocusIdentifier(worldState: IDeliveryTimeLineStoreData, kind: FocusKind): any {
        if (!worldState || !worldState.focusElement || worldState.focusElement.kind !== kind) {
            return null;
        }
        return worldState.focusElement.identifier;
    }

    /**
     * Set the current focus identifier.
     */
    private static _setCurrentTypedFocusIdentifier(worldState: IDeliveryTimeLineStoreData, kind: FocusKind, identifier: any) {
        worldState.focusElement = {
            kind: kind,
            identifier: identifier
        }
    }
}