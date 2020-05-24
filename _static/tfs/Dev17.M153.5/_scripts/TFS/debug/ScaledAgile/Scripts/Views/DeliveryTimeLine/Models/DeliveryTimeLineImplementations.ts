
import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { WorkItemStatesColorProvider } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { TimelineTeamStatusCode, TimelineIterationStatusCode, TeamFieldValue, PlanUserPermissions, PlanType, FilterClause } from "TFS/Work/Contracts";
import {
    IDeliveryTimeLineViewData, ITeam, IInterval, ITimeLineRequestIds, ITeamBacklog, ITimeLineRequest,
    ITeamStatus, IIntervalStatus, IBacklogLevel, ICalendarMonth, ICriteriaStatus, ICalendarMarker, FocusElement, IIntervalInlineAddProps
} from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IItem, IItems } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IUnpagedItem } from "ScaledAgile/Scripts/Shared/Models/IUnpagedItem";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { ItemComparator } from "ScaledAgile/Scripts/Shared/Utils/ItemComparator";
import { ICardSettings, ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { IReorderOperation } from "Agile/Scripts/Common/Agile";

export class DeliveryTimeLineData implements IDeliveryTimeLineViewData {
    public id: string;
    public revision: number;
    public type: PlanType;
    public name: string;
    public description: string;
    public criteriaStatus: ICriteriaStatus;

    public worldStartDate: Date;
    public worldEndDate: Date;
    public worldHeight: number;
    public worldWidth: number;
    public userPermissions: PlanUserPermissions;

    public viewportHeight: number;
    public viewportWidth: number;
    public viewportTop: number;
    public viewportLeft: number;

    public calendarMonths: ICalendarMonth[];
    public calendarMarkers: ICalendarMarker[];
    public teams: ITeam[];
    public zoomLevelInPixelPerDay: number;
    public todayMarkerPosition: number;
    public cardSettings: ICardSettings;
    public cardRenderingOptions: ICardRenderingOptions;
    public criteria: FilterClause[];
    public itemMap: IDictionaryNumberTo<IItem>;
    public focusElement: FocusElement;

    public isItemAlreadyInView(itemId: number): boolean {
        return this.itemMap[itemId] != null;
    }

    public isInlineAddEditing(): boolean {
        if (!this.teams)
            return false;

        return this.teams.some((t) => t && t.intervals && t.intervals.some((i) => i.isInlineAddEditing()));
    }

    constructor(viewportWidth?: number, viewportHeight?: number) {
        this.type = PlanType.DeliveryTimelineView;
        this.zoomLevelInPixelPerDay = DeliveryTimeLineViewConstants.zoomLevelDefault;
        this.todayMarkerPosition = 0;
        this.viewportLeft = 0;
        this.viewportTop = 0;
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.calendarMonths = [];
    }
}

export class CalendarMonth implements ICalendarMonth {
    public date: Date;
    public left: number;
}

export class CalendarMarker implements ICalendarMarker {
    private _leftOffset: number;

    public constructor(private _id: string, private _label: string, private _date: Date, private _dateDisplayLabel: string, private _bgColor: string, private _fontColor: string) {
    }

    public get id() { return this._id; }
    public get label() { return this._label; }
    public get date() { return this._date; }
    public get dateDisplayLabel() { return this._dateDisplayLabel; }
    public get backgroundColor() { return this._bgColor; }
    public get fontColor() { return this._fontColor; }

    public get leftOffset() { return this._leftOffset; }
    public set leftOffset(value: number) { this._leftOffset = value; }
}

export class Team implements ITeam {
    private _maxNumberCardsToDisplay = 0;
    private _isCollapsed = false;

    private _id: string;
    private _backlog: IBacklogLevel;

    constructor(id: string, backlogLevel: IBacklogLevel) {
        if (!id) {
            throw new Error("id must be defined");
        }
        if (!backlogLevel) {
            throw new Error("backlogLevel must be defined");
        }

        this._id = id;
        this._backlog = backlogLevel;
        this.status = new TeamStatus();
    }

    public name: string;
    public projectId: string;
    public status: TeamStatus;
    public intervals: IInterval[];
    public workItemTypeColorAndIcons: WorkItemTypeColorAndIcons;
    public workItemStateColorsProvider: WorkItemStatesColorProvider;
    public top: number;
    public height: number;
    public isInViewport: boolean;
    public orderField: string;
    public teamFieldDefaultValue: string;
    public teamFieldName: string;
    public teamFieldValues: TeamFieldValue[];

    public get key(): string {
        return this.id + ":" + this.backlog.categoryReferenceName;
    }

    public get id(): string {
        return this._id;
    }

    public get backlog(): IBacklogLevel {
        return this._backlog;
    }

    public get isCollapsed(): boolean {
        const noIterations = this.status && this.status.type === TimelineTeamStatusCode.NoIterationsExist;
        if (noIterations) {
            return false;
        }
        return this._isCollapsed;
    }

    public set isCollapsed(value: boolean) {
        this._isCollapsed = value;
    }

    public hasError(): boolean {
        return this.status &&
            this.status.type !== TimelineTeamStatusCode.OK;
    }

    public firstIntervalWithError(): IInterval {
        if (this.intervals) {
            let badIntervals = this.intervals.filter(i => i.hasError());
            if (badIntervals.length > 0) {
                return badIntervals[0];
            }
        }

        return null;
    }

    public getMaxNumberOfCardsToDisplay(): number {
        return this._maxNumberCardsToDisplay;
    }

    public setMaxNumberOfCardsToDisplay(value: number) {
        if (value > this._maxNumberCardsToDisplay) {
            this._maxNumberCardsToDisplay = value;
        }
    }
}

export class TeamStatus implements ITeamStatus {
    public constructor(public type: TimelineTeamStatusCode = TimelineTeamStatusCode.OK, public message: string = "") {
    }
}

export class BacklogLevel implements IBacklogLevel {
    private _categoryReferenceName: string;
    private _pluralName: string;
    private _workItemTypes: string[];
    private _workItemStates: string[];

    public constructor(categoryReferenceName: string, pluralName: string, workItemTypes: string[], workItemStates: string[]) {
        if (!categoryReferenceName) {
            throw Error("categoryReferenceName must be defined");
        }

        this._categoryReferenceName = categoryReferenceName;
        this._pluralName = pluralName;
        this._workItemTypes = workItemTypes;
        this._workItemStates = workItemStates;
    }

    get categoryReferenceName() {
        return this._categoryReferenceName;
    }

    get pluralName() {
        return this._pluralName;
    }

    get workItemTypes() {
        return this._workItemTypes;
    }

    get workItemStates() {
        return this._workItemStates;
    }
}

export class TimeLineRequestIds implements ITimeLineRequestIds {
    /**
     * List of item to be loaded
     */
    public itemsId: number[];

    /**
     * Build a request object with an optional initial list of item to load
     * @param initialItems
     */
    public constructor(initialItems: number[] = []) {
        this.itemsId = initialItems;
    }

    /**
     * Add a new work item id into the collection
     * @param {number} id - Work item id
     */
    public add(id: number): void {
        if (this.itemsId == null) {
            this.itemsId = [];
        }
        this.itemsId.push(id);
    }

    /**
     * Indicate if item needed to load
     */
    public canLoadMoreItems(): boolean {
        return this.itemsId != null && this.itemsId.length > 0;
    }
}

/**
 * Simple immutable TeamBacklog impl.
 */
export class TeamBacklog implements ITeamBacklog {
    private _teamId: string;
    private _backlogReferenceName: string;

    constructor(teamId: string, backlogReferenceName: string) {
        if (!teamId) {
            throw Error("teamId must be defined");
        }
        if (!backlogReferenceName) {
            throw Error("backlogReferenceName must be defined");
        }

        this._teamId = teamId;
        this._backlogReferenceName = backlogReferenceName;
    }

    get teamId(): string {
        return this._teamId;
    }

    get backlogReferenceName(): string {
        return this._backlogReferenceName;
    }
}

/**
 * Simple TimeLineRequest impl.
 */
export class TimeLineRequest implements ITimeLineRequest {
    timeLineId: string;
    timeLineRevision: number;
    backlogRowIds: ITeamBacklog[];
    startDate: Date;
    endDate: Date;

    constructor(timeLineId: string, timeLineRevision: number, backlogRowIds: ITeamBacklog[], startDate: Date, endDate: Date) {
        this.timeLineId = timeLineId;
        this.timeLineRevision = timeLineRevision;
        this.backlogRowIds = backlogRowIds;
        this.startDate = startDate;
        this.endDate = endDate;
    }
}
export class Interval implements IInterval {
    public id: string;
    public name: string;
    public startDate: Date;
    public endDate: Date;
    public status: IntervalStatus;
    public items: IItem[];
    public unpagedItems: IUnpagedItem[];
    public hasInlineAddItem: boolean;
    public inlineAddProps: IIntervalInlineAddProps;
    public isWaitingForItems: boolean;
    public leftPosition: number;
    public width: number;
    public isInViewport: boolean;
    public isLoadMoreInViewport: boolean;
    public teamStatus: TeamStatus;
    public isDragging: boolean;

    constructor() {
        this.isWaitingForItems = false; //By default the status is that we are not in the process of loading more items
        this.isInViewport = false; //By default we are not in viewport, we let a first round in business logic to determine the view port
        this.unpagedItems = [];
        this.teamStatus = { type: TimelineTeamStatusCode.OK, message: "" };
    }

    public hasError(): boolean {
        return this.status && this.status.type !== TimelineIterationStatusCode.OK;
    }

    public getWorkItemIdsNotLoaded(): ITimeLineRequestIds {
        if (!this.unpagedItems) {
            return new TimeLineRequestIds();
        }

        let itemIds: number[] = this.unpagedItems.map((item) => item.id);
        return new TimeLineRequestIds(itemIds);
    }

    /**
     * @returns Return array of visible items
     */
    public getVisibleItems(): IItem[] {
        return this.items ? this.items.filter(x => !x.isHidden) : [];
    }

    /**
     * Add given items to the end of the interval's items.
     * @param {IItems} items - list of items to add to this interval.
     */
    public addItems(items: IItems): void {
        if (items != null) {
            if (this.items == null) {
                this.items = [];
            }

            let itemDictionary: IDictionaryNumberTo<IItem> = this._getIntervalItemDictionary();

            if (items.cards != null) {
                for (let i = 0, len = items.cards.length; i < len; i++) {
                    if (!itemDictionary[items.cards[i].id]) {
                        itemDictionary[items.cards[i].id] = items.cards[i];
                        this.items.push(items.cards[i]);
                    }
                }
            }
        }
    }

    /**
     * Move item from this interval to the target interval.
     * @param {number} itemId - Item id to be move from this interval
     * @param {IInterval} targetInterval - Target interval to place the item to.
     */
    public moveItem(itemId: number, targetInterval: IInterval, orderField: string): IItem {
        if (targetInterval != null) {
            let item = this.removeItem(itemId);
            if (item != null) {
                targetInterval.addItemByOrderField(item, orderField);
            }
            return item;
        }
        return null;
    }

    /**
     * Add new items into the interval based on order field.
     * @param {IItems} - List of items to add into the list of fully loaded items.
     * @param {string} - The order Field to compared based on.
     */
    public addItemByOrderField(item: IItem, orderField: string) {
        this.addItemOnTop(item);

        let comparator = new ItemComparator();
        this.items = comparator.sortSameLevelItems(this.items, orderField);
    }

    /**
     * Add an item to the top of the interval's items if it doesn't exist in the items or replace that item (in the same order) if it is already in the list.
     * @param {IItem} item - the item to add to this interval.
     */
    public addItemOnTop(item: IItem) {
        if (item != null) {
            if (this.items == null) {
                this.items = [];
            }

            // Search for the item.
            let isExistingItem = false;
            for (let i = 0, len = this.items.length; i < len; ++i) {
                let currentItem = this.items[i];
                if (currentItem.id === item.id) {
                    // Found the item, replace with the new one.
                    this.items[i] = item;
                    isExistingItem = true;
                    break;
                }
            }

            if (!isExistingItem) {
                // Didn't find the item, add it to the head.
                this.items.splice(0, 0, item);
            }
        }
    }

    /**
     * Remove the given item id from the interval's items.
     * @param {number} itemId - the item id to identify the item to remove.
     * @return {IItem} - the item that get removed if it was a fully loaded item.
     */
    public removeItem(itemId: number): IItem {
        // store the item that get removed.
        let result = null;

        // remove item from the interval's fully loaded items, if exist.
        let itemRemoved = false;
        if (this.items) {
            for (let i = 0, len = this.items.length; i < len; i++) {
                let currentItem = this.items[i];
                if (currentItem.id === itemId) {
                    result = currentItem;
                    this.items.splice(i, 1);
                    itemRemoved = true;
                    break;
                }
            }
        }

        if (!itemRemoved && this.unpagedItems) {
            for (let i = 0, len = this.unpagedItems.length; i < len; ++i) {
                if (this.unpagedItems[i].id === itemId) {
                    this.unpagedItems.splice(i, 1);
                    break;
                }
            }
        }

        return result;
    }

    /**
     * See IDeliveryTimeLineInterface.IInterval.reorderItem.
     */
    public reorderItem(itemId: number, newIndex: number): IReorderOperation {
        let reorderOperation: IReorderOperation = null;
        if (this.items != null && itemId > -1 && newIndex > -1 && newIndex < this.items.length) {
            for (let i = 0, len = this.items.length; i < len; ++i) {
                let currentItem = this.items[i];
                if (currentItem.id === itemId) {
                    // Found the item, move to new index.
                    this.items.splice(newIndex, 0, this.items.splice(i, 1)[0]);
                    reorderOperation = {
                        Ids: [itemId],
                        ParentId: null,  // inferred to have reorder api figure out the parent
                        PreviousId: (newIndex - 1) > -1 ? this.items[newIndex - 1].id : null,
                        NextId: (newIndex + 1) < this.items.length ? this.items[newIndex + 1].id : null,
                        IterationPath: this.id
                    };
                    break;
                }
            }
        }
        return reorderOperation;
    }

    public isInlineAddEditing(): boolean {
        return this.hasInlineAddItem && this.inlineAddProps && this.inlineAddProps.inlineAddSaveStatus == undefined;
    }

    /**
     * To convert the items in each interval into dictionary for fast calculation
     */
    private _getIntervalItemDictionary(): IDictionaryNumberTo<IItem> {
        let itemDictionary: IDictionaryNumberTo<IItem> = {};
        if (this.items != null) {
            this.items.forEach((card) => {
                itemDictionary[card.id] = card;
            });
        }

        return itemDictionary;
    }
}

export class IntervalStatus implements IIntervalStatus {
    public type: TimelineIterationStatusCode;
    public message: string;

    constructor() {
        this.type = TimelineIterationStatusCode.OK;
        this.message = null;
    }
}
