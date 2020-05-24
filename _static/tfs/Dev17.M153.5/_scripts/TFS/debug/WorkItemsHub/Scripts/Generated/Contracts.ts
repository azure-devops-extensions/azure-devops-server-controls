
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.Server.WebAccess.WorkItemsHub.Plugins
//----------------------------------------------------------

import Presentation_Scripts_TFS_Generated_TFS_WorkItemTracking_Contracts = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Contracts");

export interface WorkItemsHubColumnOption {
    fieldReferenceName: string;
    width: number;
}

export interface WorkItemsHubColumnSettings {
    columnOptions: WorkItemsHubColumnOption[];
    sortOptions: WorkItemsHubSortOption[];
    version: number;
}

export interface WorkItemsHubData {
    fieldValues: Presentation_Scripts_TFS_Generated_TFS_WorkItemTracking_Contracts.SecuredGenericData[];
    pageContext: WorkItemsHubPageContext;
    permission: WorkItemsHubPermissionsData;
    processSettings: WorkItemsHubProcessData;
    userSettings: WorkItemsHubUserSettings;
}

export interface WorkItemsHubOldSortOption {
    fieldReferenceName: string;
    isAscending: boolean;
}

export interface WorkItemsHubPageContext {
    fieldReferenceNames: string[];
    fieldValues: any[][];
    unpagedWorkItemIds: number[];
}

export interface WorkItemsHubPermission {
    hasPermission: boolean;
}

export interface WorkItemsHubPermissionsData {
    newWorkItem: WorkItemsHubPermission;
    personalView: WorkItemsHubPermission;
    query: WorkItemsHubPermission;
    sendEmail: WorkItemsHubPermission;
}

export interface WorkItemsHubProcessData {
    defaultOrderByClause: string;
    defaultSortOptions: WorkItemsHubSortOption[];
    defaultWhereClause: string;
    doneStateNames: string[];
    featureNotSupported: boolean;
    featureNotSupportedReason: string;
    fieldFriendlyNames: string[];
    fieldReferenceNames: string[];
    tabId: string;
    unsortableFieldReferenceNames: string[];
    wiqlTemplate: string;
}

export interface WorkItemsHubSortOption {
    fieldReferenceName: string;
    isAscending: boolean;
}

export interface WorkItemsHubUserSettings {
    columnSettings: WorkItemsHubColumnSettings;
    filter: { [key: string]: Presentation_Scripts_TFS_Generated_TFS_WorkItemTracking_Contracts.WorkItemFilter; };
    showCompleted: boolean;
}

