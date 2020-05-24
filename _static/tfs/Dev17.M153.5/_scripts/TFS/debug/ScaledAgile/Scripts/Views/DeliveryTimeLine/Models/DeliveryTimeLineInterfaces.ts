import { WorkItemStatesColorProvider } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { TimelineTeamStatusCode, TimelineCriteriaStatusCode, TimelineIterationStatusCode, TeamFieldValue, PlanUserPermissions, PlanType, FilterClause } from "TFS/Work/Contracts";
import { IItem, IItems, ItemSaveStatus } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IUnpagedItem } from "ScaledAgile/Scripts/Shared/Models/IUnpagedItem";
import { IItemStoreData } from "ScaledAgile/Scripts/Shared/Stores/ItemStoreInterface";
import { ICardSettings, ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { IReorderOperation } from "Agile/Scripts/Common/Agile";

/**
 * Interface to get the latest world state from the store.
 */
export interface IDeliveryTimeLineStoreWorldStateProvider {
    /**
     * Get the latest delivery timeline store world state.
     *  Although this object is mutable you always need to invoke a method on the store (indirectly via DeliveryTimeLineActions) to ensure emitChanged() is invoked.
     */
    getValue(): IDeliveryTimeLineStoreData;

    /**
     * Is this object disposed? If it is disposed no other methods should be invoked on this object.
     */
    isDisposed(): boolean;
}

/**
 * What: Information about the DeliveryTimelineStore that are persisted on the backend
 * Why: Allow to pass information to the store or action creator that can be persisted (saved) without carrying other information used only during the experience.
 */
export interface IDeliveryTimelineStorePersistedData {
    /**
     * Plan unique identifier
     */
    id: string;

    /**
     * Revision of this view.
     */
    revision: number;

    /**
     * The type of this plan
     */
    type: PlanType;

    /**
     * User defined name for the delivery time line view
     */
    name: string;

    /**
     * User defined description for the delivery time line view
     */
    description: string;

    /**
     * List of teams that the view has. This is the full list of teams in order that it needs to be display in the screen.
     */
    teams: ITeam[];

    /**
    * Card settings
    */
    cardSettings: ICardSettings;

    /**
     * The permissions for this user for this plan
     */
    userPermissions: PlanUserPermissions;

    /**
     * Plan Criteria
     */
    criteria: FilterClause[];

    /**
     * Plan Filter Criteria Status from server
     */
    criteriaStatus: ICriteriaStatus;

    /**
     * Calendar markers for this plan.
     */
    calendarMarkers: ICalendarMarker[];
}

/**
 * Information about the data stored as part of the DeliveryTimeLineStore
 */
export interface IDeliveryTimeLineStoreData extends IDeliveryTimelineStorePersistedData {

    /**
     * The starting date that the view is currently displaying information for. The start date may not contain
     * items. It's the most left date the scroll contains.
     */
    worldStartDate: Date;

    /**
     * The ending date that the view is having. It doesn't mean that the view is having items up to that end date.
     * However, the ui has in the calendar all the month up to that date.
     */
    worldEndDate: Date;

    /**
     * The dimension in pixel between world start date and world end date
     */
    worldWidth: number;

    /**
     * world height in pixel
     */
    worldHeight: number;

    /**
     * viewport width in pixels.
     */
    viewportWidth: number;

    /**
     * viewport height in pixels.
     */
    viewportHeight: number;

    /**
     * The value of how much we have scrolled down
     */
    viewportTop: number;

    /**
     * The number of pixels that the user has scrolled to the left of the timeline in relation to the beginning of the month of the start date
     */
    viewportLeft: number;

    /**
     * Method that verify if an item is already present in the grid. This allow to determine
     * if we are in a stale position (duplicate of item)
     * @param {number} itemId - Unique identifier of an item
     * @returns {bool} True if the item is already in the view; False if the item is not in the view 
     */
    isItemAlreadyInView(itemId: number): boolean;

    /**
     * The number of pixel for a single day. This value change relatively to level selected by the user
     */
    zoomLevelInPixelPerDay: number;

    /**
     * The left pixel offset relative viewport start date of today marker.
     */
    todayMarkerPosition: number;

    /**
     * Calendar months
     */
    calendarMonths: ICalendarMonth[];

    /**
     * Card rendering options
     */
    cardRenderingOptions: ICardRenderingOptions;

    /**
     * Determine which element should have focus on the view.
     */
    focusElement: FocusElement;

    /**
     * Indicates whether any teams contain intervals in "inline add" mode.
     */
    isInlineAddEditing(): boolean;

    /**
     * Indicates whether the view data has filter applied.
     */
    isFiltered?: boolean;
}

/**
 * Information about the specific type view "Delivery TimeLine"
 */
export interface IDeliveryTimeLineViewData extends IDeliveryTimeLineStoreData, IItemStoreData {
}

/**
 * Represent a calendar month which contains the first day of the month as a date and the left pixel value it should be rendered at
 */
export interface ICalendarMonth {
    /**
     * Date representing first of the month
     */
    date: Date;

    /**
     * Left value to render the calendar month
     */
    left: number;
}

/**
 * Represent a team. A team contains multiple iterations
 */
export interface ITeam {
    /**
     * Unique key for the the timeline row - {team + category}.
     */
    key: string;

    /**
     * Team unique identifier
     */
    id: string;

    /** 
     * Backlog associated with this team row 
     */
    backlog: IBacklogLevel;

    /**
     * Team's friendly name
     */
    name: string;

    /** Id of project the team is in */
    projectId: string;

    /**
     * Indicate if the team is collapsed or not
     */
    isCollapsed: boolean;

    /**
     * Status for this team.
     */
    status: ITeamStatus;

    /**
     * All intervals loaded (partially or full) for this team.
     *
     */
    intervals: IInterval[];

    /**
     * Colors provider used to get work item type colors.
     */
    workItemTypeColorAndIcons: WorkItemTypeColorAndIcons;

    /**
     * Colors provider used to get work item type colors.
     */
    workItemStateColorsProvider: WorkItemStatesColorProvider;

    /**
     * Is there an error with this team (not aggregated across intervals)?
     */
    hasError(): boolean;

    /**
     * Get the first iteration that has an error.
     */
    firstIntervalWithError(): IInterval;

    /**
     * Y-position of the top of the team within the viewport
     */
    top: number;

    /**
     * Height of the team. When collapsed it's small, when loaded with minimal card, it's another height, when fully loaded it's a bigger number
     */
    height: number;

    /**
     * Indicate if the team is in view port or not
     */
    isInViewport: boolean;

    /**
     * Get the maximum number cards we should display for any interval. Value will always be greater than 0.
     *  Typically you will want to use IntervalHelperFunctions.getMaxNumberOfCardsToDisplay(...) instead of this method.
     */
    getMaxNumberOfCardsToDisplay(): number;

    /**
     * Set the maximum number of cards we should display on all this team's intervals to max(currentValue, value).
     */
    setMaxNumberOfCardsToDisplay(value: number): void;

    /**
     * The team field reference name
     */
    teamFieldName: string;
    /**
     * The team field default value
     */
    teamFieldDefaultValue: string;
    /**
     * The team field values
     */
    teamFieldValues: TeamFieldValue[];
    /**
     * The team order field
     */
    orderField: string;
}

export interface ITeamStatus {
    type: TimelineTeamStatusCode;
    message: string;
}

export interface ICriteriaStatus {
    type: TimelineCriteriaStatusCode;
    message: string;
}

/**
 * Backlog level
 */
export interface IBacklogLevel {
    categoryReferenceName: string;
    pluralName: string;
    workItemTypes: string[];
    workItemStates: string[];
}

export interface IIntervalInlineAddProps {
    inlineAddWorkItemType: string;
    inlineAddTitle?: string;
    inlineAddSaveStatus?: ItemSaveStatus;
}

/**
 * Represent an interval of time. This can be a sprint or iteration
 */
export interface IInterval {
    /**
     * Unique identifier of the interval
     */
    id: string;

    /**
     * Name of the interval
     */
    name: string;

    /**
     * Starting date for the interval.  This is expected to be in UTC. 
     */
    startDate: Date;

    /**
     * Ending date. This is expected to be in UTC.
     */
    endDate: Date;

    /**
     * Status for this interval.
     */
    status: IIntervalStatus;

    /**
     * Paged work items in this interval.
     */
    items: IItem[];

    /**
     * Unpaged items in this interval.
     */
    unpagedItems: IUnpagedItem[];

    /**
     * Flag indicating whether there is a "fake" card included in the list for "inline add"
     * If true, values in inlineAddProps are used to define the card's behavior
     */
    hasInlineAddItem: boolean;

    /**
     * Configuration for the "inline add" card, if hasInlineAddItem is true.
     */
    inlineAddProps?: IIntervalInlineAddProps;

    /**
     * Team row status, if this is present and not OK, it will yield special rendering.
     */
    teamStatus?: ITeamStatus;

    /**
     * Is there an error with this iteration?
     */
    hasError(): boolean;
    /**
     * Get a list of work item ids that haven't been fully loaded/materialized.
     * @returns {ITimeLineRequestIds} : Can be an empty list of nothing to load; list of work items id
     */
    getWorkItemIdsNotLoaded(): ITimeLineRequestIds;

    /**
     * @returns Return array of visible items
     */
    getVisibleItems(): IItem[];

    /**
     * Status about if the interval is in the process of loading more information or not. Default is false
     */
    isWaitingForItems: boolean;

    /**
     * Add new items into the interval based on position.
     * @param {IItems} - List of items to add into the list of fully loaded items
     */
    addItems(items: IItems): void;

    /**
     * Add new items into the interval based on order field.
     * @param {IItems} - List of items to add into the list of fully loaded items.
     * @param {string} - The order Field to compared based on.
     */
    addItemByOrderField(item: IItem, orderField: string): void;

    /**
     * Add an item to the top of the interval's items if it doesn't exist in the items or replace that item (in the same order) if it is already in the list.
     * @param {IItem} item - the item to add to this interval.
     */
    addItemOnTop(item: IItem): void;

    /**
     * Remove item from the interval.
     * @param {number} - Item id to remove from the list of fully loaded items
     * @return {IItem} - Return item that is removed. Return null if no item was removed.
     */
    removeItem(itemId: number): IItem;

    /**
     * Move item from this interval to the target interval.
     * @param {number} itemId - Item id to be move from this interval
     * @param {IInterval} targetInterval - Target interval to place the item to.
     */
    moveItem(itemId: number, targetInterval: IInterval, orderField: string): IItem;

    /**
     * Move an item from its original position to the given new position within its interval.
     * @param {number} itemId - id of the item to be moved.
     * @param {number} newIndex - new index to move to.
     * @returns {IReorderOperation} - The resultant changes of the reorder, which can be used as param for reorder api. Return null if the itemId is not found or newIndex is invalid.
     */
    reorderItem(itemId: number, newIndex: number): IReorderOperation;

    /**
     * Left position for the interval relative to the delivery time line container.
     * For example, 0px would be the start date position.
     */
    leftPosition: number;

    /**
     * Interval width depending of the number of days in the interval
     */
    width: number;

    /**
     * Indicate if the interval is in view port or not
     */
    isInViewport: boolean;

    /**
     * Indicate if the interval is in view port or not
     */
    isLoadMoreInViewport: boolean;

    /**
     * Flag indicates if the interval is currently have item that is dragging. This property is used for rendering.
     */
    isDragging: boolean;

    /**
     * Indicates whether there is an "inline add" card which is currently being edited in the interval
     */
    isInlineAddEditing(): boolean;
}

export interface IIntervalStatus {
    type: TimelineIterationStatusCode;
    message: string;
}

/**
 * TimeLine Request Id needed to load. This is used to get more cards from interval
 */
export interface ITimeLineRequestIds {
    /**
     * List of items to load
     */
    itemsId: number[];
    /**
     * Add a new work item id into the collection
     * @param {number} id - Work item id
     */
    add(id: number): void;
    /**
     * Indicate if item needed to load
     */
    canLoadMoreItems(): boolean;
}

/**
 * Team + backlog - this uniquely identifies a row within the timeline.
 */
export interface ITeamBacklog {
    teamId: string;
    backlogReferenceName: string;
}

export interface ITimeLineRequest {
    /**
     * Id of the timeline.
     */
    timeLineId: string;

    /**
     * Revision of the timeline currently loaded.
     */
    timeLineRevision: number;

    /**
     * Collection of identifier for the backlog rows (team id + backlog reference name).
     */
    backlogRowIds: ITeamBacklog[];

    /**
     * Start date of the date range to get data for.
     */
    startDate: Date;

    /**
     * End date of the date range to get data for.
     */
    endDate: Date;
}

//-------------------------------------------- Interface between ActionCreator and Stores for received data actions -------------------------
export interface ISetTeamsParams {
    /**
    * A set of teams to be directly replaced in the store
    */
    teams: ITeam[];
}
//-------------------------------------------- Interface between ActionCreator and Stores for Actions -------------------------
export interface ISetItemsInIntervalParams {
    /**
     * Interval that is getting changes
     */
    interval: IInterval;

    /**
     * Indicate weither or not the items has been loaded or we are waiting a response.
     * We cannot only check items to be null or not because we may get from server nothing and still
     * do not want to wait.
     */
    isWaitingForItems: boolean;

    /**
    * New world height after getting new items in the interval. This is valid only when isWaitingForItems is false and can be undefined if isWaitingForItems is true
    */
    worldHeight?: number;

    /**
     * New items to insert into the interval. Can be null. In that case, nothing added.
     */
    items?: IItems;
}

/**
 * Payload used to store data on dragged item.
 */
export interface IDragSourceParams {
    /**
     * Drag source team
     */
    sourceTeam: ITeam;
    /**
     * Drag source interval
     */
    sourceInterval: IInterval;
    /**
     * Drag source item id
     */
    itemId: number;
}

/**
 * Payload used on item drop action is invoked from component to action creator
 */
export interface IDropTargetParams {
    /**
     * Drop target team
     */
    targetTeam: ITeam;
    /**
     * Drop target interval
     */
    targetInterval: IInterval;
    /**
     * Drop target item id
     */
    itemId: number;
}

/**
 * Payload used for sending info about item drag source and drop target from action creator to store
 */
export interface IDragDropParams extends IDragSourceParams, IDropTargetParams {
}

/**
 * Payload used for sending info after item sorted has stopped and update with new index position from action creator to store.
 */
export interface ISortUpdateParams extends IDragSourceParams {
    newIndex: number;
    userInitiated: boolean;
}

export interface ISetTeamStateColorProviderParams {
    /**
     * Project id a team belongs to
     */
    projectId: string;

    /**
     * The state to color provider for the project
     */
    stateColorsProvider: WorkItemStatesColorProvider;
}

/**
 * This interface allow to return more than a single date. Often, a method needs to
 * return a new starting and ending date.
 */
export interface IDateSet {
    /**
     * Start date (can be for view port or world)
     */
    start: Date;

    /**
     * End date (can be for view port or world)
     */
    end: Date;
}


export interface IMoveItemParams {

    /**
     * Unique plan id
     */
    planId: string;

    /**
     * Indicate if the server request is successful.
     */
    isSuccessful: boolean;

    /**
     * Server request error message if any.
     */
    errorMessage: string;

    /**
     * Time when started the execution.
     */
    startTime: number;

    /**
     * Flag specifying whether the user initiated this move action
     * If false, customer intelligence events are suppressed.
     */
    userInitiated: boolean;
}

export interface ICollapseTeamParams {
    /**
     * Unique plan id
     */
    planId: string;

    /**
     * If null = all teams
     */
    teamId: string;
    /**
     * Indicate if the team row is collapsed
     */
    isCollapsed: boolean;
}

export interface IZoomLevelParams {
    /**
     * Unique plan id
     */
    planId: string;

    /**
     * New level to zoom to (in pixels)
     */
    zoomLevel: number;

}

export interface ICalendarMarker {
    /**
     * Unique id used as React key for rendering.
     */
    id: string;
    /**
     * Label of the marker.
     */
    label: string;
    /**
     * Date of the marker in UTC format.
     */
    date: Date;
    /**
     * The left pixel offset relative viewport world start date for this marker.
     */
    leftOffset: number;
    /**
     * The date label used for display on the marker.
     */
    dateDisplayLabel: string;
    /**
     * The background color of the marker used for rendering.
     */
    backgroundColor: string;
    /**
     * The font color for marker used for rendering.
     */
    fontColor: string;
}

export enum HorizontalDirection {
    Left,
    Right
}

// Below is for keyboard accessibility of plan.
export interface FocusElement {
    kind: FocusKind;
    identifier: any;
}

export enum FocusKind {
    Interval,
    LoadMore,
    Card,
    PanButton,
    ExpandCollapseAllButton,
    TeamAnchor,
    Backlog,
    AddNewItemButton,
    InlineAddCard
}

export enum TeamFocusType {
    TeamToggle,
    BacklogLink
}

export interface IntervalFocusIdentifier {
    teamKey: string;
    intervalId: string;
}

export interface CardFocusIdentifier {
    teamKey: string;
    itemId: number;
}

export interface LoadMoreFocusIdentifier {
    teamKey: string;
    intervalId: string;
}

export interface PanFocusIdentifier {
    direction: HorizontalDirection;
}

export interface ExpandCollapseAllFocusIdentifier {
}

export interface TeamAnchorFocusIdentifier {
    teamKey: string;
}

export interface BacklogFocusIdentifier {
    teamKey: string;
}

export interface AddNewItemFocusIdentifier {
    teamKey: string;
    intervalId: string;
}

export interface InlineAddCardFocusIdentifier {
    teamKey: string;
    intervalId: string;
}

export namespace DeliveryTimeLineEvents {
    export var SHOW_AND_FOUCS_PLANFILTER_KEY_PRESSED = "SHOW_AND_FOUCS_PLANFILTER_KEY_PRESSED";
}
