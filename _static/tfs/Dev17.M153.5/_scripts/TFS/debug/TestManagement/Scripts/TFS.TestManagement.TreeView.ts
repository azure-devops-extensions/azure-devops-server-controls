// Copyright (c) Microsoft Corporation.  All rights reserved.

import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TestAssignTester_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AssignTestersToSuite");
import TMControls_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Controls");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import TreeView = require("VSS/Controls/TreeView");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");


import Q = require("q");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let domElem = Utils_UI.domElem;
let DAUtils = TestsOM.DAUtils;
let TelemetryService = TCMTelemetry.TelemetryService;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export class NewSuiteCommandIds {
    public static newStaticSuite = "new-static-suite";
    public static newRequirementSuite = "new-requirement-suite";
    public static newQueryBasedSuite = "new-query-based-suite";
}

export class Constants {
    public static DragSuiteLineClass: string = "drag-suite-line";
    public static DragSuiteLineSelector: string = ".drag-suite-line";
    public static DragSuiteTileClass: string = "drag-suite-tile";
    public static DragNotDroppableClass: string = "drag-not-droppable-icon";
    public static DragNotDroppableSelector: string = ".drag-not-droppable-icon";
    public static DragDroppableClass: string = "drag-droppable";
    public static DragDroppableSelector: string = ".drag-droppable";
    public static DragSuiteNoFillIcon: string = "bowtie-icon bowtie-status-no-fill";
}

interface TreeNodeWithOrder extends TreeView.TreeNode {
    order: number;
}

interface Offset {
    top: number;
}

interface DragStartInfo extends Offset {
    nodeIndex: number;
}

interface AdjacentTreeNodeInfo {
    previousNode: TreeNodeWithOrder;
    nextNode: TreeNodeWithOrder;
}

interface DropTargetInfo {
    position: number;
    destNode: TreeView.TreeNode;
    overlap: boolean;
}

export class TestSuitesTree extends TreeView.TreeView {

    private static _editingNodeAnchorData = "nodeAnchor";
    private static _editingNodeContextMenuData = "nodeContextMenu";
    private static _editingSuiteIdData = "editSuiteId";
    private static _editingSuiteOldNameData = "oldName";
    public static enhancementTypeName: string = "tfs.testmanagement.TestSuitesTree";
    public static DropScope: string = "Suite";
    private _plan: any;
    private _selectedSuiteId: number;
    private $renameInputElem: JQuery;
    private _suites: any;
    private _treeOffsetFromTop: number;
    private _nodeHeight: number;
    private _dragStartInfo: DragStartInfo;
    private _lastDropTarget: DropTargetInfo;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _initialSuiteId: number;
    private _supressNodeChangedEvent: boolean;
    private _suiteExpansionData: any;
    private _rootSuiteNode: any;
    private _editInProgress: boolean;
    private _assignTesterToSuite: any;
    private _isFilterApplied: () => boolean;

    public deleteTestSuiteDelegate: (suite: TestsOM.ITestSuiteModel) => void;
    public renameTestSuiteDelegate: (suite: TestsOM.ITestSuiteModel, title: string, errorCallback?: IErrorCallback) => void;
    public moveTestSuiteEntryDelegate: (toSuite: TestsOM.ITestSuiteModel, fromSuite?: TestsOM.ITestSuiteModel, suite?: TestsOM.ITestSuiteModel, position?: number, errorCallback?: IErrorCallback) => void;
    public testPointDroppableAcceptDelegate: () => boolean;
    public runTestSuiteDelegate: (suite: TestsOM.ITestSuiteModel, runWithOptions: boolean) => void;
    public launchExportHtmlDialogDelegate: (suite: TestsOM.ITestSuiteModel) => void;
    public createNewSuiteDelegate: (suite: TestsOM.ITestSuiteModel, command: NewSuiteCommandIds) => void;
    public openTestPlanInClientDelegate: () => void;
    public openTestPlanDelegate: () => void;
    public deleteTestPlanDelegate: () => void;
    public openTestSuiteDelegate: (suite: TestsOM.ITestSuiteModel) => void;
    public showErrorDelegate: (error: string) => void;
    public assignConfigurationsToSuiteDelegate: (suite: TestsOM.ITestSuiteModel) => void;

    constructor(options?: any) {
        /// <summary>Create a new TestSuitesTree Combobox</summary>
        /// <param name="options" type="Object">the options for this control</param>

		// TODO:BUG 937329: Need to remove this once framework team set this property by default.
        if (options) {
            options.useArrowKeysForNavigation = true;
        }
        super(options);
        this._assignTesterToSuite = null;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        let contextMenu: any;
        contextMenu = {
            "arguments": (contextInfo) => {
                return {
                    item: contextInfo.item
                };
            },
            executeAction: delegate(this, this.OnContextMenuItemClick),
            updateCommandStates: delegate(this, this._updateContextMenuCommandStates),
            contributionIds: ["ms.vss-test-web.test-plans-suites-context"]
        };

        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._enableDragDrop(options);
        }
        this._isFilterApplied = options && options.isFilterAppliedDelegate ? options.isFilterAppliedDelegate : () => {
            return false;
        };
        super.initializeOptions($.extend({
            cssClass: "testmanagement-suites-tree",
            contextMenu: contextMenu,
            showIcons: true
        }, options));
    }

    public static TestSuitesTreeCommands = {
        CMD_RENAME: "rename-suite",
        CMD_DELETE: "delete-suite",
        CMD_DELETE_PLAN: "delete-plan",
        CMD_RUN: "run-suite",
        CMD_RUN_WITH_OPTIONS: "run-with-options",
        CMD_OPENINCLIENT: "open-in-client",
        CMD_NEWSUITE: "create-new-suite",
        CMD_OPENPLAN: "open-plan",
        CMD_OPENSUITE: "open-suite",
        CMD_EXPORT: "export-to-html",
        CMD_ASSIGN_TESTERS_TO_SUITE: "assign-testers-to-suite",
        CMD_ASSIGN_CONFIGURATIONS_TO_SUITE: "assign-configurations-to-suite",
        CMD_SET_TESTOUTCOME_SETTINGS: "set-test-outcome-settings"
    };

    public initialize() {
        /// <summary>Initailizes the control</summary>
        let $renameElementParent: JQuery;
        super.initialize();
        $renameElementParent = $(this._element).parents(".test-hub-view");
        this._element.bind("selectionchanged", delegate(this, this._onSelectedSuiteChanged));
        this._bind("dblclick", delegate(this, this._beginEdit));
        //appending to the body to avoid intereference from drag and drop events
        this.$renameInputElem = $("<input type='text' class='testmanagement-suite-rename'/>").prependTo($renameElementParent);
        this.$renameInputElem.hide();
        this._bind(this.getElement(), "scroll", delegate(this, this._onScroll));
        this._selectedSuiteId = 0;
        this._treeOffsetFromTop = this._element.offset().top;
    }

    public setData(data: any) {
        /// <summary>Puts data to be shown in the TreeView</summary>
        /// <param name="data" type="Object">Contains the plan and the suites to be displayed in treeview</param>
        this._updateSuitesExpansionData();
        this.setSelectedNode(null);
        this._plan = data.plan;
        this._suites = data.suites;
        this._populate();
    }

    public GetDisplaySuites() {
        return this._suites;
    }

    private _onScroll(e?) {
        if (!this._editInProgress) {
            this._endEdit();
        }
    }

    public getSelectedSuite(): any {
        /// <summary>Gets the currently selected suite node</summary>
        /// <returns type="Object" > the suite data object currently selected </returns>
        let node = <any>this.getSelectedNode();
        return node && node.suite;
    }

    public setSelectedNode(node: any, suppressChangeEvent?: boolean) {
        /// <summary>Sets the currently selected suite node</summary>
        /// <param name="node" type="Object">Contains the node to be selected </param>
        /// <param name="suppressChangeEvent" type="boolean" optional="true" />
        let eventArgs = {
            suite: node && node.suite,
            canceled: false
        };

        this._fire("selectedSuiteChanging", eventArgs);
        if (!eventArgs.canceled) {
            this._supressNodeChangedEvent = (suppressChangeEvent === true);
            super.setSelectedNode(node);
            this._supressNodeChangedEvent = false;
        }
    }

    public setSelectedSuite(suiteId: number, supressNodeChangeEvent: boolean) {
        /// <summary>Sets the currently selected suite node</summary>
        /// <param name="suiteId" type="Number">Contains the id of the suite to be selected </param>
        /// <param name="supressNodeChangeEvent" type="Boolean">boolean indicating whether to fire suite change event</param>
        let currentSelection, node = null;

        if (!suiteId) {
            node = this._rootSuiteNode;
        }
        else {
            currentSelection = this.getSelectedSuite();
            if (currentSelection && currentSelection.id === suiteId) {
                return;
            }

            Utils_UI.walkTree.call(this.rootNode, function (treeNode) {
                if (treeNode.suite && treeNode.suite.id === suiteId) {
                    node = treeNode;
                }
            });
        }

        this.setSelectedNode(node, supressNodeChangeEvent);
        this.focus();
    }

    public makeSelectedSuiteEditable() {
        this._makeEditable(this.getSelectedNode());
    }

    public onShowPopupMenu(node, options?) {
        options = $.extend({}, options, { items: this._getContextMenuItems(node) });
        super.onShowPopupMenu(node, options);
    }

    private _getContextMenuItems(node: TreeView.TreeNode): any[] {
        let menuItems: any[] = [];
        if (!LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            menuItems.push({ rank: 5, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RUN, text: Resources.RunText, title: Resources.RunActiveTests, icon: "bowtie-icon bowtie-media-play-fill", showIcon: true, showText: true, groupId: "execute" });
            return menuItems;
        }
        if (node) {
            menuItems = <any[]>[
                { rank: 5, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RUN, text: Resources.RunText, title: Resources.RunActiveTests, icon: "bowtie-icon bowtie-media-play-fill", showIcon: true, showText: true, groupId: "execute" }
            ];

            menuItems.push({ rank: 5, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RUN_WITH_OPTIONS, text: Resources.RunTestWithOptionsText, title: Resources.RunTestWithOptionsTooltip, icon: "bowtie-icon bowtie-media-play-fill", showIcon: true, showText: true, groupId: "execute" });
            
            menuItems.push({ rank: 6, separator: true });
            menuItems.push({ rank: 8, id: NewSuiteCommandIds.newStaticSuite, text: Resources.NewStaticSuiteTitle, title: Resources.CreateStaticSuite, showText: true, icon: "bowtie-icon bowtie-folder", showIcon: true });
            menuItems.push({ rank: 9, id: NewSuiteCommandIds.newRequirementSuite, text: Resources.NewRequirementSuite, title: Resources.CreateRequirementSuite, showText: true, icon: "bowtie-icon bowtie-tfvc-change-list", showIcon: true });
            menuItems.push({ rank: 10, id: NewSuiteCommandIds.newQueryBasedSuite, text: Resources.NewQueryBasedSuiteTitle, title: Resources.CreateQueryBasedSuiteTitle, showText: true, icon: "bowtie-icon bowtie-folder-query", showIcon: true });
            menuItems.push({ rank: 11, separator: true });

            if (node.parent.id > 0) {
                menuItems.push({ rank: 12, id: TestSuitesTree.TestSuitesTreeCommands.CMD_OPENSUITE, text: Resources.OpenTestSuite, icon: "bowtie-icon bowtie-arrow-open", showIcon: true, showText: true });
                menuItems.push({ rank: 13, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RENAME, text: Resources.RenameText, title: Resources.RenameSuite, icon: "bowtie-icon bowtie-edit-rename", showIcon: true, showText: true });
               
                menuItems.push({ rank: 14, id: TestSuitesTree.TestSuitesTreeCommands.CMD_DELETE, text: Resources.PermanentlyDeleteText, title: Resources.PermanentlyDeleteSuite, icon: "bowtie-icon bowtie-edit-delete", showIcon: true, showText: true });
                
                menuItems.push({ rank: 15, separator: true });
            }
            else {
                menuItems.push({ rank: 12, id: TestSuitesTree.TestSuitesTreeCommands.CMD_OPENINCLIENT, text: Resources.OpenInClient, title: Resources.OpenInClientTooltip, icon: "bowtie-icon bowtie-brand-mtm bowtie-icon-large", showIcon: true, showText: true });
                menuItems.push({ rank: 13, id: TestSuitesTree.TestSuitesTreeCommands.CMD_OPENPLAN, text: Resources.OpenTestPlan, icon: "bowtie-icon bowtie-arrow-open", showIcon: true, showText: true });
                
                menuItems.push({ rank: 14, id: TestSuitesTree.TestSuitesTreeCommands.CMD_DELETE_PLAN, text: Resources.PermanentlyDeleteText, title: Resources.PermanentlyDeletePlan, icon: "bowtie-icon bowtie-edit-delete", showIcon: true, showText: true });
                
                menuItems.push({ rank: 15, separator: true });
            }
            menuItems.push({ rank: 16, id: TestSuitesTree.TestSuitesTreeCommands.CMD_EXPORT, text: Resources.ExportHtml, title: Resources.ExportHtmlTooltip, icon: "bowtie-icon bowtie-print", showIcon: true, showText: true });

            menuItems.push({ rank: 17, separator: true });
            menuItems.push({ rank: 18, id: TestSuitesTree.TestSuitesTreeCommands.CMD_ASSIGN_TESTERS_TO_SUITE, text: Resources.AssignTestersToSuite, title: Resources.AssignTestersToSuiteToolTip, icon: "bowtie-icon bowtie-users", showIcon: true, showText: true });

            let text = Resources.AssignConfigurationsToPlan;
            if (parseInt(node.parent.id) !== 0) {
                text = Resources.AssignConfigurationsToSuite;
            }
            menuItems.push({ rank: 20, id: TestSuitesTree.TestSuitesTreeCommands.CMD_ASSIGN_CONFIGURATIONS_TO_SUITE, text: text, title: Resources.AssignConfigurationsToSuiteToolTip, icon: "bowtie-icon bowtie-server-remote", showIcon: true, showText: true });


            if (node.parent.root) {
                menuItems.push({ rank: 21, separator: true });
                menuItems.push({
                    rank: 22,
                    id: TestSuitesTree.TestSuitesTreeCommands.CMD_SET_TESTOUTCOME_SETTINGS,
                    text: Resources.ConfigureTestOutcomeSettings,
                    title: Resources.ConfigureTestOutcomeSettings,
                    icon: "bowtie-icon bowtie-settings-gear",
                    showIcon: true,
                    showText: true
                });
            }

            return menuItems;
        }
    }

    private _createNewSuiteSubMenuItems(): any[] {
        /// <summary>Creates the items list for the new suite sub menu</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items: any[] = [];

        items.push({
            id: NewSuiteCommandIds.newStaticSuite,
            text: Resources.StaticSuiteTitle,
            title: Resources.CreateStaticSuite,
            showText: true,
            icon: "bowtie-icon bowtie-folder",
            showIcon: true
        });

        items.push({
            id: NewSuiteCommandIds.newRequirementSuite,
            text: Resources.RequirementSuite,
            title: Resources.CreateRequirementSuite,
            showText: true,
            icon: "bowtie-icon bowtie-tfvc-change-list",
            showIcon: true
        });

        items.push({
            id: NewSuiteCommandIds.newQueryBasedSuite,
            text: Resources.QueryBasedSuiteTitle,
            title: Resources.CreateQueryBasedSuiteTitle,
            showText: true,
            icon: "bowtie-icon bowtie-folder-query",
            showIcon: true
        });

        return items;
    }

    public OnContextMenuItemClick(e?: any) {
        /// <summary>executes upon executing a right click command from the context menu</summary>
        /// <param name="e" type="Object">event related info</param>
        let command = e.get_commandName(),
            commandArgs = e.get_commandArgument(),
            node: any = commandArgs.item;
        if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_RENAME) {
            this._makeEditable(node);
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_DELETE) {
            this.deleteTestSuiteDelegate(node.suite);
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_DELETE_PLAN) {
            this.deleteTestPlanDelegate();
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_RUN) {
            this.runTestSuiteDelegate(node.suite, false);
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_RUN_WITH_OPTIONS) {
            this.runTestSuiteDelegate(node.suite, true);
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_OPENINCLIENT) {
            this.openTestPlanInClientDelegate();
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_EXPORT) {
            this.launchExportHtmlDialogDelegate(node.suite);
        }
        else if (command === NewSuiteCommandIds.newStaticSuite ||
            command === NewSuiteCommandIds.newRequirementSuite ||
            command === NewSuiteCommandIds.newQueryBasedSuite) {

            this.createNewSuiteDelegate(node.suite, command);
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_OPENPLAN) {
            this.openTestPlanDelegate();
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_OPENSUITE) {
            this.openTestSuiteDelegate(node.suite);
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_ASSIGN_TESTERS_TO_SUITE) {
            this._openAssignTesterToSuiteDialog(node.suite);
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_ASSIGN_CONFIGURATIONS_TO_SUITE) {
            this.assignConfigurationsToSuiteDelegate(node);
        }
        else if (command === TestSuitesTree.TestSuitesTreeCommands.CMD_SET_TESTOUTCOME_SETTINGS) {
            this._launchTestOutcomeSettingsDialog(node);
        }
    }

    private _launchTestOutcomeSettingsDialog(node: any) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Controls"], (Module: typeof TMControls_LAZY_LOAD) => {
            let launchDialog = (isEnabled: boolean) => {
                let options = { enabled: isEnabled, planId: node.plan.id, planName: node.plan.name };
                Module.TestDialogs.configureOutcomeSettings(options);
            };

            this.beginGetTestOutcomeSettings(node.plan.id).then(launchDialog);
        });
    }

    public beginGetTestOutcomeSettings(planId: number): IPromise<boolean> {
        let key = this._getTestOutcomeSettingsRegistryKey(planId);

        return this._beginReadProjectSettings(key)
            .then(response => {
                return response.value ? response.value === "true" : false;
            });
    }

    /**
     * This will check if the selected node has child suites count which is exceeding
     * the maximum allowed child suites count for export HTML feature
     */
    public checkIfThresholdExceededForExportFeature(): boolean {
        let result: boolean = false;
        let node = this.getSelectedNode();
        let count = this.getChildSuitesCountToExceedThresholdForExport(node);
        if (count > TCMConstants.ExportHtml.TestSuitesLimit) {
            result = true;
        }

        return result;
    }

    /**
     * This will return the child nodes count of the node, this method will call in recursion
     * to get nodes count, it will break when child nodes count is more than test suites limit
     * for the export html feature
     * @param node
     */
    public getChildSuitesCountToExceedThresholdForExport(node: TreeView.TreeNode): number {
        let childCounts: number = 1;

        if (!node) {
            return 0;
        }

        let children = node.children || [];
        let childrenLength = children.length;
        if (childrenLength === 0) {
            return 1;
        }

        for (let i = 0; i < childrenLength; i++) {
            childCounts += this.getChildSuitesCountToExceedThresholdForExport(node.children[i]);
            if (childCounts > TCMConstants.ExportHtml.TestSuitesLimit) {
                return childCounts;
            }
        }

        return childCounts;
    }

    private _getTestOutcomeSettingsRegistryKey(planId: number) {
        return Utils_String.format("MS.VS.TestManagement/TestOutcomeSettings/TestPlan/{0}", planId);
    }

    private _beginReadProjectSettings(key: string): IPromise<any> {
        let deferred = Q.defer();

        let webSettings = TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault())
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

        webSettings.beginReadSetting(key, TFS_WebSettingsService.WebSettingsScope.Project,
            deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    private _updateContextMenuCommandStates(menu: any) {
        let context: any,
            suite: TestsOM.ITestSuiteModel,
            canAddNewSuite: boolean;

        context = this._getPopupMenuContextInfo(menu);
        suite = context.item.suite;
        canAddNewSuite = suite && suite.type === TCMConstants.TestSuiteType.StaticTestSuite;

        menu.updateCommandStates(
            [
                {
                    id: TestSuitesTree.TestSuitesTreeCommands.CMD_NEWSUITE,
                    disabled: !canAddNewSuite
                },
                {
                    id: NewSuiteCommandIds.newStaticSuite,
                    disabled: !canAddNewSuite
                },
                {
                    id: NewSuiteCommandIds.newRequirementSuite,
                    disabled: !canAddNewSuite
                },
                {
                    id: NewSuiteCommandIds.newQueryBasedSuite,
                    disabled: !canAddNewSuite
                }]);

    }

    private _getPopupMenuContextInfo(menu: any) {
        let popupMenu = menu;

        while (popupMenu && !popupMenu._options.contextInfo) {
            popupMenu = popupMenu._parent;
        }
        return popupMenu._options.contextInfo;
    }

    private _makeEditable(node) {
        try {
            this._editInProgress = true;
            let $nodeElement: JQuery = this._getNodeElement(node),
                $suiteImg: JQuery = $nodeElement.find(".tree-node-img").first(),
                left: number = $suiteImg.offset().left + $suiteImg.outerWidth(true),
                $inputElem: JQuery = this.$renameInputElem,
                pos = $nodeElement.offset(),
                $nodeAnchor: JQuery = $nodeElement.find("a").first(),
                $nodeContextMenu = $nodeElement.find(".node-context-menu.icon").first();

            pos.left = left;
            if (node && node.parent.id > 0 && $inputElem.data(TestSuitesTree._editingSuiteIdData) !== node.suite.id) {
                // do not allow rename if root suite
                $inputElem.val(node.suite.title);

                //store data that we would need later
                $inputElem.data(TestSuitesTree._editingSuiteOldNameData, node.suite.title);
                $inputElem.data(TestSuitesTree._editingNodeAnchorData, $nodeAnchor);
                $inputElem.data(TestSuitesTree._editingNodeContextMenuData, $nodeContextMenu);
                $inputElem.data(TestSuitesTree._editingSuiteIdData, node.suite.id);

                //hide tree element
                $nodeAnchor.css("visibility", "hidden");
                $nodeContextMenu.css("visibility", "hidden");

                //show and position our input element
                $inputElem.show();
                $inputElem.offset(pos);
                this._bind($inputElem, "blur", delegate(this, this._endEdit));
                this._bind($inputElem, "keydown", (e: JQueryEventObject) => {
                    if (e.which === Utils_UI.KeyCode.ENTER || e.which === Utils_UI.KeyCode.ESCAPE) {
                        this._endEdit(e, e.which === Utils_UI.KeyCode.ESCAPE);
                        return false;
                    }
                });
                this.delayExecute("makeEditable", 10, true, () => {
                    $inputElem.focus();
                    TMUtils.setTextSelection($inputElem[0], 0, (node.suite.title.length));
                    this._editInProgress = false;
                });
            }
        }
        catch (e) {
            this._editInProgress = false;
        }
    }

    public focus() {
        if (this._selectedNode) {
            //overriding default behaviour, sinc jquery focus does not seem working in version 1.7.2
            try {
                this._getNodeElement(this._selectedNode).children(".node-link").get(0).focus();
            }
            catch (e) {
            }
        }
    }

    public _onBlur(e?: JQueryEventObject): any {
        super._clearFocusOnElement();
    }

    private _beginEdit(e?: JQueryEventObject) {

        this._endEdit();

        let li: JQuery = $(e.target).closest("li.node"), node;
        node = this._getNode(li);
        if (node && node.selected) {
            this._makeEditable(node);
        }
    }

    private _endEdit(e?: JQueryEventObject, cancelRename?: boolean) {
        //cancelRename is true when user presses Escape key
        //this is called on renaming a suite. Rename should be fast and would succeed normally in most cases. We do not want to block user or show the old name
        // untill the renamme is complete on the server. Hence we update the name locally and thenn make the server call and revert if any error is thrown
        let li: JQuery,
            node,
            $input = this.$renameInputElem,
            oldName: string = $input.data(TestSuitesTree._editingSuiteOldNameData),
            suiteName: string = $input.val(),
            applyPreviewState = (node: any, title: string) => {
                node.suite.title = title;
                node.text = this._getNodeText(node.suite);
                node.title = this._getNodeTitle(node.suite);
                this.updateNode(node);
            },
            $nodeAnchor = $input.data(TestSuitesTree._editingNodeAnchorData),
            $nodeContextMenu = $input.data(TestSuitesTree._editingNodeContextMenuData);

        DAUtils.trackAction("RenameSuite", "/SuiteManagement");

        if ($nodeAnchor && $nodeContextMenu) {

            //hide the input element
            $input.hide();

            //Searching the node after $input.hide as later was raising blur event on edge browser 
            li = $nodeAnchor.closest("li.node");
            node = this._getNode(li);
            //make treenode visible
            $nodeAnchor.css("visibility", "visible");
            $nodeContextMenu.css("visibility", "visible");
            //clear data related to this edit
            $input.data(TestSuitesTree._editingSuiteIdData, 0);
            $input.data(TestSuitesTree._editingNodeAnchorData, null);
            $input.data(TestSuitesTree._editingNodeContextMenuData, null);

            if (!cancelRename && $.isFunction(this.renameTestSuiteDelegate) && oldName !== suiteName) {
                if (!$.trim(suiteName)) {
                    alert(Resources.SuiteNameCannotBeEmpty);
                }
                else {
                    applyPreviewState(node, suiteName);
                    this.renameTestSuiteDelegate(node.suite, suiteName, ((node, suiteTree) => {
                        //error callback, revert to old title
                        return function (e) {
                            if (node) {
                                node.text = oldName;
                                node.suite.title = oldName;
                                suiteTree.updateNode(node);
                            }
                        };
                    })(node, this));

                }
            }
            else if (e && e.type !== "blur") {
                Utils_UI.tryFocus($nodeAnchor, 10);
            }
        }
    }

    public onItemClick(node, nodeElement, e?: JQueryEventObject): boolean {
        if (e && e.target) {
            let $target: JQuery = $(e.target),
                parent = node.parent;

            if ($target.hasClass("node-remove")) {
                if (parseInt(parent.id) === 0) { // root of the tree
                    if ($.isFunction(this.deleteTestPlanDelegate)) {
                        this.deleteTestPlanDelegate();
                        return false;
                    }
                }
                else {
                    if ($.isFunction(this.deleteTestSuiteDelegate)) {
                        this.deleteTestSuiteDelegate(node.suite);
                        return false;
                    }
                }
            }
        }

        super.onItemClick(node, nodeElement, e);
        return false;
    }

    public _onInputKeyDown(e?: JQueryEventObject): any {
        if (e.keyCode === 113) {//F2
            this._beginEdit(e);
            return;
        }
        super._onInputKeyDown(e);
    }

    public _toggle(node: TreeView.TreeNode, nodeElement: JQuery): any {
        this._endEdit();
        super._toggle(node, nodeElement);
    }

    public _updateNode(li: JQuery, node: TreeView.TreeNode, level: number) {
        
        let divNodeContent = super._updateNode(li, node, level);
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            if (level > 0) {
                
                $("<span />").addClass("node-remove").attr("title", Resources.PermanentlyDeleteSuite).addClass("bowtie-icon bowtie-edit-delete").appendTo(divNodeContent);
                
            }
            else {
                
                $("<span />").addClass("node-remove").attr("title", Resources.PermanentlyDeletePlan).addClass("bowtie-icon bowtie-edit-delete").appendTo(divNodeContent);
                
            }
        }

        return divNodeContent;
    }

    public expandAll() {
        let elem: JQuery;
        Utils_UI.walkTree.call(this.rootNode, (treeNode) => {
            elem = this._getNodeElement(treeNode);
            this._setNodeExpansion(treeNode, elem, true);
        });
    }

    public collapseAll() {
        let elem: JQuery;
        Utils_UI.walkTree.call(this.rootNode, (treeNode) => {
            elem = this._getNodeElement(treeNode);
            this._setNodeExpansion(treeNode, elem, false);
        });
    }

    public getUniqueNameIndexInCurrentSuite(defaultName: string, nameFormat: string): number {
        let curNode = this.getSelectedNode(),
            counter: number = 0,
            suiteName: string;

        if (curNode) {
            do {
                counter++;
                if (counter === 1) {
                    suiteName = defaultName;
                }
                else {
                    suiteName = Utils_String.format(nameFormat, defaultName, counter.toString());
                }
                if (!curNode.findNode(suiteName)) {
                    break;
                }
            } while (true);
        }
        return counter;
    }

    public clearTreeView() {
        this.rootNode.clear();
        this._draw();
    }

    private _populate() {
        /// <summary>draws the treeview with the data</summary>
        this.rootNode.clear();
        this._addRootSuite(this._plan, this._suites, this.rootNode);
        this._draw();
    }

    private _getNodeHeight(): number {
        let nodes: TreeNodeWithOrder[] = this._getVisibleNodesInOrder();
        let nodeHeight: number;
        let nodeCount = nodes.length;
        if (nodeCount > 0) {
            let actualNodeContent = this._element.find(".tree-children div.node-content");
            if (actualNodeContent && actualNodeContent.length > 0) {
                let nodeHeightWithoutMargin = actualNodeContent[0].offsetHeight;
                let tree = this._getNodeElement(nodes[0]);
                let treeHeight = tree.height();

                // treeHeight is nothing but sum of all nodes height with margin, but it doesn't include
                // last node margin, so get actual node height with margin we need to add margin in last node as well
                // Here is the way to get margin
                let margin = (treeHeight - (nodeCount * nodeHeightWithoutMargin)) / (nodeCount - 1);

                nodeHeight = (treeHeight + margin) / nodeCount;
            }
        }

        return nodeHeight;
    }

    private _onSelectedSuiteChanged(e?: any) {
        /// <summary>fires the suite changed event</summary>
        /// <param name="e" type="Object">event related info</param>
        let suite = this.getSelectedSuite(),
            selectedNode = this.getSelectedNode(),
            $nodeAnchor = this._getNodeElement(selectedNode).children(".node-link").first();
        // Fire selectedSuiteChanged event only when selected suite is other than currently selected suite
        if (!this._supressNodeChangedEvent && this._selectedSuiteId !== suite.id) {
            this._fire("selectedSuiteChanged", { suite: this.getSelectedSuite() });
        }
        this._selectedSuiteId = suite.id;
        if ($nodeAnchor && !$nodeAnchor.is(":focus")) {
            //need to do this as jquery ui drag and drop is eating the click event and hence
            //on click nodes dont become focussed and also suites in rename mode dont blur
            this.delayExecute("focusSelectedSuite", 50, true, () => {
                this.focus();
            });
        }

    }

    public updateSelectedSuite() {
        let node = <any>this.getSelectedNode();
        node.text = this._getNodeText(node.suite);
        node.title = this._getNodeTitle(node.suite);
        if (this.$renameInputElem.data(TestSuitesTree._editingSuiteIdData) !== node.suite.id) {
            this.updateNode(node);
        }
    }

    private _enableDragDrop(options?: any) {
        let that = this;

        options.draggable = $.extend({
            scroll: false,
            scrollables: [".testmanagement-suites-tree"],
            scope: TestSuitesTree.DropScope,
            appendTo: document.body,        // append to body to allow for free drag/drop                    
            distance: 20,                   // start the drag if the mouse moved more than 20px, this will prevent accidential drag/drop
            helper: function (event) { return that._draggableHelper(this, event); },
            cursorAt: { left: -20, top: 0 },
            containment: ".testmanagement-suites-tree",
            start: function (event, ui) { that._draggableStart(this, event, ui); },
            stop: function (event) { that._draggableStop(event); },
            drag: function (event, ui) { that._draggableDrag(this, event, ui); }
        }, options.draggable);

        options.droppable = $.extend({
            hoverClass: "droppable-hover",
            scope: TestSuitesTree.DropScope,
            tolerance: "pointer",
            accept: function ($draggable) { return that._droppableAccept(this, $draggable); },
            drop: function (event, ui) { return that._droppableDrop(this, event, ui); },
            over: function (event, ui) { that._droppableOver($(this), event, ui); },
            greedy: true // ensure that the most local/specific elements get to accept the drop first, not the parents                    
        }, options.droppable);
    }

    private _isSuiteDraggedOnNonStaticSuite($draggedElement: JQuery, suite: TestsOM.ITestSuiteModel): boolean {
        let isTestSuiteBeingDragged = $draggedElement.hasClass("tree-drag-tile");
        return isTestSuiteBeingDragged && suite.type !== TCMConstants.TestSuiteType.StaticTestSuite;
    }

    private _areTestCasesDraggedOnQueryBasedSuite($draggedElement: JQuery, suite: TestsOM.ITestSuiteModel): boolean {
        let areTestCasesBeingDragged = !$draggedElement.hasClass("tree-drag-tile");
        return areTestCasesBeingDragged && suite.type === TCMConstants.TestSuiteType.DynamicTestSuite;
    }

    /**
     * Perform start events for the drag operation
     * 
     * @param event
     * @param ui
     */
    private _draggableStart(draggableTreeNodeElement: any, event: any, ui: any) {
        let treeNode = $(draggableTreeNodeElement).data(TreeView.TreeView.NODE_DATA_NAME);
        if (!treeNode.suite) {
            return false;
        }

        if (!this._nodeHeight) {
            this._nodeHeight = this._getNodeHeight();
        }

        // This is to get the number of pixels that are hidden from view above the scrollable area
        let treeScrollTop = this._element.scrollTop();

        let nodeIndex = (ui.offset.top + treeScrollTop - this._treeOffsetFromTop) / this._nodeHeight;
        this._dragStartInfo = {
            top: ui.offset.top,
            nodeIndex: nodeIndex
        };
    }

    /**
     * Perform events actions when the drag operation stops. This occurs after any drop handler has executed.
     * 
     * @param event
     * @param ui
     */
    private _draggableStop(event: any) {
        this._dragStartInfo = null;
        this._lastDropTarget = null;
        this._resetSuiteDragDroppable();
    }

    /**
     * Perform events for the drag operation
     * 
     * @param event
     * @param ui
     */
    private _draggableDrag(draggableTreeNodeElement: any, event: any, ui: any) {
        if (this._dragStartInfo) {
            let sourceTreeNode = $(draggableTreeNodeElement).data(TreeView.TreeView.NODE_DATA_NAME);
            this._lastDropTarget = this._getDropTargetInfo(<Offset>ui.offset, sourceTreeNode);
            let $dragElem = ui.helper,
                $dragElemDroppableStyle = $dragElem.find(Constants.DragDroppableSelector),
                $dragElemNotDroppableStyle = $dragElem.find(Constants.DragNotDroppableSelector),
                $suiteDragLineindicator = $dragElem.find(Constants.DragSuiteLineSelector);

            if (this._lastDropTarget) {
                let node: any = this._lastDropTarget.destNode;

                // Remmove any preexisting selection or selection happened through hover from the tree node while dragging
                this._clearFocus();

                // Handling test suite drag styling here instead of _droppableOver as here we get styling more accurately
                if (node && node.suite) {
                    if (this._isSuiteDraggedOnNonStaticSuite($dragElemDroppableStyle, node.suite) ||
                        this._areTestCasesDraggedOnQueryBasedSuite($dragElemDroppableStyle, node.suite)) {
                        this._hideSuiteDraggerAndShowNotDroppableStyle($dragElemDroppableStyle, $dragElemNotDroppableStyle, $suiteDragLineindicator);
                    }
                    else {
                        this._showSuiteDragger($dragElemDroppableStyle, $dragElemNotDroppableStyle, $suiteDragLineindicator);
                    }
                }
            }
            else {
                // Hide the suite dragger and show the not droppable style in case drop target is not valid, like if you drag way below last suite item
                this._hideSuiteDraggerAndShowNotDroppableStyle($dragElemDroppableStyle, $dragElemNotDroppableStyle, $suiteDragLineindicator);
            }
        }
    }

    /**
     * Show suite dragger line and style, hide not droppable style
     */
    private _showSuiteDragger($dragElemDroppableStyle: JQuery, $dragElemNotDroppableStyle: JQuery, $suiteDragLineindicator: JQuery) {
        $dragElemDroppableStyle.show();
        $dragElemNotDroppableStyle.hide();
        if (this._lastDropTarget.overlap) {
            $suiteDragLineindicator.hide();
            let destNodeElement = this._getNodeElement(this._lastDropTarget.destNode);

            // Add selection to the destination node
            destNodeElement.addClass("focus");
        }
        else {
            $suiteDragLineindicator.show();
        }
    }

    /**
     * Hide suite dragger line and droppable style, show not droppable style
     */
    private _hideSuiteDraggerAndShowNotDroppableStyle($dragElemDroppableStyle: JQuery, $dragElemNotDroppableStyle: JQuery, $suiteDragLineindicator: JQuery) {
        $dragElemDroppableStyle.hide();
        $dragElemNotDroppableStyle.show();
        $suiteDragLineindicator.hide();
    }

    private _droppableOver($node, event: any, ui: any) {
        let node: any = this._getNode($node),
            $dragElem = ui.helper,
            $dragElemDroppableStyle = $dragElem.find(Constants.DragDroppableSelector),
            $dragElemNotDroppableStyle = $dragElem.find(Constants.DragNotDroppableSelector);
        // Only handling test case drag styling here, suite drag styling handled in _draggableDrag method
        // You can handle styling more accurately in _draggableDrag method, here sometime styling didn't get updated properly
        // Handling of test case here because we need to get destination node where test is getting dropped
        if (node && node.suite) {
            if (this._areTestCasesDraggedOnQueryBasedSuite($dragElemDroppableStyle, node.suite)) {
                let $suiteDragLineindicator = $dragElem.find(Constants.DragSuiteLineSelector);
                $dragElemDroppableStyle.hide();
                $dragElemNotDroppableStyle.show();
                $suiteDragLineindicator.hide();
            }
            else {
                $dragElemDroppableStyle.show();
                $dragElemNotDroppableStyle.hide();
            }
        }

        this._removeDroppableHoverAndSelectedClass();
    }

    private _clearFocus() {
        $("ul.tree-children li.focus").removeClass("focus");
        this._removeDroppableHoverAndSelectedClass();
    }

    private _removeDroppableHoverAndSelectedClass() {
        $("ul.tree-children li.droppable-hover").removeClass("droppable-hover");
        $("ul.tree-children li.selected").removeClass("selected");
    }

    private _draggableHelper(draggableTreeNodeElement: any, event: JQueryEventObject) {
        let nodeDataClone: any = $.extend({}, $(draggableTreeNodeElement).data(TreeView.TreeView.NODE_DATA_NAME)),
            nodelevel = $(draggableTreeNodeElement).data(TreeView.TreeView.LEVEL_DATA_NAME),
            $li = $("<li />").addClass("tree-drag-tile drag-droppable");

        let node = this._getNode($(draggableTreeNodeElement));

        //Label as collapsed to ensure children are not rendered
        nodeDataClone.expanded = false;

        //Label as unselected to prevent conflicting style applications
        nodeDataClone.selected = false;

        //Disallow droppable to prevent self-referential drop of folder onto helper
        nodeDataClone.droppable = false;

        this._updateNode($li, nodeDataClone, nodelevel);

        let $dragSuiteIndicator = $("<div />")
            .addClass(Constants.DragSuiteLineClass)
            .css("width", this._element.width()); // setting width similar to suite tree view

        //Size our helper content to be consistent with the element the user is trying to drag.
        $li.css("width", draggableTreeNodeElement.clientWidth);
        let $dragTile = $("<div />")
            .addClass(Constants.DragSuiteTileClass)
            .append($("<div />")
                .addClass(Constants.DragNotDroppableClass)
                .addClass(Constants.DragSuiteNoFillIcon))
            .append($dragSuiteIndicator)
            .append($li);

        return $dragTile;
    }

    private _droppableAccept(droppableTreeNodeElement: any, $draggable: JQuery): boolean {

        let destTreeNode = $(droppableTreeNodeElement).data(TreeView.TreeView.NODE_DATA_NAME),
            sourceTreeNode = $draggable.data(TreeView.TreeView.NODE_DATA_NAME);

        if (sourceTreeNode && destTreeNode && destTreeNode.suite) {
            return true;
        }

        else if (this.testPointDroppableAcceptDelegate()) {
            return true;
        }
        return false;
    }

    private _droppableDrop(droppable: any, event: JQueryEventObject, ui: any) {
        let that = this,
            destNodeElement = $(droppable),
            destTreeNode = destNodeElement.data(TreeView.TreeView.NODE_DATA_NAME),
            sourceNodeElement = ui.draggable[0],
            sourceTreeNode = sourceNodeElement ? $(sourceNodeElement).data(TreeView.TreeView.NODE_DATA_NAME) : null;

        if (sourceTreeNode && sourceTreeNode.suite) {
            let dropTargetInfo = this._getDropTargetInfo(<Offset>ui.offset, sourceTreeNode);
            if (!dropTargetInfo) {
                return true;
            }

            // Using calculated destination node through ui offset as control not giving right destination node always as
            // its finding nearest destination node, we can't use same above if clause as this get calculated from dragStartInfo
            // which is not present for test case drag which is happening from different control
            destTreeNode = dropTargetInfo.destNode;

            if (destTreeNode && destTreeNode.suite &&
                sourceTreeNode.suite.id !== destTreeNode.suite.id &&
                destTreeNode.suite.type === TCMConstants.TestSuiteType.StaticTestSuite) {

                sourceTreeNode.text = Utils_String.format(Resources.DirtyText, sourceTreeNode.suite.title);
                this.updateNode(sourceTreeNode);
                this._moveTreeNode(sourceTreeNode, destTreeNode, dropTargetInfo.position);
                TelemetryService.publishEvents(TelemetryService.featureSuiteReorder, { "SourceSuiteType": sourceTreeNode.suite.type, "DestinationSuiteType": destTreeNode.suite.type });
            }
        }
        else {
            if (destTreeNode.suite.type !== TCMConstants.TestSuiteType.DynamicTestSuite) {
                this.moveTestSuiteEntryDelegate(destTreeNode.suite);
                TelemetryService.publishEvents(TelemetryService.featureTestCaseMove, {});
            }
        }

        return true;
    }

    private _moveTreeNode(sourceTreeNode: any, destTreeNode: any, position: number) {
        let fromSuite = sourceTreeNode.parent.suite,
            toSuite = destTreeNode.suite,
            suite = sourceTreeNode.suite;
        if (fromSuite && toSuite && suite) {
            this.moveTestSuiteEntryDelegate(toSuite,
                fromSuite,
                suite,
                position,
                ((node: any, suiteTree: TestSuitesTree) => {
                    //error callback, revert to old title
                    return function (e) {
                        if (node) {
                            node.text = suiteTree._getNodeText(node.suite);
                            suiteTree.updateNode(node);
                        }
                    };
                })(sourceTreeNode, this));
        }
    }

    public updateNodes(updatedSuitesData: any, updateTotalPointsData: any) {
        let suite;
        Utils_UI.walkTree.call(this.rootNode, (node) => {
            suite = node.suite;
            if (suite) {
                if (updatedSuitesData[suite.id]) {
                    suite.pointCount = updatedSuitesData[suite.id];
                }
                else {
                    suite.pointCount = 0;
                }
                if (updateTotalPointsData[suite.id]) {
                    suite.totalPointCount = updateTotalPointsData[suite.id];
                }
                else {
                    suite.totalPointCount = 0;
                }
                node.text = this._getNodeText(node.suite);
                node.title = this._getNodeTitle(node.suite);
                this.updateNode(node);
            }
        });
    }

    private _updateSuitesExpansionData() {
        this._suiteExpansionData = {};
        if (this.rootNode) {
            Utils_UI.walkTree.call(this.rootNode, (treeNode) => {
                if (treeNode.expanded && treeNode.suite) {
                    this._suiteExpansionData[treeNode.suite.id] = true;
                }
            });
        }
    }

    public updateSuitesRevisionAndPointCount(suites: TestsOM.ITestSuiteModel[]) {
        let i, length = suites.length;
        if (this.rootNode && length) {
            Utils_UI.walkTree.call(this.rootNode, (treeNode) => {
                for (i = 0; i < length; i++) {
                    if (treeNode.suite && treeNode.suite.id === suites[i].id) {
                        treeNode.suite.revision = suites[i].revision;
                        if (suites[i].pointCount) {
                            treeNode.suite.pointCount = suites[i].pointCount;
                            //Initialize total point count with point count as thery will be equal without filter applied
                            treeNode.suite.totalPointCount = suites[i].pointCount;
                            treeNode.text = this._getNodeText(treeNode.suite);
                            treeNode.title = this._getNodeTitle(treeNode.suite);
                            this.updateNode(treeNode);
                            break;
                        }
                    }
                }
            });
        }
    }

    private _getSuiteType(type: TCMConstants.TestSuiteType): string {
        let suiteTypes = TCMConstants.TestSuiteType;
        if (type === suiteTypes.StaticTestSuite) {
            return Resources.StaticSuiteTitle;
        }
        else if (type === suiteTypes.RequirementTestSuite) {
            return Resources.RequirementBasedSuiteTitle;
        }
        else if (type === suiteTypes.DynamicTestSuite) {
            return Resources.QueryBasedSuiteTitle;
        }
    }

    private _getIcon(suite: TestsOM.ITestSuiteModel): string {
        let suiteTypes = TCMConstants.TestSuiteType;
        if (suite.type === suiteTypes.RequirementTestSuite) {
            return "bowtie-icon bowtie-tfvc-change-list";
        }
        else if (suite.type === suiteTypes.DynamicTestSuite) {
            return "bowtie-icon bowtie-folder-query";
        }
        else {
            return "bowtie-icon bowtie-folder";
        }
    }

    private _getNodeTitle(suite: TestsOM.ITestSuiteModel): string {
        let suiteType = TMUtils.TestSuiteUtils.getSuiteTypeString(suite.type),
            suiteTitle = suite.title;
        let title = suiteTitle + Utils_String.newLine + (suiteType ? Utils_String.format(Resources.SuiteTypeFormatText, suiteType) : "");
        if (this._isFilterApplied && this._isFilterApplied()) {
            title = title + Utils_String.newLine + Utils_String.format(Resources.TestSuiteVisiblePointCountText, suite.pointCount ? suite.pointCount.toString() : "0") +
            Utils_String.newLine + Utils_String.format(Resources.TestSuitePointCountText, suite.totalPointCount ? suite.totalPointCount.toString() : "0");
        } else {
            title = title + Utils_String.newLine + Utils_String.format(Resources.TestSuitePointCountText, suite.totalPointCount ? suite.totalPointCount.toString() : "0");
        }
        return title;
    }

    private _getNodeText(suite: TestsOM.ITestSuiteModel): string {

        let suiteTitle = suite.title;
        if (this._isFilterApplied && this._isFilterApplied()) {
            if (suite.totalPointCount) {
                return Utils_String.format(Resources.SuiteTitleWithTotalPointCount, suiteTitle, suite.pointCount.toString(), suite.totalPointCount.toString());
            } else {
                return suiteTitle;
            }
        } else {
            if (suite.totalPointCount) {
                return Utils_String.format(Resources.SuiteTitleWithPointCount, suiteTitle, suite.totalPointCount.toString());
            } else {
                return suiteTitle;
            }
        }
    }

    private _addRootSuite(plan: any, suites: { [id: number]: TestsOM.ITestSuiteModel; }, rootNode: TreeView.TreeNode) {
        let node,
            suitesExpansionInfo = this._suiteExpansionData,
            suite: TestsOM.ITestSuiteModel;

        if (plan.rootSuiteId) {
            suite = suites[plan.rootSuiteId];
            if (suite) {
                suite.title = plan.name;
                node = this._createAndPrepareNode(suite, true);
                node.plan = plan;
                node.expanded = true;
                rootNode.add(node);

                $.each(suite.childSuiteIds, (i, childSuiteId) => {
                    this._addSuiteNode(childSuiteId, suites, node);
                });
            }
        }
    }

    private _createAndPrepareNode(suite: TestsOM.ITestSuiteModel, isRootSuite?: boolean): TreeView.TreeNode {
        let node: any;
        node = TreeView.TreeNode.create(this._getNodeText(suite));
        if (!isRootSuite) {
            node.draggable = true;
        }
        node.droppable = true;
        node.suite = suite;
        node.title = this._getNodeTitle(suite);
        node.getContributionContext = this._getSuiteContributionContextFunc.bind(this, node);
        if (!isRootSuite) {
            node.icon = this._getIcon(suite);
        }

        return node;
    }

    private _getSuiteContributionContextFunc(node: any) {
        let suite = node.suite;
        let plan = node.plan;
        while (!plan && node.parent) {
            node = node.parent;
            plan = node.plan;
        }
        return { suite: suite, plan: plan };
    }

    private _addSuiteNode(suiteId: number, suites: any, parentNode: TreeView.TreeNode) {

        let suite = suites[suiteId],
            node = null;
        if (suite) {
            node = this._createAndPrepareNode(suite);
            if (this._suiteExpansionData[suiteId]) {
                node.expanded = true;
            }
            parentNode.add(node);

            $.each(suite.childSuiteIds, (i, childSuiteId) => {
                this._addSuiteNode(childSuiteId, suites, node);
            });
        }
    }

    private _openAssignTesterToSuiteDialog(suite: TestsOM.ITestSuiteModel): void {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.AssignTestersToSuite"], (Module: typeof TestAssignTester_LAZY_LOAD) => {
            if (null === this._assignTesterToSuite) {
                this._assignTesterToSuite = new Module.AssignTestersToSuite();
            }
            this._assignTesterToSuite.AssignTesters(this._plan.id, suite, Utils_Core.delegate(this, this._assignTesterToSuiteDialogClosed), this.showErrorDelegate);

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: AssignTester
            TelemetryService.publishEvent(TelemetryService.featureAssignTester, TelemetryService.assignTester, 1);
        });
    }


    private _assignTesterToSuiteDialogClosed() {
        this._fire("selectedSuiteUpdated");
    }

    private _resetSuiteDragDroppable(): void {
        $(Constants.DragDroppableSelector, this._element).remove();
    }

    /**
     * Get drop target information
     * @param offset
     * @param dragStartInfo
     * @param sourceTreeNode
     */
    private _getDropTargetInfo(offset: Offset, sourceTreeNode: TreeView.TreeNode): DropTargetInfo {
        let dropTargetInfo: DropTargetInfo;
        let overlap: boolean = false;

        // This is to get the number of pixels that are hidden from view above the scrollable area
        let treeScrollTop = this._element.scrollTop();

        let adjustedOffset = <Offset>{
            top: offset.top + treeScrollTop - this._treeOffsetFromTop
        };

        if (adjustedOffset.top <= 0) {
            return null;
        }

        let nodeIndex = Math.floor(adjustedOffset.top / this._nodeHeight);
        let leftOver = adjustedOffset.top % this._nodeHeight;

        if (nodeIndex === this._dragStartInfo.nodeIndex) {
            return null;
        }

        // If leftover is smaller than 15 then it means that it is the case of move under the node rather ordering
        if (leftOver > 0 && leftOver < 15) {
            overlap = true;
        }

        let visibleTreeNodesWithOrder: TreeNodeWithOrder[] = this._getVisibleNodesInOrder();
        let adjacentTreeNodes = this._getAdjacentTreeNodeInfo(visibleTreeNodesWithOrder, nodeIndex);

        // Return null if both previous and next node are undefined
        if (!(adjacentTreeNodes.previousNode || adjacentTreeNodes.nextNode)) {
            return null;
        }

        if (overlap) {
            // Drop target info in case of node move, dragged node will appear at position 0
            dropTargetInfo = {
                position: 0,
                destNode: adjacentTreeNodes.previousNode,
                overlap: overlap
            };
        }
        else {
            dropTargetInfo = this._getTargetInfo(adjacentTreeNodes, sourceTreeNode, nodeIndex);
        }

        return dropTargetInfo;
    }

    /**
     * Get the drop target info when ordering of dragged node is been done
     * @param adjacentTreeNodes
     * @param sourceTreeNode
     * @param nodeIndex
     */
    private _getTargetInfo(adjacentTreeNodes: AdjacentTreeNodeInfo, sourceTreeNode: TreeView.TreeNode, nodeIndex: number): DropTargetInfo {
        let levelOfNextNode: number = 0, levelOfPreviousNode: number = 0;
        // Get the level of previous and next node
        if (adjacentTreeNodes.previousNode) {
            levelOfPreviousNode = adjacentTreeNodes.previousNode.level(false);
        }

        if (adjacentTreeNodes.nextNode) {
            levelOfNextNode = adjacentTreeNodes.nextNode.level(false);
        }

        let parentNodeForInsertion: TreeView.TreeNode, position: number;


        if (levelOfPreviousNode > levelOfNextNode) {
            parentNodeForInsertion = adjacentTreeNodes.previousNode.parent;
            position = adjacentTreeNodes.previousNode.order;

            // If node is dragged from outside the parent node then increment the position as we need to accomadate the new element
            if (sourceTreeNode.parent.id != parentNodeForInsertion.id) {
                position = position + 1;
            }
        }
        else if (levelOfPreviousNode < levelOfNextNode) {
            parentNodeForInsertion = adjacentTreeNodes.nextNode.parent;
            position = adjacentTreeNodes.nextNode.order;
        }
        else {
            parentNodeForInsertion = adjacentTreeNodes.nextNode.parent;
            position = adjacentTreeNodes.nextNode.order;

            // If node is dragged within the same tree and drag happening from the top then we need to decrement the position, 
            // as one item get deleted from top and all elements will move one position up, so effectively we can use the previous node position
            if (sourceTreeNode.parent.id == parentNodeForInsertion.id &&
                this._dragStartInfo.nodeIndex < nodeIndex) {
                position = adjacentTreeNodes.previousNode.order;
            }
        }

        return {
            position: position,
            destNode: parentNodeForInsertion,
            overlap: false
        };
    }

    /**
     * Get the previous and next tree node info wrt to the index where new node will get dropped
     * @param index index at which new node will get dropped
     */
    private _getAdjacentTreeNodeInfo(visibleTreeNodesWithOrder: TreeNodeWithOrder[], index: number): AdjacentTreeNodeInfo {
        let visibleTreeNodesLength: number = visibleTreeNodesWithOrder.length;
        let previousNode: TreeNodeWithOrder, nextNode: TreeNodeWithOrder;
        if (visibleTreeNodesLength >= index) {
            previousNode = visibleTreeNodesWithOrder[index];
            if (index < visibleTreeNodesLength) {
                nextNode = visibleTreeNodesWithOrder[index + 1];
            }
        }

        return {
            previousNode: previousNode,
            nextNode: nextNode
        };
    }

    /**
     * Get the visible tree nodes with order in tree view
     */
    private _getVisibleNodesInOrder(): TreeNodeWithOrder[] {
        let treeNodesWithOrder: TreeNodeWithOrder[] = [];
        if (this.rootNode) {
            let topTreeNodeWithOrder: TreeNodeWithOrder = <TreeNodeWithOrder>this.rootNode.children[0];
            topTreeNodeWithOrder.order = 0;
            treeNodesWithOrder.push(topTreeNodeWithOrder);
            this._populateExpandedTreeNodeWithOrder(topTreeNodeWithOrder, treeNodesWithOrder);
        }

        return treeNodesWithOrder;
    }

    /**
     * Populate the tree node with order by traversing node at each level which are visible and expanded,
     * here order of node means the position of the node within its parent node.
     * @param node top tree node with order
     * @param treeNodesWithOrder array of TreeNodeWithOrder
     */
    private _populateExpandedTreeNodeWithOrder(node: TreeNodeWithOrder, treeNodesWithOrder: TreeNodeWithOrder[]) {

        // If node is not expanded, no need to further traverse
        if (!node.expanded) {
            return;
        }

        let children = node.children;
        for (let i = 0, length = children.length; i < length; i++) {
            let child = <TreeNodeWithOrder>children[i];
            child.order = i;
            treeNodesWithOrder.push(child);
            this._populateExpandedTreeNodeWithOrder(child, treeNodesWithOrder);
        }
    }
}

VSS.initClassPrototype(TestSuitesTree, {
    _plan: 0,
    _suites: null,
    _selectedSuiteId: 0,
    _tfsContext: null,
    _initialSuiteId: 0,
    deleteTestSuiteDelegate: null,
    renameTestSuiteDelegate: null,
    moveTestSuiteEntryDelegate: null,
    runTestSuiteDelegate: null,
    createNewSuiteDelegate: null,
    openTestPlanDelegate: null,
    _supressNodeChangedEvent: false,
    $renameInputElem: null,
    _rootSuiteNode: null,
    _suiteExpansionData: null
});

VSS.classExtend(TestSuitesTree, TfsContext.ControlExtensions);

