import * as ServerDataWork from "TFS/Work/Contracts";
import * as ServerDataWorkItemTracking from "TFS/WorkItemTracking/Contracts";

import * as Utils_Date from "VSS/Utils/Date";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { Color } from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";
import { IDeliveryTimeLineViewData, ITeam, IInterval, ICalendarMarker } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { DeliveryTimeLineData, Interval, IntervalStatus, Team, TeamStatus, BacklogLevel, CalendarMarker } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineImplementations";
import { IItem, IItems, IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { Item } from "ScaledAgile/Scripts/Shared/Models/Item";
import { CoreFieldRefNames, FieldType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { ICardSettings, IdentityPickerRenderingOption, IAdditionalField } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { CardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/CardRenderingOptions";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { DateManipulationFunctions } from "ScaledAgile/Scripts/Shared/Utils/DateManipulationFunctions";
import { ColorUtilities } from "Charts/ColorUtilities";

export interface IMapper {
    /**
     * Convert Delivery Timeline view data from server to client model {IDeliveryTimeLineViewData}
     * @param {DeliveryViewData} data delivery timeline view data from server
     * @param {Plan} plan plan data from the server. Can be null.
     * @returns {IDeliveryTimeLineViewData} The transformed data into client model
     */
    mapTimelineDataToTimelineState(data: ServerDataWork.DeliveryViewData, plan: IViewsStoreData): IDeliveryTimeLineViewData;

    /**
     * Convert WorkItemTracking WorkItem object models into shall Items consumable by Item/Card component
     * @param {WorkItem[]} input array of full work item objects
     * @param {workItemTypeColorAndIcons} WorkItemTypeColorAndIcons Work item type color and icon provider used to set the color/icon for the items.
     * @returns {IItems} The transformed data into IItems
     */
    mapWorkItemsToItems(input: ServerDataWorkItemTracking.WorkItem[], workItemTypeColorAndIcons: WorkItemTypeColorAndIcons): IItems;
}

export class Mapper implements IMapper {

    /**
     * Convert Delivery Timeline view data from server to client model {IDeliveryTimeLineViewData}
     * @param {DeliveryViewData} data delivery timeline view data from server
     * @param {Plan} plan plan data from the server. Can be null.
     * @returns {IDeliveryTimeLineViewData} The transformed data into client model
     */
    public mapTimelineDataToTimelineState(data: ServerDataWork.DeliveryViewData, plan: IViewsStoreData): IDeliveryTimeLineViewData {
        if (!data) {
            throw new Error("DeliveryViewData is null");
        }

        let teams: ITeam[] = [];
        let cardIdToItem: IDictionaryNumberTo<IItem> = {};

        data.teams.forEach(team => {
            let intervals: IInterval[] = [];
            const status = this.mapToTeamStatus(team.status);
            if (status.type !== ServerDataWork.TimelineTeamStatusCode.OK) {
                intervals.push(this.createErrorInterval(status));
            }
            else if (team.isExpanded && team.iterations) {
                team.iterations.forEach(iteration => {
                    let newInterval = this.mapIterationToInterval(team.fieldReferenceNames, team.partiallyPagedFieldReferenceNames, iteration, cardIdToItem, data.childIdToParentIdMap);
                    if (newInterval) {
                        intervals.push(newInterval);
                    }
                });
            }

            let workItemTypeColorAndIconsProvider = this.mapWorkItemTypeColorAndIcons(team.workItemTypeColors);
            let newTeam = this.mapTimelineTeamToTeam(team, intervals, workItemTypeColorAndIconsProvider);
            teams.push(newTeam);
        });
        let result = this.saveToDeliveryTimeLineData(data, teams, cardIdToItem);

        // Generally plan is null for the GetData calls - in initial data load it is set.
        if (plan) {
            result.name = plan.view.name;
            result.description = plan.view.description;
            result.revision = plan.view.revision;
            result.cardSettings = this.mapCardSettings(plan.view.cardSettings);
            result.userPermissions = plan.view.userPermissions;
            result.cardRenderingOptions = new CardRenderingOptions(result.cardSettings, this._mapFieldDefinitions(plan.view.cardSettings));
            result.criteria = plan.view.criteria;
            result.calendarMarkers = this._mapMarkers(plan.view.markers);
        }

        return result;
    }

    /**
     * Map array of server object Marker into array of client object ICalendarMarker.
     * @param {ServerDataWork.Marker[]} markers
     * @return {ICalendarMarker[]}
     */
    public _mapMarkers(markers: ServerDataWork.Marker[]): ICalendarMarker[] {
        let calendarMarkers = [];
        if (markers) {
            // sort markers by date ascending order for rendering purpose.
            const sortedMarkers = markers.sort((a: ServerDataWork.Marker, b: ServerDataWork.Marker) => { return Utils_Date.defaultComparer(new Date(a.date), new Date(b.date)); });
            for (let i = 0, len = sortedMarkers.length; i < len; i++) {
                const marker = sortedMarkers[i];
                const markerLocaleDate = new Date(marker.date);
                const datePattern = DateManipulationFunctions.getShortDayMonthPattern();
                const markerUtcDateLabel = DateManipulationFunctions.getUtcDateLabel(markerLocaleDate, datePattern);
                const markerUtcDate = Utils_Date.shiftToUTC(markerLocaleDate);
                // zero out marker hours in order for accurate calculation for its position relative to the calendar and today marker.
                markerUtcDate.setHours(0, 0, 0, 0);
                const markerColor = new Color(marker.color);
                const bgColor = markerColor.asHex();
                const fontColor = ColorUtilities.selectForegroundColor(bgColor);
                calendarMarkers.push(new CalendarMarker(GUIDUtils.newGuid(), marker.label, markerUtcDate, markerUtcDateLabel, bgColor, fontColor));
            }
        }
        return calendarMarkers;
    }

    /**
     * Get/Create a a colors provider given a collection of work item colors.
     * @param workItemColors Collection of work item colors.
     */
    public mapWorkItemTypeColorAndIcons(workItemColors: ServerDataWork.WorkItemColor[]): WorkItemTypeColorAndIcons {
        var workItemTypeColorAndIcons = new WorkItemTypeColorAndIcons();

        if (workItemColors) {
            for (var workItemColor of workItemColors) {
                workItemTypeColorAndIcons.setColorAndIcon(workItemColor.workItemTypeName, workItemColor.primaryColor, workItemColor.icon);
            }
        }

        return workItemTypeColorAndIcons;
    }

    /**
     * Map the object of DeliveryViewData to DeliveryTimeLineData type object
     * @param {DeliveryViewData} input Each iteration inside the team of DeliveryViewData
     * @param {ITeam[]} teams Array of teams
     * @param {IDictionaryStringTo<IItem>} cardIdToItem Dictionary of card id to card/item
     * @returns {DeliveryTimeLineData} Delivery view which is consumed by the client side
     */
    public saveToDeliveryTimeLineData(
        input: ServerDataWork.DeliveryViewData,
        teams: ITeam[],
        cardIdToItem: IDictionaryNumberTo<IItem>): DeliveryTimeLineData {

        let result = new DeliveryTimeLineData();
        result.id = input.id;
        result.teams = teams;
        result.itemMap = cardIdToItem;
        result.criteriaStatus = input.criteriaStatus;
        
        // If dates are available, convert to UTC to correct for browser shift. UTC time is the correct sprint date we want to display, with time at 00:00.
        // We are doing this here so that our pixel placement calculation in DeliveryTimelineBusinessLogic is correct. Dates must be placed correctly relative to each other, 
        // as well as relative to the calendar element,  which is created on the client and not shifted to local time.
        // It is much easier to do these calculations based off the correct dates we want to display, 
        // rather than following the normal pattern of converting dates right before you show them to the user. 
        result.worldStartDate = input.startDate ? Utils_Date.shiftToUTC(input.startDate) : input.startDate;
        result.worldEndDate = input.endDate ? Utils_Date.shiftToUTC(input.endDate) : input.endDate;

        return result;
    }

    /**
     * Overwrites and returns the default card settings with the card settings payload from the server
     * @param input - The card settings payload from the server
     */
    public mapCardSettings(cardSettings: ServerDataWork.CardSettings): ICardSettings {
        if (!cardSettings || !cardSettings.fields) {
            throw new Error("cardSettings must be defined.");
        }

        let fieldSettings = cardSettings.fields;
        let assignedToRenderingOption = this._mapAssignedToDisplayFormat(fieldSettings.assignedToDisplayFormat);
        let additionalFields: IAdditionalField[] = [];

        if (fieldSettings.additionalFields instanceof Array) {
            additionalFields = fieldSettings.additionalFields.map(field => { return { identifier: GUIDUtils.newGuid(), referenceName: field.referenceName, isValid: true } as IAdditionalField; });
        }

        let settings: ICardSettings = {
            showEmptyFields: fieldSettings.showEmptyFields,
            showId: fieldSettings.showId,
            showState: fieldSettings.showState,
            showTags: fieldSettings.showTags,
            showAssignedTo: fieldSettings.showAssignedTo,
            assignedToRenderingOption: assignedToRenderingOption,
            additionalFields: additionalFields
        };

        return settings;
    }

    public _mapFieldDefinitions(cardSettings: ServerDataWork.CardSettings): IFieldDefinition[] {
        let fields = [];
        if (cardSettings && cardSettings.fields) {
            const coreFields = cardSettings.fields.coreFields;
            const additionalFields = cardSettings.fields.additionalFields;
            if (coreFields instanceof Array) {
                fields = fields.concat(coreFields.map(field => { return { referenceName: field.referenceName, name: field.displayName, type: this._mapFieldType(field.fieldType), isIdentity: field.isIdentity } as IFieldDefinition; }));
            }
            if (additionalFields instanceof Array) {
                return fields = fields.concat(additionalFields.map(field => { return { referenceName: field.referenceName, name: field.displayName, type: this._mapFieldType(field.fieldType), isIdentity: field.isIdentity } as IFieldDefinition; }));
            }
        }
        return fields;
    }

    /**
     * Cover the case of receiving the value (integer) or the name of the enum
     */
    private _mapFieldType(fieldType: ServerDataWork.FieldType): FieldType {
        // string comparision instead of using enum type directly is because fieldType in card settings couldn't be mapped to 
        // enum by serializer since card settings is under properties which is any type. This can be resolved by strongly-typing
        // properties in the Plan object
        if (fieldType != undefined) {
            switch (fieldType.toString().toLowerCase()) {
                case ServerDataWork.FieldType[ServerDataWork.FieldType.Boolean].toLowerCase():
                    return FieldType.Boolean;
                case ServerDataWork.FieldType[ServerDataWork.FieldType.DateTime].toLowerCase():
                    return FieldType.DateTime;
                case ServerDataWork.FieldType[ServerDataWork.FieldType.Double].toLowerCase():
                    return FieldType.Double;
                case ServerDataWork.FieldType[ServerDataWork.FieldType.Integer].toLowerCase():
                    return FieldType.Integer;
                case ServerDataWork.FieldType[ServerDataWork.FieldType.PlainText].toLowerCase():
                    return FieldType.PlainText;
                case ServerDataWork.FieldType[ServerDataWork.FieldType.String].toLowerCase():
                    return FieldType.String;
                case ServerDataWork.FieldType[ServerDataWork.FieldType.TreePath].toLowerCase():
                    return FieldType.TreePath;
                default:
                    throw Error("Unknown field type");
            }
        }
        throw Error("Unknown field type");
    }

    private _mapAssignedToDisplayFormat(displayFormat: ServerDataWork.IdentityDisplayFormat): IdentityPickerRenderingOption {
        let renderingOption: IdentityPickerRenderingOption = IdentityPickerRenderingOption.AvatarAndFullName;
        if (displayFormat) {
            switch (displayFormat.toString().toLowerCase()) {
                case ServerDataWork.IdentityDisplayFormat[ServerDataWork.IdentityDisplayFormat.AvatarOnly].toLowerCase():
                    renderingOption = IdentityPickerRenderingOption.AvatarOnly;
                    break;
                case ServerDataWork.IdentityDisplayFormat[ServerDataWork.IdentityDisplayFormat.FullName].toLowerCase():
                    renderingOption = IdentityPickerRenderingOption.FullName;
                    break;
                default:
                    renderingOption = IdentityPickerRenderingOption.AvatarAndFullName;
                    break;
            }
        }

        return renderingOption;
    }

    /**
     * Convert the server side iteration to client side interval. Will convert local time back to UTC. 
     * @param {DeliveryViewData} fieldReferenceNames The field reference names for the work item data
     * @param {DeliveryViewData} partiallyPagedFieldReferenceNames The field reference names for partially paged workitems
     * @param {TimelineTeamIteration} iteration Each iteration inside the team of DeliveryViewData
     * @param {ITeam[]} cardIdToItem Dictionary of card id to card/item
     * @param {IDictionaryNumberTo<number>} childIdToParentIdMap Dictionary of id to its parent id
     * @returns {Interval} Client side interval which stands for each iteration. Internval time in UTC. Can return null if: System.id not defined, if missing data or overlap. 
     */
    public mapIterationToInterval(fieldReferenceNames: string[], partiallyPagedFieldReferenceNames: string[], iteration: ServerDataWork.TimelineTeamIteration, cardIdToItem: IDictionaryNumberTo<IItem>, childIdToParentIdMap?: IDictionaryNumberTo<number>): Interval {
        // extract the work items if there are any.
        let items = this.mapServerWorkItemsToItems(iteration.workItems, fieldReferenceNames, cardIdToItem, childIdToParentIdMap);
        if (!items) {
            // Invalid payload, abort creating the iteration
            return null;
        }

        // extract the unpaged workitems
        let unpagedItems = this.mapServerWorkItemsToItems(iteration.partiallyPagedWorkItems, partiallyPagedFieldReferenceNames) || [];

        // create the new interval (along with the work items from above).
        let newInterval = new Interval();
        newInterval.id = iteration.path;
        newInterval.name = iteration.name;
        newInterval.status = this.mapToIntervalStatus(iteration.status);
        newInterval.items = items;
        newInterval.unpagedItems = unpagedItems;

        // If dates are available, convert to UTC to correct for browser shift. UTC time is the correct sprint date we want to display, with time at 00:00.
        // We are doing this here so that our pixel placement calculation in DeliveryTimelineBusinessLogic is correct. Dates must be placed correctly relative to each other, 
        // as well as correctly relative to the calendar element, which is created on the client and not shifted to local time.
        // It is much easier to do these calculations based off the correct dates we want to display, 
        // rather than following the normal pattern of converting dates right before you show them to the user. 
        newInterval.startDate = iteration.startDate ? Utils_Date.shiftToUTC(iteration.startDate) : iteration.startDate;
        newInterval.endDate = iteration.finishDate ? Utils_Date.shiftToUTC(iteration.finishDate) : iteration.finishDate;

        return newInterval;
    }

    /**
     * Creates an interval that represents a team that requires configuration
     * @param {TeamStatus} status The team status
     * @returns {Interval} Client side interval which stands for each iteration
     */
    public createErrorInterval(status: TeamStatus): Interval {
        const newInterval = new Interval();
        newInterval.teamStatus = status;
        newInterval.id = GUIDUtils.newGuid();
        newInterval.name = "team-row-error";
        newInterval.startDate = new Date(Date.now());
        newInterval.endDate = new Date(Date.now());
        newInterval.status = this.mapToIntervalStatus({ type: ServerDataWork.TimelineIterationStatusCode.OK, message: null });
        newInterval.items = [];
        newInterval.unpagedItems = [];
        return newInterval;
    }

    /**
     * Convert the server side iteration to client side interval
     * @param {any[][]} workItems work item data
     * @param {DeliveryViewData} fieldReferenceNames The field reference names for the work item data
     * @param {ITeam[]} cardIdToItem Dictionary of card id to card/item. Optional, not used for unpaged items
     * @param {IDictionaryNumberTo<number>} childIdToParentIdMap Dictionary of id to its parent id
     * @returns {Interval} Client side interval which stands for each iteration. Can return null if: System.id not defined, if missing data or overlap.
     */
    public mapServerWorkItemsToItems(workItems: any[][], fieldReferenceNames: string[], cardIdToItem?: IDictionaryNumberTo<IItem>, childIdToParentIdMap?: IDictionaryNumberTo<number>): IItem[] {
        let items: IItem[] = [];
        if (workItems && workItems.length > 0) {

            let idIndex: number;
            if (fieldReferenceNames && fieldReferenceNames.length > 0) {
                idIndex = fieldReferenceNames.indexOf(CoreFieldRefNames.Id);
            } else {
                return null;
            }

            workItems.forEach(workItem => {
                let id = workItem[idIndex];
                let item = this.mapWorkItemToItem(fieldReferenceNames, workItem, id, childIdToParentIdMap ? childIdToParentIdMap[id] : undefined);
                items.push(item);
                if (cardIdToItem) {
                    cardIdToItem[id] = item;
                }
            });
        }

        return items;
    }

    /**
     * Map the server side work item to the client side item which is a card basically
     * @param {string[]} fieldReferenceNames fieldReferenceNames from DeliveryViewData
     * @param {any[]} workItem Each server side work item inside iteration
     * @param {number} id The value of id whose reference name is System.Id
     * @param {number} parentId The parent id of this work item
     * @returns {Item} client side item/card
     */
    public mapWorkItemToItem(fieldReferenceNames: string[], workItem: any[], id: number, parentId?: number): Item {
        let fieldValues = {} as IDictionaryStringTo<any>;
        fieldReferenceNames.forEach((refName, index) => {
            fieldValues[refName] = workItem[index];
        });

        return new Item(id, fieldValues, parentId);
    }

    /**
     * Construct the interval status from the TimelineIterationStatus.
     * @param status {TimelineIterationStatus} status from DeliveryViewData
     * @returns {IntervalStatus} the status
     */
    public mapToIntervalStatus(status: ServerDataWork.TimelineIterationStatus): IntervalStatus {
        let newStatus = new IntervalStatus();
        if (status && status.type) {
            newStatus.type = status.type;
            newStatus.message = status.message;
        } else {
            newStatus.type = ServerDataWork.TimelineIterationStatusCode.OK;
        }
        return newStatus;
    }

    /**
     * Map the timeline team to the client side team
     * @param team {TimelineTeamData} team object from DeliveryViewData
     * @param intervals {IInterval[]}
     * @param {workItemTypeColorAndIcons} Work item type colors and icons provider - used to get type colors and icons.
     * @returns {Team} client side view data
     */
    public mapTimelineTeamToTeam(team: ServerDataWork.TimelineTeamData, intervals: IInterval[], workItemTypeColorAndIcons: WorkItemTypeColorAndIcons): Team {
        if (!workItemTypeColorAndIcons) {
            throw new Error("workItemTypeColorAndIconsProvider is null");
        }

        // In the case of a team with an error the work item types and states will be null/undefined.
        let newTeam = new Team(team.id, new BacklogLevel(team.backlog.categoryReferenceName, team.backlog.pluralName, team.backlog.workItemTypes || [], team.backlog.workItemStates || []));
        newTeam.name = team.name;
        newTeam.projectId = team.projectId;
        newTeam.status = this.mapToTeamStatus(team.status);
        newTeam.intervals = intervals;
        newTeam.workItemTypeColorAndIcons = workItemTypeColorAndIcons;
        newTeam.orderField = team.orderByField;
        newTeam.teamFieldName = team.teamFieldName;
        newTeam.teamFieldDefaultValue = team.teamFieldDefaultValue;
        newTeam.teamFieldValues = team.teamFieldValues;
        return newTeam;
    }

    /**
     * Construct the team status from the TimelineTeamStatus.
     * @param status {TimelineTeamStatus} status from DeliveryViewData
     * @returns {TeamStatus} the status
     */
    public mapToTeamStatus(status: ServerDataWork.TimelineTeamStatus): TeamStatus {
        let newTeamStatus = new TeamStatus();
        if (status && status.type) {
            newTeamStatus.type = status.type;
            newTeamStatus.message = status.message;
        }
        return newTeamStatus;
    }

    /**
     * Map the server side work items to the client side items/cards
     * @param {WorkItem} input server side work items
     * @returns {IItems} client side items
     */
    public mapWorkItemsToItems(input: ServerDataWorkItemTracking.WorkItem[]): IItems {
        let items: Item[] = input.map(serverWorkItem => this.mapServerWorkItemToItem(serverWorkItem));

        return { cards: items } as IItems;
    }

    /**
     * Map each server side work item to client side item/card
     * @param {WorkItem} serverWorkItem single server side work item
     * @returns {Item} single client side item
     */
    public mapServerWorkItemToItem(serverWorkItem: ServerDataWorkItemTracking.WorkItem): Item {
        let fieldData: IDictionaryStringTo<any> = {};

        for (let key in serverWorkItem.fields) {
            if (serverWorkItem.fields.hasOwnProperty(key)) {
                fieldData[key] = serverWorkItem.fields[key];
            }
        }

        return new Item(serverWorkItem.id, fieldData);
    }
}
