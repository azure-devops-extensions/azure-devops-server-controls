import "VSS/LoaderPlugins/Css!Agile/Admin/AdminHub";
import Q = require("q");

import VSS = require("VSS/VSS");
import VSSError = require("VSS/Error");
import Controls = require("VSS/Controls");
import Service = require("VSS/Service");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Navigation_Services = require("VSS/Navigation/Services");
import Notifications = require("VSS/Controls/Notifications");
import Dialogs = require("VSS/Controls/Dialogs");
import Splitter = require("VSS/Controls/Splitter");
import TreeView = require("VSS/Controls/TreeView");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Utils_Clipboard = require("VSS/Utils/Clipboard");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import AgileAdminResources = require("Agile/Scripts/Resources/TFS.Resources.AgileAdmin");
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");

import TeamServices = require("TfsCommon/Scripts/Team/Services");
import TemplateService = require("WorkItemTracking/Scripts/Services/WorkItemTemplateService");
import TemplateDialog = require("WorkItemTracking/Scripts/Dialogs/WorkItemTemplates/WorkItemTemplateEditDialog");
import BulkEdit = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit");
import MultiFieldModel = require("WorkItemTracking/Scripts/Controls/Fields/Models/MultiFieldEditModel");
import { WorkItemTemplatesHelper, TemplatesTelemetry } from "WorkItemTracking/Scripts/Utils/WorkItemTemplateUtils";
import { KeyCode } from "VSS/Utils/UI";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

import VSS_Telemetry = require("VSS/Telemetry/Services");

export interface IWorkItemTemplatesControlOptions {
    tfsContext: TFS_Host_TfsContext.TfsContext;
}

export class WorkItemTemplatesControl extends Controls.Control<IWorkItemTemplatesControlOptions> {
    public static ACTION_TEMPLATES = "templates";

    private static TREE_VIEW_CLASS = "work-item-type-tree-view";

    private _httpClient: WIT_WebApi.WorkItemTrackingHttpClient;
    private _nodes: IDictionaryStringTo<WorkItemTypeTreeNode> = {};
    private _service: TemplateService.WorkItemTemplateService;

    private _splitter: Splitter.Splitter;
    private _typesTreeView: TreeView.TreeView;
    private _treeViewContainer: JQuery;
    private _templateView: WorkItemTemplateViewPage;

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _webContext: Contracts_Platform.WebContext;
    private _hiddenWorkItemTypeNames: IDictionaryStringTo<boolean> = {};

    public initialize() {
        super.initialize();

        this._tfsContext = this._options.tfsContext;
        this._webContext = this._options.tfsContext.contextData;

        this._initialize();
    }

    private _initialize() {
        var splitterOptions: Splitter.ISplitterOptions = { initialSize: 216, vertical: false };
        this._splitter = Controls.create(Splitter.Splitter, this.getElement(), splitterOptions);

        var connection: Service.VssConnection = TFS_OM_Common.ProjectCollection.getConnection(this._tfsContext);
        this._httpClient = connection.getHttpClient<WIT_WebApi.WorkItemTrackingHttpClient>(WIT_WebApi.WorkItemTrackingHttpClient);
        this._service = connection.getService<TemplateService.WorkItemTemplateService>(TemplateService.WorkItemTemplateService);

        let getWorkItemHiddenCategory = this._httpClient.getWorkItemTypeCategory(this._webContext.project.id, "Microsoft.HiddenCategory").then(
            (category: WIT_Contracts.WorkItemTypeCategory) => {
                if (category && $.isArray(category.workItemTypes)) {
                    for (let workItemType of category.workItemTypes) {
                        this._hiddenWorkItemTypeNames[workItemType.name.toLowerCase()] = true;
                    }
                }
            },
            (error: Error) => {
                VSSError.publishErrorToTelemetry(error);
            }
        );

        let workItemTypes: WIT_Contracts.WorkItemType[];
        let getWorkItemTypes = this._httpClient.getWorkItemTypes(this._webContext.project.id).then(
            (types: WIT_Contracts.WorkItemType[]) => {
                workItemTypes = types;
            },
            (error: Error) => {
                this._templatesViewErrorHandler(error);
            }
        );

        Q.allSettled([getWorkItemHiddenCategory, getWorkItemTypes]).then(
            (results) => {
                if (workItemTypes && workItemTypes.length > 0) {
                    this._createWorkItemTypeTreeView(workItemTypes);
                }
                else {
                    this._templatesViewErrorHandler(<Error>{ message: AgileAdminResources.WorkItemTemplates_ErrorMessageGeneric });
                }
            }
        );
    }

    private _templatesViewErrorHandler(error: Error): void {
        // Create or refresh the TemplateView (Right Pane) with empty grid
        this._createOrRefreshWorkItemTypeTemplateView("", []);
        this._templateView.setError(error);
        this.hideBusyOverlay();
    }

    private _attachNavigateEvents() {
        var historySvc = Navigation_Services.getHistoryService();

        historySvc.attachNavigate(WorkItemTemplatesControl.ACTION_TEMPLATES, (sender, state) => {
            // If the type doesn't exist we will select the first one
            if (state.type && this._nodes[state.type]) {
                this.showBusyOverlay();
                this._service.getWorkItemTemplatesForType(this._webContext.project.id, this._webContext.team.id, state.type).then((templates: WIT_Contracts.WorkItemTemplateReference[]) => {
                    this._typesTreeView.setSelectedNode(this._nodes[state.type]);
                    this._createOrRefreshWorkItemTypeTemplateView(state.type, templates);
                    this.hideBusyOverlay();
                }, (error) => {
                    this._templateView.setError(error);
                    this.hideBusyOverlay();
                });
            }
            else {
                historySvc.replaceHistoryPoint(WorkItemTemplatesControl.ACTION_TEMPLATES, {
                    type: Object.keys(this._nodes)[0]
                });
            }
        }, true);
    }

    private _createWorkItemTypeTreeView(types: WIT_Contracts.WorkItemType[]) {
        var typeNodes: WorkItemTypeTreeNode[] = [];

        this._service.getWorkItemTemplateReferences(this._webContext.project.id, this._webContext.team.id).then(
            (templates: IDictionaryStringTo<WIT_Contracts.WorkItemTemplateReference[]>) => {

                // Populate templates lookup
                let templatesLookup: IDictionaryStringTo<number> = {};
                for (let workItemType of Object.keys(templates)) {
                    templatesLookup[workItemType.toLowerCase()] = templates[workItemType].length;
                }

                // Iterate over the given workItemTypes and populate the nodes
                for (let workItemType of types) {
                    let typeNameKey = workItemType.name.toLowerCase();
                    if (!this._hiddenWorkItemTypeNames[typeNameKey] || templatesLookup[typeNameKey]) {
                        var node: WorkItemTypeTreeNode = new WorkItemTypeTreeNode(workItemType, this._webContext.project.name);
                        typeNodes.push(node);
                        this._nodes[workItemType.name] = node;
                    }
                }
                var options: TreeView.ITreeOptions = {
                    clickSelects: false,
                    nodes: typeNodes,
                    showIcons: true,
                    useBowtieStyle: true,
                    useArrowKeysForNavigation: true,
                    onRenderIcon: (node: WorkItemTypeTreeNode) => {
                        if (node.projectName && node.workItemType) {
                            let container = $("<div />");
                            WorkItemTypeIconControl.renderWorkItemTypeIcon(container[0], node.workItemType.name, node.projectName);
                            return container[0];
                        }

                        return null;
                    }
                };

                this._splitter.leftPane.empty();
                this._treeViewContainer = $('<div>').addClass(WorkItemTemplatesControl.TREE_VIEW_CLASS).addClass("auto-scrollable-content").appendTo(this._splitter.leftPane);
                this._treeViewContainer.attr("role", "navigation");
                this._typesTreeView = <TreeView.TreeView>Controls.create(TreeView.TreeView, this._treeViewContainer, options);
                this._attachNavigateEvents();
            },
            (error) => {
                this._templatesViewErrorHandler(error);
            }
        );
    }

    private _createOrRefreshWorkItemTypeTemplateView(workItemType: string, templateReferences: WIT_Contracts.WorkItemTemplateReference[]) {
        if (!this._templateView) {
            this._templateView = <WorkItemTemplateViewPage>Controls.create(
                WorkItemTemplateViewPage,
                this._splitter.rightPane,
                {
                    workItemType: workItemType,
                    templateReferences: templateReferences,
                    tfsContext: this._options.tfsContext
                }
            );
            this._templateView._element.attr("role", "main");
        }
        else {
            this._templateView.refresh(workItemType, templateReferences);
        }
    }

    public show() {
        this.showElement();
    }

    public hide() {
        this.hideElement();
    }
}

class WorkItemTypeTreeNode extends TreeView.TreeNode {
    public workItemType: WIT_Contracts.WorkItemType;

    public projectName: string;

    constructor(workItemType: WIT_Contracts.WorkItemType, projectName: string, children?: TreeView.TreeNode[]) {
        super(workItemType.name, null, children);

        this.workItemType = workItemType;
        this.projectName = projectName;
        this.noTreeIcon = true;

        var historySvc = Navigation_Services.getHistoryService();

        this.link = historySvc.getFragmentActionLink(WorkItemTemplatesControl.ACTION_TEMPLATES, {
            type: workItemType.name
        });
    }
}

/**
 * Expected source items for workItemTemplatesGrid datasource
 */
export interface IGridSourceItem {
    id: string;
    name: string;
    description: string;
    template: WIT_Contracts.WorkItemTemplateReference;
}

interface IWorkItemTemplatesGridOptions extends Grids.IGridOptions {
    editTemplate: (id: string) => void;
}

/**
 * Grid for workitem type templates
 */
class WorkItemTemplatesGrid extends Grids.GridO<IWorkItemTemplatesGridOptions> {

    constructor(options?: any) {
        super(options);
    }

    /**
     * Updates data source for the grid
     * @param sourceItems array or items of type IGridSourceItem
     * @param selectedIndex index for the selected item in the array, default is 0 (first item)
     */
    public updateSource(sourceItems: IGridSourceItem[], selectedIndex: number = 0) {
        this.setDataSource(sourceItems, null, null, null, selectedIndex);
    }

    public onOpenRowDetail(eventArgs) {
        let dataIndex = this.getSelectedDataIndex();
        if (dataIndex >= 0) {
            let templateSource: IGridSourceItem = this.getRowData(dataIndex);
            if (templateSource && templateSource.id && this._options.editTemplate) {
                this._options.editTemplate(templateSource.id);
            }
            return false; // Event was handled    
        }
    }
}

/**
 * Template view page for a workItemType
 * @param workItemType selected workItemType
 * @param templateReferences array of template references of type WorkItemTemplateReference
 */
export interface IWorkItemTemplateViewOptions {
    workItemType: string;
    templateReferences: WIT_Contracts.WorkItemTemplateReference[];
    tfsContext: TFS_Host_TfsContext.TfsContext;
}

interface IContextMenuArgs {
    rowInfo: Grids.IGridRowInfo;
    item: IGridSourceItem;
}

export class WorkItemTemplateViewPage extends Controls.Control<IWorkItemTemplateViewOptions> {

    public static NEW_TEMPLATE = "work-item-new-template";

    private _toolBar: Menus.MenuBar;
    private _workItemType: string;
    private _templateReferences: WIT_Contracts.WorkItemTemplateReference[];
    private _errorPane: Notifications.MessageAreaControl;
    private _$title: JQuery;
    private _grid: WorkItemTemplatesGrid;
    private _sourceItems: IGridSourceItem[];

    private _service: TemplateService.WorkItemTemplateService;

    constructor(options: IWorkItemTemplateViewOptions) {
        super(options);
        this._workItemType = options.workItemType;
        this._templateReferences = options.templateReferences;
    }

    // Override
    public initialize() {
        super.initialize();
        this._initializeUIElements();
        this.refresh(this._workItemType, this._templateReferences);
    }

    /**
     * Refresh template view page
     * @param workItemType
     * @param templateReferences array of template references of type WorkItemTemplateReference
     * @param selectedIndex index for the selected item in the array, default is 0 (first item)
     */
    public refresh(workItemType: string, templateReferences: WIT_Contracts.WorkItemTemplateReference[], selectedIndex: number = 0) {
        this._workItemType = workItemType;
        this._templateReferences = templateReferences;

        // Title
        this._setTitleText();

        // Error pane
        this._errorPane.clear();

        // Grid
        this._sourceItems = this._getGridSourceItemsFromTemplateReferences(this._templateReferences);
        this._grid.updateSource(this._sourceItems, selectedIndex);
    }

    public setError(error: any) {
        this._errorPane.setError(VSS.getErrorMessage(error));
    }

    public setWarning(warning: string) {
        this._errorPane.setMessage(warning, Notifications.MessageAreaType.Warning);
    }

    private _initializeUIElements() {

        let $rootElement = this.getElement().addClass("work-item-template-view-container");
        $rootElement.empty();

        // Title
        this._$title = $("<h1>").addClass("templates-view-title").appendTo($rootElement);
        this._setTitleText();

        let $templatesViewContent = $("<div/>").addClass("templates-view-content").appendTo($rootElement);
        let $templatesViewContainer = $("<div/>").addClass("templates-view-content-container").appendTo($templatesViewContent);

        // Description
        let $description = $("<div/>").addClass("templates-view-description").appendTo($templatesViewContainer);

        $description.html(Utils_String.format(AgileAdminResources.WorkItemTemplates_AdminPageDescription, Utils_String.format(
            "<a href='{0}' target='_blank' rel='noopener noreferrer'>{1}</a>", AgileAdminResources.WorkItemTemplates_LearnMoreFwLink, AgileAdminResources.WorkItemTemplates_LearnMore
        )));

        // Toolbar
        let toolBarDiv = $('<div>').addClass('toolbar templates-view-toolbar').appendTo($templatesViewContainer);
        this._toolBar = <Menus.MenuBar>Controls.BaseControl.createIn(
            Menus.MenuBar,
            toolBarDiv,
            {
                items: [{
                    id: WorkItemTemplateViewPage.NEW_TEMPLATE,
                    idIsAction: true,
                    disabled: !this._workItemType,
                    title: AgileAdminResources.WorkItemTemplates_View_AddTemplateButtonText,
                    setTitleOnlyOnOverflow: true,
                    text: AgileAdminResources.WorkItemTemplates_View_AddTemplateButtonText,
                    icon: "bowtie-icon bowtie-math-plus"
                }],
            }
        );
        this._toolBar._element.find('[class=drop]').css('margin-left', '2px');

        Menus.menuManager.attachExecuteCommand((sender, args?) => {
            this._onExecuteCommand(sender, args);
        });

        // Grid
        let gridContainer = $('<div>').addClass('templates-view-grid-container').appendTo($templatesViewContainer);
        this._errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, gridContainer);
        this._grid = <WorkItemTemplatesGrid>Controls.BaseControl.createIn(WorkItemTemplatesGrid, gridContainer, this._generateGridOptions());
        this._sourceItems = this._getGridSourceItemsFromTemplateReferences(this._templateReferences);
        this._grid.updateSource(this._sourceItems);

        this._grid._bind(this._grid._canvas, 'keyup', (e: JQueryEventObject) => {
            if (e.which === KeyCode.DELETE) {
                let dataIndex = this._grid.getSelectedDataIndex();
                if (dataIndex >= 0 && this._sourceItems && this._sourceItems.length > dataIndex) {
                    let templateSource: IGridSourceItem = this._sourceItems[dataIndex];
                    if (templateSource && templateSource.template) {
                        this._deleteTemplate(templateSource.template, dataIndex);
                    }
                }
            }
        });

        // Add warning message if users do not have permission to edit templates
        let projectId = this._options.tfsContext.contextData.project && this._options.tfsContext.contextData.project.id;
        let teamId = this._options.tfsContext.contextData.team && this._options.tfsContext.contextData.team.id;

        Service.getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(projectId, teamId).then((permissions: TeamServices.ITeamPermissions) => {
            if (!permissions.currentUserHasTeamPermission) {
                this.setWarning(AgileAdminResources.WorkItemTemplates_TeamAccessWarning);
            }
        });
    }

    /**
     * Set title text
     */
    private _setTitleText() {
        if (!!this._$title) {
            const title = this._workItemType ? Utils_String.format(AgileAdminResources.WorkItemTemplates_View_Title, this._workItemType) :
                AgileAdminResources.WorkItemTemplates_View_Title_Default;
            this._$title.text(title);
        }
    }

    /**
     * Generate workItemTemplates grid options
     */
    private _generateGridOptions(): IWorkItemTemplatesGridOptions {
        return <IWorkItemTemplatesGridOptions>{
            editTemplate: (id: string) => this._editTemplate(id),
            header: true,
            sharedMeasurements: false,
            coreCssClass: "grid templates-view-grid",
            columns: [{
                canSortBy: false,
                name: AgileAdminResources.WorkItemTemplates_Grid_NameColumnHeader,
                text: AgileAdminResources.WorkItemTemplates_Grid_NameColumnHeader,
                width: 400,
                getCellContents: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                    let $gridCell: JQuery = this._grid._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                    let name = this._sourceItems[dataIndex].name;
                    let $cellContents = $("<div>").text(name);
                    RichContentTooltip.addIfOverflow(name, $cellContents);
                    $gridCell.empty(); // Clear the nbsp character
                    return $gridCell.append($cellContents);
                }
            },
            {
                canSortBy: false,
                name: AgileAdminResources.WorkItemTemplates_Grid_DescriptionColumnHeader,
                text: AgileAdminResources.WorkItemTemplates_Grid_DescriptionColumnHeader,
                width: 500,
                getCellContents: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                    let $gridCell = this._grid._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                    let description = this._sourceItems[dataIndex].description;
                    RichContentTooltip.addIfOverflow(description, $gridCell);
                    return $gridCell.text(description);
                }
            }
            ],
            allowMoveColumns: false,
            allowMultiSelect: false,
            lastCellFillsRemainingContent: true,
            useBowtieStyle: true,
            contextMenu: {
                items: (contextInfo) => {
                    return this._getContextMenuItems(contextInfo);
                }
            }
        };
    }

    /**
     * Get context menu items
     * @param contextInfo
     */
    private _getContextMenuItems(contextInfo: IContextMenuArgs): Menus.IMenuItemSpec[] {
        let menuItems: Menus.IMenuItemSpec[] = [];

        // Edit template menuitem
        menuItems.push({
            id: "Edit",
            icon: "bowtie-icon bowtie-edit",
            text: AgileAdminResources.WorkItemTemplates_MenuItem_Edit,
            title: AgileAdminResources.WorkItemTemplates_MenuItem_Edit,
            setTitleOnlyOnOverflow: true,
            action: (e) => { this._editTemplateHandler(e); },
            "arguments": contextInfo
        });

        // Delete template menuitem
        menuItems.push({
            id: "Delete",
            icon: "bowtie-icon bowtie-edit-delete",
            text: AgileAdminResources.WorkItemTemplates_MenuItem_Delete,
            title: AgileAdminResources.WorkItemTemplates_MenuItem_Delete,
            setTitleOnlyOnOverflow: true,
            action: (e) => { this._deleteTemplateHandler(e); },
            "arguments": contextInfo
        });

        // Copy template link menuitem
        menuItems.push({
            id: "Copy link",
            icon: "bowtie-icon bowtie-copy-to-clipboard",
            text: AgileAdminResources.WorkItemTemplates_MenuItem_CopyLink,
            title: AgileAdminResources.WorkItemTemplates_MenuItem_CopyLink,
            setTitleOnlyOnOverflow: true,
            action: (e) => { this._copyTemplateLinkHandler(e); },
            "arguments": contextInfo
        });

        // Create template copy menuitem
        menuItems.push({
            id: "Create copy",
            text: AgileAdminResources.WorkItemTemplates_MenuItem_CreateCopy,
            title: AgileAdminResources.WorkItemTemplates_MenuItem_CreateCopy,
            setTitleOnlyOnOverflow: true,
            action: (e) => { this._createTemplateCopyHandler(e); },
            "arguments": contextInfo
        });

        return menuItems;
    }

    private _onExecuteCommand(sender: any, args?: any) {
        switch (args.get_commandName()) {
            case WorkItemTemplateViewPage.NEW_TEMPLATE:
                let templatePromise = Q(<WIT_Contracts.WorkItemTemplate>{ workItemTypeName: this._workItemType });
                TemplateUtils.launchTemplateDialog(this._options.tfsContext, templatePromise, this._workItemType, true, TemplatesTelemetry.FeatureCreateTemplateAdmin)
                    .then((template) => this._updateGridUsingService(template));
                break;
        }
    }

    private _editTemplateHandler(args: IContextMenuArgs) {
        this._editTemplate(args.item.id);
    }

    private _editTemplate(id: string) {
        var projectId: string = this._options.tfsContext.contextData.project.id;
        var teamId: string = this._options.tfsContext.contextData.team.id;
        var templatePromise = this._getService().getWorkItemTemplate(projectId, teamId, id);

        TemplateUtils.launchTemplateDialog(this._options.tfsContext, templatePromise, this._workItemType, false).then((template) => this._updateGridUsingService(template));
    }

    private _createTemplateCopyHandler(args: IContextMenuArgs) {
        var projectId: string = this._options.tfsContext.contextData.project.id;
        var teamId: string = this._options.tfsContext.contextData.team.id;
        var templatePromise = this._getService().getWorkItemTemplate(projectId, teamId, args.item.id).then((template: WIT_Contracts.WorkItemTemplate) => {
            var copiedTemplate: WIT_Contracts.WorkItemTemplate = $.extend(true, {}, template);
            copiedTemplate.id = null;
            copiedTemplate.url = null;
            copiedTemplate.name = null;

            return copiedTemplate;
        });

        TemplateUtils.launchTemplateDialog(this._options.tfsContext, templatePromise, this._workItemType, true, TemplatesTelemetry.FeatureCopyTemplateAdmin)
            .then((template) => this._updateGridUsingService(template));
    }

    private _templateRefToSourceItem(ref: WIT_Contracts.WorkItemTemplateReference): IGridSourceItem {
        return {
            id: ref.id,
            name: ref.name,
            description: ref.description,
            template: ref,
        };
    }

    private _getGridSourceItemsFromTemplateReferences(workItemTemplateReferences: WIT_Contracts.WorkItemTemplateReference[]): IGridSourceItem[] {
        let gridSourceItems: IGridSourceItem[] = [];
        if ($.isArray(workItemTemplateReferences)) {
            gridSourceItems = workItemTemplateReferences.map<IGridSourceItem>(item => this._templateRefToSourceItem(item));
        }

        return gridSourceItems;
    }

    private _getService(): TemplateService.WorkItemTemplateService {
        if (!this._service) {
            let connection: Service.VssConnection = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext);
            this._service = connection.getService<TemplateService.WorkItemTemplateService>(TemplateService.WorkItemTemplateService);
        }
        return this._service;
    }

    private _updateGridUsingService(selectedTemplate?: WIT_Contracts.WorkItemTemplateReference, selectedIndex: number = 0) {
        var projectId: string = this._options.tfsContext.contextData.project.id;
        var teamId: string = this._options.tfsContext.contextData.team.id;

        this._getService()
            .getWorkItemTemplatesForType(projectId, teamId, this._workItemType)
            .then((templates: WIT_Contracts.WorkItemTemplateReference[]) => {
                if (selectedTemplate) {
                    selectedIndex = Utils_Array.findIndex(templates, (t: WIT_Contracts.WorkItemTemplateReference) => Utils_String.equals(t.id, selectedTemplate.id, true));
                }
                this.refresh(this._workItemType, templates, selectedIndex >= 0 ? selectedIndex : 0);
            });
    }

    private _deleteTemplateHandler(args: IContextMenuArgs) {
        this._deleteTemplate(args.item.template, args.rowInfo.rowIndex);
    }

    private _deleteTemplate(template: WIT_Contracts.WorkItemTemplateReference, rowIndex: number) {
        var options: Dialogs.IModalDialogOptions = {
            title: AgileAdminResources.WorkItemTemplates_DeleteDialog_Title,
            contentText: AgileAdminResources.WorkItemTemplates_DeleteDialog_ContentMessage,
            okText: AgileAdminResources.WorkItemTemplates_DeleteDialog_OkText,
            okCallback: () => {
                var event = new VSS_Telemetry.TelemetryEventData(TemplatesTelemetry.Area, TemplatesTelemetry.FeatureDeleteTemplateAdmin, { [TemplatesTelemetry.PropType]: this._workItemType });
                VSS_Telemetry.publishEvent(event);

                var projectId: string = this._options.tfsContext.contextData.project.id;
                var teamId: string = this._options.tfsContext.contextData.team.id;
                this._getService().deleteWorkItemTemplate(projectId, teamId, template)
                    .then(() => this._updateGridUsingService(null, rowIndex),
                        (error) => this.setError(error));
            }
        };
        Dialogs.show(DeleteTemplateConfirmationDialog, options);
    }

    private _copyTemplateLinkHandler(args: IContextMenuArgs) {
        const link = TemplateUtils.getWorkItemTemplateUrl(
            args.item.id,
            args.item.template.workItemTypeName,
            this._options.tfsContext
        );

        // Copy workItem template link to clipboard
        Utils_Clipboard.copyToClipboard(link);
    }
}

class DeleteTemplateConfirmationDialog extends Dialogs.ConfirmationDialog {
    /**
     * Initialize options
     *
     * @param options options
     */
    public initializeOptions(options?: Dialogs.IConfirmationDialogOptions) {
        super.initializeOptions($.extend({
            width: 500,
            height: "auto",
        }, options));
    }

    /**
     * Gets the current dialog result which will be used when ok button is clicked.
     */
    public getDialogResult() {
        return true;
    }
}

export module TemplateUtils {
    function getDialogOptions(
        tfsContext: TFS_Host_TfsContext.TfsContext,
        template: IPromise<WIT_Contracts.WorkItemTemplate>,
        workItemTypeName: string,
        saveCallback: (template: WIT_Contracts.WorkItemTemplate) => IPromise<string>,
        allowRemoveUnmodified: boolean,
        ciFeature?: string
    ): TemplateDialog.WorkItemTemplateEditDialogOptions {

        var options: TemplateDialog.WorkItemTemplateEditDialogOptions = {
            title: AgileAdminResources.WorkItemTemplates_NewDialog_Title,
            dataProvider: new BulkEdit.WorkItemStoreMultiEditDataProvider(tfsContext, { [tfsContext.contextData.project.name]: [workItemTypeName] }),
            attachResize: true,
            initialTemplate: template,
            saveCallback: saveCallback,
            allowRemoveUnmodified: allowRemoveUnmodified,
            getNewWorkItemFromTemplateUrl: (template: WIT_Contracts.WorkItemTemplate) => getWorkItemTemplateUrl(template.id, template.workItemTypeName, tfsContext),
            ciFeature: ciFeature
        };

        return options;
    }

    export function getWorkItemTemplateUrl(templateId: string, workItemTypeName: string, tfsContext: TFS_Host_TfsContext.TfsContext) {
        const ownerId = tfsContext.contextData.team.id; // NOTE: Admin pages populate teamContext even after teamRemoval FF is ON
        return WorkItemTemplatesHelper.generateTemplateUrl(workItemTypeName, ownerId, templateId, tfsContext);
    }

    export function fieldChangesToDictionary(changes: MultiFieldModel.FieldChange[]): IDictionaryStringTo<string> {
        var fields: IDictionaryStringTo<string> = {};

        for (let item of changes) {
            fields[item.fieldRefName] = item.value;
        }

        return fields;
    }

    export function fieldsDictionaryToChanges(fields: IDictionaryStringTo<string>): MultiFieldModel.FieldChange[] {
        var changes: MultiFieldModel.FieldChange[] = [];

        for (var fieldName of Object.keys(fields)) {
            changes.push({
                fieldName: fieldName,
                fieldRefName: fieldName,
                value: fields[fieldName]
            });
        }

        return changes;
    }

    export function launchTemplateDialog(tfsContext: TFS_Host_TfsContext.TfsContext, template: IPromise<WIT_Contracts.WorkItemTemplate>, workItemTypeName: string, isNew: boolean, ciFeature?: string): IPromise<WIT_Contracts.WorkItemTemplate> {
        var deferred: Q.Deferred<WIT_Contracts.WorkItemTemplate> = Q.defer<WIT_Contracts.WorkItemTemplate>();

        var lastSavedTemplate: WIT_Contracts.WorkItemTemplate = null;

        let saveCallBack = (updatedTemplate: WIT_Contracts.WorkItemTemplate) => {
            var projectId = tfsContext.contextData.project.id;
            var teamId = tfsContext.contextData.team.id;

            let connection: Service.VssConnection = TFS_OM_Common.ProjectCollection.getConnection(tfsContext);
            let service = connection.getService<TemplateService.WorkItemTemplateService>(TemplateService.WorkItemTemplateService);

            if (updatedTemplate.id) {
                return service.replaceWorkItemTemplate(projectId, teamId, updatedTemplate.id, updatedTemplate).then((template) => {
                    lastSavedTemplate = template;
                    return template.id;
                });
            } else {
                return service.createWorkItemTemplate(projectId, teamId, updatedTemplate).then((template) => {
                    lastSavedTemplate = template;
                    return template.id;
                });
            }
        };

        var options: TemplateDialog.WorkItemTemplateEditDialogOptions = getDialogOptions(tfsContext, template, workItemTypeName, saveCallBack, false, ciFeature);

        options.title = isNew ? AgileAdminResources.WorkItemTemplates_NewDialog_Title : AgileAdminResources.WorkItemTemplates_EditDialog_Title;

        options.cancelCallback = () => {
            if (lastSavedTemplate) {
                deferred.resolve(lastSavedTemplate);
            }
        };

        Dialogs.show(TemplateDialog.WorkItemTemplateEditDialog, options);

        return deferred.promise;
    }
}
