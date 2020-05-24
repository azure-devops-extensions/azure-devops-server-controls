// Copyright (c) Microsoft Corporation.  All rights reserved.

import Q = require("q");
import { IMenuItemSpec } from "VSS/Controls/Menus";
import Context = require("VSS/Context");
import Events_Services = require("VSS/Events/Services");
import SDK_Shim = require("VSS/SDK/Shim");
import VSS = require("VSS/VSS");
import DeleteMenuItemHelper = require("WorkItemTracking/Scripts/MenuItems/DeleteMenuItemCommonHelper");
import * as Resources_Async from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as TCMTelemetry_Async from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import TestWorkItemDeleteDialog_Async = require("WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog");
import WitControls_Async = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");

const eventSvc = Events_Services.getService();

(function () {
    const testDeleteMenu = {
        getMenuItems
    };

    // Fullqualified path for test item delete menu
    SDK_Shim.VSS.register("ms.vss-test-web.test-work-item-delete-menu", testDeleteMenu);
}());

export function getMenuItems(context): IPromise<IMenuItemSpec[]> {
    const pageContext = Context.getPageContext();
    const clientHost = pageContext.webAccessConfiguration.clientHost;
    const menuProperties = DeleteMenuItemHelper.getMenuItemProperties(context);

    if (DeleteMenuItemHelper.hidePermanentlyDeleteMenuItemForTestWorkItem(clientHost, context, menuProperties)) {
        return Promise.resolve([]);
    }

    return VSS.requireModules(["TestManagement/Scripts/Resources/TFS.Resources.TestManagement", "TestManagement/Scripts/TFS.TestManagement.Telemetry"]).spread(
        (Resources: typeof Resources_Async, TCMTelemetry: typeof TCMTelemetry_Async) => {
            const TelemetryService = TCMTelemetry.TelemetryService;

            const menuItems: IMenuItemSpec[] = [{
                id: "test-work-item-delete",
                groupId: menuProperties.groupId,
                rank: menuProperties.rank,
                title: Resources.PermanentDeleteTestWorkItemToolTip,
                text: Resources.PermanentDeleteTestWorkItem,
                icon: "css://bowtie-icon bowtie-edit-delete",
                showText: true,
                hidden: true,
                action: (actionContext) => {
                    TelemetryService.publishEvents(TelemetryService.featureDeleteTestWorkItem,
                        {
                            "LaunchPoint": menuProperties.ciFeatureName,
                            "SourceArea": menuProperties.ciSourceAreaName,
                            "WorkItemTypes": menuProperties.workItemTypeNames
                        });

                    VSS.using(["WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog"], (dialog: typeof TestWorkItemDeleteDialog_Async) => {
                        const workItemType = menuProperties.workItemTypeNames[0];
                        const workItemId = menuProperties.workItemIds[0];
                        const project = context.currentProjectGuid || (context.workItemProjects && context.workItemProjects[workItemId]);
                        dialog.getTestWorkItemDeleteConfirmationDialog(workItemType, project).then((testWorkItemDeleteDialog) => {
                            testWorkItemDeleteDialog.showDialog(workItemId, workItemType, () => {
                                let invokeCloseWorkItemFormDialogDelegate = () => {
                                    if ($.isFunction(actionContext.closeWorkItemFormDialogDelegate)) {
                                        actionContext.closeWorkItemFormDialogDelegate();
                                    }
                                };
                                let launchedFromWorkItemForm = (actionContext.workItemAvailable !== undefined);
                                if (launchedFromWorkItemForm) {
                                    menuProperties.successCallback = invokeCloseWorkItemFormDialogDelegate;
                                    menuProperties.errorCallback = (error) => {
                                        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"], (WitControls: typeof WitControls_Async) => {
                                            let eventArgs = error.serverError;
                                            if (error.message) {
                                                eventArgs = { message: error.message };
                                            }

                                            eventSvc.fire(WitControls.WorkItemActions.WORKITEM_DELETE_ERROR, null, eventArgs);
                                        });
                                    };
                                }
                                else {
                                    invokeCloseWorkItemFormDialogDelegate();
                                }

                                testWorkItemDeleteDialog.deleteTestWorkItem(
                                    menuProperties.ciFeatureName,
                                    menuProperties.ciSourceAreaName,
                                    workItemId,
                                    launchedFromWorkItemForm, // suppressFailureNotification to avoid duplicate errors being shown up on the form as well as the host page
                                    menuProperties.successCallback,
                                    menuProperties.errorCallback);
                            });
                        });
                    });
                }
            }];

            // Categorize given workItemTypes into test and non test work item types, if there are no non-test work item
            // then unhide this contribution, if multiple test work items selected then disable the contribution
            DeleteMenuItemHelper.WorkItemCategorization.categorizeWorkItemTypes(menuProperties.workItemTypeNames, context.currentProjectGuid)
                .then((testAndNonTestWorkItemTypes) => {
                    if (testAndNonTestWorkItemTypes.nonTestTypes.length === 0 && testAndNonTestWorkItemTypes.testTypes.length > 0) {
                        if (menuProperties.workItemIds.length === 1) {
                            menuItems[0].hidden = false;
                            context.updateMenuItems(menuItems);
                        }
                        else {
                            menuItems[0].hidden = false;
                            menuItems[0].disabled = true;
                            context.updateMenuItems(menuItems);
                        }
                    }
                });

            // check if work item is dirty then show delete menu as disabled
            if (context.workItemDirty) {
                menuItems[0].disabled = true;
            }

            return menuItems;
        });
}
