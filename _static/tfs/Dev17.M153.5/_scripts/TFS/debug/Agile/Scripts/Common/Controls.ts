/// <reference types="jquery" />

import Q = require("q");

import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import CheckboxList = require("VSS/Controls/CheckboxList");
import Combos = require("VSS/Controls/Combos");
import Dialogs = require("VSS/Controls/Dialogs");
import Notifications = require("VSS/Controls/Notifications");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Validation = require("VSS/Controls/Validation");
import Diag = require("VSS/Diag");
import Menus = require("VSS/Controls/Menus");
import TreeView = require("VSS/Controls/TreeView");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Url = require("VSS/Utils/Url");
import VSS = require("VSS/VSS");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";

import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");
import Tfs_Work_Contracts = require("TFS/Work/Contracts");

import ProductBacklogMRU = require("Agile/Scripts/Backlog/ProductBacklogMru");
import Agile = require("Agile/Scripts/Common/Agile");
import { IterationDateUtil } from "Agile/Scripts/Common/IterationDateUtil";
import AgileUtils = require("Agile/Scripts/Common/Utils");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import ProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import { AgileRouteParameters } from "Agile/Scripts/Generated/HubConstants";

import { BacklogConfigurationService, IBacklogLevelConfiguration, BacklogFieldTypes } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_EngagementRegistrations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Engagement.Registrations");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import Configuration = require("Presentation/Scripts/TFS/TFS.Configurations");
import ConfigurationsConstants = require("Presentation/Scripts/TFS/TFS.Configurations.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import EngagementRegistrations_NO_REQUIRE = require("WorkItemTracking/Scripts/Engagement/Registrations");
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkShortcutGroup = require("WorkItemTracking/Scripts/WorkShortcutGroup");
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";

import { getDefaultWebContext, getPageContext } from "VSS/Context";
import { TeamContext } from "TFS/Core/Contracts";
import { WebContext } from "VSS/Common/Contracts/Platform";
import * as Tfs_Work_WebApi from "TFS/Work/RestClient";
import { IViewOptions } from "VSSUI/Utilities/ViewOptions";
import { BacklogsUrls, BoardsUrls, SprintsUrls } from "../Common/HubUrlUtilities";

import * as LWP from "VSS/LWP";

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

// Wrap an interface around a backlog node being used in rendering the left backlog filter control
export interface IBacklogNode {
    name: string;

    /** Url to navigate to */
    url: string;

    /** Optional handler to invoke upon navigation */
    onNavigate?: Function;
    isHubContext: boolean;
    isSelected: boolean;
    isRequirement: boolean;
    color?: string;
}

export class AgileShortcutGroup extends WorkShortcutGroup.WorkShortcutGroup {
    /**
     * Called when the user presses the "Navigate to Backlog" hotkey
     *
     * OVERRIDE: Navigates to the backlog of the current backlog level
     *
     */
    protected _navigateToBacklog() {
        var backlogContext: Agile.BacklogContext = Agile.BacklogContext.getInstance();
        var context = {
            level: backlogContext.level.name,
            showParents: ProductBacklogMRU.ShowParents.getMRUState()
        };

        this.navigateToUrl(Agile.LinkHelpers.getAsyncBacklogLink(BacklogViewControlModel.backlogPageAction, context));
    }

    /**
     * Called when the user presses the "Navigate to Board" hotkey
     *
     * OVERRIDE: Navigates to the board of the current backlog level
     *
     */
    protected _navigateToBoard() {
        this.navigateToUrl(Agile.LinkHelpers.generateBacklogLink(BacklogViewControlModel.boardPageAction));
    }
}

export class AgileHubShortcutGroup extends WorkShortcutGroup.WorkShortcutGroup {
    private _viewOptions: IViewOptions;

    constructor(viewOptions: IViewOptions) {
        super();
        this._viewOptions = viewOptions;

        //  TODO Remove this once all new Agile hubs have been implemented.
        //  Tracking work using User Story 1038091: Work hub keyboard shortcuts cleanup.
        this._unregisterShortcutsNotSupportedinXHR();
    }

    /**
     * Called when the user presses the backlog hotkey.  Navigates to the backlog hub MRU.     
     */
    protected _navigateToBacklog() {
        BacklogsUrls.navigateToBacklogsHubUrl(
            BacklogsUrls.getExternalBacklogContentUrl(this._viewOptions.getViewOption(AgileRouteParameters.TeamName))
        );
    }

    /**
     * Called when the user presses the board hotkey. Navigate to the boards hub MRU. 
     */
    protected _navigateToBoard() {
        BoardsUrls.navigateToBoardsHubUrl(
            BoardsUrls.getBoardsContentUrl(this._viewOptions.getViewOption(AgileRouteParameters.TeamName))
        );

    }

    /**
     * Called when user presses the sprints hotkey. Navigates to the sprints hub MRU. 
     */
    protected _navigateToIteration() {
        SprintsUrls.navigateToSprintsHubUrl(
            SprintsUrls.getExternalSprintContentUrl(this._viewOptions.getViewOption(AgileRouteParameters.TeamName))
        );
    }

    /**
     * Called when user presses "Toggle fullscreen" hotkey. 
     */
    protected _toggleFullScreen() {
        const isFullScreen = this._viewOptions.getViewOption(HubViewOptionKeys.fullScreen);
        this._viewOptions.setViewOption(HubViewOptionKeys.fullScreen, !isFullScreen);
    }

    /**
     *  Removes Agile keyboard shortcuts not valid in XHR hubs. 
     */
    private _unregisterShortcutsNotSupportedinXHR(): void {
        const unsupportedShortcuts: string[] = [
            WorkShortcutGroup.KeyboardShortcuts.OpenTaskboard
        ];

        unsupportedShortcuts.map((key) => this.unRegisterShortcut(key));
    }
}

export class SprintViewControl extends TreeView.TreeView {
    private _sentCollapseFutureSprintCI = false;    // Use this to only send once the collapse future sprints node CI event
    /**
     * Creates new Sprint View Control
     */
    constructor(options?) {
        super(options);
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        var that = this;

        options.droppable = $.extend({
            accept: function ($draggable) { return that._acceptDroppableHandler(this, $draggable); },
        }, options.droppable);

        super.initializeOptions($.extend({
            useBowtieStyle: true,
            clickToggles: true,
            useArrowKeysForNavigation: true,
            onItemToggle: this.onClickTreeNodeCollectCI
        }, options));

    }

    /**
     * Checks whether the given work item types can be dropped into the drop target or not.
     *
     * @param $dropTarget It is the JQuery element corresponding to the drop target.
     * @param workItemTypes It is an array of work item types, of those work items which are dragged.
     * @param areAllItemsOwned Indicates whether all the dragged work items are owned or not.
     * @return True if all workitem types passed can be dropped into the drop target. False otherwise.
     */
    public isValidDropTargetForWorkItemTypes($dropTarget: JQuery, workItemTypes: string[], areAllItemsOwned: boolean): boolean {
        // Get name of target backlog node we are dropping under
        let targetNode = this.getNodeFromElement($dropTarget);

        if (!targetNode) {
            return false;
        }

        let moveToIterationHelper = new AgileUtils.MoveToIterationHelper();

        if (targetNode instanceof SprintTreeNode) {
            return moveToIterationHelper.canMoveToIteration(workItemTypes, areAllItemsOwned);
        }

        if (targetNode instanceof BacklogTreeNode) {
            var backlogNodeInfo = (<BacklogTreeNode>targetNode).backlogNodeInfo;
            return moveToIterationHelper.canMoveToBacklog(workItemTypes, areAllItemsOwned, backlogNodeInfo.name);
        }

        return false;
    }

    /** Default implementation of accept handler for a tile being dropped on the control */
    private _acceptDroppableHandler(droppableTreeNodeElement: any, $draggable: JQuery) {

        var workItemId: number = $draggable.data(Agile.DataKeys.DataKeyId);
        var workItemType: string = $draggable.data(Agile.DataKeys.DataKeyType);

        if (workItemId <= 0) {
            return false;
        }

        return this.isValidDropTargetForWorkItemTypes($(droppableTreeNodeElement), [workItemType], true);
    }

    /**
     * OVERRIDE: Initialize the control
     */
    public initialize() {
        var tfsContext = (<any>this._options).tfsContext; // From extending TfsContext.ControlExtensions.
        var data = Utils_Core.parseMSJSON($(".sprint-data", this._element).html(), false);
        var teamAwareness = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService(TFS_TeamAwarenessService.TeamAwarenessService);

        // Populate the tree with the iterations.
        this.populate(teamAwareness.getTeamSettings(tfsContext.currentTeam.identity.id), data.selectedIteration, data.actionName);

        super.initialize();

        // push this until after initialization is complete or it costs ~45ms
        Utils_Core.delay(this, 0, () => {
            this._fixHeight();
        });
        this._bind(window, "resize", delegate(this, this._fixHeight));
        Events_Services.getService().attachEvent(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, () => {
            this._fixHeight();
        });

        //Listen to ContributedTabSelected event and update the links of the node so user switches the same tab when they change the iteration
        Events_Services.getService().attachEvent(ContributableTabConstants.EVENT_AGILE_CONTRIBUTED_TAB_SELECTED, (eventArgs: IContributedTabDisplayedEventArgs) => {
            var extService = Service.getService(Contributions_Services.ExtensionService);
            extService.getContribution(eventArgs.contributionId).then((contribution: IExtensionContribution) => {
                //Add the contribution to node only when it targets iteration pages
                if (contribution.targets.some(target => target === "ms.vss-work-web.iteration-backlog-tabs")) {
                    this._updateLinkToIncludeContribution(tfsContext, this.rootNode, eventArgs);
                    this._draw();
                }
            });
        });

        new AgileShortcutGroup();
    }

    /**
     * Updates the node link recursively to open contributions view
     * @param tfsContext The tefs context
     * @param node Node to be updated
     * @param eventArgs Event args
     */
    private _updateLinkToIncludeContribution(tfsContext: TFS_Host_TfsContext.TfsContext, node: TreeView.TreeNode, eventArgs: IContributedTabDisplayedEventArgs): void {

        if (!node.hasChildren() && !node.isEmptyFolderChildNode && !node.root) {
            var link = tfsContext.getActionUrl("iterationcontributions", "backlogs", { parameters: node["iterationPath"] });
            link = Utils_Url.replaceUrlParam(link, "contributionId", eventArgs.contributionId);
            link = Utils_Url.replaceUrlParam(link, "_a", "contribution");
            node.link = Utils_Url.replaceUrlParam(link, "spv", "" + eventArgs.selectedPivot);
        }

        if (node.hasChildren()) {
            for (var i = 0, l = node.children.length; i < l; ++i) {
                this._updateLinkToIncludeContribution(tfsContext, node.children[i], eventArgs);
            }
        }
    }

    /**
     * Reconfigure the control with data from services that were updated prior to this call.
     */
    public reconfigure() {
        this._draw();
    }

    /**
     * Populates the control with the list of iterations
     *
     * @param teamSettings The team settings.
     * @param selectedIteration The (WIT) iteration path for the iteration that should be selected
     * @param actionName The action name to use when generating the node links
     */
    public populate(teamSettings: TFS_AgileCommon.ITeamSettings, selectedIteration: string, actionName: string): void {

        Diag.Debug.assertParamIsObject(teamSettings, "teamSettings");
        Diag.Debug.assertParamIsStringNotEmpty(selectedIteration, "selectedIteration");
        Diag.Debug.assertParamIsString(actionName, "actionName");

        var that = this;
        var backlogIterationPath: string = teamSettings.backlogIteration.friendlyPath;
        var currentIterations: TFS_AgileCommon.IIterationData[] = [];

        function createIterationNode(iteration: TFS_AgileCommon.IIterationData): SprintTreeNode {
            var title = Utils_String.format(AgileControlsResources.IterationPathTooltip, iteration.friendlyPath);

            if (iteration.startDate && iteration.finishDate) {
                const utcStartDate = Utils_Date.shiftToUTC(new Date(iteration.startDate));
                const utcEndDate = Utils_Date.shiftToUTC(new Date(iteration.finishDate));
                const iterationDateRange = IterationDateUtil.getSprintDatesDisplay(utcStartDate, utcEndDate);

                title = title + Utils_String.newLine + iterationDateRange;
            }

            var nodes = iteration.friendlyPath.split("\\");
            var name = nodes[nodes.length - 1];

            var treeNode = new SprintTreeNode(name);
            treeNode.droppable = true;
            treeNode.iterationPath = iteration.friendlyPath;
            treeNode.link = Agile.LinkHelpers.generateIterationLink(actionName, iteration.friendlyPath, backlogIterationPath);
            treeNode.title = title;

            if (selectedIteration === iteration.friendlyPath) {
                treeNode.selected = true;
                that._selectedNode = treeNode;
                that._expandNodeParents(treeNode);
                that._updateSelections();
            }

            return treeNode;
        }

        function addSection(name: string, iterations: TFS_AgileCommon.IIterationData[], expanded: boolean): void {
            var i, l,
                node,
                treeNode = TreeView.TreeNode.create(name);

            // Don't add the section if there are no children.
            if (iterations.length === 0) {
                return;
            }

            // add nodes for each child iteration
            for (i = 0, l = iterations.length; i < l; i += 1) {
                node = createIterationNode(iterations[i]);
                treeNode.add(node);

                // expand the parent if any child nodes are selected
                expanded = expanded || node.selected;
            }

            // setup section treeNode
            treeNode.expanded = expanded;
            treeNode.config.unselectable = true;

            (<any>treeNode).folder = true;

            that.rootNode.add(treeNode);
        }

        this.rootNode.clear();

        // add nodes for the past, current, future sections

        // If there is a current iteration, add it to the current iterations array.
        if (teamSettings.currentIteration) {
            currentIterations.push(teamSettings.currentIteration);
        }

        addSection(ProductBacklogResources.SprintHeader_Past, teamSettings.previousIterations || [], false);
        addSection(ProductBacklogResources.SprintHeader_Current, currentIterations, true);
        addSection(ProductBacklogResources.SprintHeader_Future, teamSettings.futureIterations || [], true);
    }

    /**
     * OVERRIDE: Overriding click handler to suppress default behavior for section headers.
     * In this case we're suppressing the browsers from following the node's link ("#") on click.
     */
    public onItemClick(treeNode, nodeElement, e?) {
        this.onClickTreeNodeCollectCI(treeNode);

        const result = super.onItemClick(treeNode, nodeElement, e);

        if (treeNode && treeNode.folder) {
            e.preventDefault();
        }

        return result;
    }

    /**
     *     OVERRIDE: Preventing any click events from causing selection since postback will cause the
     *     node for the sprint we want to be selected. This is done to allow appropriate interaction
     *     with the runningDocumentsTable. If the page is dirty after we select a node and we choose
     *     to cancel navigation we do not want to select this node.
     *
     * @param suppressChangeEvent
     */
    public setSelectedNode(node, suppressChangeEvent?: boolean) {
    }

    /**
     * Ensure the control takes up the available vertical space on the screen
     */
    private _fixHeight() {
        var $element = this.getElement(),
            siblingsHeight = 0,
            totalHeight = $element.parent().height();

        $element.siblings(":visible").each(function () {
            siblingsHeight += $(this).outerHeight(true);
        });

        $element.height(totalHeight - siblingsHeight);
    }

    private onClickTreeNodeCollectCI(treeNode: TreeView.TreeNode): void {
        if (!treeNode) return;
        if (treeNode.folder) {
            // Record when users collapse the "Future" list of sprints
            if (treeNode.text === ProductBacklogResources.SprintHeader_Future &&
                treeNode.expanded === true &&
                !this._sentCollapseFutureSprintCI) {
                this._sentCollapseFutureSprintCI = true;
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATION_COLLAPSE_FUTURE_LIST, {}));
            }
        }
        else if (treeNode.parent && treeNode.parent.children && treeNode.parent.children.length > 0) {
            //Clicking on last item in the 'Past' node (previous sprint) ?
            if (treeNode.parent.text === ProductBacklogResources.SprintHeader_Past &&
                treeNode.parent.children[treeNode.parent.children.length - 1] === treeNode) {
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATION_CLICK_PREVIOUS_ITERATION, {}));
            }

            //Clicking on the first item in the 'Future' node (next sprint) ?
            if (treeNode.parent.text === ProductBacklogResources.SprintHeader_Future &&
                treeNode.parent.children[0] === treeNode) {
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATION_CLICK_NEXT_ITERATION, {}));
            }
        }

    }
}

VSS.classExtend(SprintViewControl, TFS_Host_TfsContext.TfsContext.ControlExtensions);

class AddNewItemShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(addNewItemControl: AddNewItemControl, groupName: string, callback?: Function) {
        super(groupName);

        this.registerShortcut(
            "n",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_AddNewItem,
                action: () => {
                    addNewItemControl.expandPopupAndSelectDefaultMenuItem();
                    if ($.isFunction(callback)) {
                        callback(); //Callback function respective to each board
                    }

                }
            });
    }
}

export interface IAddNewItemControlOptions {
    addNewItem: Function;
    itemTypes: string[];
    itemTypesFilterCallback?: (itemTypes: string[]) => IPromise<string[]>;
    debounceTime: number;
    iconRenderer: (itemType: string) => JQuery;
    displayText?: string;
    cssClass?: string;
    addIconCssClass?: string;
    popupMenuAlign?: string;
    coreCssClass?: string;
    disableAddNewHandler?: () => boolean;
    enableKeyboardShortcut?: boolean;
    groupName: string;
    callback?: () => void;
}

export class AddNewItemControl extends Controls.Control<IAddNewItemControlOptions> {
    public static coreCssClass = "add-new-item";
    public static iconCssClass = "add-item-icon";
    public static iconElementCssClass = "add-item-icon-element";
    private static tagName = "div";
    protected static displayTextCssClass = "text";
    protected _addIconCssClass: string;
    private _displayText: string;
    protected _itemTypes: string[];
    private _firstItemType: string;
    private _addNewItem: Function;
    protected _onHide: Function;
    private _addNewItemTimeout: number;
    private _debounceTime: number;
    private _iconRenderer: (itemType: string, ariaAttributes?: Controls.AriaAttributes) => JQuery;
    private _disableAddNewHandler: () => boolean;
    private _enableKeyboardShortcut: boolean;
    private _groupName: string;
    private _callback: () => void;
    private _addNewItemShortcutGroup: AddNewItemShortcutGroup;
    private _menuItem: Menus.PopupMenu;

    constructor(options?: IAddNewItemControlOptions) {
        Diag.Debug.assertIsFunction(options.addNewItem, "addNewItem should be a function");
        Diag.Debug.assertIsArray(options.itemTypes, "itemTypes should be non-empty array", true);

        super(options);
        this._itemTypes = options.itemTypes;
        this._addNewItem = options.addNewItem;
        this._debounceTime = options.debounceTime;
        this._displayText = options.displayText;
        this._iconRenderer = options.iconRenderer;
        this._addIconCssClass = options.addIconCssClass || "bowtie-icon bowtie-math-plus-box-light";
        this._options.popupMenuAlign = this._options.popupMenuAlign || "left-bottom";
        this._disableAddNewHandler = options.disableAddNewHandler;
        this._enableKeyboardShortcut = options.enableKeyboardShortcut;
        this._groupName = options.groupName;
        this._callback = options.callback;
        this._firstItemType = (options.itemTypes.length > 0) ? options.itemTypes[0] : null;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: AddNewItemControl.coreCssClass,
            tagName: AddNewItemControl.tagName
        }, options));
    }

    public initialize() {
        var $element = this.getElement();

        $element.attr({
            tabindex: 0,
            role: "button"
        });

        // add the icon
        $element.append($(domElem("div", this._addIconCssClass)));

        // add span for text
        $element.append($(domElem("span", AddNewItemControl.displayTextCssClass)).text(this._displayText));

        // filter item types
        if ($.isFunction(this._options.itemTypesFilterCallback)) {
            this._options.itemTypesFilterCallback(this._itemTypes).then(visibleItemTypes => {
                this._itemTypes = visibleItemTypes;
                this._createTooltipAndMenuItems($element, visibleItemTypes);
            });
        }
        else {
            this._createTooltipAndMenuItems($element, this._itemTypes);
        }

        if (this._enableKeyboardShortcut === true) {
            this._addNewItemShortcutGroup = new AddNewItemShortcutGroup(this, this._groupName, this._callback);
        }
    }

    public expandPopupAndSelectDefaultMenuItem() {
        // Trigger click to show menu
        this.getElement().click();
        this._focusDefaultMenuItem();
    }

    private _focusDefaultMenuItem(): void {
        // Select base menu item so keyboard browses popup items
        // We need focus here to avoid the popup menu jumping during keyboard nav
        // The jump is due to using $(document.body) for popup creation 
        if (this._menuItem) {

            //  We want the first type to be selected when the menu pops up, if available.
            //  If not, default to the first menu item available.
            let typeSelector: string = ".menu-item";

            if (this._firstItemType) {
                typeSelector += ` li[id*='${this._firstItemType}']`;
            }

            this._menuItem.getElement()
                .find(typeSelector)
                .focus();
        }
    }

    private _createTooltipAndMenuItems($element: JQuery, itemTypes: string[]) {

        if (itemTypes.length > 1) {
            $element.attr("aria-haspopup", "true");
        }

        // add click handler
        $element.bind("click.TFS.Agile", (event: JQueryMouseEventObject) => {
            this._clickHandler(event);
        }).bind("keydown.TFS.Agile", (e: JQueryKeyEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
                // TODO: See if we need to use Core.Delay here
                $(e.currentTarget).click();
                this._focusDefaultMenuItem();
                return false;
            }
        });
    }

    public dispose() {
        if (this._addNewItemShortcutGroup) {
            this._addNewItemShortcutGroup.removeShortcutGroup();
        }

        if (this._menuItem) {
            this._menuItem.dispose();
        }
        super.dispose();
    }

    protected _clickHandler(event: JQueryMouseEventObject) {
        var itemTypes = this._itemTypes;
        if ($.isFunction(this._disableAddNewHandler) && this._disableAddNewHandler()) {
            return;
        }
        if (itemTypes.length > 1) {
            if (!this._menuItem) {
                this._menuItem = this._createPopupMenu(itemTypes);
            }

            this._menuItem.popup($(event.currentTarget), $(event.currentTarget));
        }
        else {
            this._debounceAddNewItem(itemTypes[0]);
        }
    }

    private _debounceAddNewItem(itemType: string) {

        if (!this._addNewItemTimeout) {

            // if debounce time is specified, execute addNewItem
            // and ignore subsequent clicks for the duration specified
            if (this._debounceTime) {
                this._addNewItemTimeout = setTimeout(
                    () => {
                        clearTimeout(this._addNewItemTimeout);
                        this._addNewItemTimeout = null;
                    },
                    this._debounceTime);
            }

            this._addNewItem(itemType);
        }
    }

    private _createMenuItems(itemTypes: string[], onClick: (commandArgs: any) => void): any[] {
        return $.map(itemTypes, (itemType) => {
            var menuItem = {
                id: "add-" + itemType,
                text: itemType,
                "arguments": { itemType: itemType },
                action: onClick
            };

            if (this._iconRenderer && $.isFunction(this._iconRenderer)) {
                $.extend(menuItem,
                    {
                        icon: ($iconElement: JQuery) => {
                            var $icon = this._iconRenderer(itemType, {
                                labelledby: menuItem.id
                            });

                            // To position the icon in 16px x 16px space(reserved by MenuItem)
                            if ($icon) {
                                $icon.addClass(AddNewItemControl.iconCssClass);
                            }
                            // To customize margin between icon and text
                            if ($iconElement) {
                                $iconElement.addClass(AddNewItemControl.iconElementCssClass);
                            }

                            return $icon;
                        }
                    });
            }

            return menuItem;
        });
    }

    private _createPopupMenu(itemTypes: string[]): Menus.PopupMenu {
        var onClick = (commandArgs: any) => this._addNewItem(commandArgs.itemType);
        var items = this._createMenuItems(itemTypes, onClick);
        var menuOptions = {
            align: this._options.popupMenuAlign,
            items: [{ childItems: items }],
            onHide: this._onHide
        };
        this._menuItem = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, $(document.body), menuOptions);
        return this._menuItem;
    }
}

export abstract class ChartControl extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.agile.chart";

    private _$image: JQuery;
    private _$largeImage: JQuery;
    private _counter: number;
    private _largeChart: Dialogs.ModalDialog;
    private _requestInProgress: boolean;
    private _requestPending: boolean;
    private _titleHeight: number;
    private _workItemChangedDelegate: IEventHandler;

    /**
     * Base Control to show agile team chart
     *
     * @param options options object
     */
    constructor(options?: any) {
        super(options);

        this._workItemChangedDelegate = delegate(this, this._workItemChanged);
    }

    /**
     * initialize the control
     */
    public initialize() {

        Diag.logTracePoint("ChatBurndown.initialize.start");
        var errors = this._options.errors;
        const hasErrors = errors && errors.length > 0;
        if (hasErrors) {
            this._drawErrorLayout(errors);
        }
        else {
            this._drawLayout();
        }
        super.initialize();
        Diag.logTracePoint("ChatBurndown.initialize.complete");
    }

    /**
     * refresh control
     */
    public refresh(refreshLarge: boolean = false) {

        if (this._requestInProgress) {
            // flag that a request is pending
            this._requestPending = true;
        }
        else {
            Diag.logTracePoint("Chart_" + this._options.action + ".refresh.start");
            var width = Math.round(this.getElement().width());
            var height = Math.round(this.getElement().height() - this._titleHeight);

            this._requestInProgress = true; // flag that request in progress
            this._requestPending = false;   // clear pending flag

            this._$image.attr("src", this._buildUrl(width, height, false, false));
        }

        if (refreshLarge && this._$largeImage) {
            var $window = $(window),
                totalWidth = $window.width(),
                totalHeight = $window.height(),
                chartWidth = Math.floor(totalWidth * 65 / 100),
                chartHeight = Math.floor(totalHeight * 65 / 100);
            this._$largeImage.attr("src", this._buildUrl(chartWidth, chartHeight, true, true));
        }
    }

    /**
     * show large Chart
     */
    public showLarge() {
        Diag.logTracePoint("Chart_" + this._options.action + "._showLarge.start");

        var $dialogHost = $("<div />"),
            $errorMessage = $("<div />").appendTo($dialogHost),
            $parentDiv = $("<div />"),
            $window = $(window),
            totalWidth = $window.width(),
            totalHeight = $window.height(),
            chartWidth = Math.floor(totalWidth * 65 / 100),
            chartHeight = Math.floor(totalHeight * 65 / 100),
            url = this._buildUrl(chartWidth, chartHeight, true, true),
            $img = this._createImageElement(chartHeight, chartWidth);

        $img.attr("src", url);
        $img.attr("alt", this._getAltText());

        $img.hide()
            .bind("load", (event) => {
                $parentDiv.removeClass("in-progress-container");
                $img.show();
                Diag.logTracePoint("Chart_" + this._options.action + ".largeImageLoad.complete");
            })
            .bind("error", (event) => {
                // This generally shouldn't happen, but clear the 'in progress' spinner.
                $parentDiv.removeClass("in-progress-container");
                $errorMessage.text(this._getGenericErrorMessage());
            });

        $parentDiv.height(chartHeight)
            .width(chartWidth)
            .addClass("large-chart-container")
            .addClass("in-progress-container");

        if (this._options.showEllipsisMenuBar) {
            const $editButton = $("<button />").addClass("edit-large-chart-button")
                .css("position", "absolute")
                .css("padding-top", "2px")
                .attr("aria-label", AgileControlsResources.EditButtonText)
                .bind("click", (e) => this._options.onEditClick());

            const $editIcon = $("<span/>")
                .addClass("edit-large-chart-icon icon clickable bowtie-icon bowtie-edit");

            const $editText = $("<span/>")
                .append(AgileControlsResources.EditButtonText)
                .addClass("edit-large-chart-link");

            $editButton.append($editIcon);
            $editButton.append($editText);
            $dialogHost.append($editButton);
        }

        $parentDiv.append($img);
        $dialogHost.append($parentDiv);

        this._$largeImage = $img;

        this._largeChart = Dialogs.show(Dialogs.ModalDialog, {
            content: $dialogHost,
            width: (chartWidth + 52) + "px", // 24 margin and 2 border on both sides
            height: "auto",
            resizable: false,
            buttons: [],
            title: this._options.title,
            useBowtieStyle: true,
            bowtieVersion: 2,
            close: () => {
                this._largeChart = null;
                $(document).unbind("click.tfs.agile.chart");
            },
            open: () => {
                // a click handler to the dialog root element to prevent click from closing the dialog
                $dialogHost.parent().click(function () {
                    return false;
                });
                // add a click handler to document to close dialog in case of click outside it
                $(document).bind("click.tfs.agile.chart", (event) => {
                    if (event.which === 1 && this._largeChart && this._allowClose()) {
                        this._largeChart.close();
                    }
                });
            }
        });

        // Add an error region to the large chart container
        Controls.BaseControl.createIn(Notifications.MessageAreaControl, $errorMessage, { closeable: false });

        // set focus to the dialog.
        this._largeChart.getElement().parent().focus();
    }

    protected skipRefreshOnSave(workitem: WITOM.WorkItem): boolean {
        return false;
    }

    /* protected */
    /**
     * Get CSS class name for Error Image
     */
    public _$getErrorImageClassName() {
        return "";
    }

    /* protected */
    /**
     * Allows the large chart to be closed when user clicks outdside of dialog.
     */
    public _allowClose(): boolean {
        return true;
    }

    protected abstract _getGenericErrorMessage(): string;

    /**
     * prepare layout for the case of error
     *
     * @param error error to show
     */
    private _drawErrorLayout(error: any) {

        if (this._options.showTitle) {
            $("<div/>").addClass("sprint-summary-tile-sprint-name")
                .addClass("burndown-tile-sprint-name")
                .text(this._options.showTitle)
                .appendTo(this._element);
        }

        // We may get an object or string as error so just pass it to show error without using it
        this._$image = this._getErrorImage(error);
        this._element.append(this._$image);
    }

    /**
     * Draw the layout of the small chart
     */
    private _drawLayout() {

        Diag.logTracePoint("Chart_" + this._options.action + "._drawLayout.start");

        if (this._options.showTitle) {
            var $title = $("<div/>")
                .addClass("sprint-summary-tile-sprint-name")
                .addClass("burndown-tile-sprint-name")
                .addClass("clickable")
                .attr("role", "button")
                .text(this._options.showTitle)
                .appendTo(this._element)
                .click((event) => {
                    this.showLarge();

                    // Stop propagation (not the same as preventDefault()).
                    return false;
                });

            this._titleHeight = $title.outerHeight(true);
        }

        this._$image = this._createImageElement(this._element.height() - this._titleHeight, this._element.width());

        this._$image.attr("tabIndex", 0);

        this._$image.attr("alt", this._getAltText());

        this._$image
            .addClass("clickable")
            .attr("role", "button")
            .click(() => {
                this.showLarge();
                return false;
            })
            .hide()
            .keypress((e) => {
                if (e.result !== false && (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE)) {
                    this.showLarge();
                    return false;
                }
            })
            .bind("error", (event) => {
                const errorMessage = this._getGenericErrorMessage();
                // We may get an object or string as error so just pass it to show error without using it
                this._$image = this._getErrorImage(errorMessage)
                    .addClass("clickable")
                    .click(() => {
                        this.showLarge();
                        return false;
                    });
                const $element = this.getElement();
                $element.append(this._$image);
                $element.attr("title", "");
            })
            .load((event) => {
                this._$image.show();
                // reset the request in progress flag
                this._requestInProgress = false;
                // if request pending do another refresh
                if (this._requestPending) {
                    this.refresh();
                }

                // replace control default tooltips coming from options coming from server, ChartHelper.cs
                const $element = this.getElement();
                var defaultControlTitle = $element.attr("title");
                if (defaultControlTitle) {
                    RichContentTooltip.add(defaultControlTitle, $element, { setAriaDescribedBy: true })
                    $element.attr("title", "");
                }

                var pageContext = getPageContext();
                if (pageContext && pageContext.diagnostics && !!pageContext.diagnostics.debugMode) {

                    console.log(`Chart: ${defaultControlTitle} Loaded.`);
                }

                Diag.logTracePoint("Chart_" + this._options.action + ".smallImageLoad.complete");
            });


        this._element.append(this._$image);
        this.refresh();

        this.attachEvents();
    }

    private _getErrorImage(errorMessage: string): JQuery {
        const image = $("<img/>")
            .attr("src", this._options.tfsContext.configuration.getResourcesFile("empty-chart-placeholder.png"))
            .attr('alt', errorMessage)
            .addClass(this._$getErrorImageClassName());

        RichContentTooltip.add(errorMessage, image, { setAriaDescribedBy: true });
        return image;
    }

    private _workItemChanged(sender, args) {
        if (args.change === WorkItemChangeType.Saved && !this.skipRefreshOnSave(args.workItem)) {
            this.refresh();
        }
    }

    /**
     * Attaches event handlers that react to external events
     */
    public attachEvents() {
        var store = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService(WITOM.WorkItemStore);
        WorkItemManager.get(store).attachWorkItemChanged(this._workItemChangedDelegate);
    }

    /**
     * Detaches event handlers that react to external events
     */
    public detachEvents() {
        var store = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService(WITOM.WorkItemStore);
        WorkItemManager.get(store).detachWorkItemChanged(this._workItemChangedDelegate);
    }

    /* protected */
    /**
     * abstract method get parameter object specified for this chart type
     *
     * @param isLarge a flag to indicate if parameters are requested for large or small chart
     */
    public abstract _$getParameters(isLarge: boolean): any;

    /* protected */
    /**
     * abstract method to get alt text
     */
    abstract _getAltText(): string;

    /**
     * Build a URL for a chart
     *
     * @param width width of the chart
     * @param height height of the chart
     * @param showLabels show labels
     * @param isLarge a flag to indicate large chart
     */
    private _buildUrl(width: number, height: number, showLabels: boolean, isLarge: boolean) {

        Diag.Debug.assertParamIsInteger(width, "width");
        Diag.Debug.assertParamIsInteger(height, "height");
        Diag.Debug.assertParamIsBool(showLabels, "showLabels");
        Diag.Debug.assertParamIsBool(isLarge, "isLarge");

        var chartOptions = {
            Width: width,
            Height: height,
            ShowDetails: showLabels,
            Title: "",
            Foreground: "#212121",
            Background: "#FFFFFF",
            Line: "#DDDDDD"
        },
            parameters = null;

        // Apply theming to chart if new agile hubs are enabled.
        const featureManagementService = Service.getService(FeatureManagementService);
        const newAgileHubsEnabled = featureManagementService.isFeatureEnabled("ms.vss-work-web.new-agile-elevated-hubs-feature");

        if (newAgileHubsEnabled) {
            var themeService = LWP.getLWPService("IVssThemeService");
            const curTheme = themeService.getCurrentTheme();

            if (curTheme && curTheme.isDark) {
                chartOptions.Foreground = "#DEDEDE";
                chartOptions.Background = "#201F1E";
                chartOptions.Line = "#999999";
            }
        }

        this._counter += 1;

        parameters = $.extend(
            {
                area: "api",
                chartOptions: Utils_Core.stringifyMSJSON(chartOptions),
                counter: this._counter,
                includeVersion: true,
                teamId: this._options.teamId
            },
            this._$getParameters(isLarge)
        );

        if (width <= 0 || height <= 0) {
            if (width <= 0) {
                Diag.Debug.fail("Chart: Width is invalid");
            }

            if (height <= 0) {
                Diag.Debug.fail("Chart: Height is invalid");
            }
        }

        return this._options.tfsContext.getActionUrl(
            this._options.action,
            "teamChart",
            parameters
        );
    }

    /**
     * Create an image element
     *
     * @param width width of the chart
     * @param height height of the chart
     * @return
     */
    private _createImageElement(height: number, width: number): JQuery {

        Diag.Debug.assertParamIsNumber(width, "width");
        Diag.Debug.assertParamIsNumber(height, "height");

        return $("<img/>")
            .attr("width", width)
            .attr("height", height);
    }

    public dispose() {
        this.detachEvents();
        super.dispose();
        this._$largeImage = null;
        this._largeChart = null;
    }
}

VSS.classExtend(ChartControl, TFS_Host_TfsContext.TfsContext.ControlExtensions);

VSS.initClassPrototype(ChartControl, {
    _$image: null,
    _counter: 0,
    _largeChart: null,
    _requestInProgress: false,
    _requestPending: false,
    _titleHeight: 0
});

export class BurndownChartControl extends ChartControl {

    public static enhancementTypeName: string = "tfs.agile.chart.burndown";

    /**
     * Control to show team burndown chart
     *
     * @param options chart options
     */
    constructor(options?: any) {

        super(options);
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            action: "Burndown"
        }, options));
    }

    /**
     * OVERRIDE: Return an object with iteration path
     *
     * @param isLarge a flag to indicate if parameters are requested for large or small chart
     */
    public _$getParameters(isLarge: boolean): any {
        Diag.Debug.assert(this._options.iterationPath, "Iteration Path cannot be null.");

        return {
            iterationPath: this._options.iterationPath
        };
    }

    /**
     * OVERRIDE: Get chart alt text
     */
    public _getAltText(): string {
        return AgileControlsResources.Burndownchart_AltText;
    }

    /**
     * OVERRIDE: Get Error Image CSS Class Name
     */
    public _$getErrorImageClassName() {
        return "burndown-chart-error-image";
    }

    /**
     * OVERRIDE: Don't refresh if it's first save and no remaining work has been set
     */
    protected skipRefreshOnSave(workitem: WITOM.WorkItem): boolean {
        if (workitem.revision === 1) {
            var fieldName = BacklogConfigurationService.getBacklogFieldName(BacklogFieldTypes.RemainingWork);
            if (!fieldName) {
                //On the Overview Page we do not have the Json Island for ProcessSettings [BUG440848]
                return true;
            }
            else {
                var field = workitem.getField(fieldName);
                if (field) {
                    var remainingWork = field.getValue();
                    if (!remainingWork || remainingWork <= 0) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    protected _getGenericErrorMessage(): string {
        return AgileControlsResources.GenericBurndownErrorMessage;
    }
}

export interface IVelocityChartsControlOptions {
    teamId: string;

    iterationsNumber: number;
}

export class VelocityChartControl extends ChartControl {
    public static enhancementTypeName = "tfs.agile.chart.velocity";
    private _iterationsNumber: number;
    private _backlogIterationPath: string;

    /**
     * Control to show team velocity
     *
     * @param options chart options
     */
    constructor(options?: IVelocityChartsControlOptions) {
        super(options);
        this._iterationsNumber = options.iterationsNumber;

        const teamAwareness = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService(TFS_TeamAwarenessService.TeamAwarenessService);
        const teamSettings: TFS_AgileCommon.ITeamSettings = teamAwareness.getTeamSettings(options.teamId);
        this._backlogIterationPath = teamSettings.backlogIteration.friendlyPath;
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            action: "Velocity"
        }, options));
    }

    /**
     * Set the iterations number
     *
     * @param iterationsNumber The iterations number
     */
    public setIterationsNumber(iterationsNumber: number) {
        Diag.Debug.assertParamIsNumber(iterationsNumber, "iterationsNumber");
        this._iterationsNumber = iterationsNumber;
    }

    protected skipRefreshOnSave(workitem: WITOM.WorkItem): boolean {
        // If this is the first save, and iteration path is either empty or set to
        // backlog iteration, then dont' refresh.
        if (workitem.revision === 1) {
            var field = workitem.getField(AgileUtils.DatabaseCoreFieldRefName.IterationPath);
            if (field) {
                var witValue = field.getValue();
                if (!witValue) {
                    return true;
                }
                if (Utils_String.ignoreCaseComparer(witValue.valueOf(), this._backlogIterationPath) === 0) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * OVERRIDE: Must be overridden when subclassing from Chart Control
     */
    protected _getGenericErrorMessage(): string {
        return AgileControlsResources.GenericVelocityErrorMessage;
    }

    /**
     * OVERRIDE: Return an object with iteration number
     *
     * @param isLarge a flag to indicate if parameters are requested for large or small chart
     */
    public _$getParameters(isLarge: boolean): any {
        return {
            iterationsNumber: this._iterationsNumber
        };
    }

    /**
     * OVERRIDE: Get chart alt text
     */
    public _getAltText(): string {
        return AgileControlsResources.Velocitychart_AltText;
    }

    /**
     * OVERRIDE: Get Error Image CSS Class Name
     */
    public _$getErrorImageClassName() {
        return "velocity-chart-error-image";
    }
}

/**
 * Interface representing CFD settings, to be kept in sync with CumulativeFlowDiagramViewModel.cs
 */
export interface ICumulativeFlowSettings {
    title: string;
    backlogLevelId: string;
    errors: string[];
    startDate: string;
    hideIncoming: boolean;
    hideOutgoing: boolean;
}

/**
 * Interface representing CFD dialog settings
 */
export interface ICumulativeFlowDialogSettings {
    startDate: string;
    showIncoming: boolean;
    showOutgoing: boolean;
}

export interface ICumulativeFlowChartControlOptions {
    teamId: string;
    backlogLevelId: string;
    startDate: string;
    hideIncoming: boolean;
    hideOutgoing: boolean;
    title: string;
}

export class CumulativeFlowChartControl extends ChartControl {
    public static enhancementTypeName: string = "tfs.agile.chart.cumulativeflow";
    private _backlogLevelId: string;
    private _showIncoming: boolean;
    private _isSettingsDialog: boolean;

    /**
     * Control to show team cumulative flow
     *
     * @param options chart options
     */
    constructor(options?: ICumulativeFlowChartControlOptions) {
        super(options);
        this._isSettingsDialog = false;
        this._backlogLevelId = options.backlogLevelId;
        this._showIncoming = !options.hideIncoming;
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            action: "CumulativeFlow",
            showEllipsisMenuBar: true,
            onEditClick: () => this._onEditClick()
        }, options));
    }

    public setShowIncoming(showIncoming: boolean) {
        this._showIncoming = showIncoming;
    }

    /**
     * Set the category ref name
     *
     * @param backlogLevelId Id of the backlog level
     */
    public setBacklogLevelId(backlogLevelId: string) {
        Diag.Debug.assertParamIsStringNotEmpty(backlogLevelId, "backlogLevelId");
        this._backlogLevelId = backlogLevelId;
    }

    protected skipRefreshOnSave(workitem: WITOM.WorkItem): boolean {
        // If this is the first save, and inComing column is not turned on, then don't refresh.
        if (workitem.revision === 1 && !this._showIncoming) {
            return true;
        }

        return false;
    }

    /**
     * OVERRIDE: Return an object with iteration number
     *
     * @param isLarge a flag to indicate if parameters are requested for large or small chart
     */
    public _$getParameters(isLarge: boolean): any {
        return {
            hubCategoryRefName: this._backlogLevelId
        };
    }

    /**
     * OVERRIDE: Get chart alt text
     */
    public _getAltText(): string {
        return AgileControlsResources.Cumulativechart_AltText;
    }

    /**
     * OVERRIDE: Must be overridden when subclassing from Chart Control
     */
    protected _getGenericErrorMessage(): string {
        return AgileControlsResources.GenericCumulativeErrorMessage;
    }

    /**
     * OVERRIDE: Get Error Image CSS Class Name
     */
    public _$getErrorImageClassName() {
        return "cumulative-flow-chart-error-image";
    }

    /**
     * OVERRIDE: Allows the large chart to be closed when user clicks outdside of dialog.
     */
    public _allowClose() {
        return !this._isSettingsDialog;
    }

    private _onEditClick() {
        this._isSettingsDialog = true;
        Events_Action.getService().performAction(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, {
            defaultTabId: Agile.TabControlsRegistrationConstants.CFD_TAB_ID,
            close: () => {
                // This is done in a delay, because the ChartDialog will also handle the click event
                // after a button is clicked resulting in the chart being dismissed.  This delay
                // ensures this callback happens after the ChartDialog handler.
                Utils_Core.delay(this, 0, () => { this._isSettingsDialog = false; });
            }
        });
        this._recordCommonConfigDialogTelemetry();
    }

    private _recordCommonConfigDialogTelemetry() {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_COMMON_CONFIG_DIALOG_OPENED, {
                Page: Agile.AgileCustomerIntelligenceConstants.CFD_VIEW,
            }));
    }
}

export class CumulativeFlowStartDateValidator extends Validation.BaseValidator<Validation.BaseValidatorOptions> {
    private _message: string;

    /**
     * @param options
     */
    constructor(options?: any) {
        super(options);
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    public isValid(): boolean {
        this._message = null;

        var text = $.trim(this.getValue());
        if (text) {
            var date = Utils_Date.parseLocale(text);

            // Check if the start date is a valid date.
            if (!(date instanceof Date) || isNaN(<any>date)) {
                this._message = Utils_String.format(AgileControlsResources.CumulativeFlowSettingsInvalidDate, Utils_Date.localeFormat(new Date(new Date().getFullYear(), 11, 31), "d", true));
                return false;
            }

            // Check if the start date is earlier than 30 weeks out.
            var minDate = new Date();
            minDate.setHours(0, 0, 0, 0);
            minDate.setDate(minDate.getDate() - (31 * 7));
            if (minDate.getTime() - date.getTime() > 0) {
                this._message = Utils_String.format(AgileControlsResources.CumulativeFlowSettingsEarlyDate, Utils_Date.localeFormat(minDate, "d", true));
                return false;
            }

            // Check if the start date is in the future.
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            if (today.getTime() - date.getTime() < 0) {
                this._message = AgileControlsResources.CumulativeFlowSettingsFutureDate;
                return false;
            }
        }

        // Valid or empty text.
        // Empty text is considered a valid date.
        return true;

    }

    public getMessage(): string {
        return this._message;
    }
}

/**
 * @interface
 * Interface for cumulative flow settings control options
 */
export interface ICumulativeFlowSettingsControl {
    /**
     * The team id.
     */
    teamId: string;
    /**
     * Cumulative flow chart control
     */
    cfdChartControl: CumulativeFlowChartControl;
    /**
     * Board name or board id.
     */
    boardIdentity: string;
    /**
     * Flag to indicate if you have permission to edit the settings.
     */
    isEditable: boolean;
    /**
     * TFS context injected into options.
     */
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

/**
 * Cumulative flow settings control.
 */
export class CumulativeFlowSettingsControl extends Controls.Control<ICumulativeFlowSettingsControl> implements Configuration.ITabContent {
    private static DESCRIPTION_AREA_CONTAINER_CLASS = "cfd-settings-description-area-container";
    private static SECTIONS_AREA_CONTAINER_CLASS = "sections-area-container";
    private static MESSAGE_AREA_CONTAINER_CLASS = "cfd-settings-message-area-container";
    private static START_DATE_DESCRIPTION_ID = "chartStartDateDescription";

    private _isValid: boolean;
    private _isDirty: boolean;
    private _canEdit: boolean;
    private _originalSettings: ICumulativeFlowDialogSettings;

    private _startDate: string;
    private _showIncomingChecked: boolean;
    private _showOutgoingChecked: boolean;
    private _throttleValidateDelegate: Function;
    private _cumulativeFlowStartDateValidator: CumulativeFlowStartDateValidator;
    private _messageArea: Notifications.MessageAreaControl;
    private _$startDate: JQuery;
    private _$dateErrorIcon: JQuery;
    private _$dateInput: JQuery;
    private _$dateInputCombo: JQuery;
    private _$dateInputMessageArea: JQuery;
    private _$dateInputErrorMessage: JQuery;
    private _onDirtyStateChanged: Function;
    private _onValidStateChanged: Function;
    private _cfdChartControl: CumulativeFlowChartControl;

    constructor(options?: ICumulativeFlowSettingsControl) {
        super($.extend(options, { cssClass: "cumulative-flow-edit-settings" }));
    }

    public initialize() {
        super.initialize();

        this._cfdChartControl = this._options.cfdChartControl;
        this._canEdit = this._options.isEditable;
        this._updateCfdChartControl();

        var $element = this.getElement();
        var $textAreaContainer = $(domElem("div", CumulativeFlowSettingsControl.DESCRIPTION_AREA_CONTAINER_CLASS));
        var $sectionsAreaContainer = $(domElem("div", CumulativeFlowSettingsControl.SECTIONS_AREA_CONTAINER_CLASS));
        this._createMessageArea($textAreaContainer);
        this._createDescriptionTextArea($textAreaContainer);
        this._createSectionTextArea($sectionsAreaContainer);
        $element.append($textAreaContainer);
        $element.append($sectionsAreaContainer);

        this._$dateInputCombo = $element.find(".cfd-datePicker-container .combo");
        this._$dateInput = $element.find(".cfd-datePicker-container input");

        if (!this._canEdit) {
            this._showWarning(AgileControlsResources.CumulativeFlowSettingsNoPermission);
            $element.find(".section-checkbox #cfd-showIncoming input").attr("disabled", "disabled");
            $element.find(".section-checkbox #cfd-showOutgoing input").attr("disabled", "disabled");
            this._$dateInputCombo.attr("disabled", "disabled");
            this._$dateInputCombo.attr("aria-disabled", "true");
        }

        this._originalSettings = {
            startDate: $.trim(this._$startDate.val()),
            showIncoming: this._showIncomingChecked,
            showOutgoing: this._showOutgoingChecked
        };
        this._validate();
    }

    /**
     * Method that lets the CSC specify the delegates to be called on state change in the tab content.
     * @param onDirtyStateChanged The delegate for the dirty state transition.
     * @param onValidStateChanged The delegate for the valid state transition.
     */
    public registerStateChangedEvents(onDirtyStateChanged: Function, onValidStateChanged: Function): void {
        this._onDirtyStateChanged = onDirtyStateChanged;
        this._onValidStateChanged = onValidStateChanged;
    }

    /**
     * @return Valid state of the control.
     */
    public isValid(): boolean {
        return this._isValid;
    }

    /**
     * @return Dirty state of the control.
     */
    public isDirty(): boolean {
        return this._isDirty;
    }

    /**
     * Method that renders the actual control, on called by the CSC framework.
     * @param $container The DOM element, to which the control should be added.
     * @return Resolve if render successfully, reject if failed.
     */
    public beginLoad($container: JQuery): IPromise<any> {
        var deferred = Q.defer();
        this._getBoardCumulativeChartApi().then(
            (value: Tfs_Work_Contracts.BoardChart) => {
                this._showIncomingChecked = !value.settings["hideIncomingColumn"];
                this._showOutgoingChecked = !value.settings["hideOutgoingColumn"];
                this._startDate = this._shiftToLocale(value.settings["startDate"]);
                this.createIn($container);
                deferred.resolve(null);
            },
            (error: { message: string; serverError: any; }) => {
                deferred.reject(error);
            });
        return deferred.promise;
    }

    /**
     * Method that save the actual control, on called by the CSC framework.
     * @return Resolve if render successfully, reject if failed.
     */
    public beginSave(): IPromise<boolean> {
        if (this.isValid()) {
            var deferred = Q.defer<boolean>();
            var startTime: number = Date.now();
            this._setBoardCumulativeChartApi().then(
                (value: any) => {
                    this._recordCfdSettingsTelemetry(startTime);
                    this._isDirty = false;
                    if ($.isFunction(this._onDirtyStateChanged)) {
                        this._onDirtyStateChanged();
                    }
                    this._showIncomingChecked = !value.settings.hideIncomingColumn;
                    this._showOutgoingChecked = !value.settings.hideOutgoingColumn;
                    this._startDate = this._shiftToLocale(value.settings.startDate);
                    this._updateCfdChartControl();
                    if (this._cfdChartControl) {
                        this._cfdChartControl.refresh(true);
                    }
                    this._originalSettings = {
                        startDate: this._startDate,
                        showIncoming: this._showIncomingChecked,
                        showOutgoing: this._showOutgoingChecked
                    };
                    deferred.resolve(false);
                },
                (error: {
                    message: string;
                    serverError: any;
                }) => {
                    deferred.reject(error);
                });
            return deferred.promise;
        }
    }

    private _updateCfdChartControl() {
        if (this._cfdChartControl) {
            this._cfdChartControl.setShowIncoming(this._showIncomingChecked);
        }
    }

    private _getCumulativeFlowSettings(): any {
        var boardChart = {
            settings: {
                startDate: this._shiftToUTC($.trim(this._$startDate.val())),
                hideIncomingColumn: !this._showIncomingChecked,
                hideOutgoingColumn: !this._showOutgoingChecked,
            }
        };
        return boardChart;
    }

    // Protected for unit testing
    protected _shiftToUTC(dateString: string): Date {
        if (!dateString) {
            return null;
        }
        return Utils_Date.shiftToUTC(Utils_Date.parseDateString(dateString, null, true));
    }

    // Protected for unit testing
    protected _shiftToLocale(dateString: string): string {
        if (!dateString) {
            return null;
        }
        return Utils_Date.localeFormat(Utils_Date.parseDateString(dateString, null, true), "d");
    }

    public dispose() {
        if (this._messageArea) {
            this._messageArea.dispose();
        }

        if (this._cumulativeFlowStartDateValidator) {
            this._cumulativeFlowStartDateValidator.dispose();
        }
        super.dispose();
    }

    private _getBoardCumulativeChartApi(): IPromise<Tfs_Work_Contracts.BoardChart> {
        const webContext = getDefaultWebContext();
        const workHttpClient = this._getClient(webContext);
        const teamContext = <TeamContext>{
            projectId: webContext.project.id,
            teamId: this._options.teamId
        };
        return workHttpClient.getBoardChart(teamContext, this._options.boardIdentity, "cumulativeflow");
    }

    private _setBoardCumulativeChartApi() {
        const webContext = getDefaultWebContext();
        const workHttpClient = this._getClient(webContext);
        const teamContext = <TeamContext>{
            projectId: webContext.project.id,
            teamId: this._options.teamId
        };
        const boardChart: Tfs_Work_Contracts.BoardChart = this._getCumulativeFlowSettings();
        return workHttpClient.updateBoardChart(boardChart, teamContext, this._options.boardIdentity, "cumulativeflow");
    }

    private _getClient(webContext: WebContext): Tfs_Work_WebApi.WorkHttpClient {
        const connection = new Service.VssConnection(webContext);
        return connection.getHttpClient<Tfs_Work_WebApi.WorkHttpClient>(Tfs_Work_WebApi.WorkHttpClient);
    }

    private _showWarning(message: string) {
        this._messageArea.setMessage(message, Notifications.MessageAreaType.Warning);
    }

    private _createMessageArea($container: JQuery) {
        var $messageAreaContainer = $(domElem("div", CumulativeFlowSettingsControl.MESSAGE_AREA_CONTAINER_CLASS));
        var messageAreaOption: Notifications.IMessageAreaControlOptions = {
            closeable: false,
            showIcon: true,
            type: Notifications.MessageAreaType.Warning
        };
        this._messageArea = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, messageAreaOption);
        $container.append($messageAreaContainer);
    }

    private _createDescriptionTextArea($container: JQuery) {
        // Contain the help text on the top of the dialog.
        var $swimlaneMainHeader = $(domElem("h2", "main-header"));
        var $dataIsland = $(".board-page-title-area");
        if ($dataIsland.length > 0) {
            $dataIsland.eq(0).html().trim();
        }
        $swimlaneMainHeader.text(AgileControlsResources.Cfd_Settings_Main_Header);

        var $swimlaneDescription = $(domElem("div", "main-description"));
        $swimlaneDescription.text(AgileControlsResources.Cfd_Settings_Description);

        $container.append($swimlaneMainHeader)
            .append($swimlaneDescription);
    }

    private _createSectionTextArea($container: JQuery) {
        var $cfdSettings = $("<div />")
            .append(this._createStartDateInput())
            .append(this._createShowIncomingInput());

        $cfdSettings.append(this._createShowOutgoingInput());

        $container.append($cfdSettings);
    }

    private _createStartDateInput(): JQuery {
        var $div = $("<div />").addClass("cfd-datePicker-container");

        // NOTE: There is a bug (either in JQuery or FireFox) where if there are no tab stops prior to the first JQuery DatePicker instance on the page
        // then the DatePicker date selection does not work when directly clicked on. Adding a superfluous tab stop to the header text fixes this problem.
        if (Utils_UI.BrowserCheckUtils.isFirefox()) {
            $div.attr("tabindex", 0);
        }

        var $title = $("<div />").addClass("section-header").text(AgileControlsResources.CFDSettingsStartDateTitle);
        $title.appendTo($div);
        var $description = $("<div />").addClass("section-description").text(AgileControlsResources.CFDSettingsStartDateDescription);
        $description.attr("id", CumulativeFlowSettingsControl.START_DATE_DESCRIPTION_ID);
        $description.appendTo($div);

        var $startDate = $("<input />")
            .attr({
                type: "text",
                id: "chartStartDate",
                "aria-label": AgileControlsResources.CFDSettingsStartDateTitle,
                "aria-describedby": CumulativeFlowSettingsControl.START_DATE_DESCRIPTION_ID
            });

        if (this._startDate) {
            $startDate.val(this._startDate);
        }

        $("<label />")
            .attr("for", "chartStartDate")
            .text(AgileControlsResources.CFDSettingsStartDateLabel)
            .appendTo($div);

        $startDate.appendTo($div);

        Controls.Enhancement.enhance(Combos.DatePicker, $startDate, {
            id: "cfd-startDate",
            dropOptions: {
                host: $(document.body)
            },
            change: delegate(this, this._onStartDateChange),
            enabled: this._canEdit
        });

        this._throttleValidateDelegate = Utils_Core.throttledDelegate(this, 500, () => { this._validate(); });

        this._cumulativeFlowStartDateValidator = <CumulativeFlowStartDateValidator>Controls.Enhancement.enhance(CumulativeFlowStartDateValidator, $startDate);

        this._$startDate = $startDate;

        // error message area
        this._createDateInputMessageArea($div);

        return $div;
    }

    private _createShowIncomingInput(): JQuery {
        var $showIncomingCheckboxControl = $("<div />").addClass("section-checkbox");
        var showIncomingCheckboxControl = Controls.Control.create(CheckboxList.CheckboxList, $showIncomingCheckboxControl, {
            id: "cfd-showIncoming",
            cssClass: "cfd-checkbox-list",
            change: (item: any[]) => {
                this._showIncomingChecked = item[1];
                this._setDirtyState();
            }
        });

        showIncomingCheckboxControl.setItems([{
            text: AgileControlsResources.CFDSettingsShowIncomingLabel,
            value: 1,
            checked: this._showIncomingChecked
        }]);

        return $showIncomingCheckboxControl;
    }

    private _createShowOutgoingInput(): JQuery {
        var $showOutgoingCheckboxControl = $("<div />").addClass("section-checkbox");
        var showIncomingCheckboxControl = Controls.Control.create(CheckboxList.CheckboxList, $showOutgoingCheckboxControl, {
            id: "cfd-showOutgoing",
            cssClass: "cfd-checkbox-list",
            change: (item: any[]) => {
                this._showOutgoingChecked = item[1];
                this._setDirtyState();
            }
        });

        showIncomingCheckboxControl.setItems([{
            text: AgileControlsResources.CFDSettingsShowOutgoingLabel,
            value: 1,
            checked: this._showOutgoingChecked
        }]);

        return $showOutgoingCheckboxControl;
    }

    private _onStartDateChange() {
        this._setDirtyState();
        var text = $.trim(this._$startDate.val());
        if (text) {
            var date = Utils_Date.parseLocale(text);
            if (date instanceof Date) {
                // If a date was parsed, validate it immediately.
                this._validate();
                return;
            }
        }
        // Invoke the validation delegate (which is 500 ms delayed).
        this._throttleValidateDelegate();
    }

    private _setDirtyState() {
        this._isDirty = this._isStartDateChanged() || this._isShowIncomingChanged() || this._isShowOutgoingChanged();
        if ($.isFunction(this._onDirtyStateChanged)) {
            this._onDirtyStateChanged();
        }
    }

    private _validate() {
        this._isValid = Validation.validateGroup("*", null, this.getElement());
        if ($.isFunction(this._onValidStateChanged)) {
            this._onValidStateChanged();
        }

        if (this._isValid) {
            this._clearDateError();
        }
        else {
            var message = this._cumulativeFlowStartDateValidator.getMessage();
            this._setDateError(message);
        }
    }

    private _createDateInputMessageArea($container: JQuery) {
        this._$dateInputMessageArea = $("<div />").addClass("control-message-area").attr("aria-live", "assertive");
        this._$dateErrorIcon = $("<div />").addClass("icon bowtie-icon bowtie-status-error");
        this._$dateErrorIcon.appendTo(this._$dateInputMessageArea);
        this._$dateInputErrorMessage = $("<div />").addClass("error-message");
        this._$dateInputErrorMessage.appendTo(this._$dateInputMessageArea);
        this._$dateInputMessageArea.appendTo($container);
    }

    private _setDateError(message: string) {
        this._$dateInputMessageArea.addClass("error");
        this._$dateInputCombo.addClass("invalid");
        this._$dateInput.addClass("invalid");
        this._$dateInputErrorMessage.text(message);
        this._$dateErrorIcon.show();
    }

    private _clearDateError() {
        this._$dateInputMessageArea.removeClass("error");
        this._$dateInputCombo.removeClass("invalid");
        this._$dateInput.removeClass("invalid");
        this._$dateInputErrorMessage.text("");
        this._$dateErrorIcon.hide();
    }

    private _isStartDateChanged(): boolean {
        var text = $.trim(this._$startDate.val());
        return Utils_String.ignoreCaseComparer(this._originalSettings.startDate, text) !== 0;
    }

    private _isShowIncomingChanged(): boolean {
        return this._showIncomingChecked !== this._originalSettings.showIncoming;
    }

    private _isShowOutgoingChanged(): boolean {
        return this._showOutgoingChecked !== this._originalSettings.showOutgoing;
    }

    private _recordCfdSettingsTelemetry(startTime: number) {
        var endTime = Date.now();
        var elapsedTime = endTime - startTime;

        var ciData: IDictionaryStringTo<any> = {
            "IsStartDateChanged": this._isStartDateChanged(),
            "IsShowIncomingChanged": this._isShowIncomingChanged(),
            "IsShowOutgoingChanged": this._isShowOutgoingChanged(),
            "ElapsedTime": elapsedTime
        };
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_CFD_UPDATE_SETTINGS,
            ciData));
    }
}

Controls.Enhancement.registerEnhancement(VelocityChartControl, ".velocity-chart");
Controls.Enhancement.registerEnhancement(BurndownChartControl, ".burndown-chart");
Controls.Enhancement.registerEnhancement(CumulativeFlowChartControl, ".cumulative-flow-chart");

// Defines the Model for the Backlog Filter Control
export class BacklogViewControlModel {
    public static indexPageAction = "index";
    public static backlogPageAction = "backlog";
    public static boardPageAction = "board";
    public static backlogsContributionPageAction = "backlogscontributions";

    //Pivot values this is used similar to BacklogPivot in BacklogPivotFiltersViewModel.cs
    public static backlogPivot = "0";
    public static boardPivot = "1";

    private _backlogNodes: IBacklogNode[];
    private _backlogContext: Agile.BacklogContext;
    private _colorsProvider: WorkItemTypeColorAndIconsProvider;
    private _actionName: string;
    private _currentPageAction: string;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    public static CreateInstance(tfsContext: TFS_Host_TfsContext.TfsContext, actionName: string, currentPageAction: string): BacklogViewControlModel {
        currentPageAction = currentPageAction || tfsContext.navigation.currentAction;
        return new BacklogViewControlModel(tfsContext, actionName, currentPageAction, Agile.BacklogContext.getInstance());
    }

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, actionName: string, currentPageAction: string, backlogContext: Agile.BacklogContext) {
        Diag.Debug.assertParamIsObject(tfsContext, "tfsContext");
        Diag.Debug.assertParamIsObject(backlogContext, "backlogContext");
        Diag.Debug.assertParamIsStringNotEmpty(actionName, "actionName");
        Diag.Debug.assertParamIsStringNotEmpty(currentPageAction, "currentPageAction");

        this._tfsContext = tfsContext;
        this._actionName = actionName;
        this._backlogContext = backlogContext;
        this._colorsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
        this._currentPageAction = currentPageAction;

        this._backlogNodes = [];

        this._initialize();
    }

    private _initialize() {
        this._addPortfolios(BacklogConfigurationService.getBacklogConfiguration().portfolioBacklogs);

        var requirementBacklog: IBacklogLevelConfiguration = BacklogConfigurationService.getBacklogConfiguration().requirementBacklog;

        // if the requirement backlog is not in Portfolio list in backlog context, do not add it
        if (!this._backlogContext.isInPortfolios(requirementBacklog.name)) {
            return;
        }

        if (this._tfsContext.isHosted) {
            VSS.using(["WorkItemTracking/Scripts/Engagement/Registrations", "Presentation/Scripts/TFS/TFS.Engagement.Registrations"], (EngagementRegistrations: typeof EngagementRegistrations_NO_REQUIRE, TFS_EngagementRegistrations: typeof TFS_EngagementRegistrations_NO_REQUIRE) => {
                EngagementRegistrations.registerVisualizeYourWorkNewFeature(this._tfsContext);
                EngagementRegistrations.registerCustomizeWorkItemsNewFeature(this._tfsContext);
                EngagementRegistrations.registerTrackChangesNewFeature();
                TFS_EngagementRegistrations.registerNewFeature();
            });
        }

        var requirementNodeUrl: string;
        if (Agile.IsWebAccessAsyncEnabled()) {
            requirementNodeUrl = Agile.LinkHelpers.getAsyncBacklogLink(this._actionName, { level: requirementBacklog.name, showParents: ProductBacklogMRU.ShowParents.getMRUState() });
        }
        else {
            requirementNodeUrl = this._tfsContext.getActionUrl(this._actionName, "backlogs", { parameters: requirementBacklog.name });
        }

        var requirementNode: IBacklogNode = {
            name: requirementBacklog.name,
            url: requirementNodeUrl,
            onNavigate: delegate(this, this._backlogNavigationHandler, {
                uri: requirementNodeUrl,
                level: requirementBacklog.name
            }),
            color: this._getBacklogLevelColor(requirementBacklog),
            isHubContext: this._backlogContext.isRequirement,
            isSelected: this._backlogContext.isRequirement && this._showHubAsSelected(this._backlogContext.actionNameFromMru),
            isRequirement: true
        };
        this._backlogNodes.push(requirementNode);
    }

    private _getBacklogLevelColor(backlogLevel: IBacklogLevelConfiguration): string {
        var color = backlogLevel.color;
        if (color) {
            color = `#${color.substr(color.length - 6)}`;
        }
        else {
            color = this._colorsProvider.getColor(this._getCurrentProject(), backlogLevel.defaultWorkItemType);
        }

        return color;
    }

    public getBacklogNodes(): IBacklogNode[] {
        return this._backlogNodes;
    }

    private _addPortfolios(portfolioBacklogs: IBacklogLevelConfiguration[]) {
        Diag.Debug.assertIsArray(portfolioBacklogs);

        // Ensure backlogs are shown in descending order of rank
        portfolioBacklogs = portfolioBacklogs.sort((a: IBacklogLevelConfiguration, b: IBacklogLevelConfiguration) => b.rank - a.rank);

        // Adding all portfolios
        for (var i = 0; i < portfolioBacklogs.length; i++) {
            var backlogLevel: IBacklogLevelConfiguration = portfolioBacklogs[i];
            var backlogName = backlogLevel.name;

            // if the backlog is not in Portfolio list in backlog context, dont add it
            if (!this._backlogContext.isInPortfolios(backlogName)) {
                continue;
            }

            var nodeUrl: string;
            if (Agile.IsWebAccessAsyncEnabled()) {
                nodeUrl = Agile.LinkHelpers.getAsyncBacklogLink(this._actionName, { level: backlogName, showParents: ProductBacklogMRU.ShowParents.getMRUState() });
            }
            else {
                nodeUrl = this._tfsContext.getActionUrl(this._actionName, "backlogs", { parameters: backlogName });
            }

            var portfolioNode: IBacklogNode = {
                name: backlogName,
                url: nodeUrl,
                onNavigate: delegate(this, this._backlogNavigationHandler, {
                    uri: nodeUrl,
                    level: backlogName
                }),
                color: this._getBacklogLevelColor(backlogLevel),
                isHubContext: this._backlogContext.isHubContext(backlogLevel),
                isSelected: this._backlogContext.isHubContext(backlogLevel) && this._showHubAsSelected(this._backlogContext.actionNameFromMru),
                isRequirement: false
            };

            this._backlogNodes.push(portfolioNode);
        }
    }

    private _showHubAsSelected(actionNameFromMru: string): boolean {

        var actionName = this._currentPageAction;

        if (Utils_String.ignoreCaseComparer(actionName, BacklogViewControlModel.indexPageAction) === 0 &&
            actionNameFromMru) {
            //  If the action is index, use the action name from the MRU if available.
            //  This covers the case when the users selects "Work" (L0) -> "Backlogs"(L1), in which case the
            //  action name is extracted from the MRU.
            actionName = actionNameFromMru;
        }

        return Utils_String.ignoreCaseComparer(actionName, BacklogViewControlModel.backlogPageAction) === 0 ||
            Utils_String.ignoreCaseComparer(actionName, BacklogViewControlModel.boardPageAction) === 0 ||
            Utils_String.ignoreCaseComparer(actionName, BacklogViewControlModel.backlogsContributionPageAction) === 0;
    }

    private _backlogNavigationHandler(event: JQueryMouseEventObject, actionArgs: Agile.IBacklogNavigationActionArgs) {
        if (Agile.IsWebAccessAsyncEnabled()) {
            Events_Action.getService().performAction(Agile.Actions.BACKLOG_NAVIGATE, actionArgs);

            // Prevent default browser navigation from happening
            event.preventDefault();
        }
    }

    private _getCurrentProject(): string {
        const projectName = this._tfsContext.navigation.project;
        Diag.Debug.assert(projectName != null, "Project name cannot be null");

        return projectName;
    }
}

export class SprintTreeNode extends TreeView.TreeNode {
    constructor(name: string) {
        super(name);
    }
}

export class BacklogTreeNode extends TreeView.TreeNode {
    public backlogNodeInfo: IBacklogNode;

    constructor(backlogNodeInfo: IBacklogNode) {
        super(backlogNodeInfo.name);
        this.backlogNodeInfo = backlogNodeInfo;
    }
}

export interface BacklogViewControlOptions extends TreeView.ITreeOptions {
    actionName: string;
    currentPageAction?: string;
    isWorkQueuedDelegate: Function;
    getMessageAreaDelegate: Function;
    isRefreshingDelegate: Function;
    /**
     * TFS context from extending TfsContext.ControlExtensions.
     */
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export class BacklogViewControl extends TreeView.TreeViewO<BacklogViewControlOptions> {
    public static EVENT_BACKLOG_VIEW_CHANGE = "backlog.view.change";

    private _model: BacklogViewControlModel;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        this._setupConfigurationData(this._options.actionName, this._options.currentPageAction);
        this._initialize(this._options.actionName);
        Events_Services.getService().attachEvent(ContributableTabConstants.EVENT_AGILE_CONTRIBUTED_TAB_SELECTED, (data: IContributedTabDisplayedEventArgs) => {
            var extService = Service.getService(Contributions_Services.ExtensionService);
            extService.getContribution(data.contributionId).then((contribution: IExtensionContribution) => {
                if (contribution.targets.some(target => target === "ms.vss-work-web.product-backlog-tabs")) {
                    this._updateLinkToIncludeContribution(this.rootNode, data);
                    this._draw();
                }
            });
        });

        super.initialize();
    }

    /**
     * Updates node link recursively to include the contribution
     * @param node Node to be updated
     * @param eventArgs Event args containing contributionid etc.
     */
    private _updateLinkToIncludeContribution(node: TreeView.TreeNode, eventArgs: IContributedTabDisplayedEventArgs): void {
        if (!node.hasChildren() && !node.isEmptyFolderChildNode && !node.root) {
            var tfsContext = <TFS_Host_TfsContext.TfsContext>(<any>this._options).tfsContext; // From extending TfsContext.ControlExtensions.
            var link = tfsContext.getActionUrl(BacklogViewControlModel.backlogsContributionPageAction, "backlogs", { parameters: [] });
            link = Utils_Url.replaceUrlParam(link, "contributionId", eventArgs.contributionId);
            link = Utils_Url.replaceUrlParam(link, "_a", "contribution");
            link = Utils_Url.replaceUrlParam(link, "level", node["backlogNodeInfo"].name);
            link = Utils_Url.replaceUrlParam(link, "showParents", "" + ProductBacklogMRU.ShowParents.getMRUState());
            node.link = Utils_Url.replaceUrlParam(link, "spv", "" + eventArgs.selectedPivot);
        }

        if (node.hasChildren()) {
            for (var i = 0, l = node.children.length; i < l; ++i) {
                this._updateLinkToIncludeContribution(node.children[i], eventArgs);
            }
        }
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: BacklogViewControlOptions) {
        var additionalOptions: any = {
            useBowtieStyle: true,
            useArrowKeysForNavigation: true
        };

        var data = Utils_Core.parseMSJSON($(".backlog-data", this.getElement()).html(), false);

        if (!Agile.IsWebAccessAsyncEnabled()) {
            additionalOptions.clickSelects = false;
        }

        super.initializeOptions($.extend(data, additionalOptions, options));
    }

    /**
     * Refresh the control's model, reconstruct the control, and redraw.
     *
     * @param actionName
     * @param currentPageAction
     */
    public reconfigure(actionName: string, currentPageAction: string) {
        this._setupConfigurationData(actionName, currentPageAction);
        this._initialize(actionName);
        this._draw();
    }

    private _setupConfigurationData(actionName: string, currentPageAction: string) {
        this._model = BacklogViewControlModel.CreateInstance(this._options.tfsContext, actionName, currentPageAction);
    }

    private _initialize(actionName: string) {
        var teamAwareness = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService(TFS_TeamAwarenessService.TeamAwarenessService);
        var preview: boolean = false;

        if (this._options.tfsContext.isHosted && FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.EnableBacklogManagementPermission)) {
            preview = TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(this._options.tfsContext)
                .getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.PortfolioBacklogManagement) < TFS_Server_WebAccess_Constants.FeatureMode.Licensed;
        }

        this.populate(preview, teamAwareness.getTeamSettings(this._options.tfsContext.currentTeam.identity.id), actionName);
    }

    /**
     * Populates the control with the list of portfolio backlogs
     *
     * @param preview Flag to indicate the license for portfolio backlog management is enabled/disabled
     * @param teamSettings The current team settings
     * @param actionName The current action name to be used for generating urls
     */
    public populate(preview: boolean, teamSettings: any, actionName: string) {
        Diag.Debug.assertParamIsStringNotEmpty(actionName, "actionName");

        var backlogIteration = teamSettings.backlogIteration.friendlyPath;
        var backlogNodes: IBacklogNode[] = this._model.getBacklogNodes();

        var createNode = (backlogNode: IBacklogNode, isRequirement: boolean) => {
            var treeNode = new BacklogTreeNode(backlogNode);

            treeNode.droppable = true;
            treeNode.iterationPath = backlogIteration;

            if (preview && !isRequirement) {
                treeNode.config.css = "preview";
            }

            treeNode.link = backlogNode.url;

            // Wrapping the link delegate with onItemClick, to prevent navigation if there are pending changes.
            treeNode.linkDelegate = (args: JQueryEventObject) => {
                if (this.onItemClick(treeNode, $(args.target))) {
                    backlogNode.onNavigate(args);
                }
            }

            treeNode.noTreeIcon = true;

            if (backlogNode.isSelected) {
                treeNode.selected = true;
                this._selectedNode = treeNode;
                this._updateSelections();
            }

            return treeNode;
        };

        this.rootNode.clear();

        // Add the portfolio backlog nodes, if they're visible.
        $.each(backlogNodes, (index, backlog) => {
            // TODO: CONSIDER MOVING VISIBILITY DETERMINATION TO THE VIEW MODEL.
            if (this._isBacklogVisibleByName(backlog.name)) {
                var isRequirement = backlog.isRequirement;
                this.rootNode.add(createNode(backlog, isRequirement));
            }
        });
    }

    /**
     * OVERRIDE: Wrapper function for handling click events on backlog nodes as navigation changes.
     */
    public onItemClick(node: BacklogTreeNode, nodeElement: JQuery, e?: JQueryEventObject): any {

        if (Agile.IsWebAccessAsyncEnabled()) {
            return this._confirmNavigationChange(e, node);
        }

        return super.onItemClick(node, nodeElement, e);
    }

    /**
     * Confirm whether or not we should allow a navigation change
     */
    private _confirmNavigationChange(event: JQueryEventObject, node: BacklogTreeNode) {

        if (this._options.isWorkQueuedDelegate && this._options.isWorkQueuedDelegate()) {
            if (this._options.getMessageAreaDelegate) {
                this._options.getMessageAreaDelegate().setMessage(ProductBacklogResources.ProductBacklog_Error_UnsavedChanges);
            }

            // User switched backlogs even though there is unsaved work
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.PRODUCTBACKLOG,
                CustomerIntelligenceConstants.PROPERTYNAME_SWITCH,
                CustomerIntelligenceConstants.PROPERTYVALUE_WITHUNSAVEDWORK));

            // Abort navigation
            return false;
        }

        if (this._options.isRefreshingDelegate && this._options.isRefreshingDelegate()) {
            // If we're already performing a backlog refresh, do nothing.
            return false;
        }
        return true;
    }

    public _updateNode(li: JQuery, node: BacklogTreeNode, level: number) {
        super._updateNode(li, node, level);

        // Show Filters before hub title
        this._showColoredBarsForBacklogPicker(node, li);
    }

    public getModel(): BacklogViewControlModel {
        return this._model;
    }

    private _showColoredBarsForBacklogPicker(node: BacklogTreeNode, $nodeElement: JQuery) {
        var $nodeContent = $nodeElement.find(".node-content");
        var nodeInfo = node.backlogNodeInfo;

        if ($nodeContent.children().hasClass("bowtie-backlog")) {
            return false;
        }

        $nodeContent.wrapInner($("<div>").addClass("backlogs-text"));
        RichContentTooltip.addIfOverflow(nodeInfo.name, $nodeContent.find(".backlogs-text"));
        if (!nodeInfo) {
            return false;
        }

        var $filter = $("<div>").addClass("bowtie-icon bowtie-backlog team-backlog-view-icon").css("color", nodeInfo.color);
        $nodeContent.append($filter);
    }

    /**
     * Determine if a backlog level (by plural name) should be shown.
     */
    private _isBacklogVisibleByName(name: string): boolean {
        Diag.Debug.assertParamIsNotNull(name, "name");

        let backlogLevelConfiguration = BacklogConfigurationService.getBacklogConfiguration().getBacklogByDisplayName(name);
        if (backlogLevelConfiguration) {
            return !Utils_Array.contains(BacklogConfigurationService.getBacklogConfiguration().hiddenBacklogs, backlogLevelConfiguration.id, Utils_String.ignoreCaseComparer);
        }
        else {
            Diag.Debug.fail("Couldn't find a backlog level using plural name. Assuming that the level is visible.");
            return true;
        }
    }
}

VSS.classExtend(BacklogViewControl, TFS_Host_TfsContext.TfsContext.ControlExtensions);

export interface IOnTileEditSaveActions {
    focusOnTile: boolean;
    createNewTile: boolean;
}

export module CommonSettingsConfigurationControl {
    export var CMD_COMMON_SETTINGS = "cmd-common-settings";

    /**
     * Initialize the commonSettingsConfiguration menuitem.
     *
     * @param menuBar Menubar which contains commonSettings menuitem.
     * @param onActionCallback Function callback on settings launch.
     * @param actionArgs An object passed to the registered action workers.
     */
    export function initialize(menuBar: Menus.MenuBar, onActionCallback?: Function, actionArgs?: any) {
        var commonSettingsMenuItem: Menus.MenuItem = menuBar.getItem(CMD_COMMON_SETTINGS);
        if (commonSettingsMenuItem) {
            commonSettingsMenuItem.update({
                id: CMD_COMMON_SETTINGS,
                icon: "bowtie-icon bowtie-settings-gear",
                showText: false,
                title: AgileControlsResources.Common_Setting_Config_Menu_Tooltip,
                action: () => {
                    Events_Action.getService().performAction(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, actionArgs);

                    if (onActionCallback) {
                        onActionCallback();
                    }
                },
            });
        }
    }

    /**
     * Create performace scenario for record telemetry.
     *
     * @param page The page that invoke the configuration setting.
     * @param isInitialLoad True if the configuration setting is first loaded on the page.
     */
    export function createPerfScenario(page: string, isInitialLoad: boolean): Performance.IScenarioDescriptor {
        var perfScenario = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_COMMON_CONFIG_DIALOG_OPENED);
        perfScenario.addData({
            Page: page,
            isInitialLoad: isInitialLoad
        });

        return perfScenario;
    }
}

export module FilterControls {
    export var FILTER_COMMAND = "filter-command";

    /**
     * Initialize the board filter menu item
     * @param menuBar Menubar which contains filter menuitem.
     * @param isFilterApplied bool which says if filter is applied on the board or not
     * @param icon Filter icon to be shown
     */
    export function initialize(menuBar: Menus.MenuBar, isFilterApplied: boolean, icon?: string) {
        Diag.Debug.assertParamIsType(menuBar, Menus.MenuBar, "menuBar");

        var filterMenuItem: Menus.MenuItem = menuBar.getItem(FILTER_COMMAND);
        if (!icon) {
            icon = "bowtie-icon bowtie-search-filter";
        }

        if (filterMenuItem) {
            filterMenuItem.update({
                id: FILTER_COMMAND,
                icon: icon,
                showText: false,
                title: AgileControlsResources.FilterIcon_ToolTip, //TODO get the correct tooltip text 
                toggled: isFilterApplied,
                action: () => {
                    //toggle the visibility of filter control
                    Events_Action.getService().performAction(Agile.Actions.LAUNCH_FILTER_CONTROL);

                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                        CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_CRITERIA_FILTER_ICON,
                        { "CriteriaFilterIcon": FILTER_COMMAND }));
                },
            });
        }
    }
}

/** Constants for Contributable tab scenarios */
export class ContributableTabConstants {
    public static EVENT_AGILE_CONTRIBUTED_TAB_SELECTED: string = "agile.contributed-tab-selected";

    //We need this event to get notified when product backlog view changes, e.g user changes to a different level 
    public static EVENT_BACKLOG_VIEW_CHANGE: string = "contribution-backlog.view.change";
}


/** Contributed tab displayed event args */
export interface IContributedTabDisplayedEventArgs {
    /** contribution id for the currently displayed contributed tab */
    contributionId: string;
    /** current pivot */
    selectedPivot: number;
}

