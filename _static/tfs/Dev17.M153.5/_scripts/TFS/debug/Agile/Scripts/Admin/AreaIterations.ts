import "VSS/LoaderPlugins/Css!Agile/Admin/AdminHub";
import "VSS/LoaderPlugins/Css!Site";

import Diag = require("VSS/Diag");
import Performance = require("VSS/Performance");
import VSS = require("VSS/VSS");

import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");

import Utils_UI = require("VSS/Utils/UI");

import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");

import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { RowSavingManager } from "Presentation/Scripts/TFS/FeatureRef/RowSavingManager";
import { MessageAreaControl } from "VSS/Controls/Notifications";
import { MenuBar, menuManager } from "VSS/Controls/Menus";
import { Grid, GridO } from "VSS/Controls/Grids";
import { BaseControl, Enhancement } from "VSS/Controls";
import { CustomerIntelligenceConstants } from "Admin/Scripts/TFS.Admin";
import { CSSNodeManager } from "Agile/Scripts/Admin/CSSNodeManager";
import { ClassificationMode, CssNode } from "Agile/Scripts/Admin/AreaIterations.DataModels";
import { IterationDateUtil } from "Agile/Scripts/Common/IterationDateUtil";
import { FieldDataProvider, HierarchicalGridDataAdapter } from "Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters";
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { getService, getLocalService } from "VSS/Service";
import { LocationService } from "VSS/Navigation/Location";
import { getDefaultWebContext } from "VSS/Context";

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;
var tfsContext = TfsContext.getDefault();

var navigationMenuActions = {
    ADD_CLASSIFICATION: "add-classification-action",
    ADD_CHILD_CLASSIFICATION: "add-child-classification-action",
    EDIT_CLASSIFICATION: "edit-classification-action",
    DELETE_CLASSIFICATION: "delete-classification-action",
    SECURE_CLASSIFICATION: "secure-classification-action"
};

class AreaIterationsGrid extends Grid {
    public collapseTo(dataIndexes: number[]): void {
        /// <summary> ensures the dataIndexes are expanded to, while all other rows are collapsed.</summary>

        var dataIndex: number;
        var oldSelectedIndex = this._selectedIndex;

        if (oldSelectedIndex >= 0) {
            dataIndex = this._getDataIndex(oldSelectedIndex);
        }

        this.collapseAllNodes();

        for (var i = 0; i < dataIndexes.length; i++) {
            this.ensureDataIndexExpanded(dataIndexes[i]);
        }

        if (oldSelectedIndex >= 0) {
            var newSelectedIndex = Math.abs(this._getRowIndex(dataIndex));
            if (newSelectedIndex >= 0) {
                this._clearSelection();
                this._addSelection(Math.abs(newSelectedIndex));
            }
        }

        this._layoutContentSpacer();
        this._redraw();
    }
}

/** Area ownership record */
/** Note: We can't use the DataContractSerializer on the client because of dynamic types. */
/**       Hence the variable names are not in camelCasing. */
interface IAreaOwnership {
    TeamName: string;
    IncludeChildren: boolean;
    ParentIncludeChildren: boolean;
}

export class AdminAreaIterations extends BaseControl {

    public static enhancementTypeName = "tfs.admin.areaiterations";
    private static _COMMAND_NEW = "new-classification-node";
    private static _COMMAND_NEW_CHILD = "new-child-classification-node";
    private static _EXPAND_ALL = "expand-all";
    private static _COLLAPSE_ALL = "collapse-all";

    public static TIMEOUT_NOW = 1;
    public static TITLE_COLUMN_INDEX = 0;
    public static INVALID_BACKLOG_ITERATION_LINK = "https://go.microsoft.com/fwlink/?LinkId=618317";

    private _mode: number;
    private _gridControl: AreaIterationsGrid;
    private _menuBar: MenuBar;
    private _payload: any;
    private _gridAdapter: HierarchicalGridDataAdapter;
    private _dataProvider: FieldDataProvider;
    private _nodeManager: CSSNodeManager;
    private _areaOwnershipMapping: IDictionaryStringTo<IDictionaryStringTo<IAreaOwnership>>;
    private _errorPane: MessageAreaControl;
    private _rowSavingManager: RowSavingManager;
    private _menuItemClickedDelegate: any;
    private _expandLevel: number;

    constructor(options?: any) {
        /// <summary>
        /// Initializes the control with the options.
        /// </summary>
        /// <param name="options" type="object">
        /// Options for the control.  The options will have the following structure:
        ///  {
        ///     mode = <mode for the control. AdminAreaIterations.MODE_ITERATIONS or AdminAreaIterations.MODE_AREAS>
        ///     teamContext = <true if in the context of a team and false otherwise>,
        ///     treeValues = <Values to be displayed in the tree.>,
        ///     rootIterationId = <Iteration ID of the product backlog root iteration.>,
        ///     selectedIterationIds = <ID's of iterations which are checked.>,
        ///     userHasTeamWritePermission = <True if the user has write permission and false otherwise>
        ///  }
        /// </param>

        super(options);
    }

    public initialize() {
        /// <summary>OVERRIDE: Initialize the control.</summary>
        var perfScenarioName = (this._mode === ClassificationMode.MODE_ITERATIONS ? CustomerIntelligenceConstants.AreaIterations.ITERATIONS_CONTROL_INITIALIZATION
            : CustomerIntelligenceConstants.AreaIterations.AREAS_CONTROL_INITIALIZATION);
        var perfScenario = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.AreaIterations.AREA, perfScenarioName);

        this._payload = this._options.payload;
        this._mode = this._payload.mode;

        this._createLayout();
        super.initialize();

        Diag.logTracePoint('TFS.Admin.AreaIterations.AdminAreaIterations.complete');
        perfScenario.end();
    }

    public _displayError(message) {
        /// <summary>Displays an error on the page. This is centralized so we</summary>
        this._errorPane.setError(message);
        this._fixGridHeight();
    }

    public _dispose() {
        /// <summary>OVERRIDE: Perform cleanup for the control.</summary>

        menuManager.detachExecuteCommand(this._menuItemClickedDelegate);
    }

    public _createToolbarItems(): any[] {
        /// <summary>Returns a list of toolbar items</summary>
        /// <returns type="Array">List of toolbar action items</returns>

        return <any[]>[
            { id: AdminAreaIterations._COMMAND_NEW, text: AgileResources.Toolbar_New, title: AgileResources.AreaIterations_AddNodeTitle, noIcon: true },
            { id: AdminAreaIterations._COMMAND_NEW_CHILD, text: AgileResources.Toolbar_NewChild, title: AgileResources.AreaIterations_AddChildNodeTitle, noIcon: true },
            { separator: true },
            { id: AdminAreaIterations._EXPAND_ALL, text: AgileResources.ExpandOneLevel, title: AgileResources.ExpandOneLevelToolTip, showText: false, icon: "bowtie-icon bowtie-toggle-expand" },
            { id: AdminAreaIterations._COLLAPSE_ALL, text: AgileResources.CollapseOneLevel, title: AgileResources.CollapseOneLevelToolTip, showText: false, icon: "bowtie-icon bowtie-toggle-collapse" }];
    }

    public drawDateColumn(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
        /// <summary>Get cell for Date Colun</summary>

        var date = this._gridControl.getColumnValue(dataIndex, column.index, columnOrder),
            $editLink,
            that = this,
            $cell,
            formattedDate;

        $cell = $(domElem("div", "grid-cell"));
        $cell.width(column.width || 20);
        if (date) {
            // convert the date to the equivalent UTC value
            let utcDate = Utils_Date.shiftToUTC(date);
            formattedDate = Utils_Date.localeFormat(utcDate, "d", /* ignoreTimeZone */ true);
            $cell.text(formattedDate);
            RichContentTooltip.addIfOverflow(formattedDate, $cell);
        }
        else {
            $editLink = $("<a/>")
                .addClass("admin-area-iterations-link")
                .text(AgileResources.AdminIterations_SetDate)
                .click(function () {
                    that._editNode(that._gridAdapter.getNodeForDataIndex(dataIndex));
                });
            $cell.append($editLink);
        }
        return $cell;

    }

    /**
     * Show the control
     */
    public show() {
        menuManager.attachExecuteCommand(this._menuItemClickedDelegate);
        this.getElement().show();
        this._fixGridHeight();
    }

    /**
     * Hide the control
     */
    public hide() {
        menuManager.detachExecuteCommand(this._menuItemClickedDelegate);
        this.getElement().hide();
    }

    private _fixGridHeight() {
        if (!this._gridControl) {
            return;
        }

        var $element = this.getElement();
        var containerHeight = $element.height();

        var messageAreaHeight = $(".error-pane:visible", $element).outerHeight(true);
        var toolbarHeight = $(".toolbar", $element).outerHeight(true);
        var descriptionHeight = $(".description-text", $element).outerHeight(true);
        var availableVerticalSpace = containerHeight - messageAreaHeight - toolbarHeight - descriptionHeight;

        this._gridControl.getElement().height(availableVerticalSpace);
        this.refreshGrid();
    }

    protected refreshGrid() {
        this._gridAdapter.refresh();
        // Clamp the expand level if required.
        var maxLevel = this._gridAdapter.getMaxExpandLevel();
        this._expandLevel = Math.min(this._expandLevel, maxLevel);
    }

    private _createLayout() {
        var $descriptionSection = $("<div>").addClass("description-text bowtie").appendTo(this.getElement());
        var $errorPaneDiv = $("<div>").addClass("error-pane bowtie").appendTo(this.getElement());
        var $toolbarDiv = $("<div>").addClass("toolbar").appendTo(this.getElement());
        var $gridElement = $("<div>").appendTo(this.getElement());

        var $learnMoreContainer = $("<div>");
        var $learnMore = $("<a>").addClass("admin-area-iteration-learn-more").text(AgileResources.Admin_Area_Iteration_LearnMore);
        $learnMore.attr("target", "_learnMore");
        $("<span>").addClass("bowtie-icon bowtie-navigate-external").appendTo($learnMore);

        var $teamSettingsDescription = $("<div>").addClass("team-settings-link-description");
        var $teamSettingsText = $("<div>");
        var $teamSettingsLink = $("<a />", {
            text: AgileResources.ProjectWorkhub_TeamSettings_Description_Link_Text,
            target: "teamSettings"
        });

        const isNewNav = getService(FeatureManagementService).isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");
        const teamName = tfsContext.currentTeam ? tfsContext.currentTeam.name : ""; // Defaults to project context if no team context available
        const getTeamSpecificSettingsPage = (pivot: string) => isNewNav ? this._getTeamConfigLandingURL(pivot) : this._getTeamURL(teamName, pivot);

        if (this._mode === ClassificationMode.MODE_ITERATIONS) {
            $learnMoreContainer.append(AgileResources.ProjectWorkhub_Iteration_Description);
            $learnMoreContainer.append($learnMore);
            $learnMore.attr("href", AgileResources.AdminIteration_LearnMore_Fwlink);
            $teamSettingsLink.attr("href", getTeamSpecificSettingsPage("iterations"));
            $teamSettingsText.text(Utils_String.format(AgileResources.ProjectWorkhub_TeamSettings_Description, AgileResources.ProjectWorkhub_TeamSettings_Description_Iteration));
        }
        else {
            $learnMoreContainer.append(AgileResources.ProjectWorkHub_Area_Description);
            $learnMoreContainer.append($learnMore);
            $learnMore.attr("href", AgileResources.AdminArea_LearnMore_FwLink);
            $teamSettingsLink.attr("href", getTeamSpecificSettingsPage("areas"));
            $teamSettingsText.text(Utils_String.format(AgileResources.ProjectWorkhub_TeamSettings_Description, AgileResources.ProjectWorkhub_TeamSettings_Description_Area));
        }

        $descriptionSection.append($learnMoreContainer);

        $teamSettingsText.append($teamSettingsLink);
        $teamSettingsDescription.append($teamSettingsText);
        $descriptionSection.append($teamSettingsDescription);

        this._errorPane = <MessageAreaControl>Enhancement.enhance(MessageAreaControl, $errorPaneDiv, { closeable: true });

        // Create the toolbar.
        this._createToolbar($toolbarDiv);

        // Create the grid.
        this._gridControl = <AreaIterationsGrid>Enhancement.enhance(AreaIterationsGrid, $gridElement, this._getGridOptions());

        $gridElement.bind(GridO.EVENT_SELECTED_INDEX_CHANGED, delegate(this, this._handleGridSelectionChanged));

        // Attach all events
        $gridElement.bind("deletekey", delegate(this, function (event, args) {

            var dataIndex = this._gridControl.getSelectedDataIndex(),
                node,
                cssNode,
                isRoot;

            if (dataIndex >= 0) {
                node = this._gridAdapter.getNodeForDataIndex(dataIndex);

                if (node) {
                    cssNode = CssNode.create(node, this._dataProvider);
                    isRoot = (cssNode.getParent() === undefined);

                    if (node && !isRoot) {
                        this._deleteNode(node);
                    }
                }
            }
        }));

        $(window).bind("resize", () => {
            this._fixGridHeight();
        });

        this._setupDataProvider();

        this._nodeManager = new CSSNodeManager(this._mode, this._dataProvider);

        this._setupHierarchicalDataAdapter();

        this._gridControl.setSelectedRowIndex(0);

        this._setupRowSavingManager();

        this._fixGridHeight();

        this._menuItemClickedDelegate = delegate(this, this._onMenuItemClicked);
        menuManager.attachExecuteCommand(this._menuItemClickedDelegate);
    }

    private _handleGridSelectionChanged(sender: any, rowIndex: number, dataIndex: number) {
        /// <summary>Respond to selected index change events from Grid</summary>
        /// <param name="sender" type="Object">The event sender</param>
        /// <param name="rowIndex" type="Number">The row index</param>
        /// <param name="dataIndex" type="Number">The data index</param>
        Diag.Debug.assertParamIsObject(sender, "sender");
        Diag.Debug.assertParamIsNumber(rowIndex, "rowIndex");
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        // rowIndex and dataIndex will be 0 when the root is selected and in this case we need to disable adding a
        // new classification node as a peer
        var disabled = rowIndex === 0 && dataIndex === 0;

        this._menuBar.updateCommandStates([{ id: AdminAreaIterations._COMMAND_NEW, disabled: disabled }]);
    }

    private _setupDataProvider() {
        /// <summary>Creates the data provider for the Grid</summary>
        this._dataProvider = new FieldDataProvider(this._payload.treeValues, { sort: CssNode.compare });
        this._areaOwnershipMapping = this._payload.areaOwners || {};
    }

    private _updateDataProviderOnReparent(sourceNode: any, targetNode: any) {
        var originalParent = sourceNode.parent;
        // Re-parent the node and refresh the grid contents.
        this._dataProvider.reparentNode(sourceNode, targetNode);

        if (this._isAreaOwnersFeatureAvailable) {
            // Update the area ownership based on the reparenting operation
            this._updateAreaOwnershipOnReparenting(sourceNode, originalParent, targetNode);
        }
    }

    private _updateDataProviderOnAdd(node: any, parentNode: any) {
        // Update the data provider
        this._dataProvider.addNode(node, parentNode);

        if (this._isAreaOwnersFeatureAvailable) {
            // Update the area ownership
            this._updateAreaOwnershipOnAdding(node, parentNode);
        }
    }

    private _isAreaOwnersFeatureAvailable(): boolean {
        return !$.isEmptyObject(this._payload.areaOwners);
    }

    private _setupHierarchicalDataAdapter() {
        /// <summary>Create the Hierarchical data adapter for the Grid</summary>
        this._gridAdapter = HierarchicalGridDataAdapter.bindAdapter(HierarchicalGridDataAdapter, this._dataProvider, this._gridControl, {});
        this._expandLevel = this._gridAdapter.getMaxExpandLevel();
    }

    private _setupRowSavingManager() {
        /// <summary>Creates the row saving manager for the Grid</summary>

        this._rowSavingManager = new RowSavingManager(
            this._gridControl,
            (id: number) => {
                /// <summary>Get the data index associated with the provided id.</summary>
                /// <param name="id" type="object">ID of the node to lookup the data index for.</param>
                Diag.Debug.assertParamIsNotNull(id, "id");

                var node = this._dataProvider.getNodeFromId(id + "");
                return node.dataIndex;
            },
            (dataIndex: number) => {
                /// <summary>Get the id of the node associated with the provided data index.</summary>
                /// <param name="dataIndex" type="number">Data index of the node being looked up.</param>
                Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

                var node = this._gridAdapter.getNodeForDataIndex(dataIndex);
                return node.id;
            });
    }

    private _createToolbar($toolbarDiv: JQuery) {
        /// <summary>Creates the toolbar that is displayed on the page</summary>
        this._menuBar = <MenuBar>BaseControl.createIn(MenuBar, $toolbarDiv, {
            items: this._createToolbarItems(),
            executeAction: delegate(this, this._onToolbarItemClick),
            useBowtieStyle: true
        });
    }

    private _getSharedMenuItems(): any {
        return [
            { rank: 100, id: navigationMenuActions.ADD_CLASSIFICATION, text: AgileResources.AreaIterations_AddNodeText, title: AgileResources.AreaIterations_AddNodeTitle, icon: "icon-new-document" },
            { rank: 200, id: navigationMenuActions.ADD_CHILD_CLASSIFICATION, text: AgileResources.AreaIterations_AddChildNodeText, title: AgileResources.AreaIterations_AddChildNodeTitle, icon: "icon-new-document" },
            { rank: 300, id: navigationMenuActions.EDIT_CLASSIFICATION, text: AgileResources.AreaIterations_EditNodeTitle, title: AgileResources.AreaIterations_EditNodeTitle, icon: "bowtie-icon bowtie-edit" },
            { rank: 400, id: navigationMenuActions.DELETE_CLASSIFICATION, text: AgileResources.AreaIterations_RemoveNodeText, title: AgileResources.AreaIterations_RemoveNodeTitle, icon: "bowtie-icon bowtie-edit-delete" },
            { rank: 500, id: navigationMenuActions.SECURE_CLASSIFICATION, text: AgileResources.AreaIterations_SecureClassificationText, title: AgileResources.AreaIterations_SecureClassificationTitle, icon: "bowtie-icon bowtie-security" }
        ];
    }

    private _onToolbarItemClick(e?: any) {
        /// <summary>Handler for toolbar click events</summary>
        /// <param name="e" type="Object">Event information (command name & arguments)</param>
        Diag.Debug.assertParamIsObject(e, "e");

        var command = e.get_commandName(),
            node = this._getSelectedNode();

        switch (command) {
            case AdminAreaIterations._COMMAND_NEW:
                this._addNode(node, false);
                break;
            case AdminAreaIterations._COMMAND_NEW_CHILD:
                this._addNode(node, true);
                break;
            case AdminAreaIterations._EXPAND_ALL:
                if (this._expandLevel < this._gridAdapter.getMaxExpandLevel()) {
                    this._expandLevel++;
                }
                this._gridControl.expandByLevel(this._expandLevel);
                break;
            case AdminAreaIterations._COLLAPSE_ALL:
                if (this._expandLevel > 0) {
                    this._expandLevel--;
                }
                this._gridControl.expandByLevel(this._expandLevel);
                break;
            default:
                Diag.Debug.fail("Toolbar command was not an expected string");
                break;
        }
    }

    private _onMenuItemClicked(sender, args?: any) {

        Diag.logTracePoint('TFS.Admin.AreaIterations.AdminAreaIterations._onMenuItemClicked.Start');

        var node = this._getSelectedNode();

        if (node) {
            switch (args.get_commandName()) {
                case navigationMenuActions.ADD_CLASSIFICATION:
                    this._addNode(node, false);
                    break;
                case navigationMenuActions.ADD_CHILD_CLASSIFICATION:
                    this._addNode(node, true);
                    break;
                case navigationMenuActions.EDIT_CLASSIFICATION:
                    this._editNode(node);
                    break;
                case navigationMenuActions.DELETE_CLASSIFICATION:
                    this._deleteNode(node);
                    break;
                case navigationMenuActions.SECURE_CLASSIFICATION:
                    this._nodeManager.editNodeSecurity(node);
                    break;
            }
        }
    }

    private _getGridOptions() {
        /// <summary>Gets the options used to initialized the grid control including columns, etc.</summary>
        /// <returns>A collection of properties including columns, etc. designed to initialize the base grid.</returns
        var gridOptions;

        if (this._mode === ClassificationMode.MODE_ITERATIONS) {
            gridOptions = this._getIterationsGridOptions();
        }
        else if (this._mode === ClassificationMode.MODE_AREAS) {
            gridOptions = this._getAreaGridOptions();
        }

        return $.extend({}, this._getCommonGridOptions(), gridOptions);
    }

    private _getCommonGridOptions() {
        /// <summary>Gets grid options common to areas and iterations.</summary>
        var mode = this._mode;
        // The draggable and droppable need to have specific scope, since we will be hosting 2 instances of this control,
        // one for iterations and one for areas on the same page and thus would have 2 pairs of draggable and droppable each.
        var scope = "droppable-scope-" + mode;

        return {
            allowMoveColumns: false,
            autoSort: false,
            allowMultiSelect: false,
            draggable: {
                zIndex: 2000,  // Need to have a high zIndex so that the tile will show up on top of dialogs.
                cursorAt: { left: 35, top: 42 },
                axis: "", // the default will set the axis to y, we need to make the tile move freely
                opacity: 1.0,
                appendTo: document.body,        // append to body to allow for free drag/drop
                scroll: false,
                scrollables: [".grid-canvas"],  // a list of selectors to identify elements that the tile will scroll wile dragging
                distance: 20,                   // start the drag if the mouse moved more than 20px, this will prevent accidential drag/drop
                helper: delegate(this, this._createDragTile),
                scope: scope
            },
            droppable: {
                tolerance: "pointer",                           // show the highlight when the pointer overlaps with the droppable
                drop: delegate(this, this._dropRowHandler),     // Invoked when the item is dropped.
                accept: delegate(this, this._acceptHandler),     // Invoked to determine if we are hovering over a valid drop target.
                hoverClass: "admin-area-iteration-grid-row-drop-active",
                scope: scope
            },
            useBowtieStyle: true,
            openRowDetail: delegate(this, function (rowIndex) {
                Diag.Debug.assert(this._gridControl.getSelectedRowIndex() === rowIndex, "Expected that the double-clicked row would be the selected index");

                var dataIndex = this._gridControl.getSelectedDataIndex(),
                    node = this._gridAdapter.getNodeForDataIndex(dataIndex),
                    cssNode = CssNode.create(node, this._dataProvider),
                    isRoot = (cssNode.getParent() === undefined);

                if (node && ((mode === ClassificationMode.MODE_ITERATIONS) || !isRoot)) {
                    this._editNode(node);
                }

            })
        };
    }

    private _updateCommandStates(menu) {
        /// <summary>Updates the enabled state of each of the navigation menu items based on the selected item.</summary>

        var cssNode = CssNode.create(this._getSelectedNode(), this._dataProvider),
            isRoot = false,
            commands = [];

        Diag.Debug.assertIsObject(cssNode, "cssNode");

        isRoot = (cssNode.getParent() === undefined);

        commands.push({ id: navigationMenuActions.ADD_CLASSIFICATION, disabled: isRoot });
        commands.push({ id: navigationMenuActions.ADD_CHILD_CLASSIFICATION });
        commands.push({ id: navigationMenuActions.EDIT_CLASSIFICATION, disabled: (isRoot && (this._mode !== ClassificationMode.MODE_ITERATIONS)) });
        commands.push({ id: navigationMenuActions.DELETE_CLASSIFICATION, disabled: isRoot });

        menu.updateCommandStates(commands);
    }

    private _getIterationsGridOptions(): any {
        /// <summary>Gets the grid options specific to the Iterations grid control.</summary>
        /// <returns type="Object">The options for the iterations grid</returns>
        return {
            contextMenu: {
                "arguments": function (contextInfo) {
                    return {
                        tfsContext: tfsContext,
                        item: contextInfo.rowInfo
                    };
                },
                items: this._getSharedMenuItems(),
                updateCommandStates: delegate(this, this._updateCommandStates)
            },
            columns: <any[]>[{
                text: AgileResources.Iterations_Plural,
                indent: true,
                width: 250,
                canSortBy: false
            },
            {
                text: AgileResources.Iteration_Grid_StartDate,
                width: 100,
                canSortBy: false,
                getColumnValue: IterationDateUtil.getIterationDateColumnValue,
                getCellContents: delegate(this, this.drawDateColumn)
            },
            {
                text: AgileResources.Iteration_Grid_EndDate,
                width: 100,
                canSortBy: false,
                getColumnValue: IterationDateUtil.getIterationDateColumnValue
            }]
        };
    }

    private _getAreaGridOptions(): any {
        /// <summary>Gets the grid options specific to the Areas grid control.</summary>
        /// <returns type="Object">The options for the areas grid</returns>

        var columns = <any[]>[
            {
                text: AgileResources.Areas_Column_Header,
                indent: true,
                width: 250,
                canSortBy: false
            }];

        if (this._isAreaOwnersFeatureAvailable()) {
            columns.push({
                text: AgileResources.Area_Owner_Column_Header,
                indent: true,
                width: 500,
                canSortBy: false,
                getCellContents: delegate(this, this._getAreaOwnerCellContents)
            });
        }

        return {
            contextMenu: {
                "arguments": function (contextInfo) {
                    return {
                        tfsContext: tfsContext,
                        item: contextInfo.rowInfo
                    };
                },
                items: this._getSharedMenuItems(),
                updateCommandStates: delegate(this, this._updateCommandStates)
            },
            columns: columns,
            allowMoveColumns: false,
            autoSort: false
        };
    }

    /**
     * Generate the area owner column contents. 
     * 
     * @param rowInfo The information about grid row that is being rendered.
     * @param dataIndex The index of the row.
     * @param expandedState Number of children in the tree under this row recursively.
     * @param level The hierarchy level of the row.
     * @param column Information about the column that is being rendered.
     * @param indentIndex Index of the column that is used for the indentation.
     * @param columnOrder The display order of the column.
     * @return Returns jQuery element representing the requested grid cell. The first returned element will be appended
     * to the row (unless the function returns null or undefined).
     */
    private _getAreaOwnerCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number): JQuery {
        var node = this._gridAdapter.getNodeForDataIndex(dataIndex);
        var $gridCell = $("<div>").addClass("grid-cell area-owner").width(column.width);

        if (this._areaOwnershipMapping && this._areaOwnershipMapping.hasOwnProperty(node.id)) {
            var ownersList = this._areaOwnershipMapping[node.id];
            if (ownersList) {
                var displayNames: string[] = [];
                for (var key in ownersList) {
                    displayNames.push(ownersList[key].TeamName);
                }

                Utils_Array.sortIfNotSorted(displayNames, Utils_String.localeIgnoreCaseComparer);

                for (var i = 0, l = displayNames.length; i < l; i++) {
                    var displayName = displayNames[i];
                    var ownerTeamUrl = this._getTeamURL(displayName, "areas");
                    var $link = $("<a />", {
                        href: ownerTeamUrl,
                        text: displayName,
                        target: "_blank",
                        rel: "noopener noreferrer"
                    });
                    $gridCell.append($link);
                    if (i !== l - 1) {
                        $gridCell.append($("<div>").addClass("separator").text(", "));
                    }
                }
            }
        }
        return $gridCell;
    }

    /**
     * Updates the areaOwnershipMapping for the node being added
     *
     * @param node The node being added.
     * @param parentNode The new parent for the node
     */
    private _updateAreaOwnershipOnAdding(node: any, parentNode: any) {

        // The owners of the parent and all its ancestor nodes, with includesChildren as true should be added to the owner list.
        var ownersToBeAdded = this._getAreaOwnersIncludingChildren(parentNode);

        this._updateAreaOwnershipMapping(node.id, ownersToBeAdded);
    }

    /**
     * Updates the areaOwnershipMapping for the node being reparented and its child hierarchy
     *
     * @param node The node being reparented.
     * @param originalParent The original parent for the node
     * @param newParent The new parent for the node
     */
    private _updateAreaOwnershipOnReparenting(node: any, originalParent: any, newParent: any) {

        // Since the node being reparented is no longer a part of the hierarchy,
        // its owners, which were added because of its ancestor nodes including children need to be removed now
        var ownersToBeRemoved = this._getAreaOwnersIncludingChildren(originalParent);

        // The owners of the new parent and all its ancestor nodes, with includesChildren as true should be added to the owner list.
        var ownersToBeAdded = this._getAreaOwnersIncludingChildren(newParent);

        this._updateAreaOwnershipHierarchy(node, ownersToBeAdded, ownersToBeRemoved);
    }

    /**
     * Gets all the IAreaOwnership records for the owners in the ancestor hierarchy, which have includeChildren as true
     *
     * @param node The node whose area ownership needs to be returned
     * @return IDictionaryStringTo<IAreaOwnership> with entries for the ancestors
     */
    private _getAreaOwnersIncludingChildren(node: any): IDictionaryStringTo<IAreaOwnership> {
        Diag.Debug.assertParamIsNotUndefined(node, "node");
        Diag.Debug.assertIsNotNull(this._areaOwnershipMapping, "this._areaOwnershipMapping");

        var ownersWithChildrenIncluded: IDictionaryStringTo<IAreaOwnership> = {};
        var currentNode = node;
        while (currentNode) {
            var ownersDictionary = this._areaOwnershipMapping[currentNode.id];
            if (ownersDictionary) {
                var owningParents: IDictionaryStringTo<IAreaOwnership> = {};
                for (var key in ownersDictionary) {
                    var currentOwner = ownersDictionary[key];
                    if (!owningParents[key] && currentOwner.IncludeChildren) {
                        owningParents[key] = currentOwner;
                    }
                }
                $.extend(ownersWithChildrenIncluded, owningParents);
            }
            currentNode = currentNode.parent;
        }

        return ownersWithChildrenIncluded;
    }

    private _updateAreaOwnershipHierarchy(node: any, ownersToBeAdded?: IDictionaryStringTo<IAreaOwnership>, ownersTobeRemoved?: IDictionaryStringTo<IAreaOwnership>) {
        if (node) {
            this._updateAreaOwnershipMapping(node.id, ownersToBeAdded, ownersTobeRemoved);
            var children: any[] = node.children;
            if (children) {
                for (var i = 0, len = children.length; i < len; i++) {
                    this._updateAreaOwnershipHierarchy(children[i], ownersToBeAdded, ownersTobeRemoved);
                }
            }
        }
    }

    private _updateAreaOwnershipMapping(id: string, ownersToBeAdded?: IDictionaryStringTo<IAreaOwnership>, ownersTobeRemoved?: IDictionaryStringTo<IAreaOwnership>) {
        var ownersDictionary = this._areaOwnershipMapping[id] || {};

        for (var key in ownersTobeRemoved) {
            if (ownersDictionary.hasOwnProperty(key)) {
                delete ownersDictionary[key];
            }
        }

        $.extend(ownersDictionary, ownersToBeAdded);

        this._areaOwnershipMapping[id] = ownersDictionary;
    }

    private _getTeamURL(teamDisplayName: string, action: string): string {
        return tfsContext.getActionUrl("", "work", { area: "admin", team: teamDisplayName, _a: action } as IRouteData);
    }

    private _getTeamConfigLandingURL(action: string): string {
        const projectName = getDefaultWebContext().project.name;
        return getLocalService(LocationService).routeUrl("ms.vss-admin-web.project-admin-hub-route", {
            project: projectName,
            adminPivot: 'work-team',
            _a: action
        });
    }

    private _createDragTile(e?: any, ui?: any) {
        /// <summary>Called to create the tile when a grid row is dragged.</summary>
        /// <param name="e" type="object">Event information.</param>
        /// <param name="ui" type="object">UI information.</param>

        Diag.Debug.assertParamIsObject(e, "e");
        Diag.Debug.assertParamIsObject(ui, "ui");

        return $("<div />")
            .addClass("row-drag-tile")
            .text(this._gridControl.getColumnValue(ui.draggingRowInfo.dataIndex, AdminAreaIterations.TITLE_COLUMN_INDEX) || "");
    }

    private _dropRowHandler(e?: any, ui?: any) {
        /// <summary>Called when a tile is dropped on a row.</summary>
        /// <param name="e" type="object">Event information.</param>
        /// <param name="ui" type="object">UI information.</param>

        Diag.Debug.assertParamIsObject(e, "e");
        Diag.Debug.assertParamIsObject(ui, "ui");

        var draggingNode,
            droppingNode,
            originalParent,
            cssDraggingNode;

        // Get the node for the row which is being dragged.
        draggingNode = this._gridAdapter.getNodeForDataIndex(ui.draggingRowInfo.dataIndex);
        originalParent = draggingNode.parent;

        // Get the node for the row which is being dropped.
        droppingNode = this._gridAdapter.getNodeForDataIndex(ui.droppingRowInfo.dataIndex);

        this._updateDataProviderOnReparent(draggingNode, droppingNode);

        this.refreshGrid();
        this._gridControl.setSelectedDataIndex(draggingNode.dataIndex);

        // Mark the row as saving
        this._rowSavingManager.markRowAsSaving(draggingNode.id);

        // Send the request off to the server request
        cssDraggingNode = CssNode.create(draggingNode, this._dataProvider);

        cssDraggingNode.beginUpdate(
            () => {
                // Unmark the row as saving.
                this._rowSavingManager.clearRowSaving(draggingNode.id);
            },
            (e) => {
                // Move the item back to the original parent.
                this._updateDataProviderOnReparent(draggingNode, originalParent);
                this.refreshGrid();

                // Unmark the row as saving.
                this._rowSavingManager.clearRowSaving(draggingNode.id);

                // Display the error message.
                this._displayError(e.message);
            });
    }

    private _acceptHandler($draggedElement: JQuery) {
        /// <summary>Called to see if a tile can be dropped on a row.</summary>
        /// <param name="$draggedElement" type="JQuery">Element being dragged.</param>

        Diag.Debug.assertParamIsObject($draggedElement, "$draggedElement");

        var draggingRowInfo = $draggedElement.data(GridO.DATA_DRAGGING_ROWINFO);
        var droppingRowInfo = $draggedElement.data(GridO.DATA_DROPPING_ROWINFO);

        // Accept handler can be invoked by JQuery UI before drag operation has started.  In
        // this case we will not have the dragging or dropping context information so we cannot
        // accept.
        if (!draggingRowInfo || !droppingRowInfo) {
            return false;
        }

        var draggingNode;
        var currentNode;
        var result = true;

        // Get the node for the row which is being dragged.
        draggingNode = this._gridAdapter.getNodeForDataIndex(draggingRowInfo.dataIndex);

        // Get the node for the row which is being dropped.
        currentNode = this._gridAdapter.getNodeForDataIndex(droppingRowInfo.dataIndex);

        // If the node is being dragged to its parent, then it is not a valid drop target.
        if (draggingNode.parent === currentNode) {
            result = false;
        }
        else {
            // If the dragging row is a parent of the dropping row this is not a valid drop target.
            while (currentNode) {
                if (currentNode === draggingNode) {
                    result = false;
                    break;
                }

                currentNode = currentNode.parent;
            }
        }

        return result;
    }

    private _getSelectedNode(): any {
        /// <summary>Gets the node associated with the currently selected row (if any)</summary>
        /// <returns type="object">The associated node, or null if no row is selected</returns>
        var grid = this._gridControl,
            dataIndex = grid.getSelectedDataIndex();

        if (dataIndex >= 0) {
            return this._gridAdapter.getNodeForDataIndex(dataIndex);
        }

        return null;
    }

    private _addNode(node, addAsChild) {
        /// <summary>Add a node either as a sibling or as a child</summary>
        Diag.Debug.assertParamIsObject(node, "node");
        Diag.Debug.assertParamIsBool(addAsChild, "addAsChild");

        var perfScenarioName = (this._mode === ClassificationMode.MODE_ITERATIONS ? CustomerIntelligenceConstants.AreaIterations.CREATE_ITERATION
            : CustomerIntelligenceConstants.AreaIterations.CREATE_AREA);
        var perfScenario = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.AreaIterations.AREA, perfScenarioName);

        var parentNode = addAsChild ? node : node.parent;

        var onSaved = (cssNode: CssNode) => {
            // add the node to data source and refresh the grid
            Diag.Debug.assertParamIsObject(cssNode, "cssNode");

            this._updateDataProviderOnAdd(cssNode.node, parentNode);
            this.refreshGrid();

            // Now that the node is added, make sure it is selected.
            this._selectRowByNodeId(cssNode.getId());

            perfScenario.end();
        };

        var onClose = () => {
            this._gridControl.focus(AdminAreaIterations.TIMEOUT_NOW);
        };

        this._nodeManager.addNode(node, addAsChild, onSaved, onClose);
    }

    private _editNode(node: any) {
        /// <summary>Displays the dialog to edit a node</summary>
        /// <param name="node" type="object">The node from the grid adapter which will be edited</param>
        Diag.Debug.assertParamIsObject(node, "node");

        var perfScenarioName = (this._mode === ClassificationMode.MODE_ITERATIONS ? CustomerIntelligenceConstants.AreaIterations.EDIT_ITERATION
            : CustomerIntelligenceConstants.AreaIterations.EDIT_AREA);
        var perfScenario = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.AreaIterations.AREA, perfScenarioName);

        var onSave = (updatedNode: CssNode) => {
            /// <param name="updatedNode" type="DataModels.CssNode">The CssNode that has been updated on the server</param>
            var parentId = updatedNode.getParentId(); // Returns Empty Guid if the node.parentId is null

            // Reparent the node if necessary, besides, we always want to prevent reparenting for root node where parentId is null.
            if (node.parentId != null && parentId !== node.parentId) {
                var parentNode = this._dataProvider.getNodeFromId(parentId);
                this._updateDataProviderOnReparent(node, parentNode);
            }

            // update and refresh
            this._dataProvider.updateNode(updatedNode.node);
            this.refreshGrid();

            // Now that the node is added, make sure it is selected.
            this._selectRowByNodeId(updatedNode.getId());

            perfScenario.end();
        };

        var onClose = () => {
            this._gridControl.focus(AdminAreaIterations.TIMEOUT_NOW);
        };

        this._nodeManager.editNode(node, onSave, onClose);
    }

    private _deleteNode(node) {
        /// <summary>Handle the request to remove the selected area/iteration.</summary>
        /// <param name="node">The node in which to remove.</param>
        Diag.Debug.assertParamIsObject(node, "node");

        var perfScenarioName = (this._mode === ClassificationMode.MODE_ITERATIONS ? CustomerIntelligenceConstants.AreaIterations.DELETE_ITERATION
            : CustomerIntelligenceConstants.AreaIterations.DELETE_AREA);
        var perfScenario = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.AreaIterations.AREA, perfScenarioName);

        var onSaved = () => {

            // Refresh the data model
            this._dataProvider.removeNode(node.id);
            this.refreshGrid();

            perfScenario.end();
        };

        var onClose = () => {
            this._gridControl.focus(AdminAreaIterations.TIMEOUT_NOW);
        };

        this._nodeManager.deleteNode(node, onSaved, onClose);
    }

    private _selectRowByNodeId(nodeId: any) {
        /// <summary>Selects a row in the grid control using the specified nodeID to identify the row.</summary>
        /// <param name="nodeId" type="Object">A node ID to search for.</param>
        Diag.Debug.assertParamIsString(nodeId, "nodeId");

        var node = this._dataProvider.getNodeFromId(nodeId),
            grid = this._gridControl,
            dataIndex;

        if (node) {
            dataIndex = this._gridAdapter.getDataIndexFromNode(node);

            // ensure the row is selected and in view
            grid.setSelectedDataIndex(dataIndex, true);  // true = expand any collapsed parent nodes
            grid.getSelectedRowIntoView();
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.AreaIterations", exports);
