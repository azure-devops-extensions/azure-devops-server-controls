import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TCMFilterHelper = require("TestManagement/Scripts/TFS.TestManagement.FilterHelper");
import TCMUtilHelper = require("TestManagement/Scripts/TFS.TestManagement.TestLiteView.Utils");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

import TestsOM_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import { RichContentTooltip } from "VSS/Controls/PopupContent";
import TreeView = require("VSS/Controls/TreeView");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export class NewSuiteCommandIds {
    public static newStaticSuite = "new-static-suite";
    public static newRequirementSuite = "new-requirement-suite";
    public static newQueryBasedSuite = "new-query-based-suite";
}

export class TestSuitesTree extends TreeView.TreeView {

    private static _editingNodeAnchorData = "nodeAnchor";
    private static _editingNodeContextMenuData = "nodeContextMenu";
    private static _editingSuiteIdData = "editSuiteId";
    private static _editingSuiteOldNameData = "oldName";
    public static enhancementTypeName: string = "tfs.testmanagement.TestSuitesTree";
    public static DropScope: string = "Suite";
    public $renameInputElem: JQuery;
    private _plan: any;
    private _selectedSuiteId: number;
    private _suites: any;
    private _treeOffsetFromTop: number;
    private _nodeHeight: number;
    private _dragStartInfo: TCMLite.DragStartInfo;
    private _lastDropTarget: TCMLite.DropTargetInfo;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _initialSuiteId: number;
    private _supressNodeChangedEvent: boolean;
    private _suiteExpansionData: any;
    private _rootSuiteNode: any;
    private _editInProgress: boolean = false;
    private _assignTesterToSuite: any;
    private _filterHelper: TCMFilterHelper.FilterHelper;

    public deleteTestSuiteDelegate: (suite: TCMLite.ITestSuiteModel) => void;
    public renameTestSuiteDelegate: (suite: TCMLite.ITestSuiteModel, title: string, errorCallback?: IErrorCallback) => void;
    public moveTestSuiteEntryDelegate: (toSuite: TCMLite.ITestSuiteModel, fromSuite?: TCMLite.ITestSuiteModel, suite?: TCMLite.ITestSuiteModel, position?: number, errorCallback?: IErrorCallback) => void;
    public testPointDroppableAcceptDelegate: () => boolean;
    public runTestSuiteDelegate: (suite: TCMLite.ITestSuiteModel) => void;
    public runTestSuiteWithDTRDelegate: (suite: TCMLite.ITestSuiteModel) => void;
    public launchExportHtmlDialogDelegate: (suite: TCMLite.ITestSuiteModel) => void;
    public createNewSuiteDelegate: (suite: TCMLite.ITestSuiteModel, command: NewSuiteCommandIds) => void;
    public openTestPlanInClientDelegate: () => void;
    public openTestPlanDelegate: () => void;
    public deleteTestPlanDelegate: () => void;
    public onTestPlanDeletion: () => void;
    public onTestSuiteDeletion: (parentSuiteId: number, suiteId: number) => void;
    public openTestSuiteDelegate: (suite: TCMLite.ITestSuiteModel) => void;
    public showErrorDelegate: (error: string) => void;
    public assignConfigurationsToSuiteDelegate: (suite: TCMLite.ITestSuiteModel) => void;

    /**
     * Create a new Test suite tree
     * @param options
     */
    constructor(options?) {
        super(options);
    }

    public GetDisplaySuites() {
        return this._suites;
    }

    public initializeOptions(options?: any) {

	    // TODO:BUG 937329: Need to remove this once framework team set this property by default.
        if (options) {
            options.useArrowKeysForNavigation = true;
        }

        /// <param name="options" type="any" />
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._enableDragDrop(options);
        }
        super.initializeOptions($.extend({
            cssClass: "testmanagement-suites-tree",
            showIcons: true
        }, options));
    }

    public static TestSuitesTreeCommands = {
        CMD_RENAME: "rename-suite",
        CMD_DELETE: "delete-suite",
        CMD_DELETE_PLAN: "delete-plan",
        CMD_RUN: "run-suite",
        CMD_RUN_WITH_OPTIONS: "run-with-options",
        CMD_RUN_WITH_DTR: "run-with-dtr",
        CMD_OPENINCLIENT: "open-in-client",
        CMD_NEWSUITE: "create-new-suite",
        CMD_OPENPLAN: "open-plan",
        CMD_OPENSUITE: "open-suite",
        CMD_EXPORT: "export-to-html",
        CMD_ASSIGN_TESTERS_TO_SUITE: "assign-testers-to-suite",
        CMD_ASSIGN_CONFIGURATIONS_TO_SUITE: "assign-configurations-to-suite",
        CMD_SET_TESTOUTCOME_SETTINGS: "set-test-outcome-settings",
        CMD_SET_TEST_PLAN_SETTINGS: "set-test-plan-settings"
    };

    public initialize() {
        /// <summary>Initailizes the control</summary>
        let $renameElementParent: JQuery;
        $renameElementParent = $(this._element).parents(".test-hub-lite-view");
        super.initialize();
        this._element.bind("selectionchanged", delegate(this, this._onSelectedSuiteChanged));
        this._bind("dblclick", delegate(this, this._beginEdit));
        this.$renameInputElem = $("<input type='text' class='testmanagement-suite-rename'/>").prependTo($renameElementParent);
        this.$renameInputElem.hide();

        //appending to the body to avoid intereference from drag and drop events
        this._selectedSuiteId = 0;
        this._treeOffsetFromTop = this._element.offset().top;
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


    public setData(data: any, suppressChangeEvent?: boolean) {
        /// <summary>Puts data to be shown in the TreeView</summary>
        /// <param name="data" type="Object">Contains the plan and the suites to be displayed in treeview</param>
        this._updateSuitesExpansionData();
        this.setSelectedNode(null, suppressChangeEvent);
        this._plan = data.plan;
        this._suites = data.suites;
        this._populate();
    }

    public getSelectedSuite(): any {
        /// <summary>Gets the currently selected suite node</summary>
        /// <returns type="Object" > the suite data object currently selected </returns>
        let node = <any>this.getSelectedNode();

        let suite = node && node.suite;
        if (suite) {
            suite = TCMUtilHelper.TestLiteViewUtils.mapSuitesToLegacyModel(suite);
        }
        return suite;
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
            super.setSelectedNode(node, suppressChangeEvent);
            this._supressNodeChangedEvent = false;
        }
    }

    public setSelectedSuite(suiteId: number, supressNodeChangeEvent: boolean): string {
        /// <summary>Sets the currently selected suite node</summary>
        /// <param name="suiteId" type="Number">Contains the id of the suite to be selected </param>
        /// <param name="supressNodeChangeEvent" type="Boolean">boolean indicating whether to fire suite change event</param>
        let currentSelection, node = null;

        if (!suiteId) {
            node = this._rootSuiteNode;
        }
        else {
            Utils_UI.walkTree.call(this.rootNode, function (treeNode) {
                if (treeNode.suite && treeNode.suite.id === suiteId) {
                    node = treeNode;
                }
            });
        }

        if (!node) {
            return;
        }
        this.setSelectedNode(node, supressNodeChangeEvent);
        this.focus();
        this._fire("selectedSuiteChanged", { suite: this.getSelectedSuite() });
        return node.text;
    }

    public createAndPrepareNode(suite: TCMLite.ITestSuiteModel, isRootSuite?: boolean): TreeView.TreeNode {
        let node: any;
        node = TreeView.TreeNode.create(this._getNodeText(suite));
        if (!isRootSuite) {
            node.draggable = true;
        }
        node.droppable = true;
        node.suite = suite;
        node.title = this._getNodeTitle(suite);
        node.text = this._getNodeText(node.suite);
        node.getContributionContext = this._getSuiteContributionContextFunc.bind(this, node);
        if (!isRootSuite) {
            node.icon = this._getIcon(suite);
        }

        return node;
    }

    public onShowPopupMenu(node, options?) {
        options = $.extend({}, options, { items: this._getContextMenuItems(node) });
        super.onShowPopupMenu(node, options);
    }

    private _getContextMenuItems(node: TreeView.TreeNode): any[] {
        let menuItems: any[] = [];
        if (!LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            menuItems.push({ rank: 5, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RUN, text: Resources.RunText, title: Resources.RunActiveTests, icon: "bowtie-icon bowtie-media-play-fill", showIcon: true, showText: true, groupId: "execute" });
            menuItems.push({ rank: 5, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RUN_WITH_OPTIONS, text: Resources.RunTestWithOptionsText, title: Resources.RunTestWithOptionsTooltip, icon: "bowtie-icon bowtie-media-play-fill", showIcon: true, showText: true, groupId: "execute" });
            return menuItems;
        }
        if (node) {
            if (LicenseAndFeatureFlagUtils.isDesktopTestRunnerOptionEnabled()) {
                menuItems = <any[]>[
                    { rank: 5, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RUN, text: Resources.RunTestForWebAppsText, title: Resources.RunActiveTests, icon: "bowtie-icon bowtie-media-play-fill", showIcon: true, showText: true, groupId: "execute" }
                ];
            }
            else {
                menuItems = <any[]>[
                    { rank: 5, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RUN, text: Resources.Run, title: Resources.RunActiveTests, icon: "bowtie-icon bowtie-media-play-fill", showIcon: true, showText: true, groupId: "execute" }
                ];
            }
            if (LicenseAndFeatureFlagUtils.isDesktopTestRunnerOptionEnabled()) {
                menuItems.push({ rank: 6, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RUN_WITH_DTR, text: Resources.RunTestWithDTRText, icon: "bowtie-icon bowtie-media-play-fill", showIcon: true, showText: true, groupId: "execute" });
            }
            menuItems.push({ rank: 5, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RUN_WITH_OPTIONS, text: Resources.RunTestWithOptionsText, icon: "bowtie-icon bowtie-media-play-fill", showIcon: true, showText: true, groupId: "execute" });
            
            menuItems.push({ rank: 7, separator: true });
            menuItems.push({ rank: 8, id: NewSuiteCommandIds.newStaticSuite, text: Resources.NewStaticSuiteTitle, showText: true, icon: "bowtie-icon bowtie-folder", showIcon: true });
            menuItems.push({ rank: 9, id: NewSuiteCommandIds.newRequirementSuite, text: Resources.NewRequirementSuite, showText: true, icon: "bowtie-icon bowtie-tfvc-change-list", showIcon: true });
            menuItems.push({ rank: 10, id: NewSuiteCommandIds.newQueryBasedSuite, text: Resources.NewQueryBasedSuiteTitle, showText: true, icon: "bowtie-icon bowtie-folder-query", showIcon: true });
            menuItems.push({ rank: 11, separator: true });

            if (node.parent.id > 0) {
                menuItems.push({ rank: 12, id: TestSuitesTree.TestSuitesTreeCommands.CMD_OPENSUITE, text: Resources.OpenTestSuite, icon: "bowtie-icon bowtie-arrow-open", showIcon: true, showText: true });
                menuItems.push({ rank: 13, id: TestSuitesTree.TestSuitesTreeCommands.CMD_RENAME, text: Resources.RenameText, title: Resources.RenameSuite, icon: "bowtie-icon bowtie-edit-rename", showIcon: true, showText: true });               
                menuItems.push({ rank: 14, id: TestSuitesTree.TestSuitesTreeCommands.CMD_DELETE, text: Resources.PermanentlyDeleteText, title: Resources.PermanentlyDeleteSuite, icon: "bowtie-icon bowtie-edit-delete", showIcon: true, showText: true });            
                menuItems.push({ rank: 15, separator: true });
            }
            else {
                if (!LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled()) {
                    menuItems.push({ rank: 12, id: TestSuitesTree.TestSuitesTreeCommands.CMD_OPENINCLIENT, text: Resources.OpenInClient, title: Resources.OpenInClientTooltip, icon: "bowtie-icon bowtie-brand-mtm bowtie-icon-large", showIcon: true, showText: true });
                    menuItems.push({ rank: 13, id: TestSuitesTree.TestSuitesTreeCommands.CMD_OPENPLAN, text: Resources.OpenTestPlan, icon: "bowtie-icon bowtie-arrow-open", showIcon: true, showText: true });
                    menuItems.push({ rank: 14, id: TestSuitesTree.TestSuitesTreeCommands.CMD_DELETE_PLAN, text: Resources.PermanentlyDeleteText, title: Resources.PermanentlyDeletePlan, icon: "bowtie-icon bowtie-edit-delete", showIcon: true, showText: true });
                    menuItems.push({ rank: 15, separator: true });
                }
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
                    id: TestSuitesTree.TestSuitesTreeCommands.CMD_SET_TEST_PLAN_SETTINGS,
                    text: Resources.TestPlanSettings,
                    icon: "bowtie-icon bowtie-settings-gear",
                    showIcon: true,
                    showText: true
                });
            }
            return menuItems;
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

    public onItemClick(node, nodeElement, e?: JQueryEventObject): boolean {
        if (e && e.target) {
            let $target: JQuery = $(e.target),
                parent = node.parent;

            if ($target.hasClass("node-remove")) {
                this._deleteNode(node);
            }
        }

        super.onItemClick(node, nodeElement, e);
        return false;
    }

    public _updateNode(li: JQuery, node: TreeView.TreeNode, level: number) {
        let divNodeContent = super._updateNode(li, node, level);
        if (divNodeContent && LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            let $removeNode = $("<span />").addClass("node-remove").attr("role", "button").attr("aria-hidden", "true").addClass("bowtie-icon bowtie-edit-delete");
            if (level > 0) {
                $removeNode.appendTo(divNodeContent);
                $removeNode.attr("aria-label", Resources.PermanentlyDeleteSuite);
                RichContentTooltip.add(Resources.PermanentlyDeleteSuite, $removeNode);
            }
            else {
                if (!LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled()) {
                    $removeNode.appendTo(divNodeContent);
                    $removeNode.attr("aria-label", Resources.PermanentlyDeletePlan);
                    RichContentTooltip.add(Resources.PermanentlyDeletePlan, $removeNode);
                }
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

    public clearTreeView() {
        this.rootNode.clear();
        this._draw();
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

    /**
     * When F2 is pressed then renameTestSuite event is triggered.
     */
    public _onInputKeyDown(e?: JQueryEventObject): any {
        if (e.keyCode === 113) {//F2
            this._beginEdit(e);
            return;
        } else if (e.keyCode === Utils_UI.KeyCode.DELETE){
            
            let li: JQuery = $(e.target).closest("li.node"), node;
            node = this._getNode(li);
            
            this._deleteNode(node);
        }
        super._onInputKeyDown(e);
    }

    private _deleteNode(node) {
         let parent = node.parent;
         if (parseInt(parent.id) === 0) { // root of the tree
                if ($.isFunction(this.deleteTestPlanDelegate)) {
                   this.deleteTestPlanDelegate();
                }
         }
         else {
                if ($.isFunction(this.deleteTestSuiteDelegate)) {
                    this.deleteTestSuiteDelegate(node.suite);
                }
         }
    }

    /**
     * Make the selected test suite name editable.
     */
    public _makeEditable(node) {
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
            if (node && node.parent.id > 0 && $inputElem.data(TCMLite.Constants.editingSuiteIdData) !== node.suite.id) {
                // do not allow rename if root suite
                $inputElem.val(node.suite.name);

                //store data that we would need later
                $inputElem.data(TCMLite.Constants.editingSuiteOldNameData, node.suite.name);
                $inputElem.data(TCMLite.Constants.editingNodeAnchorData, $nodeAnchor);
                $inputElem.data(TCMLite.Constants.editingNodeContextMenuData, $nodeContextMenu);
                $inputElem.data(TCMLite.Constants.editingSuiteIdData, node.suite.id);

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
                    this.setTextSelection($inputElem[0], 0, (node.suite.name.length));
                    this._editInProgress = false;
                });
            }
        }
        catch (e) {
            this._editInProgress = false;
        }
    }

    /**
     * Selects the text for a text box or textarea for a given start and end index
     */
    private setTextSelection(input: any, selectionStart: number, selectionEnd: number) {
    let range;

    if (input.setSelectionRange) {
        input.setSelectionRange(selectionStart, selectionEnd);
    }
    else if (input.createTextRange) {
        range = input.createTextRange();
        range.moveStart("character", selectionStart);
        range.moveEnd("character", selectionEnd);
        range.select();
    }
   }

   private removeAllSelections(input: JQuery){
       let selection = window.getSelection();
       if (selection){
           selection.removeAllRanges();
       }
   }

    private _beginEdit(e?: JQueryEventObject) {

        this._endEdit();

        let li: JQuery = $(e.target).closest("li.node"), node;
        node = this._getNode(li);
        if (node) {
            this._makeEditable(node);
        }
    }

    private _endEdit(e?: JQueryEventObject, cancelRename?: boolean) {
        let li: JQuery,
            node,
            $input = this.$renameInputElem,
            oldName: string = $input.data(TCMLite.Constants.editingSuiteOldNameData),
            suiteName: string = $input.val(),
            applyPreviewState = (node: any, title: string) => {
                if(node) {
                    node.suite.name = title;
                    node.text = this._getNodeText(node.suite);
                    node.name = this._getNodeTitle(node.suite);
                    this.updateNode(node);
                }
            },
            $nodeAnchor = $input.data(TCMLite.Constants.editingNodeAnchorData),
            $nodeContextMenu = $input.data(TCMLite.Constants.editingNodeContextMenuData);


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
            $input.data(TCMLite.Constants.editingSuiteIdData, 0);
            $input.data(TCMLite.Constants.editingNodeAnchorData, null);
            $input.data(TCMLite.Constants.editingNodeContextMenuData, null);

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
                                node.suite.name = oldName;
                                suiteTree.updateNode(node);
                            }
                        };
                    })(node, this));

                }
            }
            else if (e && e.type !== "blur") {
                this.removeAllSelections($input);
                Utils_UI.tryFocus($nodeAnchor, 10);
            }
        }
    }

    private _addRootSuite(plan: any, suites: { [id: number]: TCMLite.ITestSuiteModel; }, rootNode: TreeView.TreeNode) {
        let node,
            suitesExpansionInfo = this._suiteExpansionData,
            suite: TCMLite.ITestSuiteModel;
        if (plan.rootSuiteId) {
            suite = suites[plan.rootSuiteId];
            if (suite) {
                suite.name = plan.name;
                node = this.createAndPrepareNode(suite, true);
                node.plan = plan;
                node.expanded = true;
                rootNode.add(node);

                if (suite.children) {
                    $.each(suite.children, (i, child) => {
                        this._addSuiteNode(child, node, suites);
                    });
                }

                if (suite.childSuiteIds) {
                    $.each(suite.childSuiteIds, (i, childId) => {
                        let suite = suites[childId];
                        this._addSuiteNode(suite, node, suites);
                    });
                }
            }
        }
    }
    private _populate() {
        /// <summary>draws the treeview with the data</summary>
        this.rootNode.clear();
        this._addRootSuite(this._plan, this._suites, this.rootNode);
        this._draw();
    }

    private _getNodeHeight(): number {
        let nodes: TCMLite.TreeNodeWithOrder[] = this._getVisibleNodesInOrder();
        let nodeHeight: number;
        let nodeCount = nodes.length;
        if (nodeCount > 0) {
            let actualNodeContent = this._element.find(TCMLite.Constants.actualTreeNodeSelector);
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
        this._fire("selectedSuiteChanged", { suite: this.getSelectedSuite() });
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

    private _isSuiteDraggedOnNonStaticSuite($draggedElement: JQuery, suite: TCMLite.ITestSuiteModel): boolean {
        let isTestSuiteBeingDragged = $draggedElement.hasClass(TCMLite.Constants.DragTileClass);
        return isTestSuiteBeingDragged && suite.suiteType !== TCMConstants.TestSuiteType.StaticTestSuite.toString();
    }

    private _areTestCasesDraggedOnQueryBasedSuite($draggedElement: JQuery, suite: TCMLite.ITestSuiteModel): boolean {
        let areTestCasesBeingDragged = !$draggedElement.hasClass(TCMLite.Constants.DragTileClass);
        return areTestCasesBeingDragged && suite.suiteType === TCMConstants.TestSuiteType.DynamicTestSuite.toString();
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
            this._lastDropTarget = this._getDropTargetInfo(<TCMLite.Offset>ui.offset, sourceTreeNode);
            let $dragElem = ui.helper,
                $dragElemDroppableStyle = $dragElem.find(TCMLite.Constants.DragDroppableSelector),
                $dragElemNotDroppableStyle = $dragElem.find(TCMLite.Constants.DragNotDroppableSelector),
                $suiteDragLineindicator = $dragElem.find(TCMLite.Constants.DragSuiteLineSelector);

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
            $dragElemDroppableStyle = $dragElem.find(TCMLite.Constants.DragDroppableSelector),
            $dragElemNotDroppableStyle = $dragElem.find(TCMLite.Constants.DragNotDroppableSelector);
        // Only handling test case drag styling here, suite drag styling handled in _draggableDrag method
        // You can handle styling more accurately in _draggableDrag method, here sometime styling didn't get updated properly
        // Handling of test case here because we need to get destination node where test is getting dropped
        if (node && node.suite) {
            if (this._areTestCasesDraggedOnQueryBasedSuite($dragElemDroppableStyle, node.suite)) {
                let $suiteDragLineindicator = $dragElem.find(TCMLite.Constants.DragSuiteLineSelector);
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
        let node = $(draggableTreeNodeElement).data(TreeView.TreeView.NODE_DATA_NAME);
        if (!node && !node.suite && !node.suite.hasOwnProperty("pointCount")) {
            return;
        }
        let nodeDataClone: any = $.extend({}, $(draggableTreeNodeElement).data(TreeView.TreeView.NODE_DATA_NAME)),
            nodelevel = $(draggableTreeNodeElement).data(TreeView.TreeView.LEVEL_DATA_NAME),
            $li = $("<li />").addClass("tree-drag-tile drag-droppable");        

        //Label as collapsed to ensure children are not rendered
        nodeDataClone.expanded = false;

        //Label as unselected to prevent conflicting style applications
        nodeDataClone.selected = false;

        //Disallow droppable to prevent self-referential drop of folder onto helper
        nodeDataClone.droppable = false;

        this._updateNode($li, nodeDataClone, nodelevel);

        let $dragSuiteIndicator = $("<div />")
            .addClass(TCMLite.Constants.DragSuiteLineClass)
            .css("width", this._element.width()); // setting width similar to suite tree view

        //Size our helper content to be consistent with the element the user is trying to drag.
        $li.css("width", draggableTreeNodeElement.clientWidth);
        let $dragTile = $("<div />")
            .addClass(TCMLite.Constants.DragSuiteTileClass)
            .append($("<div />")
                .addClass(TCMLite.Constants.DragNotDroppableClass)
                .addClass(TCMLite.Constants.DragSuiteNoFillIcon))
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
            let dropTargetInfo = this._getDropTargetInfo(<TCMLite.Offset>ui.offset, sourceTreeNode);
            if (!dropTargetInfo) {
                return true;
            }

            // Using calculated destination node through ui offset as control not giving right destination node always as
            // its finding nearest destination node, we can't use same above if clause as this get calculated from dragStartInfo
            // which is not present for test case drag which is happening from different control
            destTreeNode = dropTargetInfo.destNode;

            if (destTreeNode && destTreeNode.suite &&
                sourceTreeNode.suite.id !== destTreeNode.suite.id &&
                destTreeNode.suite.suiteType === TCMConstants.TestSuiteType.StaticTestSuite.toString()) {

                sourceTreeNode.text = Utils_String.format(Resources.DirtyText, sourceTreeNode.suite.name);
                this.updateNode(sourceTreeNode);
                this._moveTreeNode(sourceTreeNode, destTreeNode, dropTargetInfo.position);
                TelemetryService.publishEvents(TelemetryService.featureSuiteReorder, { "SourceSuiteType": sourceTreeNode.suite.type, "DestinationSuiteType": destTreeNode.suite.type });
            }
        }
        else {
            if (destTreeNode.suite.suiteType !== TCMConstants.TestSuiteType.DynamicTestSuite.toString()) {
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
            }
        });

        this.updateNode(this.rootNode);
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

    public updateSuitesRevisionAndPointCount(suites: TCMLite.ITestSuiteModel[]) {
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

    private _getIcon(suite: TCMLite.ITestSuiteModel): string {
        let suiteTypes = TCMConstants.TestSuiteType;
        if (suite.suiteType === suiteTypes.RequirementTestSuite.toString()) {
            return "bowtie-icon bowtie-tfvc-change-list";
        }
        else if (suite.suiteType === suiteTypes.DynamicTestSuite.toString()) {
            return "bowtie-icon bowtie-folder-query";
        }
        else {
            return "bowtie-icon bowtie-folder";
        }
    }

    public getSuiteTypeString(type: string): string {
        let suiteTypes = TCMConstants.TestSuiteType;
        if (type === suiteTypes.StaticTestSuite.toString()) {
            return Resources.StaticSuiteTitle;
        }
        else if (type === suiteTypes.RequirementTestSuite.toString()) {
            return Resources.RequirementBasedSuiteTitle;
        }
        else if (type === suiteTypes.DynamicTestSuite.toString()) {
            return Resources.QueryBasedSuiteTitle;
        }
    }

    /**
     * Get the title of the node.
     */
    public _getNodeTitle(suite: TCMLite.ITestSuiteModel): string {
        let suiteType = this.getSuiteTypeString(suite.suiteType),
            suiteTitle = suite.name;
        let title = suiteTitle + Utils_String.newLine + (suiteType ? Utils_String.format(Resources.SuiteTypeFormatText, suiteType) : "");

        if (LicenseAndFeatureFlagUtils.isPointCountFeatureDisabled()){
            return title;
        }
        if (this.isFilterApplied()) {
            title = title + Utils_String.newLine + Utils_String.format(Resources.TestSuiteVisiblePointCountText, suite.pointCount ? suite.pointCount.toString() : "0") +
            Utils_String.newLine + Utils_String.format(Resources.TestSuitePointCountText, suite.totalPointCount ? suite.totalPointCount.toString() : "0");
        } else {
            title = title + Utils_String.newLine + Utils_String.format(Resources.TestSuitePointCountText, suite.totalPointCount ? suite.totalPointCount.toString() : "0");
        }
        return title;
    }

    /**
     * Get the text of the node.
     */
    public _getNodeText(suite: TCMLite.ITestSuiteModel): string {

        let suiteTitle = suite.name;
        if (LicenseAndFeatureFlagUtils.isPointCountFeatureDisabled()){
           return suiteTitle;
        }
        
        if (this.isFilterApplied()) {
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

    private isFilterApplied() {
        if (!this._filterHelper) {
            this._filterHelper = TCMFilterHelper.FilterHelper.getInstance();
        }
        return this._filterHelper && this._filterHelper.isFilterApplied();
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

    private _addSuiteNode(suite: any, parentNode: TreeView.TreeNode, suites: { [id: number]: TCMLite.ITestSuiteModel; }) {

        let node = null;
        if (suite) {
            node = this.createAndPrepareNode(suite);
            if (this._suiteExpansionData[suite.id]) {
                node.expanded = true;
            }
            parentNode.add(node);

            if (suite.children) {
                $.each(suite.children, (i, child) => {
                    this._addSuiteNode(child, node, suites);
                });
            }

            if (suite.childSuiteIds) {
                $.each(suite.childSuiteIds, (i, childId) => {
                    let suite = suites[childId];
                    this._addSuiteNode(suite, node, suites);
                });
            }
        }
    }

    private _resetSuiteDragDroppable(): void {
        $(TCMLite.Constants.DragDroppableSelector, this._element).remove();
    }

    /**
     * Get drop target information
     * @param offset
     * @param dragStartInfo
     * @param sourceTreeNode
     */
    private _getDropTargetInfo(offset: TCMLite.Offset, sourceTreeNode: TreeView.TreeNode): TCMLite.DropTargetInfo {
        let dropTargetInfo: TCMLite.DropTargetInfo;
        let overlap: boolean = false;

        // This is to get the number of pixels that are hidden from view above the scrollable area
        let treeScrollTop = this._element.scrollTop();

        let adjustedOffset = <TCMLite.Offset>{
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

        let visibleTreeNodesWithOrder: TCMLite.TreeNodeWithOrder[] = this._getVisibleNodesInOrder();
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
    private _getTargetInfo(adjacentTreeNodes: TCMLite.AdjacentTreeNodeInfo, sourceTreeNode: TreeView.TreeNode, nodeIndex: number): TCMLite.DropTargetInfo {
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
    private _getAdjacentTreeNodeInfo(visibleTreeNodesWithOrder: TCMLite.TreeNodeWithOrder[], index: number): TCMLite.AdjacentTreeNodeInfo {
        let visibleTreeNodesLength: number = visibleTreeNodesWithOrder.length;
        let previousNode: TCMLite.TreeNodeWithOrder, nextNode: TCMLite.TreeNodeWithOrder;
        if (visibleTreeNodesLength >= index) {
            if (index > 0) {
                previousNode = visibleTreeNodesWithOrder[index - 1];
            }
            if (index < visibleTreeNodesLength) {
                nextNode = visibleTreeNodesWithOrder[index];
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
    private _getVisibleNodesInOrder(): TCMLite.TreeNodeWithOrder[] {
        let treeNodesWithOrder: TCMLite.TreeNodeWithOrder[] = [];
        if (this.rootNode) {
            let topTreeNodeWithOrder: TCMLite.TreeNodeWithOrder = <TCMLite.TreeNodeWithOrder>this.rootNode.children[0];
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
    private _populateExpandedTreeNodeWithOrder(node: TCMLite.TreeNodeWithOrder, treeNodesWithOrder: TCMLite.TreeNodeWithOrder[]) {

        // If node is not expanded, no need to further traverse
        if (!node.expanded) {
            return;
        }

        let children = node.children;
        for (let i = 0, length = children.length; i < length; i++) {
            let child = <TCMLite.TreeNodeWithOrder>children[i];
            child.order = i;
            treeNodesWithOrder.push(child);
            this._populateExpandedTreeNodeWithOrder(child, treeNodesWithOrder);
        }
    }
}