// Copyright (c) Microsoft Corporation.  All rights reserved.
import Q = require("q");
import Context = require("VSS/Context");
import Diag = require("VSS/Diag");
import MenuItemHelpers = require("WorkItemTracking/Scripts/MenuItems/MenuItemHelpers");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { RecycleBinTelemetryConstants  } from "WorkItemTracking/Scripts/RecycleBinConstants";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemCategoryConstants } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { WorkItemPermissionDataHelper } from "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";
import { IWorkItemTypeCategory } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

export interface DeleteMenuItemProperties {
    ciFeatureName: string;
    ciSourceAreaName: string;
    text: string;
    workItemIds: number[];
    workItemTypeNames: string[];
    tfsContext: TFS_Host_TfsContext.TfsContext;
    refreshRequired: boolean;
    readWorkItemsBeforeDeletion: boolean;
    groupId: string;
    rank?: number;
    errorCallback?: IArgsFunctionR<any>;
    successCallback?: IArgsFunctionR<any>;
}

// export for unit tests
export function getMenuItemProperties(context: any): DeleteMenuItemProperties {
    let deleteMenuItemProperties = {
        ciFeatureName: RecycleBinTelemetryConstants.CONTEXT_MENU,
        ciSourceAreaName: "",
        text: WITResources.DeleteWorkItemDeleteButtonText,
        workItemIds: [],
        workItemTypeNames: [],
        tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
        refreshRequired: false,
        readWorkItemsBeforeDeletion: false,
        groupId: "modify",
        errorCallback: undefined,
        rank: undefined
    }
    let menuItemLocation = MenuItemHelpers.GetContextMenuLocation(context);

    // extract selected work item ids depending on which contribution point
    if (menuItemLocation === MenuItemHelpers.MenuItemLocation.Backlog) {
        // work items on backlog view
        deleteMenuItemProperties.ciSourceAreaName = RecycleBinTelemetryConstants.BACKLOG_SOURCE;
        deleteMenuItemProperties.text = WITResources.DeleteSelectedWorkItems;
        deleteMenuItemProperties.workItemIds = context.workItemIds;
        deleteMenuItemProperties.workItemTypeNames = context.workItemTypeNames;
        deleteMenuItemProperties.refreshRequired = context.refreshRequired;
        deleteMenuItemProperties.readWorkItemsBeforeDeletion = context.readWorkItemsBeforeDeletion;
        deleteMenuItemProperties.rank = 50;
    }
    else if (menuItemLocation === MenuItemHelpers.MenuItemLocation.Taskboard) {
        // Taskboard
        deleteMenuItemProperties.ciSourceAreaName = RecycleBinTelemetryConstants.TASK_BOARD_SOURCE;
        deleteMenuItemProperties.workItemIds = context.id && [context.id];
        deleteMenuItemProperties.workItemTypeNames = context.workItemType && [context.workItemType];
    }
    else if (menuItemLocation === MenuItemHelpers.MenuItemLocation.Kanban) {
        // Kanban
        deleteMenuItemProperties.ciSourceAreaName = RecycleBinTelemetryConstants.KANBAN_SOURCE;
        deleteMenuItemProperties.workItemIds = context.id && [context.id];
        deleteMenuItemProperties.workItemTypeNames = context.workItemType && [context.workItemType];
    }
    else if (menuItemLocation === MenuItemHelpers.MenuItemLocation.Queries) {
        // work items on queries view
        deleteMenuItemProperties.ciSourceAreaName = RecycleBinTelemetryConstants.WORK_ITEMS_VIEW_SOURCE;
        deleteMenuItemProperties.text = WITResources.DeleteSelectedWorkItems;
        deleteMenuItemProperties.workItemIds = context.ids;
        deleteMenuItemProperties.workItemTypeNames = context.workItemTypeNames;
        deleteMenuItemProperties.tfsContext = context.tfsContext;
        deleteMenuItemProperties.rank = 25;
        // This is required to support scenario when user selects few test and few non test workitems in queries page
        // and we should allow deletion of non test work items, hence need to read to get test work item types
        let pageContext = Context.getPageContext();
        deleteMenuItemProperties.readWorkItemsBeforeDeletion = true;
    }
    else if (menuItemLocation === MenuItemHelpers.MenuItemLocation.WorkItemForm) {
        // work item form
        deleteMenuItemProperties.ciFeatureName = RecycleBinTelemetryConstants.WORK_ITEMS_FORM_SOURCE;
        deleteMenuItemProperties.ciSourceAreaName = RecycleBinTelemetryConstants.WORK_ITEMS_VIEW_SOURCE;
        deleteMenuItemProperties.workItemIds = context.workItemId && [context.workItemId];
        deleteMenuItemProperties.workItemTypeNames = context.workItemTypeName && [context.workItemTypeName];
        deleteMenuItemProperties.tfsContext = context.tfsContext;
        deleteMenuItemProperties.groupId = "core";
    }
    else {
        Diag.Debug.assert(false, "Unknown contribution point");
    }

    return deleteMenuItemProperties;
};

export interface TestAndNonTestWorkItemTypes {
    testTypes: string[];
    nonTestTypes: string[];
}

export class WorkItemCategorization {
    public static TestAndNonTestWorkItemTypes: TestAndNonTestWorkItemTypes = {
        testTypes: [],
        nonTestTypes: []
    };

    /**
     * Categorize the passed workItem types into test and non test categories
     * @param workItemTypes
     * @param projectId Optionally specify the projectId to be used. Defaults to the navigation context, if not specified
     */
    public static categorizeWorkItemTypes(workItemTypes: string[], projectId?: string): IPromise<TestAndNonTestWorkItemTypes> {
        var deferred: Q.Deferred<TestAndNonTestWorkItemTypes> = Q.defer<TestAndNonTestWorkItemTypes>();
        this.TestAndNonTestWorkItemTypes = {
            testTypes: [],
            nonTestTypes: []
        };

        this.getAllTestWorkItemTypes(projectId).then((testWorkItemTypesMap) => {
            if (workItemTypes) {
                $.each(workItemTypes, (index: number, workItemType: string) => {
                    if (testWorkItemTypesMap && testWorkItemTypesMap[workItemType]) {
                        this.TestAndNonTestWorkItemTypes.testTypes.push(workItemType);
                    }
                    else {
                        this.TestAndNonTestWorkItemTypes.nonTestTypes.push(workItemType);
                    }
                });
            }

            deferred.resolve(this.TestAndNonTestWorkItemTypes);
        },
            (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * Get all test work item types belongs to TestPlan, TestSuite, TestCase, SharedParameter & SharedSteps
     * category.
     * If we expect this to be called without an explicit project in the navigation context,
     * be sure to pass projectId explicitly.
     * @param projectId Optionally specify the projectId to be used.
     *                  Defaults to the navigation context, if not specified
     */
    public static getAllTestWorkItemTypes(projectId?: string): IPromise<IDictionaryStringTo<string>> {
        const deferred: Q.Deferred<IDictionaryStringTo<string>> = Q.defer<IDictionaryStringTo<string>>();

        const testCategories = [
            WorkItemCategoryConstants.TEST_CASE,
            WorkItemCategoryConstants.TEST_PLAN,
            WorkItemCategoryConstants.TEST_SUITE,
            WorkItemCategoryConstants.TEST_SHAREDPARAMETER,
            WorkItemCategoryConstants.TEST_SHAREDSTEP
        ];

        // Creating the store
        const store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        const testWorkItemTypeDict: IDictionaryStringTo<string> = {};

        store.beginGetProject(projectId || TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId, (project: WITOM.Project) => {
            project.beginGetWorkItemCategories((allCategories: IDictionaryStringTo<IWorkItemTypeCategory>) => {
                $.each(testCategories, (index: number, categoryName: string) => {
                    if (allCategories && allCategories[categoryName]) {
                        const testCategory = allCategories[categoryName];
                        $.each(testCategory.workItemTypeNames, (index: number, name: string) => {
                            testWorkItemTypeDict[name] = categoryName;
                        });
                    }
                });

                deferred.resolve(testWorkItemTypeDict);
            },
                (error) => {
                    deferred.reject(error);
                });
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }
}

// Check if we need to hide delete menu item.  Hide if no items are selected or the user doesn't have permission
export function hideDeleteMenuItem(clientHost: string, context: any, menuProperties: DeleteMenuItemProperties): boolean {
    if (context.hideDelete) {
        return true;
    }

    //Check to see if we have permission data ... if we have the data and user do not have permission do not show the delete context menu
    if (WorkItemPermissionDataHelper.isPopulated()) {
        const isDeleteSupported = WorkItemPermissionDataHelper.hasWorkItemDeletePermission() && !clientHost;
        if (!isDeleteSupported) {
            return true;
        }
    }

    // We hide the delete menu item if no work items are selected (menuProperties.workItemIds.length === 0). 
    if (!menuProperties.workItemTypeNames || !menuProperties.workItemIds || menuProperties.workItemIds.length === 0) {
        return true;
    }

    return false;
}

// Check if we need to hide permanently delete menu item for test work item
export function hidePermanentlyDeleteMenuItemForTestWorkItem(clientHost: string, context: any, menuProperties: DeleteMenuItemProperties): boolean {
    if (context.hideDelete) {
        return true;
    }

    // Check if workItemTypes or workItemIds are undefined or workItemIds/workItemTypes length is 0, no need to show delete contribution
    if (!isValidWorkItem(menuProperties)) {
        return true;
    }

    //Check to see if we have permission data ... if we have the data and user does not have permission, do not show the permanent delete context menu for test work items
    if (WorkItemPermissionDataHelper.isPopulated()) {
        const isPermanentDeleteSupported = WorkItemPermissionDataHelper.hasWorkItemDeletePermission()
            && WorkItemPermissionDataHelper.hasWorkItemDestroyPermission() && !clientHost;
        if (!isPermanentDeleteSupported) {
            return true;
        }
    }

    return false;
}

function isValidWorkItem(menuProperties: DeleteMenuItemProperties): boolean {
    // Check if workItemTypes or workItemIds are undefined or workItemIds/workItemTypes length is 0, no need to show delete contribution
    if (!menuProperties.workItemTypeNames || menuProperties.workItemTypeNames.length === 0
        || !menuProperties.workItemIds || menuProperties.workItemIds.length === 0) {
        return false;
    }

    return true;
}
