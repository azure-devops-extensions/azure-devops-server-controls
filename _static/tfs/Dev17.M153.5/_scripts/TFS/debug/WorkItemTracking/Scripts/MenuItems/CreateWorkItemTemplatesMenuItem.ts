import Q = require("q");

import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import {FeatureAvailabilityFlags} from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import Menus = require("VSS/Controls/Menus");
import {ProjectCollection} from "Presentation/Scripts/TFS/TFS.OM.Common";
import SDK_Shim = require("VSS/SDK/Shim");
import {TfsContext} from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VSS = require("VSS/VSS");
import VSSError = require("VSS/Error");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Service = require("VSS/Service");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TeamServices = require("TfsCommon/Scripts/Team/Services");
import WITContracts = require("TFS/WorkItemTracking/Contracts");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_String = require("VSS/Utils/String");
import Events_Action = require("VSS/Events/Action");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import Events_Document = require("VSS/Events/Document");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import MenuItemHelpers = require("WorkItemTracking/Scripts/MenuItems/MenuItemHelpers");
import { WorkItemStore, WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { WorkItemDocument } from "WorkItemTracking/Scripts/Utils/WorkItemDocument";

import { WorkItemTemplateService } from "WorkItemTracking/Scripts/Services/WorkItemTemplateService";

import TemplateUtils_Async = require("WorkItemTracking/Scripts/Utils/WorkItemTemplateUtils");
import CaptureDialog_Async = require("WorkItemTracking/Scripts/Dialogs/WorkItemTemplates/WorkItemTemplateCaptureDialog");

// export for unit tests
export function getMenuItemProperties(context: any): CaptureDialog_Async.ITemplatesMenuContext {

    Diag.Debug.assertIsObject(context, "context cannot be empty");

    let templateMenuItemProperties: CaptureDialog_Async.ITemplatesMenuContext = {
        tfsContext: context.tfsContext || TfsContext.getDefault(),
        workItemIds: [],
        workItemTypes: [],
        immediateSave: false,
        groupId: "modify",
        rank: 100,
        ciFeatureName: "ContextMenu",
        projectNames: {},
        ciSourceAreaName: "",
    }

    let menuItemLocation = MenuItemHelpers.GetContextMenuLocation(context);

    // extract selected work item ids depending on which contribution point
    if (menuItemLocation === MenuItemHelpers.MenuItemLocation.Backlog || menuItemLocation === MenuItemHelpers.MenuItemLocation.Queries) {
        // work items on backlog view
        templateMenuItemProperties.ciSourceAreaName = "ResultGrid";
        templateMenuItemProperties.workItemIds = context.workItemIds;
        templateMenuItemProperties.rank = menuItemLocation === MenuItemHelpers.MenuItemLocation.Backlog? 40: 70;
        templateMenuItemProperties.immediateSave = !!context.immediateSave;
        templateMenuItemProperties.workItemTypes = context.workItemTypeNames;
        templateMenuItemProperties.projectNames = context.workItemProjects;
    }
    else if (menuItemLocation === MenuItemHelpers.MenuItemLocation.WorkItemForm) {

        // work item form
        let activeDocument = <WorkItemDocument>(Events_Document.getService().getActiveDocument());
        let projectName = activeDocument ? activeDocument.getWorkItem().project.name : "";
        let projectNames: IDictionaryNumberTo<string> = {};
        if (activeDocument) {
            projectNames[context.workItemId] = projectName;
        }

        templateMenuItemProperties.ciFeatureName = "WI Form";
        templateMenuItemProperties.ciSourceAreaName = "WorkItemView";
        templateMenuItemProperties.workItemIds = context.workItemId !== undefined && context.workItemId !== null && [context.workItemId];
        templateMenuItemProperties.workItemTypes = context.workItemTypeName && [context.workItemTypeName];
        templateMenuItemProperties.groupId = "core";
        templateMenuItemProperties.workItem = activeDocument && activeDocument.getWorkItem();
        templateMenuItemProperties.projectNames = projectNames;
    }
    else {
        Diag.Debug.assert(false, "Unknown contribution point");
    }

    return templateMenuItemProperties;
};

function copyLegacyUrl(menuProperties: CaptureDialog_Async.ITemplatesMenuContext): void {
    Diag.Debug.assertIsObject(menuProperties.workItem, "Work item cannot be null");
    let workItem = menuProperties.workItem;
    let routeData: IDictionaryStringTo<string> = {};

    //http://{host}:{port}/tfs/{collection}/{project}/_workitems/create/{parameters}
    routeData["parameters"] = workItem.workItemType.name;

    $.each(workItem.getTemplateFieldValues(), function (fieldRef, value) {
        routeData["[" + fieldRef + "]"] = (value === undefined || value === null) ? "" : value;
    });

    let url = workItem.store.getTfsContext().getPublicActionUrl("create", "workItems", routeData);

    // Copy to user's clipboard
    Utils_Clipboard.copyToClipboard(url);
    if (Utils_Clipboard.supportsNativeCopy()) {
        alert(WITResources.CreateWorkitemIVURLSuccess);
    }

    // Telemetry 
    var currentController = workItem.store.getTfsContext().navigation.currentController;
    var currentAction = workItem.store.getTfsContext().navigation.currentAction;

    VSS_Telemetry.publishEvent(
        new VSS_Telemetry.TelemetryEventData(
            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_TOOLBAR_CLICK,
            {
                "Action": "Copy template url",
                "OriginArea": currentController + "/" + currentAction
            }));
}

(function () {
    let templateMenu = {
        getMenuItems: (context) => {
            let menuItemLocation = MenuItemHelpers.GetContextMenuLocation(context);

            //Context menus that target work item form context menus are automatically included on the board
            //But we do not want to show template menu options on board
            if (menuItemLocation !== MenuItemHelpers.MenuItemLocation.Backlog && menuItemLocation !== MenuItemHelpers.MenuItemLocation.WorkItemForm
                && menuItemLocation !== MenuItemHelpers.MenuItemLocation.Queries) {
                return;
            }

            let menuProperties = getMenuItemProperties(context);

            let projectId = menuProperties.tfsContext.contextData.project && menuProperties.tfsContext.contextData.project.id;
            let projectName = menuProperties.tfsContext.contextData.project && menuProperties.tfsContext.contextData.project.name;
            let teamId = menuProperties.tfsContext.contextData.team && menuProperties.tfsContext.contextData.team.id;

            let validContext = projectId && teamId;

            let validWorkItemOrIds = (menuProperties.workItemIds && menuProperties.workItemIds.length > 0) || menuProperties.workItem;
            let validWorkItemsSelection = validWorkItemOrIds && menuProperties.workItemTypes && menuProperties.workItemTypes.length === 1;

            if (!validContext || !validWorkItemsSelection) {
                return;
            }

            let isCrossProjectWorkItem = !Utils_String.equals(projectName, menuProperties.projectNames[menuProperties.workItemIds[0]], true);
            if (isCrossProjectWorkItem) {
                return;
            }

            // at this point we have 1 or more items selected and they are of the same work item type

            // add capture and manage, disable if not members of the team
            let managePromise = Service.getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(projectId, teamId).then((permissions: TeamServices.ITeamPermissions) => {
                let actionMenuItems: Menus.IMenuItemSpec[] = [];
                let isTeamAccessDisabled = false;
                let singleWorkItem = true;
                let disabledTeamAccessTooltip = null;
                let captureToolTip = "";

                // Check if we only have one work item for capture
                if (menuProperties.workItemIds && menuProperties.workItemIds.length > 1) {
                    singleWorkItem = false;
                    captureToolTip = WITResources.WorkItemTemplates_CaptureTemplateMenuItem_TooManyItemsTooltip;
                }

                // Check team access and set tooltips
                if (!permissions.currentUserHasTeamPermission) {
                    isTeamAccessDisabled = true;
                    disabledTeamAccessTooltip = WITResources.WorkItemTemplates_UserDoesNotHaveTeamPermission;
                }

                // Capture template item
                actionMenuItems.push({
                    title: disabledTeamAccessTooltip ? disabledTeamAccessTooltip : captureToolTip,
                    text: WITResources.WorkItemTemplates_CaptureTemplateMenuItem_Text,
                    action: (actionContext) => {
                        VSS.requireModules(["WorkItemTracking/Scripts/Dialogs/WorkItemTemplates/WorkItemTemplateCaptureDialog"]).spread((CaptureDialog: typeof CaptureDialog_Async) => {
                            CaptureDialog.launchCaptureWorkItemTemplateDialog(menuProperties);
                        });
                    },
                    disabled: isTeamAccessDisabled || !singleWorkItem,
                    icon: "css://bowtie-icon bowtie-camera"
                });

                // Add manage menu item
                actionMenuItems.push({
                    title: disabledTeamAccessTooltip ? disabledTeamAccessTooltip : "",
                    text: WITResources.WorkItemTemplates_ManageMenuItem_Text,
                    action: (actionContext) => {
                        let teamName = menuProperties.tfsContext.contextData.team.name;
                        let adminUrl = menuProperties.tfsContext.getActionUrl("", "work", { area: "admin", team: teamName, _a: "templates", type: menuProperties.workItemTypes[0] } as IRouteData);
                        
                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                                    url: adminUrl,
                                    target: "_blank"} );
                    },
                    disabled: isTeamAccessDisabled,
                    icon: "css://bowtie-icon bowtie-settings-gear"
                });

                // Check if legacy template URL item is enabled and we are in correct context to add 
                if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTemplatesLegacyUrl) &&
                    menuProperties.workItem &&
                    menuProperties.workItem.isNew()) {

                    // Add Separator 
                    actionMenuItems.push({ separator: true });

                    // Add legacy copy menu item 
                    actionMenuItems.push({
                        title: WITResources.WorkItemTemplates_LegacyCopyMenuItem_Title,
                        text: WITResources.WorkItemTemplates_LegacyCopyMenuItem_Text,
                        action: (actionContext) => {
                            copyLegacyUrl(menuProperties);
                        },
                        icon: "css://bowtie-icon bowtie-copy-to-clipboard"
                    });
                }

                return actionMenuItems;
            });

            // get the available templates for the type
            let connection: Service.VssConnection = TFS_OM_Common.ProjectCollection.getConnection(menuProperties.tfsContext);
            let service = connection.getService<WorkItemTemplateService>(WorkItemTemplateService);

            let templatePromise = service.getWorkItemTemplatesForType(projectId, teamId, menuProperties.workItemTypes[0]).then((templates: WITContracts.WorkItemTemplateReference[]) => {
                    let availableTemplatesMenuItems: Menus.IMenuItemSpec[] = [];

                    templates.forEach((template) => {
                        // Add template as a menu item
                        availableTemplatesMenuItems.push({
                            title: template.description || "", // if it has a description use it as tooltip, otherwise use the ""
                            text: template.name,
                            action: () => {
                                VSS.requireModules(["WorkItemTracking/Scripts/Utils/WorkItemTemplateUtils"]).spread((TemplateUtils: typeof TemplateUtils_Async) => {
                                    var props: IDictionaryStringTo<any> = {};
                                    props[TemplateUtils.TemplatesTelemetry.PropType] = template.workItemTypeName;
                                    props[TemplateUtils.TemplatesTelemetry.PropNumOfWorkItems] = menuProperties.workItemIds ? menuProperties.workItemIds.length : 1;
                                    props[TemplateUtils.TemplatesTelemetry.PropContext] = menuProperties.ciSourceAreaName;
                                    var event: VSS_Telemetry.TelemetryEventData = new VSS_Telemetry.TelemetryEventData(
                                        TemplateUtils.TemplatesTelemetry.Area,
                                        TemplateUtils.TemplatesTelemetry.FeatureContextMenu,
                                        props);
                                    VSS_Telemetry.publishEvent(event);

                                    let options: TemplateUtils_Async.WorkItemTemplatesHelper.IWorkItemTemplateBulkUpdateItemsOptions = {
                                        tfsContext: menuProperties.tfsContext,
                                        workItem: menuProperties.workItem,
                                        workItemIds: menuProperties.workItemIds,
                                        templateId: template.id,
                                        immediateSave: menuProperties.immediateSave,
                                        ownerId: teamId
                                    };

                                    if (menuProperties.immediateSave) {
                                        let message = Utils_String.format(WITResources.BulkEdit_ApplyTemplateMessage, template.name);
                                        Dialogs.showMessageDialog(
                                            message,
                                            {
                                                title: WITResources.BulkEdit_ApplyTemplateTitle,
                                                buttons: [
                                                    <IMessageDialogButton>{ id: "ok", text: WITResources.BulkEdit_ApplyTemplateButton, reject: false },
                                                    <IMessageDialogButton>{ id: "cancel", text: VSS_Resources_Platform.ModalDialogCancelButton, reject: true }
                                                ]
                                            }).then((result: IMessageDialogResult) => {
                                                if (result.button.id === "ok") {
                                                    TemplateUtils.WorkItemTemplatesHelper.getWorkItemTemplateAndBulkUpdateWorkItems(options);
                                                }
                                            });
                                    }
                                    else {
                                        TemplateUtils.WorkItemTemplatesHelper.getWorkItemTemplateAndBulkUpdateWorkItems(options);
                                    }
                                });
                            }
                        });
                    });

                    return availableTemplatesMenuItems;
            });

            return Q.all([managePromise, templatePromise])
                .then(
                (results) => {
                    let baseChildrenItems: Menus.IMenuItemSpec[] = [];

                    for (let r of results) {
                        if (r && r.length !== 0) {
                            if (baseChildrenItems.length > 0) {
                                baseChildrenItems.push({ separator: true });
                            }
                            baseChildrenItems.push(...r);
                        }
                    }

                    // if i have permission to capture, but have not template add "no template" help text
                    if (results.length === 2 && results[0] && results[0].length > 0 && !(results[1] && results[1].length > 0)) {
                        baseChildrenItems.push({ separator: true });

                        baseChildrenItems.push({
                            text: WITResources.WorkItemTemplates_NoTemplatesDisabledMenuItemTitle,
                            disabled: true
                        });
                    }

                    let menuItem: Menus.IMenuItemSpec = {
                        id: "work-item-templates",
                        groupId: menuProperties.groupId,
                        rank: menuProperties.rank,
                        text: WITResources.WorkItemTemplates_ContextMenuItem_Text,
                        icon: "css://bowtie-icon bowtie-auto-fill-template",
                        showText: true,
                        childItems: baseChildrenItems
                    };

                    return [menuItem];
                },
                (reason: Error) => {
                    if (!reason || !reason.name || !reason.message) {
                        // Reason is actually type of <any> so it might not actually be type Error
                        VSSError.publishErrorToTelemetry({
                            name: "UnexpectedWorkItemTemplatesContextMenuException",
                            message: VSS.getErrorMessage(reason)
                        });
                    }
                    else {
                        VSSError.publishErrorToTelemetry(reason);
                    }
                    return [];
                });
        }
    };

    SDK_Shim.VSS.register("ms.vss-work-web.work-item-templates-menu", templateMenu);
} ());
