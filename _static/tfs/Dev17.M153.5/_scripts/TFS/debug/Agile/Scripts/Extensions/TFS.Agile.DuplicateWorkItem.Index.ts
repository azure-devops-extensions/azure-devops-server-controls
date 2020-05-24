/// <amd-dependency path='VSS/LoaderPlugins/Css!DuplicateWorkItem' />

import Q = require("q");
import VSSError = require("VSS/Error");
import Diag = require("VSS/Diag");

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

import Telemetry_Services = require("VSS/Telemetry/Services");

import Dialogs = require("VSS/Controls/Dialogs");
import SDK_Shim = require("VSS/SDK/Shim");

import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import Events_Document = require("VSS/Events/Document");
import { WorkItemDocument } from "WorkItemTracking/Scripts/Utils/WorkItemDocument";

import DuplicateWorkItemManager = require("Agile/Scripts/Extensions/TFS.Agile.DuplicateWorkItem");
import DuplicateFormDialog = require("Agile/Scripts/Extensions/TFS.Agile.DuplicateWorkItem.DuplicateFormDialog");
import ExtensionResources = require("Agile/Scripts/Resources/TFS.Resources.AgileExtensionsDuplicateWorkItem");

import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");

var contributionHandler = () => {
    var currentWorkItem: WITOM.WorkItem;
    var commonSettings = {
        width: 600,
        minWidth: 550,
        height: 475,
        minHeight: 440,
        title: ExtensionResources.ToolbarButtonTitle,
        useLegacyStyle: true,
        attachResize: true
    };

    var launchManageDuplicatesDialog = function () {
        var manager = new DuplicateWorkItemManager.DuplicateWorkItemService(config);
        var options: DuplicateFormDialog.IDialogOptions = $.extend(commonSettings, options);
        options.workItem = currentWorkItem;

        manager.findPrimary(currentWorkItem.id).then(primaryItem => {
            options.primaryWorkItem = primaryItem;
            options.configuration = config;

            Dialogs.show(DuplicateFormDialog.ManageDuplicateDialog, options);
        });

        Telemetry_Services.publishEvent(new Telemetry_Services.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE, "DuplicateWorkItem", {
                "action": "OpenDialog",
                "workItemType": currentWorkItem.workItemType.name
            }));
    };

    var bindWorkItem = function (workItemId: number) {
        let workItemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        let manager = WorkItemManager.get(workItemStore);

        currentWorkItem = manager.getWorkItem(workItemId);
    }

    // Prefetch configuration
    var config: DuplicateWorkItemManager.Configuration.IConfiguration;
    var configPromise = DuplicateWorkItemManager.Configuration.load().then(c => {
        config = c;
    });

    var menuItem = {
        id: 'manage-duplicates',
        text: ExtensionResources.ToolbarButtonTitle,
        toolbarText: ExtensionResources.ToolbarButtonText,
        title: ExtensionResources.ToolbarButtonTitle,
        icon: 'css://icon-duplicate-workitem'
    };

    return {
        bindWorkItem: (id: number) => {
            bindWorkItem(id);
        },

        loadConfig: (): IPromise<DuplicateWorkItemManager.Configuration.IConfiguration> => {
            return configPromise.then(() => {
                return config;
            });
        },

        // This is a callback that gets invoked when a user clicks the newly contributed menu item
        // The actionContext parameter contains context data surrounding the circumstances of this
        // action getting invoked.
        execute: (actionContext: { workItemId: number }) => {
            return configPromise.then(() => {
                launchManageDuplicatesDialog();
            });
        },

        getMenuItems: (actionContext: { workItemId: number, workItemAvailable: boolean }): IPromise<any> => {
            if (!actionContext || !actionContext.workItemId || actionContext.workItemId < 0 || !actionContext.workItemAvailable) {
                // If work item is not saved, do not show menu item
                return Q([$.extend({}, menuItem, { hidden: true })]);
            }

            // Binds currentWorkItem
            bindWorkItem(actionContext.workItemId);

            if (!currentWorkItem) {
                Diag.Debug.fail("CurrentWorkItem should not be null/undefined");
                var details: TfsError = {
                    name: "CurrentWorkItemNullError",
                    message: Utils_String.format("DuplicateworkItem/getMenuItems() currentWorkItem is null or undefined. Workitem id: {0}", actionContext.workItemId)
                };
                VSSError.publishErrorToTelemetry(details);

                // If work item is not available, do not show menu item
                return Q([$.extend({}, menuItem, { hidden: true })]);
            }

            var workItemTypeName = currentWorkItem.workItemType.name;

            // Only show button for supported work item types
            var getMenuItem = () => {
                var supportedWorkItemTypeNames = (config && config.workItemTypes && config.workItemTypes.map(x => x.workItemTypeName)) || [];
                if (!Utils_Array.contains(supportedWorkItemTypeNames, workItemTypeName, Utils_String.localeIgnoreCaseComparer)) {
                    return $.extend({}, menuItem, { hidden: true });
                }

                // Return copy of menu item
                return $.extend({}, menuItem);
            };

            return configPromise.then(() => {
                return Q([getMenuItem()]);
            });
        },


    };
};

SDK_Shim.VSS.register("ms-internal.vss-agile-duplicate-work-item.duplicateAction", contributionHandler());
SDK_Shim.registerContent("duplicateAction.Group",
    (context: SDK_Shim.InternalContentContextData) => {
        var duplicateContribution = contributionHandler();
        var messageBoxClassName = "duplicateWorkItem-group-message";
        var duplicateGroupButtonClassName = "duplicate-workitem-group-launch-btn";

        var $messageLabel = $("<span class=\"" + messageBoxClassName + "\">");

        var $searchWorkItemButton = $("<button type='button' />")
            .text(ExtensionResources.ToolbarButtonText)
            .addClass(duplicateGroupButtonClassName)
            .click(function (e: JQueryEventObject) {
                let activeDocument = <WorkItemDocument>(Events_Document.getService().getActiveDocument());

                let workItem: WITOM.WorkItem = activeDocument && activeDocument.getWorkItem();
                if (!!workItem && workItem.id > 0) {
                    duplicateContribution.bindWorkItem(workItem.id);
                    duplicateContribution.execute({ workItemId: workItem.id });
                    $(e.target.parentNode).find("." + messageBoxClassName).text("");
                }
                else {
                    $(e.target.parentNode).find("." + messageBoxClassName).text(ExtensionResources.SaveWorkItemMessage);
                }
            });

        context.$container.append($searchWorkItemButton);
        context.$container.append($messageLabel);

        // Disable the button if the configuration is not available.
        duplicateContribution.loadConfig().then(config => {
            if (!config) {
                $("." + duplicateGroupButtonClassName).prop("disabled", true);
                $("." + messageBoxClassName).text(ExtensionResources.NotConfiguredMessage);
            }
        }, () => {
            $("." + duplicateGroupButtonClassName).prop("disabled", true);
            $("." + messageBoxClassName).text(ExtensionResources.ConfigurationLoadFailMessage);
        });
    });
