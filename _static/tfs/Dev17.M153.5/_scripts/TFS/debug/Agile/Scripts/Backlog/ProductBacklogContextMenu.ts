/// <reference types="jquery" />

import React = require("react");
import ReactDOM = require("react-dom");

import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import VSSError = require("VSS/Error");
import Controls = require("VSS/Controls");
import Notifications = require("VSS/Controls/Notifications");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Action = require("VSS/Events/Action");
import Menus = require("VSS/Controls/Menus");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import * as Events_Handlers from "VSS/Events/Handlers";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import TFS_Agile = require("Agile/Scripts/Common/Agile");
import AgileProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import TFS_Agile_ProductBacklog_DM = require("Agile/Scripts/Backlog/ProductBacklogDataManager");
import TFS_Agile_ProductBacklog_Grid = require("Agile/Scripts/Backlog/ProductBacklogGrid");
import TFS_Agile_WorkItemChanges = require("Agile/Scripts/Common/WorkItemChanges");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import {
    MappingDataProvider,
    IMappingPaneResultModel,
    IMappingPaneReparentArgs
} from "Agile/Scripts/Backlog/ProductBacklogMappingPanel";
import {
    IChangeParentDialogProps,
    ChangeParentDialog,
    IWorkItemInfo,
    ITeamInfo,
    ISimpleMessageDialogProps,
    SimpleMessageDialog,
    ISimpleMessageLink
} from "Agile/Scripts/Backlog/ContextMenu/Components/ChangeParentDialog";

import { ITeam } from "Agile/Scripts/Models/Team";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import {
    BacklogConfigurationService,
} from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";

import ResourcesWorkItemTracking = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITControls_Accessories = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Accessories");
import WITControls_BulkEdit_NOREQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit");
import QueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import { Exceptions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IFieldIdValue } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import * as LinkingUtils from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";
import { TempQueryUtils } from "WorkItemTracking/Scripts/Utils/TempQueryUtils";

// Important: Only use type information from the imports. 
// Otherwise it will be a real dependency and break the async loading.
import AdminSendMail_Async = require("Admin/Scripts/TFS.Admin.SendMail");
import EmailWorkItemsModel_Async = require("WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems");
import WITDialogs_Async = require("WorkItemTracking/Scripts/Dialogs/WITDialogs");
import WITOM_NOREQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

const delegate = Utils_Core.delegate;
const CommonContextMenuItems = WITControls_Accessories.CommonContextMenuItems;
const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export class ContextMenuContributionUtils {
    /** Returns a value indicating whether only virtual workitems are in the given list of work item ids */
    public static onlyVirtualWorkItems(workItemIds: number[]): boolean {
        return !workItemIds || !workItemIds.some(id => TFS_Agile_ProductBacklog_Grid.GridGroupRowBase.getGroupRow(id) === null);
    }

    /** Sets the iteration path on the provided work item ids and the non-complete child work items */
    public static moveToIteration(workItemIds: number[], iterationPath: string) {
        var actionArgs: TFS_Agile.IMoveToIterationActionArgs = {
            iterationPath: iterationPath,
            workItemIds: workItemIds
        };
        ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "move-to-iteration");
        Events_Action.getService().performAction(TFS_Agile.Actions.BACKLOG_MOVE_TO_ITERATION, actionArgs);
    }

    /** Returns a value indicating whether any of the workitems is currently being saved */
    public static anyWorkItemSaving(grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, workItemIds: number[]): boolean {
        var rowSavingManager = grid.getRowSavingManager();

        return workItemIds.some(id => rowSavingManager.isRowSaving(id));
    }

    /** Handles bulk save error */
    public static bulkSaveErrorHandler(error: any) {
        if (error && error.name === Exceptions.WorkItemBulkSaveException) {
            var errorMessages: string[] = [];
            var $container = $("<div>");
            var $listHeader = $("<p>");
            var $list = $("<ul>");

            $listHeader.text(AgileProductBacklogResources.BulkEdit_ErrorListHeader);
            $container.append($listHeader);
            $container.append($list);

            error.results.forEach((result) => {
                if (result.error) {
                    errorMessages.push(result.error.message);
                }
            });

            if (errorMessages.length > 0) {
                errorMessages = Utils_Array.unique(errorMessages, Utils_String.localeComparer);
                errorMessages.forEach((errorMessage: string) => {
                    $list.append($("<li>").append(errorMessage));
                });
            }

            Events_Action.getService().performAction(TFS_Agile.Actions.BACKLOG_SHOW_ERROR_MESSAGE, <TFS_Agile.IErrorActionArgs>{
                message: AgileProductBacklogResources.BulkEdit_ErrorMessageHeader,
                content: errorMessages.length === 0 ? null : $container
            });
        }
        else {
            Events_Action.getService().performAction(TFS_Agile.Actions.BACKLOG_SHOW_ERROR_MESSAGE, <TFS_Agile.IErrorActionArgs>{
                message: VSS.getErrorMessage(error)
            });
        }
    }

    /** Handles bulk save success */
    public static bulkSaveSuccessHandler(workItems: WITOM_NOREQUIRE.WorkItem[], changes: IFieldIdValue[]) {
        let actionArgs = <TFS_Agile.IBacklogBulkEditEvaluateMembershipActionArgs>{
            workItems: workItems,
            changes: changes
        };

        Events_Action.getService().performAction(TFS_Agile.Actions.BACKLOG_BULK_EDIT_EVALUATE_MEMBERSHIP, actionArgs);
    }

    public static recordContextMenuTelemetry(workItemIds: number[], action: string) {
        //Filter out unparented rows
        var selectedWorkItemIds = workItemIds.filter(workItemId => TFS_Agile_ProductBacklog_Grid.GridGroupRowBase.getGroupRow(workItemId) === null);
        if (selectedWorkItemIds.length === 1) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.SINGLESELECT_CONTEXTMENU, {
                    "Action": action,
                }));
        }
        else if (selectedWorkItemIds.length > 1) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.MULTISELECT_CONTEXTMENU, {
                    "NumberOfSelectedItems": selectedWorkItemIds.length,
                    "Action": action,
                }));
        }
    }

    /** Create new selection filter instance */
    public static createSelectionFilter(grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, itemHierarchy: TFS_Agile_WorkItemChanges.IItemDataHierarchy<TFS_Agile_WorkItemChanges.IWorkItemHierarchyData>): TFS_Agile_WorkItemChanges.ISelectionFilter {
        return new TFS_Agile_WorkItemChanges.TopLevelItemsSelectionFilter(
            itemHierarchy, delegate(grid, grid.pageWorkItems))
    }
}

export interface IBacklogContextMenuContribution {
    getItems(teamId: string, workItemIds: number[], gridMenuOptions: TFS_Agile_ProductBacklog_Grid.IProductBacklogGridMenuOptions): Menus.IMenuItemSpec[];
}

export class BacklogContextMenuCreator {
    protected _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid;
    protected _getTeam: () => ITeam;
    protected _itemHierarchy: TFS_Agile_WorkItemChanges.IWorkItemDataHierarchy;
    protected _gridBehaviors: IBacklogContextMenuContribution[];
    protected _messageSuppressor: TFS_Agile.IMessageSuppressor;

    /** Potential contributors to the context menu */
    private _entries: { rank: number, contribution: IBacklogContextMenuContribution }[] = [];

    constructor(
        _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid,
        _getTeam: () => ITeam,
        _itemHierarchy: TFS_Agile_WorkItemChanges.IWorkItemDataHierarchy,
        _gridBehaviors: IBacklogContextMenuContribution[],
        _messageSuppressor: TFS_Agile.IMessageSuppressor) {
        this._grid = _grid;
        this._getTeam = _getTeam;
        this._itemHierarchy = _itemHierarchy;
        this._gridBehaviors = _gridBehaviors;
        this._messageSuppressor = _messageSuppressor;

        this._initializeContribution();
    }

    public createContextMenu(
        workItemIds: number[],
        gridMenuOptions: TFS_Agile_ProductBacklog_Grid.IGridMenuOptions,
        backlogGridMenuOptions: TFS_Agile_ProductBacklog_Grid.IProductBacklogGridMenuOptions): any {
        workItemIds = workItemIds || [];

        var items: Menus.IMenuItemSpec[] = [];

        for (var entry of this._entries) {
            // Delegate to contribution
            var itemsToAdd = entry.contribution.getItems(this._getTeam().id, workItemIds, backlogGridMenuOptions) || [];

            if (itemsToAdd.length > 0) {
                // Adjust rank to avoid conflicts
                var baseRank = entry.rank;
                for (var i = 0; i < itemsToAdd.length; ++i) {
                    itemsToAdd[i].rank = baseRank + i;
                }

                items = items.concat(itemsToAdd);
            }
        }

        gridMenuOptions.items = items;

        // Pass selected ids to extension contribution
        if (gridMenuOptions.contextInfo) {
            if (ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
                // Do not allow extensions for virtual work items
                gridMenuOptions.contributionIds = [];
            }

            gridMenuOptions.contextInfo.item = $.extend(gridMenuOptions.contextInfo.item, {
                workItemIds: workItemIds.filter(workItemId => TFS_Agile_ProductBacklog_Grid.GridGroupRowBase.getGroupRow(workItemId) === null),
                workItemTypeNames: this._grid.getSelectedWorkItemTypes(),
                workItemProjects: this._grid.getSelectedWorkItemProjectNameMapping(),
                hideDelete: ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds),
                refreshRequired: workItemIds.some(id => !this._grid.getDataManager().isLeafNode(id)),
                immediateSave: true,
                team: this._getTeam()
            });
        }
    }

    protected _initializeContribution() {

        this._addItem(10, new BulkEditContextMenuItem(this._messageSuppressor));

        this._addItem(20, new AssignToContextMenuItem());

        this._addItem(30, new CopyAsHtmlContextMenuItem(this._grid));

        // Preserve rank 40 for 'Templates' menuItem

        // Preserve rank 50 for 'Delete' menuItem

        this._addItem(70, new AddLinkContextMenuItem(this._itemHierarchy, this._messageSuppressor, this._grid.getDataManager()));

        this._addItem(80, new MoveToIterationContextMenuItem(this._itemHierarchy, this._messageSuppressor, this._grid.getDataManager()));

        // Preserve rank 90 for change parent

        // Preserve rank 100 for 'Move to position' menuItem

        const processInheritanceEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebaccessProcessHierarchy);

        if (processInheritanceEnabled || FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingChangeWorkItemType)) {
            this._addItem(120, new ChangeTypeContextMenuItem(this._grid));
        }

        if (processInheritanceEnabled || FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingMove)) {
            this._addItem(130, new MoveItemContextMenuItem(this._grid, this._messageSuppressor));
        }

        this._addItem(140, new EmailWorkItemContextMenuItem(this._grid));
    }

    protected _addItem(rank: number, item: IBacklogContextMenuContribution) {
        this._entries.push({
            rank: rank,
            contribution: item
        });

        // Ensure items are still sorted by rank
        this._entries.sort((a, b) => a.rank - b.rank);
    }

    protected _addSeparator(rank: number) {
        this._addItem(rank, new SeparatorContextMenuItem());
    }
}

export class ProductBacklogContextMenuCreator extends BacklogContextMenuCreator {
    protected _initializeContribution() {
        super._initializeContribution();

        var selectionFilter = ContextMenuContributionUtils.createSelectionFilter(this._grid, this._itemHierarchy);

        this._addItem(90, new ChangeParentContextMenuItem(this._grid));

        this._addItem(100, new MoveToPositionContextMenuItem(this._grid, new MoveToPositionHelper(this._grid, this._itemHierarchy, selectionFilter)));
    }
}

export class IterationBacklogContextMenuCreator extends BacklogContextMenuCreator {
    protected _initializeContribution() {
        super._initializeContribution();

        var selectionFilter = ContextMenuContributionUtils.createSelectionFilter(this._grid, this._itemHierarchy);

        this._addItem(100, new MoveToPositionContextMenuItem(this._grid, new IterationMoveToPositionHelper(this._grid, this._itemHierarchy, selectionFilter)));
    }
}

export class SeparatorContextMenuItem implements IBacklogContextMenuContribution {
    public getItems(): Menus.IMenuItemSpec[] {
        return [{
            separator: true
        }];
    }
}

export class MoveToIterationContextMenuItem implements IBacklogContextMenuContribution {
    constructor(
        protected _itemHierarchy: TFS_Agile_WorkItemChanges.IWorkItemDataHierarchy,
        protected _messageSuppressor: TFS_Agile.IMessageSuppressor,
        protected _dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager) {
    }

    public getItems(teamId: string, workItemIds: number[], gridMenuOptions: TFS_Agile_ProductBacklog_Grid.IProductBacklogGridMenuOptions): Menus.IMenuItemSpec[] {
        if (ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
            return;
        }

        if (!TFS_Agile.areAdvancedBacklogFeaturesEnabled()) {
            return;
        }

        var menuItem: Menus.IMenuItemSpec = WITControls_Accessories.CommonContextMenuItems.getMoveToIterationContextMenuItem(
            tfsContext,
            teamId,
            $.extend({}, gridMenuOptions),
            <(...args: any[]) => any>ContextMenuContributionUtils.bulkSaveErrorHandler,
            ContextMenuContributionUtils.moveToIteration);

        menuItem.disabled = menuItem.disabled || ContextMenuContributionUtils.anyWorkItemSaving(gridMenuOptions.grid, workItemIds);
        menuItem.cssClass = "backlogs-move-to-iteration-context-menu-item";
        menuItem.groupId = "core";
        menuItem.title = Utils_String.empty;

        return [menuItem];
    }
}

export class ChangeParentContextMenuItem implements IBacklogContextMenuContribution {
    constructor(private _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid) {
    }

    public getItems(teamId: string, workItemIds: number[]): Menus.IMenuItemSpec[] {

        const filteredWorkItemIds = <number[]>Events_Action.getService().performAction(
            TFS_Agile.Actions.BACKLOG_FILTER_SELECTION, <TFS_Agile.IBacklogFilterWorkItemsActionArgs>{
                selectedWorkItemIds: workItemIds
            }) || [];
        const workitemTypeName = this._grid.getWorkItemTypeNameById(filteredWorkItemIds[0]);
        const backlogConfig = BacklogConfigurationService.getBacklogConfiguration();
        const backlogLevel = backlogConfig.getBacklogByWorkItemTypeName(workitemTypeName);

        if (!backlogLevel) {
            // Backlog level can be null when an item appears on the backlog only to bring in its children (usually in drill-down views)
            // Example: Bugs can show up on backlogs even when bugBehavior is turned off, this happens only when its children are associated with the backlog level
            // Don't show menuItem if backlog level doesn't exist
            return [];
        }

        return [<Menus.IMenuItemSpec>{
            text: AgileProductBacklogResources.ContextMenu_ChangeParent,
            disabled: false,
            groupId: "core",
            action: (commandArgs: any) => {
                // Setup container
                let $container: JQuery = $(document.body).find(".change-parent-dialog-container");
                if (!$container.length) {
                    $container = $("<div>").addClass("change-parent-dialog-container").appendTo(document.body);
                }

                const closeHandler = () => {
                    if ($container.length) {
                        ReactDOM.unmountComponentAtNode($container[0]);
                    }
                };

                const showSimpleMessageDialog = (message: string, link?: ISimpleMessageLink): void => {
                    const messageDialogProps: ISimpleMessageDialogProps = {
                        message: message,
                        title: AgileProductBacklogResources.BacklogsChangeParentDialogTitle,
                        link: link || null,
                        onDismiss: closeHandler
                    };
                    ReactDOM.render(
                        React.createElement<ISimpleMessageDialogProps>(SimpleMessageDialog, messageDialogProps),
                        $container[0]);
                };

                if (filteredWorkItemIds.length === 0) {
                    showSimpleMessageDialog(AgileProductBacklogResources.ChangeParentInvalidSelectionMessage, {
                        linkText: AgileProductBacklogResources.ChangeParentInvalidSelectionLearnMore,
                        url: AgileProductBacklogResources.ChangeParentInvalidSelectionLearnMoreLink
                    });
                } else if (filteredWorkItemIds.length > 200) {
                    showSimpleMessageDialog(AgileProductBacklogResources.ChangeParentSelectionLimitExceededMessage);
                } else if (Utils_String.equals(backlogLevel.id, backlogConfig.getAllBacklogLevels()[0].id, true)) {
                    // Top level items cannot be reparented
                    showSimpleMessageDialog(AgileProductBacklogResources.ChangeParentSelectionCannotReparentMessage);
                } else if (filteredWorkItemIds.length > 0) {
                    const params = {
                        backlogTeamId: teamId,
                        childBacklogLevelId: backlogLevel.id
                    };
                    const saveHandler = (parentId: number) => {
                        Events_Action.getService().performAction(
                            TFS_Agile.Actions.MAPPING_PANE_REPARENT,
                            <IMappingPaneReparentArgs>{ workItemIds: filteredWorkItemIds, newParentId: parentId, forceRefresh: true });
                        closeHandler();
                        ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "change-parent");
                    };

                    MappingDataProvider.getMappingPaneQueryResults(teamId, params).then(
                        (data: IMappingPaneResultModel) => {
                            ReactDOM.render(
                                React.createElement<IChangeParentDialogProps>(ChangeParentDialog,
                                    <IChangeParentDialogProps>{
                                        selectedWorkItemIds: filteredWorkItemIds,
                                        currentTeam: teamId,
                                        onDismiss: closeHandler,
                                        saveHandler: saveHandler,
                                        teamsMru: data.teamsMru.map<ITeamInfo>(x => ({ name: x.teamName, tfid: x.teamId })),
                                        initialSuggestedWorkItems: this._processMappingData(data),
                                        getSuggestedWorkItems: (team: string): IPromise<IDictionaryStringTo<IWorkItemInfo>> => {
                                            return MappingDataProvider.getMappingPaneQueryResults(team,
                                                {
                                                    backlogTeamId: team,
                                                    childBacklogLevelId: backlogLevel.id
                                                }).then((data: IMappingPaneResultModel) => {
                                                    return this._processMappingData(data);
                                                });
                                        }
                                    }),
                                $container[0]
                            );
                        },
                        (error: Error) => {
                            showSimpleMessageDialog(VSS.getErrorMessage(error));
                        });
                }
            }
        }];
    }

    private _processMappingData(data: IMappingPaneResultModel): IDictionaryStringTo<IWorkItemInfo> {
        let result: IDictionaryStringTo<IWorkItemInfo> = {};

        let titleIdx = null;
        let typeIdx = null;
        let projectIdx = null;
        let workItemIdIdx = null;

        (data.pageColumns || []).forEach((value: string, idx: number) => {
            switch (value) {
                case WITConstants.CoreFieldRefNames.Title: titleIdx = idx;
                    break;
                case WITConstants.CoreFieldRefNames.WorkItemType: typeIdx = idx;
                    break;
                case WITConstants.CoreFieldRefNames.TeamProject: projectIdx = idx;
                    break;
                case WITConstants.CoreFieldRefNames.Id: workItemIdIdx = idx;
                    break;
                default:
                    break;
            }
        });

        for (let rowItem of data.payload.rows) {
            let id = rowItem[workItemIdIdx];
            if (id) {
                const projectName = rowItem[projectIdx];
                const type = rowItem[typeIdx];

                result[id] = <IWorkItemInfo>{
                    id: id,
                    workitemType: type,
                    projectName: projectName,
                    title: rowItem[titleIdx]
                };
            }
        }
        return result;
    }
}

export class AddLinkContextMenuItem implements IBacklogContextMenuContribution {
    constructor(
        protected _itemHierarchy: TFS_Agile_WorkItemChanges.IWorkItemDataHierarchy,
        protected _messageSuppressor: TFS_Agile.IMessageSuppressor,
        protected _dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager) {
    }

    public getItems(teamId: string, workItemIds: number[], gridMenuOptions: TFS_Agile_ProductBacklog_Grid.IProductBacklogGridMenuOptions): Menus.IMenuItemSpec[] {
        if (ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
            return;
        }

        const executeAddLinkCommand = (command: string) => {
            VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"]).then(
                () => {
                    Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs(command, {
                        baseId: workItemIds[0],
                        selectedIds: workItemIds,
                        options: {
                            workItemLinkFilters: null,
                            externalLinkFilters: null,
                            workItemTypeFilters: null,
                            isNewLinksControl: true,
                            immediateSave: true,
                            afterSave: (result: { workItems: WITOM_NOREQUIRE.WorkItem[] }) => {
                                ContextMenuContributionUtils.recordContextMenuTelemetry(result.workItems.map(x => x.id), command);
                            }
                        }
                    }, null));
                },
                (error: Error) => {
                    VSSError.publishErrorToTelemetry({
                        name: `CouldNotExecute${command}Command`,
                        message: VSS.getErrorMessage(error)
                    });
                }
            );
        };

        return [<Menus.IMenuItemSpec>{
            text: AgileProductBacklogResources.ContextMenu_AddLink,
            disabled: false,
            groupId: "core",
            childItems: [
                <Menus.IMenuItemSpec>{
                    text: AgileProductBacklogResources.ContextMenu_LinkToExistingItem,
                    disabled: false,
                    icon: "bowtie-icon bowtie-link",
                    action: (commandArgs?: any) => {
                        executeAddLinkCommand(LinkingUtils.ACTIONS_LINK_TO_EXISTING)
                    }
                },
                <Menus.IMenuItemSpec>{
                    text: AgileProductBacklogResources.ContextMenu_LinkToNewItem,
                    disabled: false,
                    icon: "bowtie-icon bowtie-work-item",
                    action: (commandArgs?: any) => {
                        executeAddLinkCommand(LinkingUtils.ACTIONS_LINK_TO_NEW)
                    }
                }
            ]
        }];
    }
}

export class EmailWorkItemContextMenuItem implements IBacklogContextMenuContribution {
    constructor(private _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid) {
    }

    public getItems(teamId: string, workItemIds: number[]): Menus.IMenuItemSpec[] {
        if (ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
            return;
        }

        return [{
            id: CommonContextMenuItems.EMAIL_SELECTION_ACTION_NAME,
            text: ResourcesWorkItemTracking.EmailSelectedWorkItems,
            icon: "bowtie-icon bowtie-mail-message",
            groupId: "export",
            action: (commandArgs: any) => {
                this._emailWorkItemsSelection(commandArgs);
                ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "email");
            }
        }];
    }

    private _emailWorkItemsSelection(commandArgs) {
        //Remove unparented place holder rows
        let selectedWorkItemIds = this._grid.getSelectedWorkItemIds();

        let gridColumns = this._grid._columns;
        let fields = $.map(gridColumns || [], function (column) {
            // filter the virtual columns, which do not have fieldId
            if (column.fieldId) {
                return column.name;
            }
        });

        let sendEmail = (emailOptions: EmailWorkItemsModel_Async.IEmailWorkItemsDialogModelOptions) => {
            VSS.requireModules(["Admin/Scripts/TFS.Admin.SendMail", "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems"])
                .spread((AdminSendMail: typeof AdminSendMail_Async, EmailWorkItemsModel: typeof EmailWorkItemsModel_Async) => {
                    AdminSendMail.Dialogs.sendMail(new EmailWorkItemsModel.EmailWorkItemsDialogModel(emailOptions));
                });
        };

        //Set up dialog options
        let emailOptions = {
            workItemSelectionOption: {
                workItems: selectedWorkItemIds,
                fields: fields,
                store: this._grid.getStore()
            }
        };

        //Add link to a temporary query if we have more than one item
        if (selectedWorkItemIds && selectedWorkItemIds.length > 1) {
            // Set up for query generation
            let tfsContext = commandArgs.tfsContext;
            let queryAdapter = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<QueryAdapter>(QueryAdapter);


            QueryResultGrid.createTemporaryQueryIdForSelectedWorkItemIds(tfsContext, queryAdapter, selectedWorkItemIds, fields, [],
                (tempQueryId: string) => {
                    const queryLink = TempQueryUtils.createTempQueryLink(tfsContext, tempQueryId);
                    $.extend(emailOptions.workItemSelectionOption, { extendedText: queryLink, tempQueryId: tempQueryId, projectId: tfsContext.navigation.projectId });
                    sendEmail(emailOptions);
                },
                () => {
                    sendEmail(emailOptions);
                });
        }
        else {
            sendEmail(emailOptions);
        }
    }
}

/** Supports adding "Assign To" context menu item to a set of work items types in the grid. */
export class AssignToContextMenuItem implements IBacklogContextMenuContribution {
    public getItems(teamId: string, workItemIds: number[]): Menus.IMenuItemSpec[] {
        if (!TFS_Agile.areAdvancedBacklogFeaturesEnabled() || ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
            return;
        }
        const assignToMenuItem = CommonContextMenuItems.getAssignToContextMenuItem(
            tfsContext,
            {
                immediateSave: true,
                afterSave: () => ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "assign-to")
            },
            <(...args: any[]) => any>ContextMenuContributionUtils.bulkSaveErrorHandler);
        assignToMenuItem.title = Utils_String.empty;
        return [assignToMenuItem];
    }
}

/** Change work item type context menu contribution */
export class ChangeTypeContextMenuItem implements IBacklogContextMenuContribution {
    constructor(private _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid) {
    }

    public getItems(teamId: string, workItemIds: number[]): Menus.IMenuItemSpec[] {

        if (ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
            return [];
        }

        return [{
            icon: "bowtie-icon bowtie-switch",
            text: WITResources.ChangeType,
            groupId: "export",
            action: (commandArgs: any) => {

                VSS.requireModules(["WorkItemTracking/Scripts/Dialogs/WITDialogs"])
                    .spread((WITDialogs: typeof WITDialogs_Async) => {
                        WITDialogs.changeWorkItemType(
                            {
                                workItemIds: this._grid.getSelectedWorkItemIds(),
                                tfsContext: tfsContext,
                                container: this._grid.getElement(),
                                saveOnClose: true,
                                errorHandler: (error: any) => {
                                    ContextMenuContributionUtils.bulkSaveErrorHandler(error);
                                }
                            });

                        ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "change-work-item-type");
                    });
            }
        }];
    }
}

/** Move work item context menu contribution */
export class MoveItemContextMenuItem implements IBacklogContextMenuContribution {
    constructor(private _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, private _messageSuppressor: TFS_Agile.IMessageSuppressor) {
    }

    public getItems(teamId: string, workItemIds: number[]): Menus.IMenuItemSpec[] {

        if (ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
            return [];
        }

        return [{
            icon: "bowtie-icon bowtie-work-item-move",
            text: WITResources.MoveWorkItemTitle,
            groupId: "export",
            action: (commandArgs: any) => {
                VSS.requireModules(["WorkItemTracking/Scripts/Dialogs/WITDialogs"])
                    .spread((WITDialogs: typeof WITDialogs_Async) => {
                        WITDialogs.moveWorkItem(
                            {
                                workItemIds: this._grid.getSelectedWorkItemIds(),
                                tfsContext: tfsContext,
                                container: this._grid.getElement(),
                                saveOnClose: true,
                                beforeSave: (workItems: WITOM_NOREQUIRE.WorkItem[]) => {
                                    this._messageSuppressor.suppressAll();
                                },
                                afterSave: (workItems: WITOM_NOREQUIRE.WorkItem[], changes: IFieldIdValue[]) => {
                                    ContextMenuContributionUtils.bulkSaveSuccessHandler(workItems, changes);
                                },
                                errorHandler: (error: any) => {
                                    ContextMenuContributionUtils.bulkSaveErrorHandler(error);
                                },
                                onClose: () => {
                                    // We are disabling suppressAll here instead of calling it in afterSave callback 
                                    // Unlike BulkEditContextMenuItem we end up calling updateWorkItems twice for bulk move 
                                    // as we are fetching first work item always. This triggers saving for the first work item separately
                                    // followed by batch update of the rest work items. Related code is readyWorkItemIds logic in beginGetWorkItems
                                    this._messageSuppressor.disableSuppressAll();
                                }
                            });

                        ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "move-work-item");
                    });
            }
        }];
    }
}

/** Supports adding "Copy as HTML" context menu item to a set of work items types in the grid. */
export class CopyAsHtmlContextMenuItem implements IBacklogContextMenuContribution {
    constructor(private _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid) {
    }

    public getItems(teamId: string, workItemIds: number[]): Menus.IMenuItemSpec[] {

        // Do not create contextMenuItem if selected row/rows are unparented
        if (ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
            return [];
        }

        return [{
            icon: "bowtie-icon bowtie-edit-copy",
            text: WITResources.CopyToClipboard,
            groupId: "modify",
            action: (commandArgs: any) => {
                this._grid.copySelectedItems();
                ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "copy-as-html");
            }
        }];
    }
}

/** Contributes work item bulk edit */
export class BulkEditContextMenuItem implements IBacklogContextMenuContribution {
    constructor(private _messageSuppressor: TFS_Agile.IMessageSuppressor) {
    }

    /**
        * Invoked when a grid-row context menu is opened.
        *
        * @param {number[]} workItemId - The work item id for the row.
        */
    public getItems(teamId: string, workItemIds: number[]): Menus.IMenuItemSpec[] {
        if (ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
            return [];
        }

        return [{
            id: "bulk-edit-workitems",
            text: WITResources.BulkEditSelectedWorkItems,
            icon: "bowtie-icon bowtie-edit-outline",
            groupId: "modify",
            action: (args) => {
                this._showBulkEditDialog(args);
                ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "bulk-edit-workitems");
            }
        }];
    }

    private _showBulkEditDialog(args: any) {
        /* This is the format of the "args" param (Look at QueryResultGrid._getDefaultActionArguments())
        {
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            id: this._workItems[contextInfo.rowInfo.dataIndex],
            selectedWorkItems: this.getSelectedWorkItemIds(),
            selectedWorkItemProjectTypeMapping: this.getSelectedWorkItemProjectTypeMapping()
        }
        */
        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (BulkEdit: typeof WITControls_BulkEdit_NOREQUIRE) => {
            var options = {
                tfsContext: args.tfsContext,
                okCallback: (dialogResult) => {
                    var bulkOptions = {
                        container: dialog._element,
                        immediateSave: true,
                        beforeSave: (workItems: WITOM_NOREQUIRE.WorkItem[]) => {
                            this._messageSuppressor.suppressAll();
                        },
                        afterSave: (workItems: WITOM_NOREQUIRE.WorkItem[], changes: IFieldIdValue[]) => {
                            ContextMenuContributionUtils.bulkSaveSuccessHandler(workItems, changes);
                            this._messageSuppressor.disableSuppressAll();
                        }
                    };

                    BulkEdit.bulkUpdateWorkItems(args.tfsContext,
                        dialogResult.workItemIds,
                        dialogResult.changes,
                        bulkOptions,
                        (error: any) => {
                            this._messageSuppressor.disableSuppressAll();

                            ContextMenuContributionUtils.bulkSaveErrorHandler(error);
                        });
                },
                buttons: {
                    "save": {
                        id: "ok", //The modal dialog expects "ok"
                        text: WITResources.Save,
                        click: (e) => { dialog.onOkClick(e) },
                        disabled: "disabled"
                    },
                    "cancel": {
                        id: "cancel",
                        text: WITResources.Cancel,
                        click: (e) => { dialog.onCancelClick(e) }
                    }
                }
            };
            var dialog = BulkEdit.BulkEditDialogs.bulkEditWorkItems(args.selectedWorkItems.filter((id: number) => { return id >= 0 }), args.selectedWorkItemProjectTypeMapping, options);
        });
    }
}

/** Contains all the logic related to moving work items to another position */
export class MoveToPositionHelper {
    private static TOP_POSITION: number = 0;

    constructor(
        protected _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid,
        protected _itemHierarchy: TFS_Agile_WorkItemChanges.IWorkItemDataHierarchy,
        protected _selectionFilter: TFS_Agile_WorkItemChanges.ISelectionFilter) {
    }

    /** Work Item Ids should be filtered before passing into any of the other methods */
    public filterWorkItemIds(workItemIds: number[]) {
        if (this._selectionFilter) {
            return this._selectionFilter.filter(workItemIds);
        }
        else {
            return workItemIds;
        }
    }

    public isMoveToPositionAllowed(workItemIds: number[]): boolean {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");

        var backlogContext = TFS_Agile.BacklogContext.getInstance();

        if (!TFS_Agile.areAdvancedBacklogFeaturesEnabled()
            || backlogContext.includeParents
            || !this._grid.getReorderState()
            || ContextMenuContributionUtils.onlyVirtualWorkItems(workItemIds)) {
            return false;
        }

        for (let workItemId of workItemIds) {
            let workItemData = this._itemHierarchy.getData(workItemId);

            // Ensure that every work item is paged in and owned (otherwise reordering is not allowed).
            if (!workItemData || !workItemData.isOwned) {
                return false;
            }
        }

        return true;
    }

    /** Move to top is hidden in product backlog
    * @param workItemIds Work item ids of the selected items.
    * @return True if there is only one item selected and it is at the top; false otherwise
    */
    public isMoveToTopHidden(workItemIds: number[]): boolean {
        return true;
    }

    public isMoveToPositionHidden(workItemIds: number[]): boolean {
        var backlogContext = TFS_Agile.BacklogContext.getInstance();

        return workItemIds.some(workItemId => {
            let workItemTypeName = this._itemHierarchy.getData(workItemId).type;;

            return !workItemTypeName || !Utils_Array.contains(backlogContext.level.workItemTypes, workItemTypeName, Utils_String.ignoreCaseComparer);
        });
    }

    public moveToTop(workItemIds: number[]) {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");

        this._grid.performActionWithPreserveSelection(() => {
            this._moveWorkItems(workItemIds, this._getTopIndexFromWorkItemId(workItemIds[0]));
        });
    }

    public moveToPosition(workItemIds: number[], visibleOrderNumber: number) {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");

        this._grid.performActionWithPreserveSelection(() => {
            var dataManager = this._grid.getDataManager();

            var previousWorkItemId: number = null;
            var nextWorkItemId: number = null;

            // For move to position we take the top-level items (only these have an order number), which are *not selected* (because selected
            // items might move, shifting order numbers). Then we try to find the correct reference element in that set.
            // Example:
            // Vis.Order  Id  Selected
            //    1       A    x
            //    2       B    
            //    3       C    x
            //    4       D
            // We try to move the selection to position 3. Filtered top level items are {B, C} (the selected items will move, so cannot be
            // considered for the selection of the reference element). Since we intend to move selection to 3, D has to be the previous-reference
            // element for the move operation. The result will be:
            // Vis.Order  Id  Selected
            //    1       B    
            //    2       D
            //    3       A    x
            //    4       C    x
            // 
            // Note: We will always generate a move action, because a reparent operation might be implied (think about selections containing
            // nested requirements, for example). 
            var workItemIdsMap: IDictionaryNumberTo<boolean> = {};
            workItemIds.forEach(id => workItemIdsMap[id] = true);
            var topLevelItemsAfterSelectionIsMoved = this._itemHierarchy.children(0).filter(topLevelWorkItemId => !workItemIdsMap[topLevelWorkItemId]);

            if (visibleOrderNumber === 1) {
                if (topLevelItemsAfterSelectionIsMoved[0] != null) {
                    nextWorkItemId = topLevelItemsAfterSelectionIsMoved[0];
                }
            } else {
                // Try to place items on best effort basis. If it's not possible to move to the correct order number, move to the end of the list
                var filteredTopLevelIndex = Math.min(topLevelItemsAfterSelectionIsMoved.length - 1, visibleOrderNumber - 2);
                var topLevelReferencePointWorkItemId = topLevelItemsAfterSelectionIsMoved[filteredTopLevelIndex];
                previousWorkItemId = topLevelReferencePointWorkItemId || null;
            }

            dataManager.moveWorkItems({
                workItemIds: workItemIds,
                targetLocation: {
                    parentId: 0, // Move to top level
                    previousId: previousWorkItemId,
                    nextId: nextWorkItemId
                }
            });
        });
    }

    /**
     * Return the top index position from a given work item id.
     * 
     * @param workItemId Work item id for the item to be moved.
     */
    protected _getTopIndexFromWorkItemId(workItemId: number): number {
        return MoveToPositionHelper.TOP_POSITION;
    }

    /**
     * Return true if the work item is already at the top position identified by the visible index
     * 
     * @param workItemId Work item id for the item to be moved.
     * @param targetDataIndex Data index of the row the work item should be moved to.
     */
    protected _isWorkItemAtTopIndex(workItemId: number, targetDataIndex: number): boolean {
        var sourceDataIndex = this._grid._getWorkItemDataIndex(workItemId);

        return (sourceDataIndex === -1 || targetDataIndex === -1 || sourceDataIndex === targetDataIndex);
    }

    /**
     * Move a work item to the position identified by the visible index, if possible
     * 
     * @param workItemIds Work item ids to be moved.
     * @param targetDataIndex Data index of the row the work item should be moved to (zero-based, ascending).
     */
    private _moveWorkItems(workItemIds: number[], targetDataIndex: number) {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertParamIsNumber(targetDataIndex, "targetDataIndex");

        var dataManager = this._grid.getDataManager();

        var parentTreeIndex = dataManager.getParentIndexFromTreeIndex(targetDataIndex);
        var parentWorkItemId = dataManager.getWorkItemIdAtTreeIndex(parentTreeIndex);
        var nextWorkItemId = dataManager.getWorkItemIdAtTreeIndex(targetDataIndex);

        Diag.Debug.assert(parentWorkItemId !== null || nextWorkItemId !== null);

        dataManager.moveWorkItems({
            workItemIds: workItemIds,
            targetLocation: {
                parentId: parentWorkItemId || 0, // ParentId cannot be null
                previousId: null,
                nextId: nextWorkItemId || null
            }
        });
    }
}

/** Contains all the logic related to moving work items to another position on the iteration backlog */
export class IterationMoveToPositionHelper extends MoveToPositionHelper {

    /** OVERRIDE */
    public isMoveToTopHidden(workItemIds: number[]): boolean {
        return workItemIds.some(workItemId =>
            this._grid.isReorderRequirementDisabledForWorkItem(workItemId) // Reordering might be disabled for this specific item on the iteration backlog
            || (workItemId < 0) // If this is a group row, then it isn't meant to be movable.
            || this._isWorkItemAtTopIndex(workItemId, this._getTopIndexFromWorkItemId(workItemId)));
    }

    /** OVERRIDE */
    public isMoveToPositionHidden(workItemIds: number[]): boolean {
        // Move to position is never enabled on the iteration backlog
        return true;
    }

    /** OVERRIDE */
    protected _getTopIndexFromWorkItemId(workItemId: number): number {
        var dataManager = this._grid.getDataManager();
        var topRequirementTreeIndex: number = 0;

        var workItemTypeName = this._grid.getWorkItemTypeNameById(workItemId);

        if (Utils_Array.contains(BacklogConfigurationService.getBacklogConfiguration().taskBacklog.workItemTypes, workItemTypeName, Utils_String.ignoreCaseComparer)) {
            // for a task, return the index of its parent as tasks are only moved under their parent requiremeent
            return dataManager.getParentIndexFromTreeIndex(dataManager.getWorkItemTreeIndex(workItemId)) + 1;
        }

        // Skip over any group rows to the first requirement
        var topWorkItemId: number = dataManager.getWorkItemIdAtTreeIndex(topRequirementTreeIndex);
        while (topWorkItemId < 0) {
            topWorkItemId = dataManager.getNextWorkItemId(dataManager.getWorkItemOrder(topWorkItemId));
        }

        return dataManager.getWorkItemTreeIndex(topWorkItemId);
    }
}

/** Supports adding "Move to Top, Move to Position" context menu items to a set of work items types in the grid. */
export class MoveToPositionContextMenuItem implements IBacklogContextMenuContribution {
    constructor(
        protected _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid,
        protected _moveToPositionHelper: MoveToPositionHelper) {
    }

    public getItems(teamId: string, workItemIds: number[]): Menus.IMenuItemSpec[] {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");

        var menuItems: Menus.IMenuItemSpec[] = [];
        workItemIds = this._moveToPositionHelper.filterWorkItemIds(workItemIds);

        if (!this._moveToPositionHelper.isMoveToPositionAllowed(workItemIds)) {
            return;
        }

        if (!this._moveToPositionHelper.isMoveToTopHidden(workItemIds)) {
            menuItems.push({
                text: AgileProductBacklogResources.ContextMenu_MoveToTop,
                disabled: ContextMenuContributionUtils.anyWorkItemSaving(this._grid, workItemIds),
                groupId: "core",
                action: (commandArgs: any) => {
                    this._moveToPositionHelper.moveToTop(workItemIds);
                    ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "move-to-top");
                }
            });
        }

        if (!this._moveToPositionHelper.isMoveToPositionHidden(workItemIds)) {
            menuItems.push({
                text: AgileProductBacklogResources.ContextMenu_MoveToPosition,
                disabled: ContextMenuContributionUtils.anyWorkItemSaving(this._grid, workItemIds),
                groupId: "core",
                action: (commandArgs: any) => {
                    ReorderDialog.reorderDialogFunc({
                        totalRootLevelItems: this._grid.getDataManager().getTotalRootLevelItems(),
                        moveWorkItemsHandler: (visibleOrderNumber: number) => {
                            this._moveToPositionHelper.moveToPosition(workItemIds, visibleOrderNumber);
                        }
                    });

                    ContextMenuContributionUtils.recordContextMenuTelemetry(workItemIds, "move-to-position");
                }
            });
        }

        return menuItems;
    }
}

export interface IReorderDialogOptions {
    totalRootLevelItems: number;
    moveWorkItemsHandler: (newOrder: number) => void;
}

export class ReorderDialog extends Dialogs.ModalDialog {

    public static reorderDialogFunc(options: IReorderDialogOptions) {
        return Dialogs.show(ReorderDialog, options);
    }

    private _totalItems: number;
    private _input: JQuery;
    private _content: JQuery;
    private _errorSection: any;
    private _intRegex;
    private _moveWorkItems: Function;

    constructor(options: IReorderDialogOptions) {
        super(options);
        this._totalItems = options.totalRootLevelItems;
        this._moveWorkItems = options.moveWorkItemsHandler;
        this._intRegex = /^\d+$/;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            width: 300,
            resizable: false,
            title: AgileProductBacklogResources.ContextMenu_MoveToPosition
        }, options));
    }

    public initialize() {
        var $controlElement = this.getElement();

        $controlElement.addClass('reorder-dialog');

        this._content = $("<div />").addClass("content");

        // Setup the error pane.
        this._errorSection = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $controlElement);

        var id = Controls.getId();
        var dialogText = Utils_String.format(AgileProductBacklogResources.ReorderDialogMessage, this._totalItems);
        $("<label />").text(dialogText).attr("for", id + "_txt").appendTo(this._content);

        this._input = $("<input />")
            .attr("type", "text")
            .attr("id", id + "_txt")
            .addClass("input-text")
            .css("width", "100%")
            .appendTo(this._content)
            .val("");

        this._element.append(this._content);

        super.initialize();

        this._setFocusOnFirstInput();

        this.updateOkButton(true);
    }

    public onOkClick() {
        Diag.logTracePoint('ReorderDialog.onOkClick.start');

        var newPosition = parseInt(this._input.val(), 10);

        // Only an integer position between 1 and the maximum number of elements in the grid is valid
        if (isNaN(newPosition)
            || !this._intRegex.test(this._input.val())
            || newPosition <= 0
            || newPosition > this._totalItems) {
            var dialogError = Utils_String.format(AgileProductBacklogResources.ReorderDialogError_Message, this._totalItems);
            this._errorSection.setError(dialogError);
            return;
        }
        try {
            this._moveWorkItems(newPosition);
        }
        catch (e) {
            this._errorSection.setError(e.message ? e.message : "Exception occurred while trying to reorder work item.");
            return;
        }
        this.close();
    }

    public _getTotalItemCount(): number {
        return this._totalItems;
    }

    /**
     * Sets focus on the first input.
     */
    private _setFocusOnFirstInput() {
        Diag.Debug.assertIsObject(this._content);
        $("input:visible:first", this._content).focus();
    }
}

