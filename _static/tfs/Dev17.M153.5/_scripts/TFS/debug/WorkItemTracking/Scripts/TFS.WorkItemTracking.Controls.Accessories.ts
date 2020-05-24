/// <reference types="jquery" />

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import Menus = require("VSS/Controls/Menus");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import Identities_Picker_Services = require("VSS/Identities/Picker/Services");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import ResourcesWorkItemTracking = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Telemetry = require("VSS/Telemetry/Services");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { haveBacklogManagementPermission } from "WorkItemTracking/Scripts/Utils/PermissionHandler";
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { WitIdentityImages } from "WorkItemTracking/Scripts/Utils/WitIdentityImages";
import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import AdminSendMail_Async = require("Admin/Scripts/TFS.Admin.SendMail");
import WITControls_Async = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");
import EmailWorkItemsModel_Async = require("WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems");

import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { TeamAwarenessService } from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";

export module CommonContextMenuItems {
    export var ASSIGN_TO_ACTION_NAME: string = "assign-to";
    export var MOVE_TO_ITERATION_ACTION_NAME: string = "move-to-iteration";
    export var EMAIL_SELECTION_ACTION_NAME: string = "email-selection";
    export var QUERIES_COMMAND_FEATURE_NAME: string = "QueriesCommand";

    /** 
     * Constructs and returns the Move To Iteration context menu items
     * 
     * @param tfsContext - TFS context
     * @param teamId Id of the team showing the iterations for
     * @param options - Additional options including event hookups.
     * @param errorHandler - Handler for errors
     * @param action - the action to be performed when the menu item is clicked. action should take the work item ids and the new value for iteration path
     *
     */
    export function getMoveToIterationContextMenuItem(tfsContext: any, teamId: string, options?: any, errorHandler?: (...args: any[]) => any, action?: (workItemIds: number[], iterationPath: string) => void, postExecute?: (commandArgs: any) => void): Menus.IMenuItemSpec {


        function getChildItems(contextInfo, callback, errorCallback) {
            const teamAwareness = TFS_OM.ProjectCollection.getConnection(tfsContext).getService(TeamAwarenessService);
            teamAwareness.beginGetTeamSettings(teamId).then((teamSettings) => {
                var menuItems = [];

                function moveToIteration(commandArgs) {
                    if ($.isFunction(action)) {
                        action(commandArgs.selectedWorkItems, commandArgs.iterationPath);
                    }
                    else {
                        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (BulkEdit) => {
                            BulkEdit.bulkUpdateWorkItems(
                                commandArgs.tfsContext,
                                commandArgs.selectedWorkItems,
                                [{ fieldName: "System.IterationPath", value: commandArgs.iterationPath }],
                                options,
                                errorHandler);
                        });
                    }

                    if ($.isFunction(postExecute)) {
                        postExecute(commandArgs);
                    }
                }

                if (teamSettings.backlogIteration) {
                    menuItems.push({
                        id: CommonContextMenuItems.MOVE_TO_ITERATION_ACTION_NAME,
                        text: PresentationResources.MoveToIteration_Backlog,
                        'arguments': { iterationPath: teamSettings.backlogIteration.friendlyPath },
                        title: teamSettings.backlogIteration.friendlyPath,
                        action: moveToIteration,
                        cssClass: "move-to-backlog-context-menu-item",
                        icon: "bowtie-icon bowtie-backlog"
                    });

                    if (teamSettings.currentIteration) {
                        menuItems.push({
                            id: CommonContextMenuItems.MOVE_TO_ITERATION_ACTION_NAME,
                            text: Utils_String.format(PresentationResources.MoveToIteration_Current, teamSettings.currentIteration.displayText),
                            'arguments': { iterationPath: teamSettings.currentIteration.friendlyPath },
                            title: teamSettings.currentIteration.friendlyPath,
                            action: moveToIteration,
                            cssClass: "move-to-current-iteration-context-menu-item",
                            icon: "bowtie-icon bowtie-triangle-right"
                        });
                    }

                    if (teamSettings.futureIterations && teamSettings.futureIterations.length > 0) {
                        menuItems.push({
                            separator: true,
                            text: PresentationResources.FutureIterations
                        });

                        $.each(teamSettings.futureIterations, function (i, iteration) {
                            menuItems.push({
                                id: CommonContextMenuItems.MOVE_TO_ITERATION_ACTION_NAME,
                                text: iteration.displayText,
                                'arguments': { iterationPath: iteration.friendlyPath },
                                title: iteration.friendlyPath,
                                cssClass: "move-to-future-iteration-context-menu-item",
                                action: moveToIteration
                            });
                        });
                    }
                }
                else {
                    menuItems.push({
                        text: PresentationResources.MissingTeamSettingsError,
                        icon: "icon-warning"
                    });
                }

                callback(menuItems);
                Diag.logTracePoint('CommonContextMenuItems.getMoveToIterationContextMenuItem.Complete');
            }, $.isFunction(errorHandler) ? errorHandler : errorCallback);
        }

        return {
            id: CommonContextMenuItems.MOVE_TO_ITERATION_ACTION_NAME,
            rank: 13,
            text: PresentationResources.MoveToIteration,
            childItems: getChildItems,
            disabled: options.disabled,
            groupId: "modify"
        };
    }

    export function getAssignToContextMenuItem(tfsContext: TFS_Host_TfsContext.TfsContext, options?: any, errorHandler?: (...args: any[]) => any, postExecute?: (commandArgs: any) => void): Menus.IMenuItemSpec {
        /// <summary>Constructs and returns the Assign To context menu item</summary>
        /// <param name="tfsContext" type="Object">TFS context</param>
        /// <param name="options" type="object" optional="true">OPTIONAL: additional options</param>
        /// <param name="errorHandler" type="function" optional="true">OPTIONAL: Handler for errors</param>

        var getChildItems: (contextInfo, callback, errorCallback) => void;

        var assignTo = (commandArgs) => {

            if (options.executeAction) {
                options.executeAction(commandArgs);
            }
            else {
                VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (BulkEdit) => {
                    BulkEdit.bulkUpdateWorkItems(
                        commandArgs.tfsContext,
                        commandArgs.selectedWorkItems,
                        [{
                            fieldName: WITConstants.CoreFieldRefNames.AssignedTo,
                            value: Identities_Picker_Controls.EntityFactory.isStringEntityId(commandArgs.identity.entityId) ?
                                null : WITIdentityHelpers.getUniquefiedIdentityName(commandArgs.identity)
                        }],
                        options,
                        errorHandler);
                });
            }

            if ($.isFunction(postExecute)) {
                postExecute(commandArgs);
            }
        };

        var getMenuItem = (entity: Identities_Picker_RestClient.IEntity, isStringEntity?: boolean) => {
            var menuItem: Menus.IMenuItemSpec = {
                id: CommonContextMenuItems.ASSIGN_TO_ACTION_NAME,
                action: assignTo,
                'arguments': { identity: entity },
            };

            // Render a custom menu item with the new identity display control.
            // TODO: come back and clean this up [US541759]
            if (!isStringEntity) {
                var entityIdentifier = Utils_String.ignoreCaseComparer(entity.localDirectory, Identities_Picker_Services.ServiceHelpers.VisualStudioDirectory) === 0 ? entity.localId : entity.signInAddress;
            }

            let $container = $("<span>");
            let options: Identities_Picker_Controls.IIdentityDisplayOptions = {
                identityType: { User: true },
                operationScope: { IMS: true },
                item: isStringEntity ? entity : entityIdentifier,
                friendlyDisplayName: entity.displayName, // Display this name until the identity is asynchronously resolved.
                size: Identities_Picker_Controls.IdentityPickerControlSize.Large, // 32px
                turnOffHover: true,
                consumerId: "5f71c9a2-a5aa-41c8-b3e0-0f82e20e5c42"
            };

            Controls.BaseControl.create(Identities_Picker_Controls.IdentityDisplayControl, $container, options);

            $.extend(menuItem, {
                html: $container,
                showText: false,
                noIcon: true
            });

            return menuItem;
        };

        getChildItems = (contextInfo, callback, errorCallback) => {
            Diag.logTracePoint("CommonContextMenuItems._getChildItems.start");
            var startTime = Date.now();

            var mruService = Service.getService(Identities_Picker_Services.MruService);

            mruService.getMruIdentities(
                <Identities_Picker_Services.IOperationScope>{ IMS: true },
                Identities_Picker_Services.MruService.DEFAULT_IDENTITY_ID,
                Identities_Picker_Services.MruService.DEFAULT_FEATURE_ID)
                .then((entities: Identities_Picker_RestClient.IEntity[]) => {
                    var menuItems: Menus.IMenuItemSpec[] = [];

                    menuItems.push(getMenuItem(Identities_Picker_Controls.EntityFactory.createStringEntity(WITResources.AssignedToEmptyText, WitIdentityImages.UnassignedImageUrl), true));

                    //Filter out group entities
                    entities = entities.filter(e => e.active !== false && Utils_String.ignoreCaseComparer(e.entityType, Identities_Picker_Services.ServiceHelpers.UserEntity) === 0);

                    for (var entity of entities) {
                        menuItems.push(getMenuItem(entity));
                    }

                    callback(menuItems);

                    Diag.logTracePoint('CommonContextMenuItems.getAssignedToContextMenuItem.Complete');
                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                        CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.TELEMETRY_ASSIGNTO_POPULATEMENU, {
                            "PeopleCount": entities ? entities.length : null
                        }, startTime));
                }, $.isFunction(errorHandler) ? errorHandler : errorCallback);
        };

        return {
            id: CommonContextMenuItems.ASSIGN_TO_ACTION_NAME,
            rank: options.assignedToRank || 13,
            text: options.title ? options.title : PresentationResources.TeamAwarenessAssignTo,
            title: options.tooltip ? options.tooltip : PresentationResources.TeamAwarenessAssignToTooltip,
            icon: "bowtie-icon bowtie-users",
            childItems: getChildItems,
            groupId: "modify"
        };
    }

    /**
     * Gets the open work item context menu options
     * @param options Object containing options to extend the open context menu with:
     */
    export function getOpenWorkItemContextMenuItems(options?: any, telemetrySource?: string, useTriageView?: boolean): Menus.IMenuItemSpec[] {
        const source = telemetrySource ? telemetrySource : "WorkItemTracking.Controls.Accesories";
        const baseOptions: Menus.IMenuItemSpec[] =
            [{
                id: WorkItemActions.ACTION_WORKITEM_OPEN,
                rank: 1,
                text: ResourcesWorkItemTracking.Open,
                icon: "bowtie-icon bowtie-arrow-open",
                groupId: "open",
                action: (commandArgs) => {
                    WITDialogShim.showWorkItemById(commandArgs.id, commandArgs.tfsContext, { triage: useTriageView });
                    Telemetry.publishEvent(
                        new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                            CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.TELEMETRY_OPENWORKITEM_CONTEXTMENU, {
                                "openNewWindow": false,
                                "source": source
                            }));
                }
            },
            {
                id: WorkItemActions.ACTION_WORKITEM_OPEN_IN_NEW_TAB,
                rank: 2,
                text: ResourcesWorkItemTracking.OpenInNewTab,
                groupId: "open",
                action: (commandArgs) => {
                    WITDialogShim.showWorkItemByIdInNewTab(commandArgs.id, commandArgs.tfsContext);
                    Telemetry.publishEvent(
                        new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                            CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.TELEMETRY_OPENWORKITEM_CONTEXTMENU, {
                                "openNewWindow": true,
                                "source": source
                            }));
                }
            }];

        var extendedOptions = baseOptions.map((menuOption) => {
            return $.extend(menuOption, options);
        });

        return extendedOptions;
    }

    export function getEmailSelectionContextMenuItem(options: any): Menus.IMenuItemSpec {
        Diag.Debug.assertParamIsObject(options, "options");
        var grid = options.grid;

        function emailWorkItemsSelection(commandArgs) {
            var gridColumns = grid._columns,
                fields = $.map(gridColumns || [],
                    function (column) {
                        // filter any the artificial columns, which do not have fieldId
                        if (column.fieldId) {
                            return column.name;
                        }
                    });

            VSS.requireModules(["Admin/Scripts/TFS.Admin.SendMail", "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls", "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems"])
                .spread((AdminSendMail: typeof AdminSendMail_Async, WITControls: typeof WITControls_Async, EmailWorkItems: typeof EmailWorkItemsModel_Async) => {
                    AdminSendMail.Dialogs.sendMail(new EmailWorkItems.EmailWorkItemsDialogModel({
                        workItemSelectionOption: {
                            workItems: commandArgs.selectedWorkItems,
                            fields: fields,
                            store: grid._store
                        }
                    }));
                });
        }

        return {
            id: CommonContextMenuItems.EMAIL_SELECTION_ACTION_NAME,
            rank: 71,
            text: ResourcesWorkItemTracking.EmailSelectedWorkItem,
            title: ResourcesWorkItemTracking.EmailSelectedWorkItemToolTip,
            icon: "bowtie-icon bowtie-mail-message",
            action: emailWorkItemsSelection,
            groupId: "export"
        };
    }

    export function contributeQueryResultGrid(menuOptions: any, options?: any) {
        /// <summary>Contributes context menu items for the Query Result Grid</summary>
        /// <param name="menuOptions" type="Object">Context menu options</param>
        /// <param name="options" type="Object">{ tfsContext, enableTeamActions }</param>

        Diag.Debug.assertParamIsObject(menuOptions, "menuOptions");
        Diag.Debug.assertParamIsObject(options, "options");

        menuOptions.items.push({ rank: 12, separator: true });
        menuOptions.items.push(CommonContextMenuItems.getAssignToContextMenuItem(options.tfsContext, options, null, (commandArgs) => {
            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                    Utils_String.format("{0}.{1}", QUERIES_COMMAND_FEATURE_NAME, CommonContextMenuItems.ASSIGN_TO_ACTION_NAME),
                    {
                        "numSelectedItems": (commandArgs && commandArgs.selectedWorkItems) ? commandArgs.selectedWorkItems.length : 0,
                        "source": "contextMenu"
                    }));
        }));

        if (options.tfsContext && options.tfsContext.currentTeam && options.enableTeamActions) {
            if (haveBacklogManagementPermission()) {
                menuOptions.items.push(CommonContextMenuItems.getMoveToIterationContextMenuItem(options.tfsContext, options.tfsContext.currentTeam.identity.id, options, null, null, (commandArgs) => {
                    Telemetry.publishEvent(
                        new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                            Utils_String.format("{0}.{1}", QUERIES_COMMAND_FEATURE_NAME, CommonContextMenuItems.MOVE_TO_ITERATION_ACTION_NAME),
                            {
                                "numSelectedItems": (commandArgs && commandArgs.selectedWorkItems) ? commandArgs.selectedWorkItems.length : 0,
                                "source": "contextMenu"
                            }));
                }));
            }
        }
    }

    export function contributeTestPointsGrid(menuOptions: any, options?: any) {
        /// <summary>Contributes context menu items for the Test Points Grid</summary>
        /// <param name="menuOptions" type="Object">Context menu options</param>
        /// <param name="options" type="Object">{ tfsContext, enableTeamActions }</param>

        Diag.Debug.assertParamIsObject(menuOptions, "menuOptions");
        Diag.Debug.assertParamIsObject(options, "options");

        if (options.tfsContext.currentTeam && options.enableTeamActions) {
            menuOptions.items = menuOptions.items.concat(<any[]>[
                { rank: 13, separator: true },
                CommonContextMenuItems.getAssignToContextMenuItem(options.tfsContext, options)]);
        }
    }

    function addAssignedToContextMenuOptionToBacklogs(menuOptions: any, options: any) {
        /// <summary>Add assigned to context menu item to menuOptions on backlog pages</summary>
        /// <param name="menuOptions" type="Object">Context menu options</param>
        /// <param name="options" type="Object">{ tfsContext, beforeSave, afterSave, errorHandler }</param>
        menuOptions.items.push(CommonContextMenuItems.getAssignToContextMenuItem(
            options.tfsContext,
            $.extend({}, options, { immediateSave: true }),
            options.errorHandler));
    }
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.WorkItemTracking.Controls.Accessories", exports);
