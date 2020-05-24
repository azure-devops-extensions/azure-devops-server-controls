import { ClassificationMode, CssNode, IClassificationTreeNode, IProjectWorkModel } from "Agile/Scripts/Admin/AreaIterations.DataModels";
import {
    ClassificationConfirmationDialog,
    ClassificationPicker,
    IClassificationConfirmationDialogOptions,
    IClassificationPickerOptions,
    IterationPicker
} from "Agile/Scripts/Admin/ClassificationPicker";
import { AreaPickerDialog, ClassificationPickerDialog, IClassificationPickerDialogOptions } from "Agile/Scripts/Admin/ClassificationPickerDialog";
import { CSSNodeManager } from "Agile/Scripts/Admin/CSSNodeManager";
import { IClassificationValidationResult, ITeamAreaRecord, ITeamClassificationRecord, ITeamIterationRecord } from "Agile/Scripts/Admin/Interfaces";
import {
    ClassificationControlNodeType,
    TeamAreaDataManager,
    TeamClassificationDataManager,
    TeamIterationDataManager
} from "Agile/Scripts/Admin/TeamClassificationDataManager";
import CommonCustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { FieldDataProvider } from "Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters";
import Q = require("q");
import { TeamContext } from "TFS/Core/Contracts";
import { TeamSettingsPatch } from "TFS/Work/Contracts";
import { WorkHttpClient } from "TFS/Work/RestClient";
import TeamServices = require("TfsCommon/Scripts/Team/Services");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import { Grid, GridO, IGridColumn, IGridContextMenu, IGridOptions } from "VSS/Controls/Grids";
import Menus = require("VSS/Controls/Menus");
import Notifications = require("VSS/Controls/Notifications");
import Diag = require("VSS/Diag");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import VSSContext = require("VSS/Context");
import { WiqlOperators } from "WorkItemTracking/Scripts/OM/WiqlOperators";


var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var delegate = Utils_Core.delegate;
var getErrorMessage = VSS.getErrorMessage;

export interface ITeamClassificationSettingsOptions {
    /** ASP.NET MVC controller name. Used for building action URL to post updates */
    controller: string;
    /** ASP.NET MVC action name. Used for building action URL to post updates */
    action: string;
    /** Title of classification page */
    title: string;
    /** If specified, 'Learn more' link appears next to the title text and will navigate to this link */
    learnMoreLink: string;
    /** Description of classification page. Appears immediately below title */
    introHtml: string;
    /** Text to use for add experience */
    addText: string;
    /** Text to use for remove experience */
    removeText: string;
    /** Label used for classification picker */
    classificationPickerLabel: string;
    /** Text used for title of classification dialog */
    classificationPickerDialogTitle: string
    /** Text used for sub title of classification dialog */
    classificationPickerDialogSubTitle: string
    /** Type of classification control (Area | Iteration) */
    classificationControlType: ClassificationControlNodeType;
    /** Error message to display if a duplicate classification is detected */
    duplicateClassificationErrorMessage: string;
    /** Warning message header to display if a duplicate classification is removed */
    classificationRecordsRemovedMessageHeader: string;
    /** Warning message text to display if a duplicate classification is removed */
    classificationRecordsRemovedMessageText: string;
    /** The message to show in the informational message area at the top of the page */
    projectLevelMessage: string;
    /** Include the settings for the current team, iteration, team fields, etc */
    teamSettings: TFS_AgileCommon.ITeamSettings;
    /** Watermark text for classification picker */
    waterMark: string;
    /** Description for the classificatation control area */
    classificationControlDescription: string;
}

/** Base class for team classification controls */
export abstract class TeamClassificationSettings<T extends ITeamClassificationRecord> extends Controls.Control<ITeamClassificationSettingsOptions> {
    private static SETTINGS_LIMIT = 5;
    private static INTRO_CONTAINER_CLASS = "intro-container";

    private _$messageAreaContainer: JQuery;
    private _projectLinkMessageArea: Notifications.MessageAreaControl;
    private _messageArea: Notifications.MessageAreaControl;

    protected static COMMAND_ADD = "add";
    protected static COMMAND_REMOVE = "remove";
    protected static COMMAND_NEW = "new";
    protected static COMMAND_NEW_CHILD = "new-child";
    protected static COMMAND_EDIT = "edit";
    protected static COMMAND_SECURITY = "security";

    protected menubar: Menus.MenuBar;
    protected classificationPicker: ClassificationPicker;
    protected teamSettings: TFS_AgileCommon.ITeamSettings;
    protected grid: Grid;
    protected dataManager: TeamClassificationDataManager<T>;
    protected fieldDataProvider: FieldDataProvider;
    protected nodeManager: CSSNodeManager;
    protected enableReadOnlyMode: boolean;

    /**
     * Retrieves the columns for the grid
     */
    protected abstract getGridColumns(): IGridColumn[];

    /**
     * Retrieves the data source for the grid
     */
    protected abstract getDataSource(): any[];

    /**
     * Saves the path in the data manager
     * @param dialogResult the return result from dialog
     */
    protected abstract saveClassificationSetting(dialogResult: IDictionaryStringTo<any>);

    /**
     * Retrieves the payload to send to the server
     */
    protected abstract getPayload(): any;

    /**
     * delete a row on the grid
     * @param path path of selected row
     */
    protected abstract removeRow(path: string);

    /**
     * Abstract method, needs to be implemented by the descendents so initialize the node manager
     * using the classification nodes, retrieved from the server.
     */
    protected abstract initializeNodeManager(): void;

    /**
     * Include the classification node for the team. Abstract method, implementation to be provided by the respecive classes
     * @param {IClassificationTreeNode} node The newly added node, to be included for the team
     * @param {IClassificationTreeNode} parentNode The parent node of the newly added node
     */
    protected abstract includeClassificationNode(node: IClassificationTreeNode, parentNode: IClassificationTreeNode): void;

    /**
     * Update the data manager to reflect the updated friendly path, due to change in the text or location of the node.
     * Need to update the descendents as well to ensure that their path reflects the change in this node's path
     * @param {IClassificationTreeNode} node The newly added node, to be included for the team
     * @param {IClassificationTreeNode} parentNode The parent node of the newly added node
     */
    protected updateDataManager(node: IClassificationTreeNode) {
        var originalNode = this.dataManager.get(node.id);
        var updatedPath = this.fieldDataProvider.getNodeFromId(node.id).path;
        this.dataManager.updateFriendlyPath(originalNode.friendlyPath, updatedPath);
    }

    /**
     * Retrieves the context menu items for the grid
     */
    protected getContextMenuItems(): IGridContextMenu {
        return {
            items: (context: { item: any[] }) => {
                var selectedItem = context.item[0];
                return [
                    {
                        id: TeamClassificationSettings.COMMAND_NEW,
                        text: AgileResources.AreaIterations_AddNodeText,
                        title: AgileResources.AreaIterations_AddNodeTitle,
                        icon: "icon-new-document",
                        rank: 100,
                        action: (args: { classificationPath: string }) => {
                            this.addClassificationNode(args.classificationPath, false);
                            publishCI(this.getTelemetryFeatureName(TeamClassificationSettings.COMMAND_NEW), { source: "ContextMenu" });
                        },
                        "arguments": { classificationPath: selectedItem },
                        disabled: this.enableReadOnlyMode || selectedItem.split(TeamClassificationDataManager.PATH_SEPARATOR).length === 1 // Disable new sibling for the root node or in case of readonly mode
                    },
                    {
                        id: TeamClassificationSettings.COMMAND_NEW_CHILD,
                        text: AgileResources.AreaIterations_AddChildNodeText,
                        title: AgileResources.AreaIterations_AddChildNodeTitle,
                        icon: "icon-new-document",
                        rank: 200,
                        action: (args: { classificationPath: string }) => {
                            this.addClassificationNode(args.classificationPath, true);
                            publishCI(this.getTelemetryFeatureName(TeamClassificationSettings.COMMAND_NEW_CHILD), { source: "ContextMenu" });
                        },
                        "arguments": { classificationPath: selectedItem },
                        disabled: this.enableReadOnlyMode
                    },
                    {
                        id: TeamClassificationSettings.COMMAND_EDIT,
                        text: AgileResources.AreaIterations_EditNodeTitle,
                        title: AgileResources.AreaIterations_EditNodeTitle,
                        icon: "bowtie-icon bowtie-edit",
                        rank: 300,
                        action: (args: { classificationPath: string }) => {
                            this.editClassificationNode(args.classificationPath);
                            publishCI(this.getTelemetryFeatureName(TeamClassificationSettings.COMMAND_EDIT), { source: "ContextMenu" });
                        },
                        "arguments": { classificationPath: selectedItem },
                        disabled: this.enableReadOnlyMode || selectedItem.split(TeamClassificationDataManager.PATH_SEPARATOR).length === 1 // Disable new sibling for the root node or in case of readonly mode
                    },
                    {
                        id: TeamClassificationSettings.COMMAND_SECURITY,
                        text: AgileResources.AreaIterations_SecureClassificationText,
                        title: AgileResources.AreaIterations_SecureClassificationTitle,
                        icon: "bowtie-icon bowtie-security",
                        rank: 500,
                        action: (args: { classificationPath: string }) => {
                            this.editClassificationNodeSecurity(args.classificationPath);
                            publishCI(this.getTelemetryFeatureName(TeamClassificationSettings.COMMAND_SECURITY), { source: "ContextMenu" });
                        },
                        "arguments": { classificationPath: selectedItem },
                        disabled: this.enableReadOnlyMode
                    }
                ];
            }
        };
    }

    constructor(options?: ITeamClassificationSettingsOptions) {
        super(options);
        Diag.Debug.assertIsNotNull(options.teamSettings);
        this.teamSettings = options.teamSettings;
    }

    /** OVERRIDE: Refer to Control */
    public initialize() {
        super.initialize();
        this.initializeNodeManager();

        const { project, team } = tfsContext.contextData;
        Service.getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(project.id, team.id)
            .then((permissions: TeamServices.ITeamPermissions) => {
                this.enableReadOnlyMode = !permissions.currentUserHasTeamAdminPermission;

                this._createMessageAreaRegion();
                this._createTitleElement();
                this._createIntroElement();
                this.createAdditionalContent();
                this._createClassificationControlDescription();
                this._displayPermissionWarning();
                this._createToolbar();
                this._createGrid();

                this._bind(window, "resize", delegate(this, this._fixGridHeight));

                this._completeInitialization();
            });
    }

    protected _completeInitialization(): void {

    }

    /**
     * Trim space & '\' from the classification path.
     * @param {string} classificationPath
     * @returns {string} classificationPath with space and '\' replaced with ""
     */
    protected trimClassificationPath(classificationPath: string): string {
        return classificationPath.replace(/^(\s|\u00A0|\\)+|(\s|\u00A0|\\)+$/g, "");
    }

    /**
     * Gets the classification node with the specified path, using the fieldDataProvider.
     * @param {string} classificationPath
     * @returns {IClassificationTreeNode}
     */
    protected getCSSNode(classificationPath: string): IClassificationTreeNode {
        return this.fieldDataProvider.getNode(classificationPath);
    }

    /**
     * Read the project work model from the json island. Added by TeamWork.aspx and the values set by AdminWorkController.
     * @returns {IProjectWorkModel}
     */
    protected getProjectWorkModel(): IProjectWorkModel {
        return Utils_Core.parseJsonIsland($(document), ".team-admin-work .project-work-model");
    }

    /**
     * Launches a dialog to add a new classification node with the specified path.
     * @param {string} classificationPath
     * @param {boolean} addAsChild Indicates if the new node should be a child of the current node
     */
    protected addClassificationNode(classificationPath: string, addAsChild: boolean): void {

        var onSuccess = (cssNode: CssNode) => {
            var parentNode = this.fieldDataProvider.getNodeFromId(cssNode.getParentId());
            this.fieldDataProvider.addNode(cssNode.node, parentNode);
            this.includeClassificationNode(cssNode.node, parentNode);
            this._fixGridHeight();
        };

        var classificationNode = this.getCSSNode(classificationPath);
        this.nodeManager.addNode(classificationNode, addAsChild, onSuccess);
    }

    /**
     * Launches a dialog to edit the classification node with the specified path.
     * @param {string} classificationPath
     */
    protected editClassificationNode(classificationPath: string): void {

        var onSuccess = (updatedNode: CssNode) => {

            var originalNode = this.fieldDataProvider.getNodeFromId(updatedNode.getId());
            if (originalNode.parentId !== updatedNode.getParentId()) {
                var newParent = this.fieldDataProvider.getNodeFromId(updatedNode.getParentId());
                this.fieldDataProvider.reparentNode(updatedNode.node, newParent);
            }
            else {
                this.fieldDataProvider.updateNode(updatedNode.node);
            }
            this.updateDataManager(updatedNode.node);
        };

        var classificationNode = this.getCSSNode(classificationPath);
        this.nodeManager.editNode(classificationNode, onSuccess);
    }

    /**
     * Lanches the dialog to manage the security for the the classification node with the specified path.
     * @param {string} classificationPath
     */
    protected editClassificationNodeSecurity(classificationPath: string) {

        var classificationNode = this.getCSSNode(classificationPath);
        this.nodeManager.editNodeSecurity(classificationNode);
    }

    /**
     * Show the control
     */
    public show() {
        this.getElement().show();
        this._fixGridHeight(true);
    }

    /**
     * Hide the control
     */
    public hide() {
        this.getElement().hide();
    }

    /** OVERRIDE: See Control */
    public dispose() {
        super.dispose();
        this.grid.dispose();
        this._messageArea.dispose();
        this._projectLinkMessageArea.dispose();
    }

    /**
     * Saves the current state of the classifications to the server
     * @param perfScenario The scenario descriptor for the current scenario
     */
    protected save(perfScenario: Performance.IScenarioDescriptor): IPromise<void> {
        return this._postUpdate(this.getPayload(), perfScenario);
    }

    /**
     * Refreshes the grid with the latest data in the data manager
     */
    protected refreshGrid() {
        this.grid.setDataSource(this.getDataSource());
    }

    /**
     * Available to be overriden by derived controls to insert content above the toolbar
     */
    protected createAdditionalContent() {

    }

    /**
     * Shows the error message on the message area.
     * @param error The error to be handled
     */
    protected handleError(error: any) {
        this.getMessageArea().setError(getErrorMessage(error));
    }

    /**
     * Gets the message area to show error/info/warning messages.
     * Enhances the message area control in a lazy manner
    */
    public getMessageArea(): Notifications.MessageAreaControl {
        if (!this._messageArea) {
            this._enhanceMessageArea();
        }

        return this._messageArea;
    }

    private _displayPermissionWarning() {
        if (this.enableReadOnlyMode) {
            var $messageAreaElement = $("<div>").appendTo(this.getElement());
            var messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $messageAreaElement, {
                closeable: false,
                showIcon: false,
                type: Notifications.MessageAreaType.Warning
            });
            messageArea.setMessage(this.getNoPermissionWarningText(), Notifications.MessageAreaType.Warning);
        }
    }

    /**
     * Create Message Area
     */
    private _enhanceMessageArea() {

        if (this._messageArea) {
            // already initialized
            return;
        }

        // If the control has not been initialted, ensure that the message area region is added nevertheless
        if (!this._$messageAreaContainer) {
            this._createMessageAreaRegion();
        }

        this._messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $(".classification-message-area", this.getElement()), {
            closeable: true,
            showIcon: true,
            type: Notifications.MessageAreaType.Warning
        });
        this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, () => {
            // Resize the grid when the status message changes as it can grown and shrink.
            this._fixGridHeight();
        });
    }

    /**
     * Shows a message indicating that classification paths was removed by a non-explicit gesture from the grid as a result of adding some other classification paths (e.g. changing backlog iteration)
     *
     * @param {string[]} removedPaths The list of classification paths that has been removed as a result of adding some other classification paths.
     * @param {string[]} addedPaths The list of classification paths that has been added which leads to removal of the given removedPaths. Optional.
     */
    protected showRemovedMessage(removedPaths: string[], addedPaths: string[]) {
        removedPaths = Utils_Array.unique(removedPaths, Utils_String.localeIgnoreCaseComparer);
        addedPaths = Utils_Array.unique(addedPaths, Utils_String.localeIgnoreCaseComparer);

        var generateDetailsContent = () => {
            var $div = $("<div>").addClass("classification-info"),
                $listHeader = $("<p>"),
                $list = $("<ul>"),
                $listFooter = $("<p>");

            var removedMessageHeader = addedPaths.join("; ");
            $listHeader.append(Utils_String.format(this._options.classificationRecordsRemovedMessageText, removedMessageHeader));

            // Cap the number of records being shown in the warning to 5
            var removedRecords = removedPaths.splice(0, 5);

            $.each(removedRecords, function (i, classificationRecord) {
                var $li = $("<li>"),
                    fieldNameHtml = Utils_String.format("<strong>{0}</strong>", classificationRecord);

                $li.append(Utils_String.format(fieldNameHtml));
                $list.append($li);
            });

            if (removedPaths.length > 0) {
                $listFooter.append(Utils_String.format(AgileResources.WorkAdminHub_ClassificationSettings_AndNMore, removedPaths.length));
            }

            $div.append($listHeader);
            $div.append($list);
            $div.append($listFooter);

            return $div;
        };

        this.getMessageArea().setMessage({
            header: this._options.classificationRecordsRemovedMessageHeader,
            content: generateDetailsContent()
        }, Notifications.MessageAreaType.Warning);
    }

    /**
     * Abstract implementation to be overriden by derived controls to get the telemetry feature name for the toolbar command
     * @param commandId The id of the command being clicked
     */
    protected abstract getTelemetryFeatureName(commandId: string);

    /**
     * Abstract implementation to be overriden by derived controls to get warning message for users with no permission
     */
    protected abstract getNoPermissionWarningText();

    private _createMessageAreaRegion() {
        if (!this._$messageAreaContainer && !this.enableReadOnlyMode) {
            this._$messageAreaContainer = $("<div>").appendTo(this.getElement()).addClass("classification-message-area-container");
            this._createProjectLinkMessageArea();
            this._createMessageAreaElement();
        }
    }

    private _createProjectLinkMessageArea() {
        this._projectLinkMessageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(
            Notifications.MessageAreaControl,
            this._$messageAreaContainer,
            <Notifications.IMessageAreaControlOptions>{
                closeable: true,
                showIcon: true,
                type: Notifications.MessageAreaType.Info
            });

        this._projectLinkMessageArea.setMessage(
            $("<span>").html(Utils_String.format(this._options.projectLevelMessage, this._createProjectLevelSettingsUrl(), this._options.controller)),
            Notifications.MessageAreaType.Info
        );

        this._projectLinkMessageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, () => {
            this._fixGridHeight();
        });
    }

    private _createMessageAreaElement() {
        this._$messageAreaContainer.append(
            $("<div>").addClass("classification-message-area")
        );
    }

    private _createTitleElement() {
        this.getElement().append(
            $("<h2>").addClass("main-header").text(this._options.title)
        );
    }

    private _createIntroElement() {
        var $container = $(`<div class="${TeamClassificationSettings.INTRO_CONTAINER_CLASS}">`);
        $("<span>").addClass("main-description").text(this._options.introHtml).appendTo($container);

        if (this._options.learnMoreLink) {
            var $learnMore = $("<a>", {
                href: this._options.learnMoreLink,
                text: AgileResources.Admin_Area_Iteration_LearnMore,
                target: "_learn_more"
            })
                .addClass("learn-more-link");

            $("<span>").addClass("bowtie-icon bowtie-navigate-external").appendTo($learnMore);
            $learnMore.appendTo($container);
        }

        this.getElement().append($container);
    }

    private _createClassificationControlDescription() {
        if (this._options.classificationControlDescription) {
            $("<div>").addClass("toolbar-info").text(this._options.classificationControlDescription).appendTo(this.getElement());
        }
    }

    private _createToolbar() {
        this.menubar = <Menus.MenuBar>Controls.BaseControl.createIn(
            Menus.MenuBar,
            $("<div>").addClass("toolbar").appendTo(this.getElement()),
            {
                items: this._createToolbarItems(),
                executeAction: delegate(this, this._onToolbarItemClick)
            });
    }

    private _createToolbarItems(): Menus.IMenuItemSpec[] {
        return [
            {
                id: TeamClassificationSettings.COMMAND_ADD,
                text: this._options.addText,
                title: this._options.addText,
                icon: "bowtie-icon bowtie-math-plus-heavy",
                disabled: this.enableReadOnlyMode,
                setTitleOnlyOnOverflow: true
            },
            {
                id: TeamClassificationSettings.COMMAND_REMOVE,
                text: this._options.removeText,
                title: this._options.removeText,
                icon: "bowtie-icon bowtie-edit-delete",
                disabled: this.enableReadOnlyMode || this.dataManager.items.length <= 1,
                setTitleOnlyOnOverflow: true
            },
            { separator: true },
            {
                id: TeamClassificationSettings.COMMAND_NEW,
                text: AgileResources.AreaIterations_AddNodeText,
                title: AgileResources.AreaIterations_AddNodeTitle,
                noIcon: true,
                disabled: this.enableReadOnlyMode || this.dataManager.items.length === 0
            },
            {
                id: TeamClassificationSettings.COMMAND_NEW_CHILD,
                text: AgileResources.AreaIterations_AddChildNodeText,
                title: AgileResources.AreaIterations_AddChildNodeTitle,
                noIcon: true,
                disabled: this.enableReadOnlyMode || this.dataManager.items.length === 0
            }
        ];
    }

    private saveClassificationSettingAndRedraw(dialogResult: IDictionaryStringTo<any>) {
        this.saveClassificationSetting(dialogResult);
        this._fixGridHeight();
    }

    private _onToolbarItemClick(e: any) {
        var command = e.get_commandName();
        var rowPath = this._getSelectedRowPath();

        switch (command) {
            case TeamClassificationSettings.COMMAND_ADD:
                this._cancelPickerOperation();

                var dialogOptions = <IClassificationPickerDialogOptions>{
                    classificationControlType: this._options.classificationControlType,
                    title: this._options.classificationPickerDialogTitle,
                    subtitle: this._options.classificationPickerDialogSubTitle,
                    controlLabel: this._options.classificationPickerLabel,
                    validate: delegate(this, this.validateClassification),
                    okCallback: delegate(this, this.saveClassificationSettingAndRedraw),
                    addLimit: TeamClassificationSettings.SETTINGS_LIMIT,
                    addLimitMessage: "",
                    pickerWatermark: this._options.waterMark,
                    rootClassificationNode: this.fieldDataProvider.getRootNode()
                };

                //TODO: find a way to optimize it, the implementation is not ideal
                if (this._options.classificationControlType === ClassificationControlNodeType.Area) {
                    dialogOptions = $.extend(dialogOptions, {
                        addLimitMessage: Utils_String.format(AgileResources.AdminWorkHub_Area_ClassificationDialog_AddLimitMessage, TeamClassificationSettings.SETTINGS_LIMIT),
                    });
                    Dialogs.show(AreaPickerDialog, dialogOptions);
                }
                else {
                    dialogOptions = $.extend(dialogOptions, {
                        showLearnMoreLink: true,
                        learnMoreLink: 'https://go.microsoft.com/fwlink/?LinkId=618317',
                        learnMoreLinkText: AgileResources.FWLink_LearnMore,
                        addLimitMessage: Utils_String.format(AgileResources.AdminWorkHub_Iteration_ClassificationDialog_AddLimitMessage, TeamClassificationSettings.SETTINGS_LIMIT),
                    });
                    Dialogs.show(ClassificationPickerDialog, dialogOptions);
                }
                publishCI(this.getTelemetryFeatureName(command), { source: "Toolbar" });
                break;
            case TeamClassificationSettings.COMMAND_REMOVE:
                if (rowPath) {
                    this.removeRow(rowPath);
                }
                publishCI(this.getTelemetryFeatureName(command), { source: "Toolbar" });
                break;
            case TeamClassificationSettings.COMMAND_NEW:
                if (rowPath) {
                    this.addClassificationNode(rowPath, false);
                }
                publishCI(this.getTelemetryFeatureName(command), { source: "Toolbar" });
                break;
            case TeamClassificationSettings.COMMAND_NEW_CHILD:
                if (rowPath) {
                    this.addClassificationNode(rowPath, true);
                }
                publishCI(this.getTelemetryFeatureName(command), { source: "Toolbar" });
                break;
        }
    }

    private _getSelectedRowPath(): string {
        var rowPath = null;
        var selectedIndex = this.grid.getSelectedDataIndex();
        if (selectedIndex !== -1) {
            var rowData = this.grid.getRowData(selectedIndex);
            if (rowData && rowData[0]) {
                rowPath = rowData[0];
            }
        }
        return rowPath;
    }

    private _createGrid() {
        this.grid = <Grid>Controls.Enhancement.enhance(
            Grid,
            $("<div>").appendTo(this.getElement()),
            this._getGridOptions());

        if (!this.enableReadOnlyMode) {
            this.grid._bind(GridO.EVENT_SELECTED_INDEX_CHANGED, delegate(this, this._handleGridSelectionChanged));
            this.grid.enableEvent(GridO.EVENT_ROW_UPDATED);
            this.grid._bind(GridO.EVENT_ROW_UPDATED, delegate(this, this._handleGridRowUpdated));
        }

        this._fixGridHeight();

        //the initialSelection and multiselect options are not applied when the grid gets created.
        //So add the grid settings here after the grid is all set
        if (this.dataManager.items.length > 0) {
            this.grid.setSelectedRowIndex(0);
        }
        this.grid._options.allowMultiSelect = false;
    }

    private _handleGridSelectionChanged(sender: any, rowIndex: number) {
        Diag.Debug.assertParamIsObject(sender, "sender");
        Diag.Debug.assertParamIsNumber(rowIndex, "rowIndex");

        // New command should be disabled if the grid is empty or the selected row is a root node, so can't add siblings
        var noRowSelected = rowIndex === -1;
        var disableNew = noRowSelected || this._isRootNode(rowIndex);

        // Disable remove add new child if the grid is empty or no row is selected
        this.menubar.updateCommandStates(this._getCommandStates(noRowSelected, disableNew, noRowSelected));

        this._handleGridRowUpdated(sender);
    }

    private _handleGridRowUpdated(sender: JQueryEventObject) {
        var selectedIndex = this.grid.getSelectedRowIndex();
        var noRowSelected = selectedIndex === -1 || this.dataManager.items.length === 0;
        if (this._options.classificationControlType === ClassificationControlNodeType.Area) {
            var disableRemove = noRowSelected || this.dataManager.items.length <= 1; // Grid has the last area node remaining
            var disableNew = noRowSelected || this._isRootNode(selectedIndex); // Grid is empty or no row is selected or it has the root node selected
            var disableNewChild = noRowSelected; // Grid is empty or no row is selected
            this.menubar.updateCommandStates(this._getCommandStates(disableRemove, disableNew, disableNewChild));
        }
        else {
            // Disable all commands if the grid is empty
            this.menubar.updateCommandStates(this._getCommandStates(noRowSelected, noRowSelected, noRowSelected));
        }
    }

    private _isRootNode(rowIndex: number): boolean {
        var isRootNode = false;
        // Check if the item at the given row index has parent node or not
        if (this.dataManager.items && this.dataManager.items[rowIndex]) {
            var selectedItem = this.dataManager.items[rowIndex];
            if (selectedItem) {
                var selectedNode: IClassificationTreeNode = this.fieldDataProvider.getNodeFromId(selectedItem.id);
                isRootNode = !selectedNode || !selectedNode.parent; // Selected node is the root node, so can't add siblings
            }
        }
        return isRootNode;
    }

    private _getCommandStates(disableRemove: boolean, disableNew: boolean, disableNewChild: boolean): Menus.ICommand[] {
        return [
            { id: TeamClassificationSettings.COMMAND_REMOVE, disabled: disableRemove },
            { id: TeamClassificationSettings.COMMAND_NEW, disabled: disableNew },
            { id: TeamClassificationSettings.COMMAND_NEW_CHILD, disabled: disableNewChild }
        ];
    }

    private _fixGridHeight(delay = false) {
        if (!this.grid) {
            return;
        }

        /* There is a header, so we must account for the height by adding one to the number of rows. */
        /* We take (number of rows + header row) * (row height + 1 pixel for padding) */
        var gridHeight = (this.dataManager.items.length + 1) * (this.grid._rowHeight + 1);

        if (delay) {
            Utils_Core.delay(this, 0, () => {
                this.grid.getElement().height(gridHeight);
                this.refreshGrid();
            });
        }
        else {
            this.grid.getElement().height(gridHeight);
            this.refreshGrid();
        }
    }

    protected getAdditionalContentHeight(): number {
        return 0;
    }

    private _createProjectLevelSettingsUrl(): string {
        return tfsContext.getActionUrl("", this._options.controller, { team: null, area: "admin" });
    }

    private _postUpdate(data: any, perfScenario: Performance.IScenarioDescriptor): IPromise<void> {
        const actionUrl = tfsContext.getActionUrl(
            this._options.action,
            this._options.controller,
            {
                area: "admin",
                includeVersion: true,
                useApiUrl: true,
                teamId: this.teamSettings.teamId
            } as TFS_Host_TfsContext.IRouteData);

        var deferred = Q.defer<void>();

        perfScenario.addSplitTiming(CustomerIntelligenceConstants.TeamClassificationSettings.BEGIN_SAVE_CLASSIFICATION);

        Ajax.postMSJSON(actionUrl,
            {
                saveData: Utils_Core.stringifyMSJSON(data)
            },
            (value: any) => {
                perfScenario.addSplitTiming(CustomerIntelligenceConstants.TeamClassificationSettings.SAVE_CLASSIFICATION_SUCCEEDED);
                deferred.resolve(value);
            },
            (error) => {
                let errorMessage = Utils_String.localeFormat(AgileResources.WorkAdminHub_Error, error.message);
                this.getMessageArea().setMessage(errorMessage, Notifications.MessageAreaType.Error);
                perfScenario.addSplitTiming(CustomerIntelligenceConstants.TeamClassificationSettings.SAVE_CLASSIFICATION_FAILED);
                deferred.reject(errorMessage);
            });

        return deferred.promise;
    }

    /**
     * Validate iteration path to be added.
     */
    protected validateClassification(path: string): IClassificationValidationResult {
        var result = <IClassificationValidationResult>{
            valid: true,
            errorMessage: null
        };

        var node = this.getCSSNode(path);

        if (!node) {
            result.valid = false;
            return result;
        }

        result.valid = !this.dataManager.get(node.id);
        result.errorMessage = !result.valid ? this._options.duplicateClassificationErrorMessage : null
        return result;
    }

    private _getGridOptions(): IGridOptions {
        return {
            columns: this.getGridColumns(),
            useBowtieStyle: true,
            contextMenu: this.getContextMenuItems(),
            allowMoveColumns: false,
            openRowDetail: (rowIndex: number) => {
                var selectedPath = this._getSelectedRowPath();
                if (this.enableReadOnlyMode || selectedPath.split(TeamClassificationDataManager.PATH_SEPARATOR).length === 1) {
                    return;
                }
                this.editClassificationNode(selectedPath);
                publishCI(this.getTelemetryFeatureName(TeamClassificationSettings.COMMAND_EDIT), { source: "RowDoubleClick" });
            }
        } as IGridOptions;
    }

    private _cancelPickerOperation() {
        if (this.classificationPicker) {
            this.classificationPicker.cancelOperation();
        }
    }
}

/** Control for managing team iterations */
export class TeamIterationsControl extends TeamClassificationSettings<ITeamIterationRecord> {
    protected dataManager: TeamIterationDataManager;
    private _defaultIterationPicker: ClassificationPicker;
    private _currentDefaultPath: string;

    constructor(options?) {
        super(options);
        this.dataManager = new TeamIterationDataManager(
            this._iterationDataToRecord(this.teamSettings.backlogIteration),
            this._getIterationRecords(),
            delegate(this, this.refreshGrid));
        this._defaultIterationPicker = null;
        this._currentDefaultPath = this._getDefaultIterationMacro();
    }

    public initialize() {
        super.initialize();
    }

    protected _completeInitialization(): void {
        this._checkForBacklog();
    }

    /** OVERRIDE: Refer to Control */
    public initializeOptions(options?: ITeamClassificationSettingsOptions): void {
        super.initializeOptions($.extend(<ITeamClassificationSettingsOptions>{
            title: AgileResources.Iterations_Plural,
            introHtml: AgileResources.TeamSettings_Iteration_IntroHtml,
            classificationControlDescription: AgileResources.TeamSettings_Iteration_ToolbarInfo,
            action: "UpdateIterationsData",
            controller: "Iterations",
            learnMoreLink: AgileResources.WorkIterations_LearnMore_FwLink,
            classificationControlType: ClassificationControlNodeType.Iteration,
            addText: AgileResources.AdminWorkHub_Iteration_AddText,
            removeText: AgileResources.AdminWorkHub_Iteration_RemoveText,
            classificationPickerLabel: AgileResources.AdminWorkHub_Iteration_ClassificationPickerLabel,
            classificationPickerDialogTitle: AgileResources.AdminWorkHub_Iteration_ClassificationDialogTitle,
            classificationPickerDialogSubTitle: AgileResources.AdminWorkHub_Iteration_ClassificationDialogSubTitle,
            duplicateClassificationErrorMessage: AgileResources.AdminWorkHub_Iteration_DuplicateErrorMessage,
            classificationRecordsRemovedMessageHeader: AgileResources.AdminWorkHub_Iteration_RecordsRemovedMessageHeader,
            classificationRecordsRemovedMessageText: AgileResources.AdminWorkHub_Iteration_RecordsRemovedMessageText,
            projectLevelMessage: AgileResources.TeamSettings_Iteration_Manage_Dismissable,
            waterMark: AgileResources.WorkAdminHub_Iteration_Picker_Watermark,
        }, options));
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected getGridColumns(): IGridColumn[] {
        return [
            {
                text: AgileResources.TeamSettings_Iteration_Grid_Iteration,
                width: 500,
                canSortBy: false
            },
            {
                text: AgileResources.Iteration_Grid_StartDate,
                width: 150,
                canSortBy: false
            },
            {
                text: AgileResources.Iteration_Grid_EndDate,
                width: 150,
                canSortBy: false
            }
        ];
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected getContextMenuItems(): IGridContextMenu {
        return {
            items: (context: { item: any[] }) => {
                var items = super.getContextMenuItems().items(context);
                items.push(
                    {
                        id: "remove-iteration",
                        text: AgileResources.AdminWorkHub_Remove,
                        icon: "bowtie-icon bowtie-edit-delete",
                        rank: 400,
                        action: (args: { iterationPath: string }) => {
                            this._removeClassificationSetting(args.iterationPath);
                            publishCI(CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_ITERATION_REMOVE, { source: "ContextMenu" });
                        },
                        "arguments": { iterationPath: context.item[0] },
                        disabled: this.enableReadOnlyMode
                    });
                return items;
            }
        };
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected getDataSource(): any[] {
        var items = this.dataManager.items;
        var gridRows = [];

        for (var i = 0, l = items.length; i < l; i++) {
            var iteration = items[i];
            gridRows.push([iteration.friendlyPath,
            iteration.startDate ? AgileUtils.localeFormatUTC(new Date(iteration.startDate), "d") : iteration.startDate,
            iteration.endDate ? AgileUtils.localeFormatUTC((new Date(iteration.endDate)), "d") : iteration.endDate]);
        }

        return gridRows;
    }

    protected saveClassificationSetting(dialogResult: IDictionaryStringTo<any>) {
        var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.TeamClassificationSettings.ITERATION,
            CustomerIntelligenceConstants.TeamClassificationSettings.ADD_ITERATION);

        var endPerfScenario = () => {
            perfScenario.end();
        };

        var classificationPathArray: string[] = dialogResult[ClassificationPickerDialog.CLASSIFICATION_PATH_RESULT_ID];
        if (classificationPathArray && classificationPathArray.length > 0) {
            var removedIterations: ITeamIterationRecord[] = [];
            var affectedAddedPaths: string[] = [];
            for (var i = 0, len = classificationPathArray.length; i < len; i++) {
                var classificationPath = classificationPathArray[i];
                var addedNode = this.getCSSNode(classificationPath);
                if (addedNode) {
                    var itemsRemoved = this.dataManager.add(this._iterationNodeToRecord(addedNode, classificationPath));
                    if (itemsRemoved.length > 0) {
                        removedIterations.push(...itemsRemoved);
                        affectedAddedPaths.push(classificationPath);
                    }
                }
                else {
                    this.handleError({
                        message: AgileResources.AdminWorkHub_Iteration_NodeNotFound
                    });

                    perfScenario.addSplitTiming(CustomerIntelligenceConstants.TeamClassificationSettings.CLASSIFICATION_NODE_NOT_FOUND);
                }
            }

            if (removedIterations.length > 0) {
                this.showRemovedMessage(removedIterations.map(x => x.friendlyPath), affectedAddedPaths);
            }
            perfScenario.addData({ "pathsCount": classificationPathArray.length });
            this.save(perfScenario).then(endPerfScenario, endPerfScenario);
        }
    }

    /**
     * Include the iteration node for the team
     * @param {IClassificationTreeNode} node The newly added node, to be included for the team
     * @param {IClassificationTreeNode} parentNode The parent node of the newly added node
     */
    protected includeClassificationNode(addedNode: IClassificationTreeNode, parentNode: IClassificationTreeNode): void {
        var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.TeamClassificationSettings.ITERATION,
            CustomerIntelligenceConstants.TeamClassificationSettings.ADD_ITERATION);

        var endPerfScenario = () => {
            perfScenario.end();
        };

        var classificationPath = parentNode.path + TeamClassificationDataManager.PATH_SEPARATOR + addedNode.text;
        var newRecord = this._iterationNodeToRecord(addedNode, classificationPath);

        // Add to the grid and show the removed message as appropriate
        var itemsRemoved = this.dataManager.add(newRecord);
        if (itemsRemoved.length > 0) {
            this.showRemovedMessage(itemsRemoved.map(x => x.friendlyPath), [classificationPath]);
        }

        this.save(perfScenario).then(endPerfScenario, endPerfScenario);
    }

    /**
     * Update the data manager to reflect the updated friendly path, due to change in the text or location of the node.
     * Need to update the descendents as well to ensure that their path reflects the change in this node's path
     * @param {IClassificationTreeNode} node The newly added node, to be included for the team
     * @param {IClassificationTreeNode} parentNode The parent node of the newly added node
     */
    protected updateDataManager(node: IClassificationTreeNode) {
        var originalRecord = this.dataManager.get(node.id);
        var updatedPath = this.fieldDataProvider.getNodeFromId(node.id).path;
        var updatedRecord = this._iterationNodeToRecord(node, updatedPath);

        // Convert start and end dates to the local timezone
        var originalStartDate = originalRecord.startDate ? Utils_Date.shiftToLocal(new Date(originalRecord.startDate)) : null;
        var originalEndDate = originalRecord.endDate ? Utils_Date.shiftToLocal(new Date(originalRecord.endDate)) : null;
        var updatedStartDate = updatedRecord.startDate ? Utils_Date.shiftToLocal(new Date(updatedRecord.startDate)) : null;
        var updatedEndDate = updatedRecord.endDate ? Utils_Date.shiftToLocal(new Date(updatedRecord.endDate)) : null;

        if (Utils_Date.defaultComparer(originalStartDate, updatedStartDate) !== 0
            || Utils_Date.defaultComparer(originalEndDate, updatedEndDate) !== 0) {
            this.dataManager.updateIteration(originalRecord, updatedRecord);
        }
        else {
            this.dataManager.updateFriendlyPath(originalRecord.friendlyPath, updatedPath);
        }
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected getPayload() {
        var selectedIterationIds = this.dataManager.items.map(i => i.id);

        return {
            rootIterationId: this.dataManager.getBacklogIteration().id,
            selectedIterations: selectedIterationIds
        };
    }

    /**
     * OVERRIDE: remove a row on grid
    */
    protected removeRow(path: string) {
        this._removeClassificationSetting(path);
    }

    /**
     * OVERRIDE: Insert content above the toolbar
     */
    protected createAdditionalContent() {
        this._createDefaultIterationControl();
        this._createBacklogControl();
    }

    /**
     * OVERRIDE: Get height of additional content
     */
    protected getAdditionalContentHeight(): number {
        var $classificationPickerElements = $(".classification-picker", this.getElement());
        var totalHeight = 0;

        $.each($classificationPickerElements, (index, value) => {
            totalHeight += $(value).outerHeight(true);
        });

        return totalHeight;
    }

    /**
     * OVERRIDE: Validate iteration path to be added.
     */
    protected validateClassification(iterationPath: string): IClassificationValidationResult {
        var result = <IClassificationValidationResult>{
            valid: true,
            errorMessage: null
        };

        var node = this.getCSSNode(iterationPath);
        if (!node) {
            result.valid = false;
            return result;
        }

        var iterationRecord = this._iterationNodeToRecord(node, iterationPath);
        return this.dataManager.validateIterationPath(iterationRecord);
    }

    /**
     * Override the base implementation to return the telemetry feature name for the toolbar command
     * @param commandId Id of the command being clicked
     */
    protected getTelemetryFeatureName(commandId: string): string {
        switch (commandId) {
            case TeamClassificationSettings.COMMAND_ADD:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_ITERATION_ADD;
            case TeamClassificationSettings.COMMAND_REMOVE:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_ITERATION_REMOVE;
            case TeamClassificationSettings.COMMAND_NEW:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_ITERATION_NEW;
            case TeamClassificationSettings.COMMAND_NEW_CHILD:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_ITERATION_NEW_CHILD;
            case TeamClassificationSettings.COMMAND_EDIT:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_ITERATION_EDIT;
            case TeamClassificationSettings.COMMAND_SECURITY:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_ITERATION_SECURITY;
            default:
                return commandId;
        }
    }

    /**
     * Override to return the warning message for users with no permission
     */
    protected getNoPermissionWarningText(): string {
        return Utils_String.format(AgileResources.TeamSettings_NoPermissionsWarning, AgileResources.TeamSettings_NoPermissionsIterations);
    }

    /**
     * Initialize the node manager and with the iteration nodes, retrieved from the json island
     */
    protected initializeNodeManager(): void {
        var projectModel = this.getProjectWorkModel();
        if (projectModel && projectModel.iterations && projectModel.iterations.treeValues) {
            this.fieldDataProvider = new FieldDataProvider(projectModel.iterations.treeValues, { sort: CssNode.compare });
        }
        this.nodeManager = new CSSNodeManager(ClassificationMode.MODE_ITERATIONS, this.fieldDataProvider);
    }

    private _checkForBacklog() {
        var messageArea = this.getMessageArea();
        if (!this.teamSettings.backlogIteration) {
            messageArea.setMessage(AgileResources.WorkAdminHub_MissingBacklogError, Notifications.MessageAreaType.Error);
        }
    }

    private _createBacklogControl() {
        var $container = $("<div>").addClass("classification-picker").appendTo(this.getElement());

        this.classificationPicker = Controls.Control.create(
            IterationPicker,
            $container,
            <IClassificationPickerOptions>{
                classificationType: ClassificationControlNodeType.Iteration,
                label: AgileResources.WorkAdminHub_Iteration_ChangeBacklog_Label,
                labelTooltip: AgileResources.WorkAdminHub_Iteration_ChangeBacklog_LabelTooltip,
                classificationPath: this.teamSettings.backlogIteration ? this.teamSettings.backlogIteration.friendlyPath : null,
                onClassificationChange: delegate(this, this._classificationChangedHandler),
                onClassificationSave: delegate(this, this._classificationSaveHandler),
                disabled: this.enableReadOnlyMode,
                rootClassificationNode: this.fieldDataProvider.getRootNode()
            });
    }

    private _classificationChangedHandler(path: string): IClassificationValidationResult {
        var node = this.getCSSNode(path);
        return <IClassificationValidationResult>{
            valid: Boolean(node) && path.charAt(path.length - 1) !== TeamClassificationDataManager.PATH_SEPARATOR, errorMessage: null
        };
    }

    private _classificationSaveHandler(path: string) {
        this._updateBacklogIteration(path);
    }

    private _createDefaultIterationControl() {

        var $container = $("<div>").addClass("classification-picker").appendTo(this.getElement());
        this._currentDefaultPath = this.teamSettings.defaultIteration ? this.teamSettings.defaultIteration.friendlyPath : this._getDefaultIterationMacro();

        this._defaultIterationPicker = Controls.Control.create(ClassificationPicker,
            $container,
            <IClassificationPickerOptions>{
                classificationType: ClassificationControlNodeType.Iteration,
                label: AgileResources.WorkAdminHub_Iteration_DefaultIteration_Label,
                labelTooltip: AgileResources.WorkAdminHub_Iteration_DefaultIteration_LabelTooltip,
                classificationPath: this._currentDefaultPath,
                onClassificationChange: delegate(this, this._defaultIterationChangedHandler),
                onClassificationSave: delegate(this, this._defaultIterationSaveHandler),
                disabled: this.enableReadOnlyMode,
                additionalNodes: [this._getDefaultIterationMacro()],
                rootClassificationNode: this.fieldDataProvider.getRootNode()
            });
    }

    private _defaultIterationChangedHandler(path: string): IClassificationValidationResult {

        var node: IClassificationTreeNode = null;
        var isCurrentIterationMacro = this._pathIsCurrentIterationMacro(path);

        if (!isCurrentIterationMacro) {
            node = this.getCSSNode(path);
        }

        return <IClassificationValidationResult>{
            valid: isCurrentIterationMacro || (Boolean(node) && path.charAt(path.length - 1) !== TeamClassificationDataManager.PATH_SEPARATOR),
            errorMessage: null
        };
    }

    private _pathIsCurrentIterationMacro(path: string): boolean {
        return Utils_String.localeIgnoreCaseComparer(path.trim(), this._getDefaultIterationMacro()) === 0;
    }

    private _getDefaultIterationMacro(): string {
        return WiqlOperators.MacroStart + AgileControlsResources.Wiql_MacroCurrentIteration;
    }

    private _defaultIterationSaveHandler(path: string) {
        this._updateDefaultIteration(path);
    }

    private _getIterationRecords(): ITeamIterationRecord[] {
        var previousIterations = this.teamSettings.previousIterations;
        var currentIteration = this.teamSettings.currentIteration;
        var futureIterations = this.teamSettings.futureIterations;

        var selectedIterations: TFS_AgileCommon.IIterationData[] = [];

        if (previousIterations) {
            selectedIterations = selectedIterations.concat(previousIterations);
        }

        if (currentIteration) {
            selectedIterations.push(currentIteration);
        }

        if (futureIterations) {
            selectedIterations = selectedIterations.concat(futureIterations);
        }

        return selectedIterations.map(i => this._iterationDataToRecord(i));
    }

    private _iterationDataToRecord(iteration: TFS_AgileCommon.IIterationData): ITeamIterationRecord {
        if (iteration) {
            return <ITeamIterationRecord>{
                id: iteration.id,
                friendlyPath: iteration.friendlyPath,
                startDate: iteration.startDate,
                endDate: iteration.finishDate
            };
        }
        return <ITeamIterationRecord>{
            id: "",
            friendlyPath: "",
            startDate: "",
            endDate: ""
        };
    }

    private _iterationNodeToRecord(iteration: IClassificationTreeNode, classificationPath: string): ITeamIterationRecord {
        return <ITeamIterationRecord>{
            id: iteration.id,
            friendlyPath: classificationPath,
            startDate: iteration.values[1] ? iteration.values[1].toString() : null,
            endDate: iteration.values[2] ? iteration.values[2].toString() : null
        };
    }

    private _removeClassificationSetting(classificationPath: string) {
        var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.TeamClassificationSettings.ITERATION,
            CustomerIntelligenceConstants.TeamClassificationSettings.REMOVE_ITERATION);

        var endPerfScenario = () => {
            perfScenario.end();
        };

        var removedNode = this.getCSSNode(classificationPath);
        if (removedNode) {
            this.dataManager.remove(removedNode.id);
        }
        this.save(perfScenario).then(endPerfScenario, endPerfScenario);
    }

    /**
     * Uses the REST API to update the default iteration
     * @param path - either the current iteration macro or the path to the selected node.
     */
    private _updateDefaultIteration(path: string) {

        var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.TeamDefaultIterationSettings.AREA,
            CustomerIntelligenceConstants.TeamDefaultIterationSettings.DEFAULT_ITERATION);
        perfScenario.addData({ "setDefaultIterationTo": path });

        var patch;

        if (this._pathIsCurrentIterationMacro(path)) {
            patch = <TeamSettingsPatch>{ defaultIterationMacro: WiqlOperators.MacroCurrentIteration };
        }
        else {
            var node = this.getCSSNode(path);

            if (node) {
                patch = <TeamSettingsPatch>{ defaultIteration: node.id };
            }
            else {
                this.handleError({
                    message: AgileResources.AdminWorkHub_Iteration_NodeNotFound
                });
                perfScenario.addData({ "error": "Node not found" });
                perfScenario.end();
                return;
            }
        }

        var tfsConnection = TFS_OM_Common.ProjectCollection.getConnection(tfsContext);
        var teamContext: TeamContext = { projectId: tfsContext.contextData.project.id, teamId: VSSContext.getDefaultWebContext().team.id, project: undefined, team: undefined };
        var workHttpClient: WorkHttpClient = tfsConnection.getHttpClient<WorkHttpClient>(WorkHttpClient);
        workHttpClient.updateTeamSettings(patch, teamContext).then(
            () => {
                this.getMessageArea().clear();
                this._currentDefaultPath = path;
                perfScenario.end();
            },
            (error) => {
                var message = error && error.message ? error.message : AgileResources.WorkAdminHub_GenericError;
                this.handleError({
                    message: message
                });

                perfScenario.addData({ "error": message });
                perfScenario.end();

                // Could not update the path, revert to the old path.
                this._defaultIterationPicker.setClassificationPath(this._currentDefaultPath, false);
            }
        );
    }

    private _updateBacklogIteration(iterationPath: string) {
        var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.TeamClassificationSettings.ITERATION,
            CustomerIntelligenceConstants.TeamClassificationSettings.UPDDATE_BACKLOG_ITERATION);

        var endPerfScenario = () => {
            perfScenario.end();
        };

        var onSaveSuccess = () => {
            endPerfScenario();
            this.getMessageArea().clear(); // Clear message area in case the missing backlog error is visible
        };

        var node = this.getCSSNode(iterationPath);

        if (node) {
            this.dataManager.updateBacklogIteration(this._iterationNodeToRecord(node, iterationPath));
            this.save(perfScenario).then(onSaveSuccess, endPerfScenario);
        }
        else {
            // TODO: Need to update the UI to revert the backlog iteration value to the original
            this.handleError({
                message: AgileResources.AdminWorkHub_Iteration_NodeNotFound
            });

            perfScenario.addSplitTiming(CustomerIntelligenceConstants.TeamClassificationSettings.CLASSIFICATION_NODE_NOT_FOUND);
            endPerfScenario();
        }
    }
}

/** Control for managing team areas */
export class TeamAreasControl extends TeamClassificationSettings<ITeamAreaRecord> {

    protected dataManager: TeamAreaDataManager;

    constructor(options?) {
        super(options);
    }

    /** OVERRIDE: Refer to Control */
    public initializeOptions(options?: ITeamClassificationSettingsOptions): void {
        super.initializeOptions($.extend({
            title: AgileResources.TeamSettings_Area_Title,
            introHtml: AgileResources.TeamSettings_Area_IntroHtml,
            toolbarInfo: "",
            action: "UpdateAreasData",
            controller: "Areas",
            classificationControlType: ClassificationControlNodeType.Area,
            addText: AgileResources.AdminWorkHub_Area_AddText,
            removeText: AgileResources.AdminWorkHub_Area_RemoveText,
            classificationPickerLabel: AgileResources.AdminWorkHub_Area_ClassificationPickerLabel,
            classificationPickerDialogTitle: AgileResources.AdminWorkHub_Area_ClassificationDialogTitle,
            classificationPickerDialogSubTitle: AgileResources.AdminWorkHub_Area_ClassificationDialogSubTitle,
            duplicateClassificationErrorMessage: AgileResources.AdminWorkHub_Area_DuplicateErrorMessage,
            classificationRecordsRemovedMessageHeader: AgileResources.AdminWorkHub_Area_RecordsRemovedMessage,
            classificationRecordsRemovedMessageText: AgileResources.WorkAdminHub_Area_RecordsRemovedMessageBody,
            projectLevelMessage: AgileResources.TeamSettings_Area_Manage_Dismissable,
            waterMark: AgileResources.WorkAdminHub_Area_Picker_Watermark
        }, options));
    }

    /** OVERRIDE: Refer to Control */
    public initialize() {
        super.initialize();
        this.dataManager = new TeamAreaDataManager(this._getAreaRecords(), delegate(this, this.refreshGrid));
        this._checkIfNoAreaSelected();
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected getGridColumns(): IGridColumn[] {
        return [
            {
                text: AgileResources.TeamSettings_Area_Grid_Area,
                width: 500,
                canSortBy: false
            },
            {
                text: "",
                width: 150,
                canSortBy: false
            },
            {
                text: "",
                width: 150,
                canSortBy: false
            }
        ];
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected getContextMenuItems(): IGridContextMenu {
        return {
            items: (context: { item: any[], rowInfo: any }) => {
                var items = super.getContextMenuItems().items(context);
                items.push(
                    {
                        id: "remove-area",
                        text: AgileResources.AdminWorkHub_Remove,
                        icon: "bowtie-icon bowtie-edit-delete",
                        rank: 400,
                        disabled: this.enableReadOnlyMode || this.dataManager.items.length === 1,
                        action: (args: { areaPath: string }) => {
                            this.removeRow(args.areaPath);
                            publishCI(CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_REMOVE, { source: "context menu" });
                        },
                        "arguments": { areaPath: context.item[0] }
                    },
                    {
                        id: "set-default",
                        text: AgileResources.AdminWorkHub_SetAsDefaultArea,
                        icon: "bowtie-icon bowtie-security",
                        rank: 600,
                        disabled: this.enableReadOnlyMode || this.dataManager.items[context.rowInfo.rowIndex].isDefault,
                        action: (args: { areaPath: string }) => {
                            this.classificationPicker.setClassificationPath(args.areaPath);
                            publishCI(CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_SET_DEFAULT, { source: "context menu" });
                        },
                        "arguments": { areaPath: context.item[0] }
                    },
                    {
                        id: "include-sub-areas",
                        text: this.dataManager.items[context.rowInfo.rowIndex].includeChildren ? AgileResources.AdminWorkHub_ExcludeSubAreas : AgileResources.AdminWorkHub_IncludeSubAreas,
                        icon: "bowtie-icon bowtie-security",
                        rank: 700,
                        disabled: this.enableReadOnlyMode,
                        action: (args: { areaPath: string }) => {

                            var isIncluded = this.dataManager.items[context.rowInfo.rowIndex].includeChildren;
                            var feature = isIncluded ?
                                CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_EXCLUDE_SUB_AREAS
                                : CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_INCLUDE_SUB_AREAS;

                            var node = this.getCSSNode(args.areaPath);

                            //if the node is the root node
                            var okCallBack = () => {
                                var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
                                    CustomerIntelligenceConstants.TeamClassificationSettings.AREA,
                                    CustomerIntelligenceConstants.TeamClassificationSettings.INCLUDE_SUB_AREA);

                                var endPerfScenario = () => {
                                    perfScenario.end();
                                };

                                var childGuids = this._flattenChildGuids(node, []);
                                var subAreas = this.dataManager.includeSubAreas(node.id, childGuids);
                                if (subAreas.length > 0) {
                                    this.showRemovedMessage(subAreas.map(x => x.friendlyPath), [args.areaPath]);
                                }
                                this.save(perfScenario).then(endPerfScenario, endPerfScenario);

                                publishCI(feature, { source: "context menu", isRootNode: !node.parent });
                            };

                            if (!node.parent && !isIncluded) {
                                this._showDialog(okCallBack);
                            }
                            else {
                                okCallBack();
                            }
                        },
                        "arguments": { areaPath: context.item[0] }
                    });
                return items;
            }
        };
    }

    protected removeRow(rowData: any) {
        var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.TeamClassificationSettings.AREA,
            CustomerIntelligenceConstants.TeamClassificationSettings.REMOVE_AREA);

        var endPerfScenario = () => {
            perfScenario.end();
        };

        var removedNode = this.getCSSNode(rowData);

        if (removedNode) {
            var newDefaultPath = this.dataManager.removeArea(removedNode.id);
            this.save(perfScenario).then(() => {
                //set the new default path in classification picker
                if (newDefaultPath) {
                    this.classificationPicker.setClassificationPath(newDefaultPath);
                }

                //calling update here, just to trigger the EVENT_ROW_UPDATED event. Will update it if there is a better way to do it
                this.dataManager.update(this.dataManager.items[0]);
                endPerfScenario();
            }, endPerfScenario);
        }
    }

    private getDefaultArea(): string {
        var areas = this.dataManager.items;

        for (var i = 0, l = areas.length; i < l; i++) {
            if (areas[i].isDefault) {
                return areas[i].friendlyPath;
            }
        }

        return Utils_String.empty;
    }

    private _checkIfNoAreaSelected() {
        if (this.dataManager.items.length === 0) {
            this.handleError(AgileResources.WorkAdminHub_Area_NoAreaSelectedWarning);
        }
    }

    /**
     * OVERRIDE: Validate iteration path to be added.
     */
    protected validateClassification(path: string): IClassificationValidationResult {
        var isSuperValid = super.validateClassification(path);

        if (isSuperValid.valid) {

            var node = this.getCSSNode(path);
            if (node) {
                var parentRecord = this._getParentThatIncludesSubAreas(node);
                if (parentRecord) {
                    isSuperValid.valid = false;
                    isSuperValid.errorMessage = Utils_String.format(AgileResources.WorkAdminHub_AddSubChild_ErrorMessage, path, parentRecord.friendlyPath);
                    return isSuperValid;
                }
            }
        }

        return isSuperValid;
    }

    private _getParentThatIncludesSubAreas(node: IClassificationTreeNode): ITeamAreaRecord {
        var guids: string[] = this.flattenParentGuids(node, []);
        for (var i = 0, l = guids.length; i < l; i++) {
            var areaRecord = this.dataManager.get(guids[i]);
            if (areaRecord && areaRecord.includeChildren && areaRecord.id !== node.id) {
                return areaRecord;
            }
        }

        return null;
    }

    private flattenParentGuids(node: IClassificationTreeNode, guids: string[]): string[] {
        if (!node.parent) {
            guids.push(node.id);
            return guids;
        }
        else {
            guids.push(node.id);
            return this.flattenParentGuids(node.parent, guids);
        }
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected getDataSource(): any[] {
        var items = this.dataManager.items;
        var gridRows = [];

        for (var i = 0, l = items.length; i < l; i++) {
            var isDefaultValue = items[i].isDefault ? AgileResources.AdminWorkHub_Area_DefaultArea : null;
            var includeChildrenValue = items[i].includeChildren ? AgileResources.AdminWorkHub_Area_IncludeChildren : null;
            gridRows.push([items[i].friendlyPath, isDefaultValue, includeChildrenValue]);
        }

        return gridRows;
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected createAdditionalContent() {
        this.classificationPicker = <ClassificationPicker>Controls.BaseControl.createIn(ClassificationPicker, $("<div>").addClass("classification-picker").appendTo(this.getElement()),
            <IClassificationPickerOptions>{
                classificationType: ClassificationControlNodeType.Area,
                label: AgileResources.WorkAdminHub_Area_DefaultArea,
                classificationPath: this.getDefaultArea(),
                onClassificationChange: delegate(this, this._classificationChangedHandler),
                onClassificationSave: delegate(this, this._classificationSaveHandler),
                disabled: this.enableReadOnlyMode,
                rootClassificationNode: this.fieldDataProvider.getRootNode()
            });
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected getAdditionalContentHeight(): number {
        return $(".classification-picker", this.getElement()).outerHeight(true);
    }

    /**
     * Override the base implementation to return the telemetry feature name for the toolbar command
     * @param commandId The id of the command being clicked
     */
    protected getTelemetryFeatureName(commandId: string): string {
        switch (commandId) {
            case TeamClassificationSettings.COMMAND_ADD:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_ADD;
            case TeamClassificationSettings.COMMAND_REMOVE:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_REMOVE;
            case TeamClassificationSettings.COMMAND_NEW:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_NEW;
            case TeamClassificationSettings.COMMAND_NEW_CHILD:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_NEW_CHILD;
            case TeamClassificationSettings.COMMAND_EDIT:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_EDIT;
            case TeamClassificationSettings.COMMAND_SECURITY:
                return CustomerIntelligenceConstants.TeamClassificationSettingsFeature.TELEMETRY_ADMIN_HUB_AREA_SECURITY;
            default:
                return commandId;
        }
    }

    /**
     * Override to return the warning message for users with no permission
     */
    protected getNoPermissionWarningText(): string {
        return Utils_String.format(AgileResources.TeamSettings_NoPermissionsWarning, AgileResources.TeamSettings_NoPermissionsAreas);
    }

    /**
     * Initialize the node manager and with the area nodes, retrieved from the json island
     */
    protected initializeNodeManager(): void {
        var projectModel = this.getProjectWorkModel();
        if (projectModel && projectModel.areas && projectModel.areas.treeValues) {
            this.fieldDataProvider = new FieldDataProvider(projectModel.areas.treeValues, { sort: CssNode.compare });
        }
        this.nodeManager = new CSSNodeManager(ClassificationMode.MODE_AREAS, this.fieldDataProvider);
    }

    private _classificationChangedHandler(path: string): IClassificationValidationResult {
        var node = this.getCSSNode(path);
        if (node && path.charAt(path.length - 1) !== TeamClassificationDataManager.PATH_SEPARATOR) {
            var parentRecord = this._getParentThatIncludesSubAreas(node);
            return <IClassificationValidationResult>{
                valid: !parentRecord,
                errorMessage: parentRecord ? Utils_String.format(AgileResources.WorkAdminHub_AddSubChild_ErrorMessage, path, parentRecord.friendlyPath) : null
            };
        }
        return <IClassificationValidationResult>{ valid: false, errorMessage: null };
    }

    private _classificationSaveHandler(path: string) {
        var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.TeamClassificationSettings.AREA,
            CustomerIntelligenceConstants.TeamClassificationSettings.UPDATE_DEFAULT_AREA);

        var endPerfScenario = () => {
            perfScenario.end();
        };

        var newDefaultNode = this.getCSSNode(path);
        var oldDefaultPath = this.dataManager.updateDefaultArea(<ITeamAreaRecord>{ id: newDefaultNode.id, friendlyPath: path, isDefault: true, includeChildren: false });
        this._removeOldDefaultArea(oldDefaultPath);
        this.save(perfScenario).then(endPerfScenario, endPerfScenario);
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected saveClassificationSetting(dialogResult: IDictionaryStringTo<any>) {
        var okCallBack = () => {
            var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
                CustomerIntelligenceConstants.TeamClassificationSettings.AREA,
                CustomerIntelligenceConstants.TeamClassificationSettings.ADD_AREA);

            var endPerfScenario = () => {
                perfScenario.end();
            };

            // save the newly added paths, and show warning message for the paths that were implicitly removed.
            if (classificationPathArray && classificationPathArray.length > 0) {
                let removedExistingPaths: ITeamAreaRecord[] = [];
                let affectedAddedPaths: string[] = [];

                for (var i = 0, len = classificationPathArray.length; i < len; i++) {
                    let classificationPath = classificationPathArray[i];
                    let addedNode = this.getCSSNode(classificationPath);
                    if (addedNode) {
                        // add new node.
                        let newNode = this._areaNodeToRecord(addedNode, classificationPath, false);
                        this.dataManager.add(newNode);

                        if (includeSubArea) {
                            // find existing paths that will get implicitly removed from the newly added node that set to include its subareas.
                            let childGuids = this._flattenChildGuids(addedNode, []);
                            let subAreas = this.dataManager.includeSubAreas(addedNode.id, childGuids);
                            if (subAreas.length > 0) {
                                removedExistingPaths.push(...subAreas);
                                affectedAddedPaths.push(classificationPath);
                            }
                        }
                    }
                }

                this.setDefaultAreaForSaveClassificationSetting();

                if (removedExistingPaths.length > 0 || removedDescendentPaths.length > 0) {
                    // show warning message for the paths that were implicitly removed.
                    removedDescendentPaths.push(...removedExistingPaths.map(x => x.friendlyPath));
                    affectedAddedPaths.push(...affectedParentPaths);
                    this.showRemovedMessage(removedDescendentPaths, affectedAddedPaths);
                }

                perfScenario.addData({ "pathsCount": addedPathsCount });
                perfScenario.addData({ "includeSubArea": includeSubArea });
                this.save(perfScenario).then(endPerfScenario, endPerfScenario);
            }
        };

        let removedDescendentPaths: string[] = [];
        let affectedParentPaths: string[] = [];
        let classificationPathArray: string[] = dialogResult[ClassificationPickerDialog.CLASSIFICATION_PATH_RESULT_ID];
        let addedPathsCount = classificationPathArray.length;
        let includeSubArea = dialogResult[AreaPickerDialog.INCLUDE_SUBAREA_RESULT_ID];

        if (addedPathsCount > 0) {
            if (includeSubArea) {
                let currentIndex = 0;
                let currentPath = classificationPathArray[currentIndex];
                let currentNode = this.getCSSNode(currentPath);
                // if the node is the root node and include subarea is true, accept the root node as the only path, and show confirmation dialog.
                if (currentNode && !currentNode.parent) {
                    if (addedPathsCount > 1) {
                        // add paths that will be implicitly removed from adding root node that will include its sub area.
                        affectedParentPaths.push(currentPath);
                        removedDescendentPaths.push(...classificationPathArray.slice(1, addedPathsCount));
                    }
                    classificationPathArray = [currentPath];
                    this._showDialog(okCallBack);
                    return;
                }

                // filter out the path that is descendent of any of the selected paths.
                // this assume that the classificationPathArray is sorted.
                for (var i = 1; i < classificationPathArray.length; i++) {
                    let path = classificationPathArray[i];
                    let isDescendantPath = TeamClassificationDataManager.isDescendantPath(path, currentPath);
                    if (isDescendantPath) {
                        affectedParentPaths.push(currentPath);
                        removedDescendentPaths.push(path);
                        classificationPathArray.splice(i, 1);
                        i--;
                    }
                    else {
                        currentIndex = i;
                        currentPath = classificationPathArray[currentIndex];
                    }
                }
            }
            okCallBack();
        }
    }

    /**
     * Include the area node for the team
     * @param {IClassificationTreeNode} node The newly added node, to be included for the team
     * @param {IClassificationTreeNode} parentNode The parent node of the newly added node
     */
    protected includeClassificationNode(addedNode: IClassificationTreeNode, parentNode: IClassificationTreeNode): void {
        var perfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.TeamClassificationSettings.AREA,
            CustomerIntelligenceConstants.TeamClassificationSettings.ADD_AREA);

        var endPerfScenario = () => {
            perfScenario.end();
        };

        var classificationPath = parentNode.path + TeamClassificationDataManager.PATH_SEPARATOR + addedNode.text;
        var newNode = {
            id: addedNode.id,
            friendlyPath: classificationPath
        } as ITeamAreaRecord;

        var parentRecord = this.dataManager.get(parentNode.id);
        if (!parentRecord || !parentRecord.includeChildren) {
            this.dataManager.add(newNode);
        }

        this.save(perfScenario).then(endPerfScenario, endPerfScenario);
    }

    private _showDialog(onClickOk: Function) {
        var options = <IClassificationConfirmationDialogOptions>{
            messageHeader: AgileResources.WorkAdminHub_Area_ConfirmRootAreaPathChangeHeader,
            messageContent: AgileResources.WorkAdminHub_Area_ConfirmRootAreaPathChange,
            successCallback: $.noop,
            okCallback: onClickOk
        }

        ClassificationConfirmationDialog.showDialog(options);
    }

    /** ABSTRACT IMPLEMENTATION: Refer to TeamClassificationSettings */
    protected getPayload() {
        var selectedAreas = this.dataManager.items;

        var teamFieldValues: TFS_AgileCommon.ITeamFieldData[] = [];
        var teamFieldValueDefaultIndex: number = null;

        for (var i = 0, l = selectedAreas.length; i < l; i++) {
            var areaRecord = selectedAreas[i];
            teamFieldValues.push({
                value: areaRecord.friendlyPath,
                includeChildren: areaRecord.includeChildren
            });

            if (areaRecord.isDefault) {
                teamFieldValueDefaultIndex = i;
            }
        }

        return {
            DefaultValueIndex: teamFieldValueDefaultIndex,
            TeamFieldValues: teamFieldValues
        };
    }

    /**
     * Updates the items in the data manager to set the default area path before saving.
     */
    protected setDefaultAreaForSaveClassificationSetting(): void {
        const allItems = this.dataManager.items;
        const onlyOneItem = (allItems.length === 1);
        const multipleItemsButNoDefault = allItems.length > 1 && !allItems.some(i => i.isDefault);

        if (onlyOneItem || multipleItemsButNoDefault) {
            // Mark the first area as default if:
            //  -   There is only one item.
            //  -   There are multiple items, but none of them marked as default.
            this.dataManager.items[0].isDefault = true;
            this._updateClassificationPickerAndClearMessageArea(this.dataManager.items[0].friendlyPath);
        }
    }

    protected _updateClassificationPickerAndClearMessageArea(newPath: string): void {
        this.classificationPicker.setClassificationPath(newPath);
        this.getMessageArea().clear();
    }

    private _removeOldDefaultArea(path: string) {
        if (!path || path.length === 0) {
            return;
        }

        var node = this.getCSSNode(path);

        if (node) {
            var parentIds: string[] = this.flattenParentGuids(node, []);

            for (var i = 0, l = this.dataManager.items.length; i < l; i++) {
                var item = this.dataManager.items[i];
                if ((item.id !== node.id) && ($.inArray(item.id, parentIds) > -1) && item.includeChildren) {
                    this.dataManager.remove(node.id);
                    return;
                }
            }
        }
    }

    private _getAreaRecords(): ITeamAreaRecord[] {
        var defaultValue = this.teamSettings.teamFieldDefaultValue;
        var teamFieldValues = this.teamSettings.teamFieldValues;

        return teamFieldValues.map(fv => this._teamFieldToRecord(fv, defaultValue));
    }

    private _areaNodeToRecord(areaNode: { id: string }, classificationPath: string, includeChildren: boolean): ITeamAreaRecord {
        return <ITeamAreaRecord>{
            id: areaNode.id,
            friendlyPath: classificationPath,
            includeChildren: includeChildren
        };
    }

    private _teamFieldToRecord(teamFieldValue: TFS_AgileCommon.ITeamFieldData, defaultValue: string): ITeamAreaRecord {
        var node = this.getCSSNode(teamFieldValue.value);

        return <ITeamAreaRecord>{
            id: node.id,
            friendlyPath: teamFieldValue.value,
            isDefault: Utils_String.localeIgnoreCaseComparer(teamFieldValue.value, defaultValue) === 0,
            includeChildren: teamFieldValue.includeChildren
        };
    }

    private _flattenChildGuids(node: { id: string, children: any[] }, guids: string[]): string[] {
        if (node.children.length === 0) {
            guids.push(node.id);
            return guids;
        }
        else {
            guids.push(node.id);
            for (var i = 0; i < node.children.length; i++) {
                guids = this._flattenChildGuids(node.children[i], guids);
            }
        }
        return guids;
    }
}

function publishCI(feature: string, data?: any) {
    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
        CommonCustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE, feature, data));
}

export module CustomerIntelligenceConstants {

    var BASE_AREA = "Agile.AdminHub.Work";

    export class TeamClassificationSettings {
        public static AREA = BASE_AREA + "Area";
        public static ITERATION = BASE_AREA + "Iteration";

        public static AREAS_CONTROL_INITIALIZATION = "AreasControlInitialization";
        public static ITERATIONS_CONTROL_INITIALIZATION = "IterationsControlInitialization";

        public static INCLUDE_SUB_AREA = "IncludeSubArea";
        public static UPDATE_DEFAULT_AREA = "UpdateDefaultArea";
        public static ADD_AREA = "AddArea";
        public static REMOVE_AREA = "RemoveArea";

        public static ADD_ITERATION = "AddIteration";
        public static REMOVE_ITERATION = "RemoveIteration";
        public static UPDDATE_BACKLOG_ITERATION = "UpdateBacklogIteration";

        public static PROJECT_NODES_RETRIEVED = "ProjectNodesRetrieved";
        public static CLASSIFICATION_NODE_NOT_FOUND = "ClassificationNodeNotFound";
        public static BEGIN_SAVE_CLASSIFICATION = "BeginSaveClassification";
        public static SAVE_CLASSIFICATION_SUCCEEDED = "SaveClassificationSucceeded";
        public static SAVE_CLASSIFICATION_FAILED = "SaveClassificationFailed";
    }

    export class TeamClassificationSettingsFeature {
        public static TELEMETRY_ADMIN_HUB_AREA_SET_DEFAULT = "Agile.AdminHub.Area.SetDefaultArea";
        public static TELEMETRY_ADMIN_HUB_AREA_INCLUDE_SUB_AREAS = "Agile.AdminHub.Area.IncludeSubAreas";
        public static TELEMETRY_ADMIN_HUB_AREA_EXCLUDE_SUB_AREAS = "Agile.AdminHub.Area.ExcludeSubAreas";
        public static TELEMETRY_ADMIN_HUB_AREA_REMOVE = "Agile.AdminHub.Area.Remove";
        public static TELEMETRY_ADMIN_HUB_AREA_ADD = "Agile.AdminHub.Area.Add";
        public static TELEMETRY_ADMIN_HUB_AREA_NEW = "Agile.AdminHub.Area.New";
        public static TELEMETRY_ADMIN_HUB_AREA_NEW_CHILD = "Agile.AdminHub.Area.NewChild";
        public static TELEMETRY_ADMIN_HUB_AREA_EDIT = "Agile.AdminHub.Area.Edit";
        public static TELEMETRY_ADMIN_HUB_AREA_SECURITY = "Agile.AdminHub.Area.Security";

        public static TELEMETRY_ADMIN_HUB_ITERATION_REMOVE = "Agile.AdminHub.Iteration.Remove";
        public static TELEMETRY_ADMIN_HUB_ITERATION_ADD = "Agile.AdminHub.Iteration.Add";
        public static TELEMETRY_ADMIN_HUB_ITERATION_NEW = "Agile.AdminHub.Iteration.New";
        public static TELEMETRY_ADMIN_HUB_ITERATION_NEW_CHILD = "Agile.AdminHub.Iteration.NewChild";
        public static TELEMETRY_ADMIN_HUB_ITERATION_EDIT = "Agile.AdminHub.Iteration.Edit";
        public static TELEMETRY_ADMIN_HUB_ITERATION_SECURITY = "Agile.AdminHub.Iteration.Security";
    }

    export class TeamDefaultIterationSettings {
        public static AREA = BASE_AREA + "WorkItemDefaultsSetting";
        public static DEFAULT_ITERATION = "DefaultIteration";
    }
}
