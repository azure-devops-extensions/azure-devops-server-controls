import { IMenuItemSpec } from "VSS/Controls/Menus";
import Context = require("VSS/Context");
import Events_Services = require("VSS/Events/Services");
import SDK_Shim = require("VSS/SDK/Shim");
import VSS = require("VSS/VSS");
import DeleteMenuItemHelper = require("WorkItemTracking/Scripts/MenuItems/DeleteMenuItemCommonHelper");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import * as WITControlsRecycleBin_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";
import * as RecycleBinConstants_Async from "WorkItemTracking/Scripts/RecycleBinConstants";

import WitControls_NO_REQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");

const eventSvc = Events_Services.getService();

(function () {
    const deleteMenu = {
        getMenuItems
    };

    // Fullqualified path for work item delete menu
    SDK_Shim.VSS.register("ms.vss-work-web.work-item-delete-menu", deleteMenu);
}());

let recycleBinControlsModule: typeof WITControlsRecycleBin_Async;
let recycleBinConstantsModule: typeof RecycleBinConstants_Async;
export function getMenuItems(context): IMenuItemSpec[] {
    const pageContext = Context.getPageContext();
    const clientHost = pageContext.webAccessConfiguration.clientHost;
    const menuProperties = DeleteMenuItemHelper.getMenuItemProperties(context);

    if (DeleteMenuItemHelper.hideDeleteMenuItem(clientHost, context, menuProperties)) {
        return [];
    }

    const menuItems: IMenuItemSpec[] = [{
        id: "work-item-delete",
        groupId: menuProperties.groupId,
        rank: menuProperties.rank,
        text: menuProperties.text,
        icon: "css://bowtie-icon bowtie-edit-delete",
        showText: true,
        setTitleOnlyOnOverflow: true,
        hidden: true, // by default hide the menu item
        action: (actionContext) => {
            const deleteAction = (recycleBinControls: typeof WITControlsRecycleBin_Async, recycleBinConstants: typeof RecycleBinConstants_Async) => {
                recycleBinControls.RecycleBinTelemetry.publish(
                    recycleBinConstants.RecycleBinTelemetryConstants.WORKITEM_DELETE_PROMPT,
                    menuProperties.ciFeatureName,
                    menuProperties.ciSourceAreaName);

                recycleBinControls.DeleteConfirmationDialog.showDialog(menuProperties.refreshRequired, () => {
                    const invokeCloseWorkItemFormDialogDelegate = () => {
                        if ($.isFunction(actionContext.closeWorkItemFormDialogDelegate)) {
                            actionContext.closeWorkItemFormDialogDelegate();
                        }
                    };
                    const launchedFromWorkItemForm = (actionContext.workItemAvailable !== undefined);
                    if (launchedFromWorkItemForm) {
                        menuProperties.successCallback = invokeCloseWorkItemFormDialogDelegate;
                        menuProperties.errorCallback = (error) => {
                            VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"], (_WitControls: typeof WitControls_NO_REQUIRE) => {
                                eventSvc.fire(_WitControls.WorkItemActions.WORKITEM_DELETE_ERROR, null, error.serverError || { message: error.message });
                            });
                        };
                    } else {
                        invokeCloseWorkItemFormDialogDelegate();
                    }

                    const testWorkItemTypes = DeleteMenuItemHelper.WorkItemCategorization.TestAndNonTestWorkItemTypes.testTypes;
                    recycleBinControls.RecycleBin.beginDeleteWorkItems(
                        menuProperties.ciFeatureName,
                        menuProperties.ciSourceAreaName,
                        menuProperties.tfsContext,
                        menuProperties.workItemIds,
                        menuProperties.readWorkItemsBeforeDeletion,
                        menuProperties.refreshRequired,
                        launchedFromWorkItemForm, // suppressFailureNotification to avoid duplicate errors being shown up on the form as well as the host page
                        testWorkItemTypes, // pass to exclude these test work items for deletion
                        menuProperties.successCallback,
                        menuProperties.errorCallback);
                });
            };

            if (recycleBinControlsModule && recycleBinConstantsModule) {
                deleteAction(recycleBinControlsModule, recycleBinConstantsModule);
            } else {
                VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin", "WorkItemTracking/Scripts/RecycleBinConstants"]).spread((WITControlsRecycleBin: typeof WITControlsRecycleBin_Async, RecycleBinConstants: typeof RecycleBinConstants_Async) => {
                    recycleBinControlsModule = WITControlsRecycleBin;
                    recycleBinConstantsModule = RecycleBinConstants;

                    deleteAction(recycleBinControlsModule, recycleBinConstantsModule);
                });
            }
        }
    }];

    // Check if test work item deletion feature flag enabled, if enabled Categorize given workItemTypes into test and non-test
    // work item types. If there are no test work items selected, we want to enable delete.  If there is a test item selected, then we don't want
    // to show the Delete item, instead we show the Permanently Destroy menu item 
    
        DeleteMenuItemHelper.WorkItemCategorization.categorizeWorkItemTypes(menuProperties.workItemTypeNames, context.currentProjectGuid)
            .then((testAndNonTestWorkItemTypes) => {
                if (testAndNonTestWorkItemTypes.testTypes.length === 0) {
                    menuItems[0].hidden = false;
                    context.updateMenuItems(menuItems);
                }
            });
    

    // check if work item is dirty then show delete menu as disabled
    if (context.workItemDirty) {
        menuItems[0].disabled = true;
    }

    return menuItems;
}
