// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict"

import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import Search_Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Server_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_String = require("VSS/Utils/String");
import WorkItemContracts = require("Search/Scripts/Contracts/TFS.Search.WorkItem.Contracts");
import {WorkItemConstants} from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

import VSS = require("VSS/VSS");
import Q = require("q");

var ignoreCaseComparer = (column, order, rowA, rowB) => {
    let fieldRefName = column.name ? column.name.toLowerCase() : null,
        v1 = rowA.flattenFields[fieldRefName] ? rowA.flattenFields[fieldRefName].value : null,
        v2 = rowB.flattenFields[fieldRefName] ? rowB.flattenFields[fieldRefName].value : null,
        id1 = rowA.flattenFields["system.id"] ? rowA.flattenFields["system.id"].value : null,
        id2 = rowB.flattenFields["system.id"] ? rowB.flattenFields["system.id"].value : null,
        compareValue = Utils_String.ignoreCaseComparer(v1, v2);

    // if string values are same break the tie using work item id.
    return compareValue !== 0 ? compareValue : id1 - id2;
};

var numericComparer = (column, order, rowA, rowB) => {
    let fieldRefName = column.name ? column.name.toLowerCase() : null,
        v1 = rowA.flattenFields[fieldRefName] ? rowA.flattenFields[fieldRefName].value : null,
        v2 = rowB.flattenFields[fieldRefName] ? rowB.flattenFields[fieldRefName].value : null;

    if (Utils_String.ignoreCaseComparer(fieldRefName, "relevance") === 0) {
        v1 = rowA.relevance;
        v2 = rowB.relevance;
    }

    return v1 - v2;
};

var dateTimeComparer = (column, order, rowA, rowB) => {
    let fieldRefName = column.name ? column.name.toLowerCase() : null,
        v1 = rowA.flattenFields[fieldRefName] ? rowA.flattenFields[fieldRefName].value : null,
        v2 = rowB.flattenFields[fieldRefName] ? rowB.flattenFields[fieldRefName].value : null,
        id1 = rowA.flattenFields["system.id"] ? rowA.flattenFields["system.id"].value : null,
        id2 = rowB.flattenFields["system.id"] ? rowB.flattenFields["system.id"].value : null,
        d1 = new Date(v1),
        d2 = new Date(v2),
        compareValue = d1.getTime() - d2.getTime();

    // if date time values are same break the tie using work item id.
    return compareValue !== 0 ? compareValue : id1 - id2;
};

export class WorkItemCommon {
    public static FIELD_METADATA: any = {
        "system.assignedto": { displayName: Search_Resources.WorkItemSearchAssignedToField, width: 100, canSortBy: true, comparer: ignoreCaseComparer, hidden: { "right": false, "bottom": false }, fieldType: WorkItemContracts.FieldType.Identity },
        "system.changeddate": { displayName: Search_Resources.WorkItemSearchChangedDateField, width: 100, canSortBy: true, comparer: dateTimeComparer, hidden: { "right": false, "bottom": false }, fieldType: WorkItemContracts.FieldType.DateTime },
        "system.createddate": { displayName: Search_Resources.WorkItemSearchCreatedDateField, width: 100, canSortBy: true, comparer: dateTimeComparer, hidden: { "right": false, "bottom": false }, fieldType: WorkItemContracts.FieldType.DateTime },
        "system.id": { displayName: Search_Resources.WorkItemSearchIDField, width: 80, canSortBy: true, comparer: numericComparer, hidden: { "right": false, "bottom": false }, fieldType: WorkItemContracts.FieldType.Integer },
        "system.state": { displayName: Search_Resources.WorkItemSearchStateField, width: 100, canSortBy: true, comparer: ignoreCaseComparer, hidden: { "right": false, "bottom": false }, fieldType: WorkItemContracts.FieldType.String },
        "system.tags": { displayName: Search_Resources.WorkItemSearchTagsField, width: 100, canSortBy: true, comparer: ignoreCaseComparer, hidden: { "right": false, "bottom": false }, fieldType: WorkItemContracts.FieldType.String },
        "system.title": { displayName: Search_Resources.WorkItemSearchTitleField, width: 350, canSortBy: true, comparer: ignoreCaseComparer, hidden: { "right": false, "bottom": false }, fieldType: WorkItemContracts.FieldType.String },
        "system.workitemtype": { displayName: Search_Resources.WorkItemSearchWorkItemTypeField, width: 100, canSortBy: true, comparer: ignoreCaseComparer, hidden: { "right": false, "bottom": false }, fieldType: WorkItemContracts.FieldType.String },
        "system.rev": { displayName: Search_Resources.WorkItemSearchRevisionField, width: 100, canSortBy: false, hidden: { "right": true, "bottom": true } },
        // this is non-exising field solely for the purpose of showing work item search results in grid view
        "relevance": { displayName: Search_Resources.WorkItemSearchRelevance, width: 0, canSortBy: true, comparer: numericComparer, hidden: { "right": true, "bottom": true } }
    }

    public static getWITColorsAndIconData(items: Array<any>, callback: any): void {
        let startTime = Performance.getTimestamp(),
            projects: string[] = items.map(x => x.project);

        let stateColorsProvider: WorkItemStateColorsProvider = WorkItemStateColorsProvider.getInstance(),
            projectsForStateToFetch = projects
                .filter((x, i) => projects.indexOf(x) === i) // remove duplicates.
                .filter(x => !stateColorsProvider.isPopulated(x)),
            stateColors = {};

        let constructColorsArrayDelegate = () => {
            for (let item of items) {
                let workItemId = item.flattenFields["system.id"].value,
                    workItemType = item.flattenFields["system.workitemtype"].value,
                    state = item.flattenFields["system.state"].value;
                stateColors[workItemId] = stateColorsProvider.getColor(item.project, workItemType, state);
            }

            TelemetryHelper.TelemetryHelper.traceLog({
                "WorkItemSearchWorkItemColorDataE2ETime": Performance.getTimestamp() - startTime
            });

            callback(stateColors);
        };

        // in scenarios where colors is required for rendering even when the results set isn't changed at all e.g. sorting
        // we want to avoid latency caused by q promise resolution hence this flow.
        if (projectsForStateToFetch.length === 0) {
            constructColorsArrayDelegate();
        }
        else {
            if (projectsForStateToFetch.length > 0) {
                stateColorsProvider.ensureColorsArePopulated(projectsForStateToFetch).then(
                    () => {
                        constructColorsArrayDelegate();
                    }
                );
            }
        }
    }

    private static _getApiLocation(tfsContext: any, controller: string, action?: string, params?: any): string {
        /// <param name="action" type="string" optional="true" />
        /// <param name="params" type="Object" optional="true" />
        return tfsContext.getActionUrl(action || "", controller, $.extend({ area: "api" }, params));
    }
}

export const HASH_GLOBAL_REGEX = /#/g;

/**
 * Represents work item state color settings for a project.
 */
export interface IProjectStateColors {
    projectName: string;
    workItemTypeStateColors: IWorkItemTypeStateColors[];
}

/**
 * Represents work item state colors for a workitemtype.
 */
export interface IWorkItemTypeStateColors {
    workItemTypeName: string;
    stateColors: IStateColor[];
}

// IWorkItemStateColor JSON object model
export interface IStateColor {
    name: string;
    color: string;
}

export class Utils {
    public static getComparer(fieldReferenceName: string, sortOrder: string): any {
        if (Utils_String.ignoreCaseComparer("relevance", fieldReferenceName) === 0) {
            return (first: WorkItemContracts.WorkItemResult, second: WorkItemContracts.WorkItemResult) => {
                let diff = first.relevance - second.relevance;

                if (sortOrder === "desc") {
                    return -diff;
                }

                return diff;
            }
        }

        let sortFieldType: WorkItemContracts.FieldType = WorkItemCommon.FIELD_METADATA[fieldReferenceName] ?
            WorkItemCommon.FIELD_METADATA[fieldReferenceName].fieldType :
            null,
            compareDelegate: Function;

        if (sortFieldType === WorkItemContracts.FieldType.DateTime) {
            compareDelegate = (first: string, second: string) => {
                let d1 = new Date(first),
                    d2 = new Date(second);
                return d1.getTime() - d2.getTime();
            }
        }
        else if (sortFieldType === WorkItemContracts.FieldType.Integer) {
            compareDelegate = (first: string, second: string) => {
                let v1 = parseInt(first),
                    v2 = parseInt(second);

                return v1 - v2;
            }
        }
        else {
            compareDelegate = Utils_String.ignoreCaseComparer;
        }

        return (
            (refName: string, order: string, comparisonDelegate: Function) => {
                return (first: WorkItemContracts.WorkItemResult, second: WorkItemContracts.WorkItemResult) => {
                    let v1 = first.flattenFields[refName].value.toString(),
                        v2 = second.flattenFields[refName].value.toString(),
                        compareValue = comparisonDelegate(v1, v2);

                    // if field to sort on have same values in both rows, then break the tie based on the work item id.
                    if (compareValue === 0) {
                        let id1 = first.flattenFields["system.id"].value,
                            id2 = second.flattenFields["system.id"].value

                        compareValue = id1 - id2;
                    }


                    if (order === "desc") {
                        return -compareValue;
                    }

                    return compareValue;
                };
            })(fieldReferenceName, sortOrder, compareDelegate);
    }

    public static sort(source: any, comparer: any): Array<any> {
        let sortedArray: Array<any>;
        if (source && $.isArray(source) && comparer) {
            sortedArray = (source as Array<any>).sort(comparer);
        }

        return sortedArray;
    }

    public static getStateCircleColor(workItemId: string, stateColorsMap: any): any {
        let border: string = "",
            color = stateColorsMap[parseInt(workItemId)];

        // if color is white
        if (color && Utils_String.ignoreCaseComparer(
            color.replace(HASH_GLOBAL_REGEX, ""), "ffffff") === 0) {
            border = "5688e0";
        }
        else if (color) {
            // in normal scenarios border and color are same.
            border = color;
        }

        return {
            "border": border,
            "fill": color
        };
    }
}