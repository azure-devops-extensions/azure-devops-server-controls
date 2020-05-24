///<amd-dependency path="jQueryUI/tabs"/>

/// <reference types="jquery" />

import "VSS/LoaderPlugins/Css!Areas";
import "VSS/LoaderPlugins/Css!Site";

import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Service = require("VSS/Service");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import AlertsOM = require("Alerts/Scripts/TFS.Alerts");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import TreeView = require("VSS/Controls/TreeView");
import Splitter = require("VSS/Controls/Splitter");
import Combos = require("VSS/Controls/Combos");
import Dialogs = require("VSS/Controls/Dialogs");
import Filters = require("VSS/Controls/Filters");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Validation = require("VSS/Controls/Validation");
import Grids = require("VSS/Controls/Grids");
import AlertsResources = require("Alerts/Scripts/Resources/TFS.Resources.Alerts");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WorkItemTracking = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import QueryAdapter_Async = require("WorkItemTracking/Scripts/OM/QueryAdapter");

var TfsContext = TFS_Host_TfsContext.TfsContext;
var delegate = Utils_Core.delegate;


export class AlertsGrid extends Grids.GridO<any> {

    public static enhancementTypeName: string = "tfs.alerts.alertsGrid";

    private _alertsManager: any;
    private _currentFilter: any;
    private _popup: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: true,
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                updateCommandStates: delegate(this, this._updateCommandStates),
                executeAction: delegate(this, this._onMenuItemClick)
            },
            cssClass: "alerts-grid",
            columns: this._getColumns(),
            sortOrder: this._getSortOrder(),
            initialSelection: false
        }, options));
    }


    public refreshColumns() {
        this._columns = this._getColumns();
    }

    public onSort(sortOrder: any, sortColumns?: any): any {
        /// <param name="sortOrder" type="any" />
        /// <param name="sortColumns" type="any" optional="true" />
        /// <returns type="any" />

        var i, l, selectedAlert = this.getSelectedAlert();

        this._trySorting(sortOrder, sortColumns);
        this._sortOrder = sortOrder;
        this.layout();

        if (selectedAlert) {
            for (i = 0, l = this._dataSource.length; i < l; i++) {
                if (this._dataSource[i] && selectedAlert.id === this._dataSource[i].id) {
                    this._selectRow(this._getRowIndex(i));
                    break;
                }
            }
        }
    }

    public initialize() {
        super.initialize();

        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._options.tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);
        this._currentFilter = { scope: AlertsOM.AlertsScope.My, categoryName: null };
    }

    public hide() {
        this._element.hide();
    }

    public show() {
        this._element.show();
    }

    public setSource(rawSource) {
        var options = this._options, i, l, indexToSelect, prevSelection = this.getSelectedAlert();
        var state = Navigation_Services.getHistoryService().getCurrentState();
        var subscriptionId = state.id;

        options.source = rawSource;
        options.columns = this._columns;
        options.sortOrder = this._sortOrder;

        this.initializeDataSource();
        this.onSort(options.sortOrder);

        if (rawSource && rawSource.length > 0) {
            if (subscriptionId) {
                var subscriptionIndex = this.getIndexById(parseInt(subscriptionId));
                if (subscriptionIndex > -1) {
                    this._selectRow(subscriptionIndex);
                    return;
                }
            }

            indexToSelect = 0;
            if (prevSelection) {
                for (i = 0, l = rawSource.length; i < l; i++) {
                    if (rawSource[i] && prevSelection.id === rawSource[i].id) {
                        indexToSelect = this._getRowIndex(i);
                        break;
                    }
                }
            }

            this._selectRow(indexToSelect);

        }
    }

    public getCurrentFilter() {
        return this._currentFilter;
    }

    public setFilter(filter, callback) {
        var scopeChanged;

        if (!filter) {
            filter = { scope: AlertsOM.AlertsScope.My, categoryName: null };
        }

        scopeChanged = !this._currentFilter || this._currentFilter.scope !== filter.scope;
        this._currentFilter = filter;

        if (scopeChanged) {
            this._columns = this._getColumns();
            this._sortOrder = this._getSortOrder();
        }

        this.refresh(callback);
    }

    public refresh(callback) {
        var that = this;

        if (this._currentFilter.userId) {
            this._alertsManager.getAlertsForUser(this._currentFilter.userId, function (alerts) {
                that._refreshCallback(alerts, callback);
            });
        }
        else {
            this._alertsManager.getAlerts(this._currentFilter.scope, getTeamAlertsPivotValue(), function (alerts) {
                that._refreshCallback(alerts, callback);
            });
        }
    }

    public getIndexById(id) {
        var i, l,
            source = this._dataSource;

        for (i = 0, l = source.length; i < l; i++) {
            if (id === source[i].id) {
                return i;
            }
        }
        return -1;
    }

    public getSelectedAlerts() {
        var selectedItems = [],
            rowIndex;

        for (rowIndex in this._selectedRows) {
            if (this._selectedRows.hasOwnProperty(rowIndex)) {
                selectedItems.push(this._dataSource[this._selectedRows[rowIndex]]);
            }
        }

        return selectedItems;
    }

    public getSelectedAlert() {
        var selectedDataIndex = this._selectedRows[this._selectedIndex];
        return (typeof (selectedDataIndex) === "number") ? this._dataSource[selectedDataIndex] : null;
    }

    public selectedIndexChanged(selectedRowIndex, selectedDataIndex) {
        super.selectedIndexChanged(selectedRowIndex, selectedDataIndex);
        this._fire("selectedAlertChanged", this._dataSource[selectedDataIndex]);
    }

    public updateSelectedAlertRow() {
        this.updateRow(this.getSelectedRowIndex());
    }

    private _getColumns() {
        var columns = [];

        columns.push({
            index: "name",
            text: AlertsResources.AlertNameColumn,
            width: 250
        });

        columns.push({
            text: AlertsResources.AlertSendToColumn,
            width: 250,
            getColumnValue: function (dataIndex, columnIndex, columnOrder) {
                /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
                /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
                /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
                /// <returns type="any" />

                var thisAlert = this._dataSource[dataIndex], address = thisAlert.deliveryPreference.address, subscriber;
                if (!address) {
                    subscriber = this._alertsManager.getSubscriber(thisAlert.subscriberId);
                    if (subscriber) {
                        address = subscriber.isGroup ? AlertsResources.MembersEmail : AlertsResources.DefaultAlertAddress;
                    }
                }
                return address;
            },
            comparer: function (column, order, item1, item2) {
                return Utils_String.localeIgnoreCaseComparer(item1.deliveryPreference.address, item2.deliveryPreference.address);
            }
        });

        columns.push({
            text: AlertsResources.AlertFormatColumn,
            width: 80,
            getColumnValue: function (dataIndex, columnIndex, columnOrder) {
                /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
                /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
                /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
                /// <returns type="any" />

                return AlertsOM.DeliveryType.getName(this._dataSource[dataIndex].deliveryPreference.type);
            },
            comparer: function (column, order, item1, item2) {
                return Utils_String.localeIgnoreCaseComparer(
                    AlertsOM.DeliveryType.getName(item1.deliveryPreference.type),
                    AlertsOM.DeliveryType.getName(item2.deliveryPreference.type));
            }
        });

        columns.push({
            index: "categoryName",
            text: AlertsResources.AlertCategoryColumn,
            width: 120
        });

        if ((this._currentFilter && this._currentFilter.scope === AlertsOM.AlertsScope.All) || getTeamAlertsPivotValue()) {
            columns.push({
                index: "subscriber",
                text: AlertsResources.AlertSubscriberColumn,
                width: 200,
                getColumnValue: function (dataIndex, columnIndex, columnOrder) {
                    /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
                    /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
                    /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
                    /// <returns type="any" />

                    var subscriber = this._alertsManager.getSubscriber(this._dataSource[dataIndex].subscriberId);
                    return subscriber && subscriber.displayName;
                },
                comparer: function (column, order, item1, item2) {
                    var subscriber1 = this._alertsManager.getSubscriber(item1.subscriberId),
                        subscriber2 = this._alertsManager.getSubscriber(item2.subscriberId);

                    return Utils_String.localeIgnoreCaseComparer(
                        subscriber1 && subscriber1.displayName,
                        subscriber2 && subscriber2.displayName);
                }
            });
        }

        return columns;
    }

    private _getSortOrder() {
        var sortColumns = [];
        if (this._currentFilter && this._currentFilter.scope === AlertsOM.AlertsScope.All) {
            sortColumns.push({ index: "subscriber", order: "asc" });
        }
        sortColumns.push({ index: "categoryName", order: "asc" });
        sortColumns.push({ index: "name", order: "asc" });
        return sortColumns;
    }

    private _getContextMenuItems() {
        var that = this;

        function getActionArgs() {
            return {
                selectedAlerts: that.getSelectedAlerts(),
                selectedAlert: that.getSelectedAlert()
            };
        }

        return [{ rank: 5, id: "open-alert", text: AlertsResources.OpenAlert, icon: "icon-open", 'arguments': getActionArgs },
            { rank: 10, id: "delete-alert", text: AlertsResources.DeleteAlert, icon: "icon-delete", 'arguments': getActionArgs }];
    }

    private _updateCommandStates(menu) {
        var items = this.getSelectedAlerts();
        menu.updateCommandStates([{
            id: "open-alert",
            disabled: !items || items.length !== 1
        }, {
                id: "delete-alert",
                disabled: !items || items.length < 1
            }]);
    }

    private _onMenuItemClick(e?) {
        this._fire("alertMenuItemClicked", e);
    }

    private _refreshCallback(alerts, callback) {
        var filteredAlerts, i, l;
        if (this._currentFilter.categoryName) {
            filteredAlerts = [];
            for (i = 0, l = alerts.length; i < l; i++) {
                if (Utils_String.localeIgnoreCaseComparer(this._currentFilter.categoryName, alerts[i].categoryName) === 0) {
                    filteredAlerts.push(alerts[i]);
                }
            }
        }
        else {
            filteredAlerts = alerts;
        }

        this.setSource(filteredAlerts);

        if ($.isFunction(callback)) {
            callback.call(this, filteredAlerts);
        }
    }

    public _updateRow(rowInfo, rowIndex, dataIndex, expandedState, level) {
        var thisAlert;
        super._updateRow(rowInfo, rowIndex, dataIndex, expandedState, level);

        rowInfo.row.removeClass("dirty-alert-row invalid-alert-row");
        thisAlert = this._dataSource[dataIndex];
        if (thisAlert.dirty) {
            rowInfo.row.addClass("dirty-alert-row");
        }
        if (!thisAlert.isValid()) {
            rowInfo.row.addClass("invalid-alert-row");
        }
    }
}

VSS.initClassPrototype(AlertsGrid, {
    _alertsManager: null,
    _currentFilter: null,
    _popup: null
});

VSS.classExtend(AlertsGrid, TfsContext.ControlExtensions);


function addFilterNode(parentNode, scope, categoryName, userId, userName) {
    var name, title, node, team;

    if (categoryName) {
        name = Utils_String.format(AlertsResources.CategoryNodeFormat, categoryName);
    }
    else if (userName) {
        name = Utils_String.format(AlertsResources.AlertsUserNodeFormat, userName);
    }
    else {
        switch (scope) {

            case AlertsOM.AlertsScope.My:
                name = AlertsResources.MyAlerts;
                break;

            case AlertsOM.AlertsScope.Team:
                team = TfsContext.getDefault().currentTeam;
                if (team) {
                    name = Utils_String.format(AlertsResources.AlertsTeamNodeFormat, team.name);
                    title = Utils_String.format(AlertsResources.TeamAlertsTitleFormat, team.name);
                }
                else {
                    name = AlertsResources.TeamAlerts;
                }
                break;

            case AlertsOM.AlertsScope.All:
                name = AlertsResources.AllAlerts;
                break;
        }
    }

    node = TreeView.TreeNode.create(name);
    node.rawName = name;
    node.title = title || name;
    node.scope = scope;
    node.categoryName = categoryName;
    node.userId = userId;
    node.userName = userName;

    if (!categoryName) {
        node.folder = true;
    }

    parentNode.add(node);
    return node;
}

export interface AlertTypesTreeOptions extends TreeView.ITreeOptions {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    hideTfVcCategory: boolean;
    hideGitCategory: boolean;
    showAllAlertsNode: boolean;
}

export class AlertTypesTree extends TreeView.TreeViewO<AlertTypesTreeOptions> {

    private _alertsManager: any;
    private _scopeFolderNodes: any;
    private _userNodes: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            clickToggles: true,
            cssClass: "alerts-tree",
            showAllAlertsNode: true
        }, options));
    }

    public initialize() {
        super.initialize();

        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._options.tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);
        this._bind(window, "managed-alerts-updated", delegate(this, this._onManagedAlertsUpdated), true);
        this._element.bind("selectionchanged", delegate(this, this._onAlertTypeChanged));

        this._populate();
    }

    public showUserNode(userName, userId) {
        var userNode = this._userNodes[userId];

        if (!userNode) {
            userNode = this._createAlertScopeNodes(AlertsOM.AlertsScope.All, userId, userName);
            userNode.expanded = true;
            userNode.hasExpanded = true;
            this._draw();
        }

        this.setSelectedNode(userNode);
    }

    public selectScopeFolderNode(scope) {
        this.setSelectedNode(this._scopeFolderNodes[scope]);
    }

    public getSelectedFilter() {
        return this._getFilterFromNode(this.getSelectedNode());
    }

    public _toggle(node, nodeElement): any {
        /// <returns type="any" />

        super._toggle(node, nodeElement);
        if (node.expanded) {
            node.hasExpanded = true;
            this._ensureAlertsAreLoaded(this._getFilterFromNode(node));
        }
    }

    public setSelectedNode(node, suppressChangeEvent?: boolean) {
        /// <param name="suppressChangeEvent" type="boolean" optional="true" />

        // Expand a parent node the first time it is clicked
        if (node && !node.hasExpanded) {
            node.expanded = true;
        }
        super.setSelectedNode(node);
    }

    private _populate() {
        var myNode, teamNode;

        this.rootNode.clear();

        // Populate all nodes
        myNode = this._createAlertScopeNodes(AlertsOM.AlertsScope.My);
        myNode.expanded = true;
        myNode.hasExpanded = true;

        if (TfsContext.getDefault().currentTeam) {
            teamNode = this._createAlertScopeNodes(AlertsOM.AlertsScope.Team);
            this._ensureAlertsAreLoaded({ scope: AlertsOM.AlertsScope.Team });
        }

        if (this._options.showAllAlertsNode) {
            this._createAlertScopeNodes(AlertsOM.AlertsScope.All);
        }


        this._draw();

        this.setSelectedNode(myNode);
    }

    private _createAlertScopeNodes(scope: number, userId?: string, userName?: string) {
        /// <param name="scope" type="number" />
        /// <param name="userId" type="string" optional="true" />
        /// <param name="userName" type="string" optional="true" />

        var folderNode = addFilterNode(this.rootNode, scope, null, userId, userName);

        if (userId) {
            this._userNodes[userId] = folderNode;
        }
        else {
            this._scopeFolderNodes[scope] = folderNode;
        }

        this._populateAlertTypeNodes(folderNode, scope, userId, userName);
        return folderNode;
    }

    private _populateAlertTypeNodes(folderNode, scope, userId, userName) {
        folderNode.children = [];
        addFilterNode(folderNode, scope, AlertsResources.CategoryWorkItem, userId, userName);

        if (!this._options.hideTfVcCategory) {
            addFilterNode(folderNode, scope, AlertsResources.CategoryCheckin, userId, userName);
        }

        if (!this._options.hideGitCategory) {
            addFilterNode(folderNode, scope, AlertsResources.CategoryGitPush, userId, userName);
            addFilterNode(folderNode, scope, AlertsResources.CategoryGitPullRequest, userId, userName);
        }

        addFilterNode(folderNode, scope, AlertsResources.CategoryBuild, userId, userName);

        if (!this._options.hideTfVcCategory) {
            addFilterNode(folderNode, scope, AlertsResources.CategoryCodeReview, userId, userName);
        }
    }

    private _onAlertTypeChanged() {
        this._fire("alertfilterchange", this.getSelectedFilter());
    }

    private _getFilterFromNode(node) {
        return {
            scope: node ? node.scope : AlertsOM.AlertsScope.My,
            categoryName: node ? node.categoryName : null,
            userName: node ? node.userName : null,
            userId: node ? node.userId : null
        };
    }

    private _updateNodeCounts(node, alertsAtScope) {
        var i, l,
            count = 0;

        if (!node.categoryName) {
            count = alertsAtScope.length;
        }
        else {
            count = 0;
            for (i = 0, l = alertsAtScope.length; i < l; i++) {
                if (Utils_String.localeIgnoreCaseComparer(alertsAtScope[i].categoryName, node.categoryName) === 0) {
                    count++;
                }
            }
        }

        if (count === 0) {
            node.text = node.rawName;
        }
        else {
            node.text = node.rawName + " (" + count + ")";
        }
    }

    private _onManagedAlertsUpdated(e?) {
        var that = this,
            cachedScopes = this._alertsManager.getCachedScopes(),
            cachedUsers = this._alertsManager.getCachedUsers();

        $.each(this._scopeFolderNodes, function (scope, node) {
            if ($.inArray(scope - 0, cachedScopes) >= 0) {
                that._alertsManager.getAlerts(scope, getTeamAlertsPivotValue(), function (alerts) {
                    that._updateParentNodeCounts(node, alerts);
                });
            }
            else {
                that._updateParentNodeCounts(node, []);
            }
        });

        $.each(this._userNodes, function (userId, node) {
            if ($.inArray(userId, cachedUsers) >= 0) {
                that._alertsManager.getAlertsForUser(userId, function (alerts) {
                    that._updateParentNodeCounts(node, alerts);
                });
            }
            else {
                that._updateParentNodeCounts(node, []);
            }
        });

        this._draw();
    }

    private _updateParentNodeCounts(node, alerts) {
        var i, l;
        this._updateNodeCounts(node, alerts);
        for (i = 0, l = node.children.length; i < l; i++) {
            this._updateNodeCounts(node.children[i], alerts);
        }
    }

    private _ensureAlertsAreLoaded(filter) {

        if (filter.userId) {
            this._alertsManager.getAlertsForUser(filter.userId);
        }
        else {
            this._alertsManager.getAlerts(filter.scope, getTeamAlertsPivotValue());
        }
    }
}

VSS.initClassPrototype(AlertTypesTree, {
    _alertsManager: null,
    _scopeFolderNodes: {},
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _userNodes: {} //TODO: Dangerous member initialization on prototype. Get rid of it.

});

VSS.classExtend(AlertTypesTree, TfsContext.ControlExtensions);



export class AlertEditor extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.alerts.AlertEditor";

    private _alertsManager: any;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _currentAlert: any;
    private _nameCombo: any;
    private _formatCombo: any;
    private _toAddressCombo: any;
    private _editAddressLink: any;
    private _subscriberCombo: any;
    private _subscriberListNames: any[];
    private _subscriberListIds: any[];
    private _filterControl: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            cssClass: "alerts-editor"
        }, options));
    }

    public initialize() {
        var $filtersContainer: JQuery,
            that = this;

        super.initialize();

        this._bind("filterModified", function () { that._fireAlertModified(); });

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);
        this._createPropertiesEditor();

        $filtersContainer = $("<div />").addClass("alerts-filter-section-container");
        $("<label />").text(AlertsResources.AlertEditorFilterGroupLabel).appendTo($filtersContainer);
        this._filterControl = <AlertFilter>Controls.BaseControl.createIn(AlertFilter, $filtersContainer, { tfsContext: this._tfsContext });
        $filtersContainer.appendTo(this._element);

        this.bindAlert(null);
    }

    public isCurrentAlertValid() {
        return Validation.validateGroup("*", null, this._element);
    }

    public bindAlert(alertToBind) {
        var subscriber, owner, isGroupAlert, subscriberIndex;

        this._currentAlert = null;

        if (alertToBind) {
            subscriber = this._alertsManager.getSubscriber(alertToBind.subscriberId);
            owner = this._alertsManager.getSubscriber(alertToBind.ownerId);
            isGroupAlert = subscriber && subscriber.isGroup;

            this._element.show();

            if (alertToBind.isBasicAlert) {
                this._nameCombo.setText(Utils_String.format(AlertsResources.BasicAlertDisplayedNameFormat, alertToBind.name || ""));
            }
            else {
                this._nameCombo.setText(alertToBind.name || "", true);
            }
            this._nameCombo.setEnabled(!alertToBind.isBasicAlert);

            this._formatCombo.setText(AlertsOM.DeliveryType.getName(alertToBind.deliveryPreference.type));
            this._updateAddressControl(alertToBind, alertToBind.deliveryPreference.address);

            // Set the subscriber control
            this._subscriberListNames = [this._tfsContext.currentIdentity.displayName];
            this._subscriberListIds = [this._tfsContext.currentIdentity.id];
            if (this._tfsContext.currentTeam) {
                this._subscriberListNames.push(this._tfsContext.currentTeam.name);
                this._subscriberListIds.push(this._tfsContext.currentTeam.identity.id);
            }

            if (!subscriber || subscriber.teamFoundationId === this._tfsContext.currentIdentity.id) {
                subscriberIndex = 0;
            }
            else if (this._tfsContext.currentTeam && subscriber.teamFoundationId === this._tfsContext.currentTeam.identity.id) {
                subscriberIndex = 1;
            }
            else {
                this._subscriberListNames.push(subscriber.displayName);
                this._subscriberListIds.push(subscriber.teamFoundationId);
                subscriberIndex = 2;
            }
            this._subscriberCombo.setSource(this._subscriberListNames);
            this._subscriberCombo.setSelectedIndex(subscriberIndex);
            this._subscriberCombo.setEnabled((alertToBind.id === 0 && !this._options.onlyMyScope) ? true : false);

            // Set the filter
            this._filterControl.setAlert(alertToBind);
        }
        else {
            this._element.hide();
        }

        this._currentAlert = alertToBind;
    }

    private _createPropertiesEditor() {
        var that = this, $propertiesContainer, id = Controls.getId();

        // Create the properties container
        $propertiesContainer = $("<div />").addClass("alert-editor-properties");

        // Alert Name
        $("<label class='name-label' />").text(AlertsResources.AlertEditorNameLabel).attr("for", id + "_alertEditor_name").appendTo($propertiesContainer);
        this._nameCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $propertiesContainer, { cssClass: "name-combo", mode: "text", id: id + "_alertEditor_name", allowEdit: true, change: function () { that._onPropertyChanged("name"); } });

        // Subscriber (My/Team)
        $("<label class='subscriber-label' />").text(AlertsResources.SubscriberLabel).attr("for", id + "_alertEditor_subscriber").appendTo($propertiesContainer);
        this._subscriberCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $propertiesContainer, { cssClass: "subscriber-combo", enabled: false, mode: "drop", id: id + "_alertEditor_subscriber", allowEdit: false, source: [], change: function () { that._onPropertyChanged("subscriber"); } });

        // To Address
        $("<label class='address-label' />").text(AlertsResources.AlertEditorAddressLabel).attr("for", id + "_alertEditor_address").appendTo($propertiesContainer);
        this._toAddressCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $propertiesContainer, { cssClass: "address-combo", mode: "text", enabled: false, id: id + "_alertEditor_address", allowEdit: true, change: function () { that._onPropertyChanged("address"); } });
        this._editAddressLink = $("<a href='#' class='edit-address-link' />").text(AlertsResources.EditLinkText).appendTo($propertiesContainer).click(delegate(this, this._handleEditAddressesClick));

        // Format (HTML/PlainText)
        $("<label class='format-label' />").text(AlertsResources.AlertEditorFormatLabel).attr("for", id + "_alertEditor_format").appendTo($propertiesContainer);
        this._formatCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $propertiesContainer, { cssClass: "format-combo", mode: "drop", id: id + "_alertEditor_format", allowEdit: false, source: [AlertsResources.DeliveryTypeEmailHtml, AlertsResources.DeliveryTypeEmailPlainText, AlertsResources.DeliveryTypeSoap], change: function () { that._onPropertyChanged("deliveryType"); } });

        this._element.append($propertiesContainer);

        // Setup Validation elements
        <Validation.RequiredValidator<Validation.BaseValidatorOptions>>Controls.Enhancement.enhance(Validation.RequiredValidator, this._nameCombo, { message: AlertsResources.ValidatorNameRequired });
        <Validation.MaxLengthValidator<Validation.MaxLengthValidatorOptions>>Controls.Enhancement.enhance(Validation.MaxLengthValidator, this._nameCombo, { message: AlertsResources.ValidatorNameExceedsMaxLength, maxLength: 255 });
        <Validation.RequiredValidator<Validation.BaseValidatorOptions>>Controls.Enhancement.enhance(Validation.RequiredValidator, this._toAddressCombo, {
            message: function () {
                var isSoapFormat = that._formatCombo.getSelectedIndex() === AlertsOM.DeliveryType.SOAP;
                return isSoapFormat ? AlertsResources.ValidatorSoapAddressRequired : AlertsResources.ValidatorEmailRequired;
            }
        });
        <Validation.ValidationSummary>Controls.BaseControl.createIn(Validation.ValidationSummary, this._element, { context: this._element });
    }

    private _handleEditAddressesClick() {
        var address, subscriber;
        if (this._currentAlert) {
            address = this._currentAlert.deliveryPreference.address;
            subscriber = this._alertsManager.getSubscriber(this._currentAlert.subscriberId);
            if (subscriber) {
                    Dialogs.show(EditEmailAddressesDialog, {
                        defaultLabelText: AlertsResources.DefaultAddressesRadioLabel,
                        customLabelText: AlertsResources.CustomAddressesRadioLabel,
                        defaultAddresses: subscriber.email,
                        initialAddresses: address || null,
                        onOkClick: delegate(this, this._handleEditAddressesOkClick)
                    });
            }
        }
    }

    private _handleMyNotificationAddressOkClick(address, callback, errorCallback?) {
		var that = this;
			if (address.indexOf(',') >= 0 || address.indexOf(';') >= 0) {
				this._handleEditAddressesOkClick(address, callback, errorCallback);
			}
			else {
				this._alertsManager.setMyCustomNotificationAddress(address, function (savedAddress) {
					if (that._currentAlert) {
						that._updateAddressControl(that._currentAlert, savedAddress);
						that._currentAlert.deliveryPreference.address = '';
						that._currentAlert.dirty = true;
						that._fireAlertModified();
						if ($.isFunction(callback)) {
							callback.call(that);
						}
					}
				}, errorCallback);
			}
    }

    private _handleEditAddressesOkClick(addresses, callback, errorCallback?) {
        if ($.isFunction(callback)) {
            callback.call(this);
        }
        if (this._currentAlert) {
            this._currentAlert.deliveryPreference.address = addresses;
            this._updateAddressControl(this._currentAlert, addresses);
            this._currentAlert.dirty = true;
            this._fireAlertModified();
        }
    }

    private _updateAddressControl(currentAlert, address) {
        var that = this, subscriber, defaultAddress, completedInline,
            hosted = this._tfsContext.isHosted,
            isMyAlert = currentAlert && currentAlert.subscriberId === this._tfsContext.currentIdentity.id;

        if (currentAlert &&
            currentAlert.deliveryPreference.type !== AlertsOM.DeliveryType.HTML &&
            currentAlert.deliveryPreference.type !== AlertsOM.DeliveryType.PlainText) {

            this._toAddressCombo.setEnabled(true);
            this._toAddressCombo.setText(address, true);
            this._setEditAddressLinkEnabled(false);
            return;
        }

        this._toAddressCombo.setEnabled(false);

        if (currentAlert) {
            subscriber = this._alertsManager.getSubscriber(currentAlert.subscriberId);
        }

        if (subscriber && subscriber.isGroup) {
            this._toAddressCombo.setText(address ? address : AlertsResources.MembersEmail, true);
			 this._setEditAddressLinkEnabled(false);
        }
        else {
		 this._setEditAddressLinkEnabled(true);
            if (!subscriber && currentAlert.subscriberId === this._tfsContext.currentIdentity.id) {

                // Changed subscriber to "Me" but my alerts haven't been fetched yet
                completedInline = false;
                this._alertsManager.getAlerts(AlertsOM.AlertsScope.My, getTeamAlertsPivotValue(), function () {
                    if (that._alertsManager.getSubscriber(currentAlert.subscriberId)) {
                        that._updateAddressControl(that._currentAlert, null);
                        completedInline = true;
                    }
                });
                if (completedInline) {
                    return;
                }
            }

            if (address) {
                this._toAddressCombo.setText(address, true);
            }
            else {
                defaultAddress = subscriber && subscriber.email;
                if (defaultAddress || hosted) {
                    that._toAddressCombo.setText(Utils_String.format(AlertsResources.DefaultAddressFormat, defaultAddress || ""), true);
                    currentAlert.deliveryPreference.address = '';
                }
                else {
                    // No default address - make text editable: will be highlighted as invalid
                    that._toAddressCombo.setEnabled(true);
                    that._toAddressCombo.setText("", true);
                    that._setEditAddressLinkEnabled(false);
                }
            }
        }
    }

    private _setEditAddressLinkEnabled(enabled) {
        if (enabled) {
            this._editAddressLink.show();
        }
        else {
            this._editAddressLink.hide();
        }
    }

    private _onPropertyChanged(propertyName) {
        var changed = false, selectedIndex, newSubscriberId, newMail;

        if (this._currentAlert) {
            switch (propertyName) {
                case "name":
                    if (!this._currentAlert.isBasicAlert &&
                        Utils_String.localeIgnoreCaseComparer(this._currentAlert.name, this._nameCombo.getText()) !== 0) {

                        this._currentAlert.name = this._nameCombo.getText();
                        changed = true;
                    }
                    break;
                case "address":
                    if (this._toAddressCombo.getEnabled()) {
                        newMail = this._toAddressCombo.getText();
                        if (Utils_String.localeIgnoreCaseComparer(this._currentAlert.deliveryPreference.address, newMail) !== 0) {
                            this._currentAlert.deliveryPreference.address = newMail;
                            changed = true;
                        }
                    }
                    break;
                case "deliveryType":
                    selectedIndex = this._formatCombo.getSelectedIndex();
                    if (selectedIndex !== this._currentAlert.deliveryPreference.type) {
                        if (selectedIndex >= 0) {
                            var address = this._currentAlert.deliveryPreference.address;
                            // if the delivery type changes from soap to email
                            if (selectedIndex !== AlertsOM.DeliveryType.SOAP && this._currentAlert.deliveryPreference.type === AlertsOM.DeliveryType.SOAP) {
                                address = null;
                            }
                            // if the delivery type changes from email to soap
                            else if (selectedIndex === AlertsOM.DeliveryType.SOAP) {
                                address = null;
                            }
                            this._currentAlert.deliveryPreference.type = selectedIndex;
                            this._updateAddressControl(this._currentAlert, address);
                        }
                        changed = true;
                    }
                    break;
                case "subscriber":
                    selectedIndex = this._subscriberCombo.getSelectedIndex();
                    newSubscriberId = this._subscriberListIds[selectedIndex] || "";
                    if (newSubscriberId !== this._currentAlert.subscriberId) {
                        this._currentAlert.subscriberId = newSubscriberId;
                        changed = true;
                        this._updateAddressControl(this._currentAlert, null);
                    }
                    break;
            }
            if (changed) {
                this._currentAlert.dirty = true;
                this._fireAlertModified();
            }
        }
    }

    private _fireAlertModified() {
        this._fire("alertModified", this._currentAlert);
    }
}

VSS.initClassPrototype(AlertEditor, {
    _alertsManager: null,
    _tfsContext: null,
    _currentAlert: null,
    _nameCombo: null,
    _formatCombo: null,
    _toAddressCombo: null,
    _editAddressLink: null,
    _subscriberCombo: null,
    _subscriberListNames: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _subscriberListIds: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _filterControl: null
});

VSS.classExtend(AlertEditor, TfsContext.ControlExtensions);

interface AlertFilterOptions extends Filters.IFilterControlOptions {
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

class AlertFilter extends Filters.FilterControlO<AlertFilterOptions> {

    public static enhancementTypeName: string = "tfs.alerts.AlertFilter";

    private _alertsManager: any;
    private _alert: any;
    private _queryAdapter: any;
    private _witProject: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "alerts-filter"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._options.tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);
    }

    public setAlert(alert) {
        var that = this, witStore, tfsContext, async = true;

        this._alert = alert;

        if (alert.subscriptionType === AlertsOM.SubscriptionType.WorkItemChangedEvent) {

            VSS.using(['WorkItemTracking/Scripts/TFS.WorkItemTracking', 'WorkItemTracking/Scripts/OM/QueryAdapter'],
                (_TFS_WorkItemTracking: typeof TFS_WorkItemTracking, _QueryAdapter: typeof QueryAdapter_Async) => {
                tfsContext = that._options.tfsContext;
                witStore = TFS_OM.ProjectCollection.getConnection(tfsContext).getService<TFS_WorkItemTracking.WorkItemStore>(_TFS_WorkItemTracking.WorkItemStore);
                witStore.beginGetProject(tfsContext.navigation.project, function (project) {
                    async = false;
                    that._witProject = project;
                    that._queryAdapter = TFS_OM.ProjectCollection.getConnection(tfsContext).getService<QueryAdapter_Async.QueryAdapter>(_QueryAdapter.QueryAdapter);

                    if (alert === that._alert) {
                        that.setFilter(alert.filter);
                    }
                });
            });

            if (async) {
                that.setFilter(alert.filter);
            }
        }
        else {
            this.setFilter(alert.filter);
        }
    }

    public _getDefaultClause() {
        /// <summary>Get the default clause for this filter.</summary>
        return { logicalOperator: AlertsResources.LogicalOperatorAnd, fieldName: "", operator: AlertsResources.OperatorEqualTo, value: "", index: 0 };
    }

    public _updateAndOrControl(andOrControl: any, clause: any) {
        /// <summary>Update the and/or dropdown based on the given clause</summary>
        /// <param name="andOrControl" type="Object">The control to be updated.</param>
        /// <param name="clause" type="Object">The clause associated with the control.</param>
        andOrControl.setText(clause.logicalOperator);
        andOrControl.setSource([AlertsResources.LogicalOperatorAnd, AlertsResources.LogicalOperatorOr]);
    }

    public _updateFieldControl(fieldControl: any, clause: any) {
        /// <summary>Update the field dropdown based on the given clause</summary>
        /// <param name="fieldControl" type="Object">The control to be updated.</param>
        /// <param name="clause" type="Object">The clause associated with the control.</param>
        fieldControl.setText(clause.fieldName);

        this._alert.adapter.beginGetFilterFields(this._alertsManager, function (fields) {
            var i, l, fieldNames = [];

            if (!fieldControl._disposed) {
                for (i = 0, l = fields.length; i < l; i++) {
                    fieldNames.push(fields[i].fieldName);
                }
                fieldControl.setSource(fieldNames);
                fieldControl.setMode(fieldNames.length > 0 ? "drop" : "text");
            }
        });
    }

    public _updateOperatorControl(operatorControl: any, clause: any, updateClause?: boolean) {
        /// <summary>Update the operator dropdown based on the given clause</summary>
        /// <param name="operatorControl" type="Object">The control to be updated.</param>
        /// <param name="clause" type="Object">The clause associated with the control.</param>
        /// <param name="updateClause" type="Boolean" optional="true">True to update the clause with the new operator/value.</param>
        var asynch = true;

        function setSource(operators) {
            operators = operators || [];

            if (operators.length) {
                operatorControl.setSource(operators);
                operatorControl.setMode("drop");
            }
            else {
                operatorControl.setSource([]);
                operatorControl.setMode("text");
            }

            if (updateClause) {
                if (clause.operator) {
                    if (!Utils_Array.contains(operators, clause.operator, Utils_String.localeIgnoreCaseComparer)) {
                        clause.operator = "";
                        clause.value = "";
                    }
                }

                if (!clause.operator && operators.length) {
                    clause.operator = operators[0];
                }
            }

            operatorControl.setText(clause.operator || "");
        }

        if (clause.fieldName) {

            this._alert.adapter.getFilterFieldByName(this._alertsManager, clause.fieldName, function (field) {
                asynch = false;

                if (!operatorControl._disposed) {
                    setSource(field ? field.operators : [AlertsResources.OperatorEqualTo]);
                }
            });

            if (asynch) {
                setSource([AlertsResources.OperatorEqualTo]);
            }
        }
        else {
            setSource([AlertsResources.OperatorEqualTo]);
        }
    }

    public _updateValueControl(valueControl: any, clause: any) {
        /// <summary>Update the value dropdown based on the given clause</summary>
        /// <param name="valueControl" type="Object">The control to be updated.</param>
        /// <param name="clause" type="Object">The clause associated with the control.</param>
        var that = this, fieldValues;
        valueControl.setText(clause.value);
        this._updateValueControlEnablement(valueControl, clause);

        function setDropdownItems(values) {
            if (values && values.length > 0) {
                valueControl.setType("list");
                valueControl.setMode("drop");
                valueControl.setSource(values);
            }
            else {
                valueControl.setType("list");
                valueControl.setMode("text");
                valueControl.setSource([]);
            }
        }

		function _logProperties(objectValue: any)
		{
			for (var x in objectValue) {
			console.warn("Property: " + x + ", Value: " + objectValue[x]);
			}
		}

		function formatValues(values) {
			var formattedValues = [];
			var i;
			for (i = 0; i < values.length ;i++) {
				if (typeof values[i] == "object") {
					if (values[i].displayName && values[i].displayName !== "") {
						formattedValues.push(values[i].displayName);
					}
					else {
						_logProperties(values[i]);
						formattedValues.push(values[i]);
					}
				}
				else {
					formattedValues.push(values[i]);
				}
			}
			return formattedValues;
		}

        if (clause.fieldName && clause.operator) {

            this._alert.adapter.getFilterFieldByName(this._alertsManager, clause.fieldName, function (field) {
                fieldValues = field ? field.values : [];

                if (!that._queryAdapter) {
                    if (!valueControl._disposed) {
                        setDropdownItems(fieldValues);
                    }
                }
                else if (that._witProject) {
                    that._queryAdapter.beginGetAvailableFieldValues(that._witProject, clause.fieldName, clause.operator, false, false, function (values) {
                        var fieldType = that._queryAdapter.getFieldType(null, clause.fieldName);

                        if (valueControl._disposed) {
                            return;
                        }

                        if (fieldType === WITConstants.FieldType.TreePath) {
                            valueControl.setType("tree");
                            valueControl.setMode("drop");
                            valueControl.setSource(function () {
                                function populateUINodes(node, uiNode) {
                                    var i, l, nodes = node.children, newUINode;

                                    if (uiNode) {
                                        newUINode = TreeView.TreeNode.create(node.name);
                                        uiNode.add(newUINode);
                                        uiNode = newUINode;
                                    }
                                    else {
                                        uiNode = TreeView.TreeNode.create(node.name);
                                    }

                                    if (nodes) {
                                        for (i = 0, l = nodes.length; i < l; i++) {
                                            node = nodes[i];
                                            populateUINodes(node, uiNode);
                                        }
                                    }

                                    return uiNode;
                                }

                                return $.map(values, function (node) {
                                    return populateUINodes(node, null);
                                });
                            });
                        }
                        else {
                            values = fieldValues.concat(values || []);
                        if (values.length > 0) {
                                valueControl.setType("list");
                                valueControl.setMode("drop");
                                valueControl.setSource(formatValues(values));
                            }
                            else {
                                valueControl.setType("list");
                                valueControl.setMode("text");
                                valueControl.setSource([]);
                            }
                        }
                    });
                }
            });
        }
    }

    public _validateClause(clauseInfo: any) {
        /// <summary>Validate the given clause.</summary>
        /// <param name="clauseInfo" type="Object">The clause info.</param>
        var clause = clauseInfo.clause;

        if (!clause.fieldName || !clause.operator || this._alert.subscriptionType === AlertsOM.SubscriptionType.Unknown) {
            clauseInfo.fieldNameControl.setInvalid(false);
            clauseInfo.operatorControl.setInvalid(false);
        }
        else {
            this._alert.adapter.getFilterFieldByName(this._alertsManager, clause.fieldName, function (field) {
                if (field) {
                    clauseInfo.fieldNameControl.setInvalid(false);
                    if (field.operators && Utils_Array.contains(field.operators, clause.operator, Utils_String.localeIgnoreCaseComparer)) {
                        clauseInfo.operatorControl.setInvalid(false);
                    }
                    else {
                        clauseInfo.operatorControl.setInvalid(true);
                    }
                }
                else {
                    clauseInfo.fieldNameControl.setInvalid(true);
                    clauseInfo.operatorControl.setInvalid(false);
                }
            });
        }
    }

    public _handleFieldNameChanged(clauseInfo: any, oldValue: string) {
        /// <summary>Handler called when the field name control's value is changed.</summary>
        /// <param name="clauseInfo" type="Object">The clause info.</param>
        /// <param name="oldValue" type="String">The old field name.</param>
        var that = this, clause = clauseInfo.clause;

        this._alert.adapter.getFilterFieldByName(this._alertsManager, clause.fieldName, function (currentField) {
            // If the new field value is not a known/valid field, then don't touch the operator or value
            if (currentField) {
                that._alert.adapter.getFilterFieldByName(that._alertsManager, oldValue, function (prevField) {
                    if (!currentField || !prevField || currentField.fieldType !== prevField.fieldType) {
                        clause.operator = "";
                        clause.value = "";
                        that._updateOperatorControl(clauseInfo.operatorControl, clause, true);
                    }
                    else {
                        that._updateOperatorControl(clauseInfo.operatorControl, clause, true);
                    }

                    that._updateValueControl(clauseInfo.valueControl, clause);
                });
            }
        });
    }

    public _handleOperatorChanged(clauseInfo: any, oldValue: string) {
        /// <summary>Handler called when the operator control's value is changed.</summary>
        /// <param name="clauseInfo" type="Object">The clause info.</param>
        /// <param name="oldValue" type="String">The old operator value.</param>
        var that = this, clause = clauseInfo.clause;
        this._updateValueControlEnablement(clauseInfo.valueControl, clauseInfo.clause);
        if (Utils_String.localeIgnoreCaseComparer(clause.operator, AlertsResources.OperatorChanges) === 0) {
            clause.value = "";
            that._updateValueControl(clauseInfo.valueControl, clause);
        }
    }

    public _updateValueControlEnablement(valueControl, clause) {
        if (!clause.fieldName || !clause.operator || Utils_String.localeIgnoreCaseComparer(clause.operator, AlertsResources.OperatorChanges) === 0) {
            valueControl.setEnabled(false);
        }
        else {
            valueControl.setEnabled(true);
        }
    }

    public _setDirty() {
        /// <summary>Mark this filter as dirty.</summary>
        this._alert.dirty = true;
    }
}

VSS.initClassPrototype(AlertFilter, {
    _alertsManager: null,
    _alert: null,
    _queryAdapter: null,
    _witProject: null
});

VSS.classExtend(AlertFilter, TfsContext.ControlExtensions);



class BasicAlertsList extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.alerts.BasicAlertsList";

    private _alertsManager: any;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _myAlerts: any[];
    private _savesInProgress: number;
    private _controlId: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);
        this._controlId = Controls.getId();
    }

    public beginLoadAlerts() {
        var that = this;

        $(this).trigger("loadingAlertsStarted");
        this._alertsManager.getAlerts(AlertsOM.AlertsScope.My, getTeamAlertsPivotValue(), function (myAlerts) {
            that._myAlerts = myAlerts;
            that._alertsManager.getBasicTemplates(function (basicTemplates) {
                that._populateCheckboxes(basicTemplates, myAlerts);
                $(that).trigger("loadingAlertsCompleted");
            },
                function (errorMessage) {
                    alert(errorMessage);
                    $(that).trigger("loadingAlertsError");
                });
        },
            function (errorMessage) {
                alert(errorMessage);
                $(that).trigger("loadingAlertsError");
            }, true);
    }

    public refresh() {
        this._element.empty();
        this.beginLoadAlerts();
    }

    private _populateCheckboxes(basicTemplates, myAlerts) {
        var i, l, template, hasAlert, id, $div, $checkbox;

        for (i = 0, l = basicTemplates.length; i < l; i++) {
            template = basicTemplates[i];
            hasAlert = this._getAlertsWithTemplate(template).length > 0;

            id = this._controlId + "_chkBasicTemplate" + i;
            $div = $("<div>").addClass("alerts-basic-alert").appendTo(this._element);

            $checkbox = $("<input id='" + id + "' type='checkbox' />")
                .prop("checked", hasAlert)
                .appendTo($div)
                .bind("change", delegate(this, this._onCheckboxChanged))
                .data("template", template);

            $("<label></label>")
                .text(template.templateName)
                .attr("for", id)
                .css({ display: "inline-block", marginTop: 0 })
                .appendTo($div);
        }
    }

    private _getAlertsWithTemplate(template) {
        var i, l,
            myAlerts = this._myAlerts,
            alertsWithTemplate = [],
            templateTag = template.basicTemplateTag;

        for (i = 0, l = myAlerts.length; i < l; i++) {
            if (myAlerts[i].isBasicAlert && Utils_String.localeIgnoreCaseComparer(myAlerts[i].tag, templateTag) === 0) {
                alertsWithTemplate.push(myAlerts[i]);
            }
        }
        return alertsWithTemplate;
    }

    private _onCheckboxChanged(e?) {
        var template, addAlert, suppressEvent, alertsWithTemplate, hasAlert, newAlert, that = this, $checkbox = $(e.target);

        addAlert = $checkbox.prop("checked") ? true : false;
        template = $checkbox.data("template");
        suppressEvent = $checkbox.data("suppressChangeEvent") === true;
        alertsWithTemplate = this._getAlertsWithTemplate(template);
        hasAlert = alertsWithTemplate.length > 0;

        if (!suppressEvent && hasAlert !== addAlert) {
            $checkbox.prop("disabled", true);
            $checkbox.data("suppressChangeEvent", true);
            $(this).trigger("savingAlertStarted");

            if (this._savesInProgress++ === 0) {
                $(this).trigger("savingAlertsStarted");
            }

            if (addAlert) {
                newAlert = this._alertsManager.createNewAlertFromTemplate(template, AlertsOM.AlertsScope.My);
                newAlert.tag = template.basicTemplateTag;
                newAlert.isBasicAlert = true;
                this._alertsManager.saveAlerts([newAlert], function () {
                    that._handleSaveComplete($checkbox);
                }, function (errorMessage) {
                        that._handleSaveComplete($checkbox, errorMessage);
                    }, true);
            }
            else {
                this._alertsManager.deleteAlerts(alertsWithTemplate, function () {
                    that._handleSaveComplete($checkbox);
                }, function (errorMessage) {
                        that._handleSaveComplete($checkbox, errorMessage);
                    });
            }
        }
    }

    private _handleSaveComplete($checkbox: JQuery, errorMessage?: string) {
        /// <param name="$checkbox" type="JQuery" />
        /// <param name="errorMessage" type="string" optional="true" />

        var that = this, eventName;

        if (errorMessage) {
            alert(errorMessage);
            $(this).trigger("savingAlertError");
            $checkbox.prop("checked", !$checkbox.prop("checked"));
        }
        else {
            $(this).trigger("savingAlertCompleted");
        }

        if (--this._savesInProgress === 0) {
            eventName = errorMessage ? "savingAlertsError" : "savingAlertsCompleted";
            $(this).trigger(eventName);
        }

        $checkbox.removeAttr("disabled");
        $checkbox.data("suppressChangeEvent", false);
        this._alertsManager.getAlerts(AlertsOM.AlertsScope.My, getTeamAlertsPivotValue(), function (myAlerts) {
            that._myAlerts = myAlerts;
        });
    }
}

VSS.initClassPrototype(BasicAlertsList, {
    _alertsManager: null,
    _tfsContext: null,
    _myAlerts: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _savesInProgress: 0,
    _controlId: null
});

VSS.classExtend(BasicAlertsList, TfsContext.ControlExtensions);



class QuickAlertTemplatesList extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.alerts.QuickAlertTemplatesList";

    private _alertsManager: any;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    public initialize() {
        var that = this;

        this._element.addClass("alerts-quick-alerts-list");

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);

        this._alertsManager.getCustomTemplates(function (templates) {
            that._populateQuickAlerts(templates);
        });
    }

    private _getNewAlertFilter() {
        if ($.isFunction(this._options.getNewAlertFilterDelegate)) {
            return this._options.getNewAlertFilterDelegate.call(this);
        }
        else {
            return { scope: AlertsOM.AlertsScope.My, categoryName: null };
        }
    }

    private _populateQuickAlerts(templates) {
        var that = this, i, l, newAlert,
            $list: JQuery;

        function addQuickAlertItem(name, template) {
            var link = $("<a href=# />").text(name).click(function () {
                var selectedTemplate = $(this).data("template"),
                    filter = that._getNewAlertFilter();

                if (selectedTemplate) {
                    newAlert = that._alertsManager.createNewAlertFromTemplate(selectedTemplate, filter.scope, filter.userId);
                    AlertDialogs.editAlert(newAlert, {
                        onSave: function () { $(that).trigger("newQuickAlertSaved", { newAlert: newAlert }); },
                        onlyMyScope: that._options.onlyMyScope === true
                    });
                }
                else {
                    AlertDialogs.newAlert({
                        scope: filter.scope,
                        category: filter.categoryName,
                        userId: filter.userId,
                        onlyMyScope: that._options.onlyMyScope === true,
                        onNewAlertSaved: function (newAlert) {
                            $(that).trigger("newQuickAlertSaved", { newAlert: newAlert });
                        }
                    });
                }
            });
            link.data("template", template);
            $("<li>").append(link).appendTo($list);
        }

        $list = $("<ul/>").appendTo(this._element);
        for (i = 0, l = templates.length; i < l; i++) {
            if (templates[i].showInQuickAlerts) {
                addQuickAlertItem(templates[i].templateName, templates[i]);
            }
        }
        addQuickAlertItem(AlertsResources.QuickAlertsOtherItem, null);
    }
}

VSS.initClassPrototype(QuickAlertTemplatesList, {
    _alertsManager: null,
    _tfsContext: null
});

VSS.classExtend(QuickAlertTemplatesList, TfsContext.ControlExtensions);



class AlertInfoBar extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.alerts.AlertInfoBar";
    public pivotFilter: Navigation.PivotFilter;

    private _alertsManager: any;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _statusIndicator: any;
    private _statusMessage: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            tagName: "div",
            cssClass: "alerts-info-bar"
        }, options));
    }

    public initialize() {
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);

        this._populate($("<div />").addClass("alerts-info-bar-container").appendTo(this._element));
        var filterDiv = $("<div />").addClass("alerts-info-bar-filter-div").appendTo(this._element);

        if (this._options.createPivotFilter) {
            this.pivotFilter = Controls.create(Navigation.PivotFilter, filterDiv, {
                "text": AlertsResources.AllMyTeamsAlerts
            });
            this.pivotFilter._element.addClass("alerts-info-bar-pivot-filter");
            this._setupFilterItems();
        }
    }

    public setStatus(showProgress, message, delay, fadeOut) {
        if (delay > 0) {
            this.delayExecute("setStatus", delay, true, function () {
                this._setStatus(showProgress, message, fadeOut);
            });
        }
        else {
            this.cancelDelayedFunction("setStatus");
            this._setStatus(showProgress, message, fadeOut);
        }
    }

    private _setupFilterItems() {

        var values = [];

        // adding personal alerts
        values.push({
            id: 0,
            text: AlertsResources.TeamsAlertsFilterHideOption,
            value: false
        });

        // adding all teams alerts
        values.push({
            id: 0,
            text: AlertsResources.TeamsAlertsFilterShowOption,
            value: true
        });

        this.pivotFilter.updateItems(values);

        var state = Navigation_Services.getHistoryService().getCurrentState();
        var pivotValue = state.showTeams;
        if (pivotValue && pivotValue != 0) {
            this.pivotFilter.setSelectedItem(AlertsResources.TeamsAlertsFilterShowOption as any);
        }
        else {
            this.pivotFilter.setSelectedItem(AlertsResources.TeamsAlertsFilterHideOption as any);
        }
    }

    private _populate($container) {
        var mailSettings, $invalidSettings;

        mailSettings = this._tfsContext.configuration.getMailSettings();
        if (!mailSettings || !mailSettings.enabled) {
            $invalidSettings = $("<div />").addClass("alerts-info-bar-invalidMailSettings").appendTo($container);
            $("<span />").addClass("icon icon-warning alerts-info-bar-invalidMailSettingsIcon").appendTo($invalidSettings);
            $("<span />").addClass("alerts-info-bar-invalidMailSettingsMsg").text(AlertsResources.InvalidMailSettingsMessage).appendTo($invalidSettings);
        }

        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $container);
        this._statusMessage = $("<span />").addClass("alerts-info-bar-statusMessage").appendTo($container);
        $("<span />").addClass("alerts-info-bar-filler").appendTo($container);
    }

    private _setStatus(showProgress, message, fadeOut) {
        if (showProgress) {
            this._statusIndicator.start();
        }
        else {
            this._statusIndicator.complete();
        }

        this._statusMessage.stop(true, true).text(message || "").attr("title", message || "").show();
        if (fadeOut > 0) {
            this._statusMessage.fadeOut(fadeOut);
        }
    }
}

VSS.initClassPrototype(AlertInfoBar, {
    _alertsManager: null,
    _tfsContext: null,
    _statusIndicator: null,
    _statusMessage: null
});

VSS.classExtend(AlertInfoBar, TfsContext.ControlExtensions);



class AdvancedAlertsView extends Navigation.NavigationView {

    public static enhancementTypeName: string = "tfs.alerts.AdvancedAlertsView";

    private _alertsManager: any;
    private _alertsGrid: any;
    private _alertEditor: any;
    private _alertsTree: any;
    private _identityControl: any;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _toolbar: any;
    private _infobar: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        var that = this, leftPane, rightPane, alertsTree, quickAlerts, $identityContainer, isAdminView;

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);

        leftPane = this._element.find(".alerts-grid-pane");
        this._infobar = <AlertInfoBar>Controls.BaseControl.createIn(AlertInfoBar, leftPane, { createPivotFilter: true });
        this._toolbar = this._createMenuBar(leftPane);
        this._alertsGrid = <AlertsGrid>Controls.BaseControl.createIn(AlertsGrid, leftPane, { tfsContext: this._tfsContext });
        this._updateMenubarItems();

        rightPane = this._element.find(".alerts-editor-pane");
        this._alertEditor = <AlertEditor>Controls.BaseControl.createIn(AlertEditor, rightPane, { tfsContext: this._tfsContext });

        isAdminView = this._element.find(".alerts-admin-actions").length > 0;
        alertsTree = this._element.find(".alerts-tree");
        this._alertsTree = <AlertTypesTree>Controls.Enhancement.enhance(AlertTypesTree, alertsTree, {
            tfsContext: this._tfsContext,
            showAllAlertsNode: isAdminView,
            hideGitCategory: !this._options.usesGitVersionControl,
            hideTfVcCategory: !this._options.usesVCVersionControl
        });

        this._bind("alertMenuItemClicked", delegate(this, this._onContextMenuItemClick));
        this._bind("openRowDetail", delegate(this, this._onOpenAlert));
        this._bind("alertfilterchange", delegate(this, this._onFilterChanged));
        this._bind("selectedAlertChanged", delegate(this, this._onSelectedAlertChanged));
        this._bind("alertModified", delegate(this, this._onAlertModified));
        $(".alerts-info-bar-pivot-filter").bind("changed", delegate(this, this._onTeamFilterChanged));

        // Create the quick-alerts control
        quickAlerts = <QuickAlertTemplatesList>Controls.Enhancement.enhance(QuickAlertTemplatesList, this._element.find("#quickAlertsList"), {
            tfsContext: this._options.tfsContext,
            getNewAlertFilterDelegate: function () {
                return that._alertsGrid.getCurrentFilter();
            }
        });

        this._bind(quickAlerts, "newQuickAlertSaved", function (e, data) {
            that._handleNewAlertCreated(data && data.newAlert);
        }, true);

        // Create the identity picker control for admins
        $identityContainer = this._element.find("#alertsIdentityControl");
        if ($identityContainer.length > 0) {
            VSS.using(['Admin/Scripts/TFS.Admin.Common'], (_TFS_Admin_Common: typeof TFS_Admin_Common) => {
                that._identityControl = <TFS_Admin_Common.IdentityPickerControl>Controls.BaseControl.createIn(_TFS_Admin_Common.IdentityPickerControl, $identityContainer, {
                    searchParams: {},
                    allowMultiSelect: false,
                    allowFreeType: true,
                    showCheckName: false,
                    showBrowse: false,
                    constrainToTfsUsersOnly: true,
                    inputTextElementId: "alertsIdentityPickerTextBox"
                });
                $identityContainer.bind('identityListChanged', function (event) {
                    var user, changes = that._identityControl.getPendingChanges(true);
                    if (changes.existingUsers.length === 1) {
                        user = changes.existingUsers[0];
                        that._identityControl._identityListControl.clear();
                        that._alertsTree.showUserNode(user.name, user.tfid);
                    }
                });
            });
        }

        this._updateAlertFilter(this._alertsTree.getSelectedFilter());
    }

    private _createMenuBar(container) {
        var menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $("<div class='toolbar' />").appendTo(container), {
            items: this._createMenubarItems(),
            executeAction: Utils_Core.delegate(this, this._onMenuItemClick)
        });
        return menuBar;
    }

    private _createMenubarItems() {
        var items = [];

        items.push({ id: "new-alert", text: AlertsResources.NewAlert, title: AlertsResources.NewAlertTitle, noIcon: true });
        items.push({ separator: true });
        items.push({ id: "save-all-alerts", text: AlertsResources.SaveAll, title: AlertsResources.SaveAllTitle, showText: false, icon: "icon-save-all" });
        items.push({ id: "refresh-alerts", text: AlertsResources.Refresh, title: AlertsResources.RefreshTitle, showText: false, icon: "icon-refresh" });
        items.push({ id: "revert-selected-alerts", text: AlertsResources.Revert, title: AlertsResources.RevertTitle, showText: false, icon: "icon-undo" });
        items.push({ id: "delete-selected-alerts", text: AlertsResources.DeleteSelected, title: AlertsResources.DeleteSelectedTitle, showText: false, icon: "icon-delete" });

        return items;
    }

    private _updateMenubarItems() {
        var dirtyAlerts = this._alertsManager.getDirtyAlerts();
        var selectedAlerts = this._alertsGrid.getSelectedAlerts();
        var areSelectedAlertsDirty = this._areSelectedAlertsDirty(dirtyAlerts, selectedAlerts);
        this._toolbar.updateCommandStates([{ id: "revert-selected-alerts", disabled: !areSelectedAlertsDirty || selectedAlerts.length === 0 }]);
        this._toolbar.updateCommandStates([{ id: "save-all-alerts", disabled: dirtyAlerts.length === 0 }]);
        this._toolbar.updateCommandStates([{ id: "delete-selected-alerts", disabled: selectedAlerts.length === 0 }]);
    }

    private _areSelectedAlertsDirty(dirtyAlerts: any, selectedAlerts: any) {
        var found = false;
        for (var i = 0; i < selectedAlerts.length; i++) {
            found = false;
            for (var j = 0; j < dirtyAlerts.length; j++) {
                if (selectedAlerts[i].id === dirtyAlerts[j].id) {
                    found = true;
                }
            }
            if (!found) {
                return false;
            }
        }
        return true;
    }

    private _onContextMenuItemClick(e?, args?) {
        this._onMenuItemClick(args);
    }

    private _onTeamFilterChanged(sender: any, item: any) {
        this._alertsGrid.refreshColumns();
        this._refreshAlerts();
    }

    private _onMenuItemClick(e?) {
        var command = e.get_commandName(),
            args = e.get_commandArgument(),
            that = this,
            filter;

        switch (command) {
            case "open-alert":
                this._openAlertForEdit(args.selectedAlert);
                break;
            case "new-alert":
                filter = this._alertsGrid.getCurrentFilter();
                AlertDialogs.newAlert({
                    scope: filter.scope,
                    category: filter.categoryName,
                    userId: filter.userId,
                    onNewAlertSaved: function (newAlert) {
                        that._handleNewAlertCreated(newAlert);
                    }
                });
                break;
            case "save-all-alerts":
                this._infobar.setStatus(true, AlertsResources.SavingAlertsMessage, 100, false);
                this._alertsManager.saveDirtyAlerts(function (results) {
                    filter = that._alertsGrid.getCurrentFilter();
                    if (filter.userId) {
                        that._alertsManager.dropAlertResultsForUser(filter.userId);
                    }
                    that._refreshAlertsGrid();
                }, function (errorMessage) {
                        alert(errorMessage);
                        that._refreshAlertsGrid();
                    }, function () {
                        that._refreshAlertsGrid();
                    }, true);
                break;
            case "refresh-alerts":
                this._refreshAlerts();
                break;
            case "revert-selected-alerts":
                if (confirm(AlertsResources.ConfirmRevertMessage)) {
                    filter = this._alertsGrid.getCurrentFilter();
                    this._infobar.setStatus(true, AlertsResources.RevertingAlertsMessage, 100, false);
                    this._alertsManager.revertAlerts(filter.scope, filter.userId, this._alertsGrid.getSelectedAlerts(), function () {
                        that._refreshAlertsGrid();
                    });
                }
                break;
            case "delete-alert":
                this._deleteAlerts(args.selectedAlerts);
                break;
            case "delete-selected-alerts":
                this._deleteAlerts(this._alertsGrid.getSelectedAlerts());
                break;
        }
    }

    private _refreshAlerts() {

        var that = this,
            cachedScopes = this._alertsManager.getCachedScopes(),
            cachedUsers = this._alertsManager.getCachedUsers();

        if (this._alertsManager.getDirtyAlerts().length === 0 || confirm(AlertsResources.ConfirmRefreshMessage)) {
            this._infobar.setStatus(true, AlertsResources.RefreshingAlertsMessage, 100, false);
            this._alertsManager.dropCachedAlerts();
            this._refreshAlertsGrid();

            $.each(cachedScopes, function (indx, scope) {
                that._alertsManager.getAlerts(scope, getTeamAlertsPivotValue());
            });
            $.each(cachedUsers, function (indx, userId) {
                that._alertsManager.getAlertsForUser(userId);
            });
        }
    }

    private _deleteAlerts(alertsToDelete) {
        var that = this;
        if (alertsToDelete && alertsToDelete.length > 0) {
            if (confirm(AlertsResources.ConfirmDeleteMessage)) {
                this._infobar.setStatus(true, AlertsResources.DeletingAlertsMessage, 100, false);
                this._alertsManager.deleteAlerts(alertsToDelete, function () {
                    that._refreshAlertsGrid();
                }, function (errorMessage) {
                        alert(errorMessage);
                        that._refreshAlertsGrid();
                    });
            }
        }
    }

    private _refreshAlertsGrid() {
        var that = this;
        this._alertsGrid.refresh(function (alerts) {
            that._infobar.setStatus(false, that._getStatusText(that._alertsTree.getSelectedFilter(), alerts));
        });
    }

    private _onFilterChanged(e?, alertFilterInfo?) {
        showHideTeamAlertsPivot(alertFilterInfo.scope !== AlertsOM.AlertsScope.Team);
        this._updateAlertFilter(alertFilterInfo);
    }

    private _updateAlertFilter(filter) {
        var that = this;
        this.setViewTitle(this._getAlertsViewTitle(filter));
        this._infobar.setStatus(true, AlertsResources.LoadingAlertsMessage, 100, false);
        this._alertsGrid.setFilter(filter, function (alerts) {
            that._infobar.setStatus(false, that._getStatusText(filter, alerts));
        });
    }

    private _getStatusText(filter, filteredAlerts) {
        var team, totalCount;
        if (filter.userName) {
            totalCount = this._alertsManager.getCachedAlertsCountForUser(filter.userId);
            return Utils_String.format(AlertsResources.SubscriberAlertsCountFormat, filteredAlerts.length, totalCount, filter.userName);
        }
        else {
            totalCount = this._alertsManager.getCachedAlertsCountForScope(filter.scope);
            if (filter.scope === AlertsOM.AlertsScope.My) {
                return Utils_String.format(AlertsResources.SubscriberAlertsCountFormat, filteredAlerts.length, totalCount, this._tfsContext.currentUser);
            }
            else if (filter.scope === AlertsOM.AlertsScope.Team) {
                team = this._tfsContext.currentTeam;
                return Utils_String.format(AlertsResources.SubscriberAlertsCountFormat, filteredAlerts.length, totalCount, team ? team.name : "");
            }
            else {
                return Utils_String.format(AlertsResources.AlertsCountFormat, filteredAlerts.length, totalCount);
            }
        }
    }

    private _getAlertsViewTitle(filter) {
        var categoryName = filter.categoryName, team;

        if (filter.userName) {
            if (categoryName) {
                return Utils_String.format(AlertsResources.CategorizedAlertsUserNodeFormat, categoryName, filter.userName);
            }
            else {
                return Utils_String.format(AlertsResources.AlertsUserNodeFormat, filter.userName);
            }
        }
        else {
            switch (filter.scope) {
                case AlertsOM.AlertsScope.My:
                    return categoryName ? Utils_String.format(AlertsResources.MyCategorizedAlertsFormat, categoryName) : AlertsResources.MyAlerts;

                case AlertsOM.AlertsScope.Team:
                    team = TfsContext.getDefault().currentTeam;
                    if (team) {
                        return categoryName ? Utils_String.format(AlertsResources.NamedTeamCategorizedAlertsFormat, categoryName, team.name) : Utils_String.format(AlertsResources.AlertsTeamNodeFormat, team.name);
                    }
                    else {
                        return categoryName ? Utils_String.format(AlertsResources.TeamCategorizedAlertsFormat, categoryName) : AlertsResources.TeamAlerts;
                    }
                case AlertsOM.AlertsScope.All:
                    return categoryName ? Utils_String.format(AlertsResources.AllCategorizedAlertsFormat, categoryName) : AlertsResources.AllAlerts;

                default:
                    return AlertsResources.AlertsAdminPageTitle;
            }
        }
    }

    private _handleNewAlertCreated(newAlert) {
        var filter, newTreeNodeSelected = false;

        if (newAlert) {
            // When a new alert is created, check the currently displayed filter. If the alert will not
            // show up, then change the filter so that the new alert will appear. Otherwise, it is confusing
            // for users who think that their alert did not get saved.
            filter = this._alertsGrid.getCurrentFilter();
            if (filter.categoryName && filter.categoryName !== newAlert.categoryName ||
                filter.scope === AlertsOM.AlertsScope.My && newAlert.subscriberId !== this._tfsContext.currentIdentity.id ||
                filter.scope === AlertsOM.AlertsScope.Team && this._tfsContext.currentTeam && newAlert.subscriberId !== this._tfsContext.currentTeam.identity.id) {

                if (newAlert.subscriberId === this._tfsContext.currentIdentity.id) {
                    this._alertsTree.selectScopeFolderNode(AlertsOM.AlertsScope.My);
                    newTreeNodeSelected = true;
                }
                else if (this._tfsContext.currentTeam && newAlert.subscriberId === this._tfsContext.currentTeam.identity.id) {
                    this._alertsTree.selectScopeFolderNode(AlertsOM.AlertsScope.Team);
                    newTreeNodeSelected = true;
                }
            }
        }

        if (!newTreeNodeSelected) {
            this._refreshAlertsGrid();
        }
    }

    private _onSelectedAlertChanged(e?, selectedAlert?) {
        this._alertEditor.bindAlert(selectedAlert);
        this.delayExecute("updateMenuItems", 250, true, this._updateMenubarItems);
    }

    private _onOpenAlert(sender, eventArgs) {
        this._openAlertForEdit(this._alertsGrid.getSelectedAlert());
    }

    private _openAlertForEdit(alertToEdit) {
        var that = this;
        AlertDialogs.editAlert(alertToEdit, {
            close: function () {
                that._refreshAlertsGrid();
            }
        });
    }

    private _onAlertModified(sender, modifiedAlert) {
        this._alertsGrid.updateSelectedAlertRow();
        this._updateMenubarItems();
    }
}

VSS.initClassPrototype(AdvancedAlertsView, {
    _alertsManager: null,
    _alertsGrid: null,
    _alertEditor: null,
    _alertsTree: null,
    _identityControl: null,
    _tfsContext: null,
    _toolbar: null,
    _infobar: null
});

VSS.classExtend(AdvancedAlertsView, TfsContext.ControlExtensions);



class ManageAlertsView extends Navigation.NavigationView {

    public static enhancementTypeName: string = "tfs.alerts.ManageAlertsView";

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _alertsManager: any;
    private _basicAlertsList: any;
    private _basicAlertsListContainer: any;
    private _$myNotificationAddressContainer: JQuery;
    private _basicAlertsWarningPane: any;
    private _tabHost: any;
    private _alertsGrid: any;
    private _advancedAlertsLink: any;
    private _advancedAlertsLinkHref: any;
    private _myNotificationAddressElement: any;
    private _controlId: any;
    private _infoBar: any;

    constructor(options?) {
        super(options);
    }

    private _isAdminEnabled(): Boolean {
        return TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(this._tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.Admin) === TFS_Server_WebAccess_Constants.FeatureMode.Licensed;
    }

    public initialize() {
        var that = this;
        super.initialize();

        this._controlId = Controls.getId();

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);

        this._$myNotificationAddressContainer = $("<fieldset />").addClass("alerts-management-my-address").appendTo(this._element);
        this._alertsManager.getMyNotificationAddress(function (myNotificationAddress) {
            that._createMyNotificationAddressSection();
            that._updateMyNotificationAddressText(myNotificationAddress);
        });
        if (this._tfsContext.currentTeam && this._isAdminEnabled()) {
            this._createAdvancedLink();
        }

        this._createTabsContainer();
    }

    private _createMyNotificationAddressSection() {
        var $legend, $link;
        $legend = $("<legend />").appendTo(this._$myNotificationAddressContainer);

        $legend.text(AlertsResources.MyNotificationAddressLegendText);
        // Do not allow the user to set a preferred email address in hosted; just show it
        if (!this._tfsContext.isHosted) {
            $legend.append(document.createTextNode(" ("));
            $link = $("<a />")
                .text(AlertsResources.EditLinkText)
                .attr("href", "#")
                .click(delegate(this, this._handleEditNotificationAddressClick));
            $legend.append($link);
            $legend.append(document.createTextNode(")"));
        }

        this._myNotificationAddressElement = $("<span />")
            .addClass("alerts-management-my-address-text")
            .appendTo($("<div />").appendTo(this._$myNotificationAddressContainer));
    }

    private _updateMyNotificationAddressText(address) {
        var displayText,
            $link;

        if (this._myNotificationAddressElement) {
            displayText = address ? address : AlertsResources.NoNotificationAddress;
            this._myNotificationAddressElement.text(displayText);
            this._myNotificationAddressElement.attr("title", displayText);
        }

        if (this._basicAlertsList) {
            if (address) {
                this._basicAlertsList._element.show();
                if (this._basicAlertsWarningPane) {
                    this._basicAlertsWarningPane.remove();
                    this._basicAlertsWarningPane = null;
                }
            }
            else {
                this._basicAlertsList._element.hide();
                if (!this._basicAlertsWarningPane) {

                    this._basicAlertsWarningPane = $("<span />")
                        .text(AlertsResources.BasicAlertsNoNotificationAddressText)
                        .appendTo(this._basicAlertsListContainer);

                    this._basicAlertsWarningPane.append($("<br />"));
                    this._basicAlertsWarningPane.append($("<br />"));

                    $link = $("<a />")
                        .attr("href", "#")
                        .text(AlertsResources.BasicAlertsNoNotificationAddressAction)
                        .click(delegate(this, this._handleEditNotificationAddressClick))
                        .appendTo(this._basicAlertsWarningPane);
                }
            }
        }
    }

    private _handleEditNotificationAddressClick() {
        var that = this;
        this._alertsManager.getMyNotificationAddress(function (myNotificationAddress) {
            Dialogs.show(EditCustomEmailAddressDialog, {
                initialAddress: myNotificationAddress,
                onOkClick: delegate(that, that._handleMyNotificationAddressOkClick)
            });
        });
    }

    private _handleMyNotificationAddressOkClick(address, callback, errorCallback?) {
       if (address.indexOf(',') >= 0 || address.indexOf(';') >= 0) {
            errorCallback(Utils_String.format(AlertsResources.InvalidEmailAddressFormat, address));
            return;
        }
        var that = this;
        this._alertsManager.setMyCustomNotificationAddress(address, function (savedAddress) {
            that._updateMyNotificationAddressText(savedAddress);
            if ($.isFunction(callback)) {
                callback.call(that);
            }
        }, errorCallback);
    }

    private _createAdvancedLink() {
        var $div = $("<div>").html(AlertsResources.AdvancedAlertManagementPageLink).addClass("alerts-management-advanced-link").appendTo(this._element);
        this._advancedAlertsLink = $div.find("a");
        this._advancedAlertsLinkHref = this._tfsContext.getActionUrl("index", "alerts", { area: 'admin' });
        this._advancedAlertsLink.attr("href", this._advancedAlertsLinkHref);
        this._advancedAlertsLink.attr("target", "_blank");
    }

    private _setAdvancedLinkEnabledState(enable) {
        if (this._advancedAlertsLink) {
            if (enable) {
                this._advancedAlertsLink.removeClass("disabled-link");
                this._advancedAlertsLink.attr("href", this._advancedAlertsLinkHref);
            }
            else {
                this._advancedAlertsLink.addClass("disabled-link");
                this._advancedAlertsLink.attr("href", "#");
            }
        }
    }

    private _createTabsContainer() {
        var $tabButtonHost,
            basicsTabId = "basicAlertsTab-" + this._controlId,
            customTabId = "customAlertsTab-" + this._controlId;

        // Create the tabs container for Basic and Custom views
        this._tabHost = $("<div/>");
        if (this._isAdminEnabled()) {
            this._tabHost.addClass("alerts-management-tabsHost");
        }
        else {
            this._tabHost.addClass("alerts-management-tabsHost-notAdmin");
        }
        $tabButtonHost = $("<ul/>").appendTo(this._tabHost);
        $("<li/>").appendTo($tabButtonHost).append($("<a/>").attr("href", "#" + basicsTabId).text(AlertsResources.BasicAlerts));
        $("<li/>").appendTo($tabButtonHost).append($("<a/>").attr("href", "#" + customTabId).text(AlertsResources.CustomAlerts));

        this._populateBasicAlertsTab($("<div id='" + basicsTabId + "' />").addClass("alerts-management-tab " + basicsTabId).appendTo(this._tabHost));
        this._populateCustomAlertsTab($("<div id='" + customTabId + "' />").addClass("alerts-management-tab " + basicsTabId).appendTo(this._tabHost));
        this._element.append(this._tabHost);

        this._tabHost.tabs({
            selected: 0
        });
    }

    private _populateBasicAlertsTab(container) {
        var $fieldSet, $legend;

        this._basicAlertsListContainer = $fieldSet = $("<fieldset />");
        $legend = $("<legend />").appendTo($fieldSet);

        this._basicAlertsList = <BasicAlertsList>Controls.BaseControl.createIn(BasicAlertsList, $fieldSet, { tfsContext: this._tfsContext });
        $("<span />").text(AlertsResources.BasicAlertsLegendText).appendTo($legend);

        this._bind(this._basicAlertsList, "loadingAlertsStarted", delegate(this, this._handleAlertsLoadingStarted), true);
        this._bind(this._basicAlertsList, "loadingAlertsCompleted loadingAlertsError", delegate(this, this._handleAlertsLoadingCompleted), true);
        this._bind(this._basicAlertsList, "savingAlertsStarted", delegate(this, this._handleSaveQuickAlertsStarted), true);
        this._bind(this._basicAlertsList, "savingAlertsCompleted", delegate(this, this._handleSaveQuickAlertsSuccess), true);
        this._bind(this._basicAlertsList, "savingAlertsError", delegate(this, this._handleSaveQuickAlertsError), true);

        $fieldSet.css("margin-top", "1em");
        container.append($fieldSet);
        this._infoBar = <AlertInfoBar>Controls.BaseControl.createIn(AlertInfoBar, container);

        this._basicAlertsList.beginLoadAlerts();
    }

    private _handleAlertsLoadingStarted() {
        this._infoBar.setStatus(true, AlertsResources.LoadingAlertsMessage);
    }

    private _handleAlertsLoadingCompleted() {
        this._infoBar.setStatus(false);
    }

    private _handleSaveQuickAlertsStarted() {
        this.delayExecute("updateAfterQuickAlertSave", 200, false, function () {
            this._infoBar.setStatus(true, AlertsResources.SavingAlertsMessage);
            this._setAdvancedLinkEnabledState(false);
        });
    }

    private _handleSaveQuickAlertsSuccess() {
        this._infoBar.setStatus(false, AlertsResources.AlertsSavedSuccessfullyMessage, 0, 5000);
        this._handleSaveQuickAlertsCompleted();
    }

    private _handleSaveQuickAlertsError() {
        this._infoBar.setStatus(false);
        this._handleSaveQuickAlertsCompleted();
    }

    private _handleSaveQuickAlertsCompleted() {
        this.cancelDelayedFunction("updateAfterQuickAlertSave");
        this._setAdvancedLinkEnabledState(true);
        this._alertsGrid.refresh();
    }

    private _populateCustomAlertsTab(container) {
        var that = this, splitter, quickAlerts, $fieldSet, $legend;
        splitter = <Splitter.Splitter>Controls.BaseControl.createIn(Splitter.Splitter, container, { cssClass: "alerts-custom-splitter", fixedSide: "left", vertical: false });

        $fieldSet = $("<fieldset />").addClass("quickAlerts-fieldset");
        $legend = $("<span />").text(AlertsResources.QuickAlertsHeader).appendTo($("<legend />").appendTo($fieldSet));
        quickAlerts = <QuickAlertTemplatesList>Controls.BaseControl.createIn(QuickAlertTemplatesList, $fieldSet, {
            tfsContext: this._tfsContext,
            onlyMyScope: true
        });
        this._bind(quickAlerts, "newQuickAlertSaved", function () { that._alertsGrid.refresh(); }, true);
        splitter.leftPane.append($fieldSet);
        splitter.handleBar.css("margin-top", "19px").css("height", "87%");

        $fieldSet = $("<fieldset />").addClass("alerts-custom-grid-container");
        $legend = $("<span />").text(AlertsResources.MyCurrentSubscriptionsLabel).appendTo($("<legend />").appendTo($fieldSet));
        this._alertsGrid = <AlertsGrid>Controls.BaseControl.createIn(AlertsGrid, $fieldSet, {
            tfsContext: this._tfsContext,
            columns: <any[]>[{ index: "name", text: AlertsResources.AlertNameColumn, width: this._options.customGridNameColWidth || 500 }],
            sortOrder: <any[]>[{ index: "name", order: "asc" }]
        });
        this._alertsGrid.setFilter({ scope: AlertsOM.AlertsScope.My, categoryName: null });
        this._alertsGrid.refresh();
        splitter.rightPane.append($fieldSet);
        this._bind("alertMenuItemClicked", delegate(this, this._onMenuItemClick));
        this._bind("openRowDetail", delegate(this, this._onOpenAlert));
    }

    private _onMenuItemClick(e?, args?) {
        var command = args.get_commandName();

        args = args.get_commandArgument();

        switch (command) {
            case "open-alert":
                this._openAlertForEdit(args.selectedAlert);
                break;
            case "delete-alert":
                this._deleteAlerts(args.selectedAlerts);
                break;
        }
    }

    private _deleteAlerts(alertsToDelete) {
        var that = this;
        if (alertsToDelete && alertsToDelete.length > 0) {
            if (confirm(AlertsResources.ConfirmDeleteMessage)) {
                this._alertsManager.deleteAlerts(alertsToDelete, function () {
                    that._alertsGrid.refresh();
                    that._basicAlertsList.refresh();
                });
            }
        }
    }

    private _onOpenAlert(sender, eventArgs) {
        this._openAlertForEdit(this._alertsGrid.getSelectedAlert());
    }

    private _openAlertForEdit(alertToEdit) {
        var that = this;
        AlertDialogs.editAlert(alertToEdit, {
            revertOnCancel: true,
            revertOnCancelScope: AlertsOM.AlertsScope.My,
            close: function () {
                that._alertsGrid.refresh();
            }
        });
    }
}

VSS.initClassPrototype(ManageAlertsView, {
    _tfsContext: null,
    _alertsManager: null,
    _basicAlertsList: null,
    _basicAlertsListContainer: null,
    _basicAlertsWarningPane: null,
    _tabHost: null,
    _alertsGrid: null,
    _advancedAlertsLink: null,
    _advancedAlertsLinkHref: null,
    _myNotificationAddressElement: null,
    _controlId: null,
    _infoBar: null
});

VSS.classExtend(ManageAlertsView, TfsContext.ControlExtensions);

interface AlertEditorDialogOptions extends Dialogs.IModalDialogOptions {
    alert?: any;
    onlyMyScope?: boolean;
    revertOnCancel?: boolean;
    revertOnCancelScope?: any;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    onSave?: Function;
}

class AlertEditorDialog extends Dialogs.ModalDialogO<AlertEditorDialogOptions> {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _editor: any;
    private _alert: any;
    private _alertsManager: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />


        options = $.extend({
            resizable: true,
            minWidth: 600,
            minHeight: 320,
            width: "80%",
            height: 500,
            title: AlertsResources.AlertEditorDialogTitle
        }, options);

        if (options.alert && options.alert.id && !options.revertOnCancel) {
            options.buttons = {
                saveAndCloseButton: {
                    id: 'ok',
                    text: AlertsResources.AlertDialogSaveAndCloseButtonText,
                    click: delegate(this, this._onSaveAndClose)
                },
                closeButton: {
                    id: 'cancel',
                    text: AlertsResources.AlertDialogCloseButtonText,
                    click: delegate(this, this.onCancelClick)
                }
            };
        }

        super.initializeOptions(options);
    }

    public initialize() {
        var that = this;
        super.initialize();

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._alert = this._options.alert;
        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);

        this._editor = <AlertEditor>Controls.BaseControl.createIn(AlertEditor, this._element, {
            tfsContext: this._tfsContext,
            onlyMyScope: this._options.onlyMyScope === true
        });
        this._editor.bindAlert(this._options.alert);

        this._updateAlertTitle();

        this._bind("alertModified", function () { that._updateAlertTitle(); });

        this.updateOkButton(true);
    }

    public onOkClick(e?) {
        var that = this;

        if (this._editor.isCurrentAlertValid()) {
            this.updateOkButton(false);
            this._alertsManager.saveAlerts([this._alert], function () {
                that.close();
                if (that._options.onSave) {
                    that._options.onSave.call(that, that._alert);
                }
            }, function (errorMessage) {
                    alert(errorMessage);
                    that.updateOkButton(true);
                }, function () {
                    that.updateOkButton(true);
                }, true);
        }
    }

    public onCancelClick(e?) {
        var that = this, thisAlert = this._alert;
        if (thisAlert && thisAlert.dirty && thisAlert.id && this._options.revertOnCancel) {
            this._alertsManager.revertAlerts(this._options.revertOnCancelScope, thisAlert.subscriberId, [thisAlert], function () {
                that.close();
            });
        }
        else {
            this.close();
        }
    }

    public onClose(e?) {
        this._options.alert = null;
        super.onClose(e);
    }

    private _updateAlertTitle() {
        var dirtyModifier = this._alert.dirty ? "* " : "";
        
        var title = Utils_String.format(AlertsResources.AlertEditorDialogAlertNameWithIdFormat, dirtyModifier, this._alert.id, this._alert.name);

        this.setTitle(title);
    }

    private _onSaveAndClose(e?) {
        this.onOkClick(e);
    }
}

VSS.initClassPrototype(AlertEditorDialog, {
    _tfsContext: null,
    _editor: null,
    _alert: null,
    _alertsManager: null
});

interface NewAlertDialogOptions extends AlertEditorDialogOptions {
    userId?: string;
    onNewAlertSaved?: Function;
    scope?: AlertsOM.AlertsScope;
    category?: string;
}

class NewAlertDialog extends Dialogs.ModalDialogO<NewAlertDialogOptions> {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _alertsManager: any;
    private _categoryCombo: any;
    private _templates: any[];
    private _filteredTemplates: any[];
    private _scopeCombo: any;
    private _templateGrid: any;
    private _templateGridOptions: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            minWidth: 400,
            minHeight: 400,
            width: 600,
            height: 500,
            title: AlertsResources.NewAlertDialogTitle
        }, options));
    }

    public initialize() {
        super.initialize();

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._alertsManager = TFS_OM.ProjectCollection.getConnection(this._tfsContext).getService<AlertsOM.AlertsManager>(AlertsOM.AlertsManager);

        this._decorate();
        this._bind("openRowDetail", delegate(this, this._onTemplateDblClicked));

        this._alertsManager.getCustomTemplates((templates) => {

            this._templates = templates;
            this._initializeCombo();
            this._onCategoryChange();
        });
    }

    public onOkClick() {
        var that = this, alertDlgOptions, scope, newAlert, template = this._getSelectedTemplate();

        if (template) {

            that.updateOkButton(false);

            scope = (this._scopeCombo && this._scopeCombo.getSelectedIndex() === 1) ? AlertsOM.AlertsScope.Team : AlertsOM.AlertsScope.My;
            newAlert = this._alertsManager.createNewAlertFromTemplate(template, scope, this._options.userId);
            that.close();

            alertDlgOptions = {
                onlyMyScope: that._options.onlyMyScope === true
            };

            if ($.isFunction(that._options.onNewAlertSaved)) {
                alertDlgOptions.onSave = function () {
                    that._options.onNewAlertSaved.call(that, newAlert);
                };
            }
            AlertDialogs.editAlert(newAlert, alertDlgOptions);
        }
    }

    private _decorate() {
        var element = this._element, gridContainer, gridTopMargin = "7.5em";

        if (!this._options.onlyMyScope && this._tfsContext.currentTeam && !this._options.userId) {
            element.append("<p><label for='scope'>" + AlertsResources.AlertScopeLabel + "</label><input id='scope' name='scope' type='text' /></p>");
            this._scopeCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, element.find("input[name='scope']"), { allowEdit: false, source: [AlertsResources.MyAlert, AlertsResources.TeamAlert] });
            if (this._options.scope === AlertsOM.AlertsScope.Team) {
                this._scopeCombo.setSelectedIndex(1);
            }
            else {
                this._scopeCombo.setSelectedIndex(0);
            }
            gridTopMargin = "11.5em";
        }

        element.append("<p><label for='category'>" + AlertsResources.AlertCategory + "</label><input id='category' name='category' type='text' /></p>");

        this._categoryCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, element.find("input[name='category']"), { allowEdit: false, indexChanged: delegate(this, this._onCategoryChange) });

        element.append("<p><div id='template'></div></p>");
        gridContainer = element.find("#template");
        gridContainer.css("position", "absolute").css("top", gridTopMargin).css("bottom", "4.5em").css("left", "0.4em").css("right", "0.4em");

        this._templateGridOptions = {
            gutter: false,
            allowMultiSelect: false,
            width: "100%",
            height: "100%",
            columns: [
                {
                    index: "categoryName",
                    text: AlertsResources.AlertCategoryColumn,
                    width: 100
                },
                {
                    index: "templateName",
                    text: AlertsResources.AlertTemplateNameColumn,
                    width: 400
                }]
        };
        this._templateGrid = <Grids.Grid>Controls.BaseControl.createIn(Grids.Grid, gridContainer, this._templateGridOptions);
    }


    private _initializeCombo() {
        /// <summary>Initializes the contents of the 'filter' combo box and sets the default filter value.</summary>
        var sourceArray: string[] = [AlertsResources.AllAlerts];
        var filters: string[] = [AlertsResources.CategoryWorkItem,
            AlertsResources.CategoryCheckin,
            AlertsResources.CategoryGitPush,
            AlertsResources.CategoryBuild,
            AlertsResources.CategoryCodeReview,
            AlertsResources.CategoryGitPullRequest];
        var hasCategory: boolean = false;

        // Filter the array down to types we have templates for (no point in having a filter that returns 0 templates)

        for (var filterIndex = 0; filterIndex < filters.length; filterIndex++) {
            var categoryName = filters[filterIndex];
            for (var i = 0, l = this._templates.length; i < l; i++) {
                if (this._templates[i].categoryName === categoryName) {
                    sourceArray.push(categoryName);

                    // Clients can set a default category to select in the dropdown.  If it's set in the options 
                    // and it is not filgered out then we will select it as the default.
                    if (this._options.category && this._options.category === categoryName) {
                        hasCategory = true;
                    }
                    break;
                }
            }
        }

        this._categoryCombo.setSource(sourceArray);

        if (hasCategory) {
            // Client specified the category to select and it hasn't been filtered out.
            this._categoryCombo.setText(this._options.category);
        }
        else {
            this._categoryCombo.setSelectedIndex(0);
        }
    }

    private _onCategoryChange() {
        var i, l, categoryName, filteredTemplates = [];

        if (this._categoryCombo.getSelectedIndex() > 0) {
            categoryName = this._categoryCombo.getText();
        }

        for (i = 0, l = this._templates.length; i < l; i++) {
            if (!categoryName || this._templates[i].categoryName === categoryName) {
                filteredTemplates.push(this._templates[i]);
            }
        }

        this._templateGrid.setDataSource(filteredTemplates, null, this._templateGridOptions.columns, null);
        if (filteredTemplates.length > 0) {
            this._templateGrid._selectRow(0);
            this.updateOkButton(true);
        }
        else {
            this.updateOkButton(false);
        }
    }

    private _getSelectedTemplate() {
        var selectedDataIndex = this._templateGrid._selectedRows[this._templateGrid._selectedIndex];
        return (typeof (selectedDataIndex) === "number") ? this._templateGrid._dataSource[selectedDataIndex] : null;
    }

    private _onTemplateDblClicked() {
        this.onOkClick();
    }
}

VSS.initClassPrototype(NewAlertDialog, {
    _tfsContext: null,
    _alertsManager: null,
    _categoryCombo: null,
    _templates: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _filteredTemplates: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _scopeCombo: null,
    _templateGrid: null,
    _templateGridOptions: null
});

interface EditEmailAddressesDialogOptions extends Dialogs.IModalDialogOptions {
    customLabelText?: string;
    defaultLabelText?: string;
    initialAddress?: string;
    initialAddresses?: any;
    defaultAddresses?: any;
    onOkClick?: Function;
}

class EditEmailAddressesDialog extends Dialogs.ModalDialogO<EditEmailAddressesDialogOptions> {

    private _emailTextArea: any;
    private _initialAddresses: any;
    private _radioCustom: any;
    private _radioDefault: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            minWidth: 300,
            minHeight: 200,
            width: 550,
            height: 280,
            title: AlertsResources.EditEmailAddressesDialogTitle,
            cssClass: "alerts-edit-email-dialog-host",
            useLegacyStyle: true
        }, options));
    }

    public initialize() {
        var $container, $radioContainer, $textAreaContainer, customLabelText, useCustom;
        super.initialize();

        $container = $("<div />")
            .addClass("alerts-edit-email-dialog-contents")
            .appendTo(this._element);

        customLabelText = this._options.customLabelText ? this._options.customLabelText : AlertsResources.EditEmailAddressesDialogDefaultLabel;
        this._initialAddresses = this._options.initialAddresses;
        useCustom = this._initialAddresses || this._initialAddresses === "";

        $container.addClass("radioMode");

        $radioContainer = $("<div />").appendTo($container);
        this._radioDefault = $("<input type='radio' id='radioDefaultAddresses' name='addressType' />")
            .appendTo($radioContainer)
            .click(delegate(this, this._onDefaultRadioClick));
        $("<label for='radioDefaultAddresses' />")
            .text(this._options.defaultLabelText)
            .appendTo($radioContainer);

        $radioContainer = $("<div />").appendTo($container);
        this._radioCustom = $("<input type='radio' id='radioCustomAddresses' name='addressType' />")
            .appendTo($radioContainer)
            .click(delegate(this, this._onCustomRadioClick));
        $("<label for='radioCustomAddresses' />")
            .text(customLabelText)
            .appendTo($radioContainer);

        $textAreaContainer = $("<div />")
            .addClass("textAreaContainer")
            .appendTo($container);
        this._emailTextArea = $("<textarea />")
            .attr("value", useCustom ? this._initialAddresses : this._options.defaultAddresses)
            .keyup(delegate(this, this._onEmailTextKeyUp))
            .appendTo($textAreaContainer);

        $("<span />")
            .text(AlertsResources.EditEmailAddressesDialogInstructionLabel)
            .addClass("emailFormatInfo")
            .appendTo(this._element);

        if (useCustom) {
            this._radioCustom.prop("checked", true);
        }
        else {
            this._radioDefault.prop("checked", true);
            this._emailTextArea.attr("disabled", true);
        }
    }

    public getSelectedAddresses() {
        if (this._radioDefault && this._radioDefault.prop("checked")) {
            return null;
        }
        else {
            return this._emailTextArea.val();
        }
    }

    public onOkClick() {
        var that = this, addresses = this.getSelectedAddresses();
        this.updateOkButton(false);
        if ($.isFunction(this._options.onOkClick)) {
            this._options.onOkClick.call(this, addresses, function () {
                that.close();
            }, function (errorText) {
                    alert(errorText);
                    that.updateOkButton(true);
                });
        }
        else {
            this.close();
        }
    }

    private _updateOkEnabledState() {
        this.updateOkButton(this.getSelectedAddresses() !== this._initialAddresses);
    }

    private _onEmailTextKeyUp(e?) {
        this._updateOkEnabledState();
    }

    private _onCustomRadioClick() {
        if (this._emailTextArea) {
            this._emailTextArea.removeAttr("disabled");
        }
        this._updateOkEnabledState();
    }

    private _onDefaultRadioClick() {
        if (this._emailTextArea) {
            this._emailTextArea.attr("value", this._options.defaultAddresses);
            this._emailTextArea.attr("disabled", true);
        }
        this._updateOkEnabledState();
    }
}

VSS.initClassPrototype(EditEmailAddressesDialog, {
    _emailTextArea: null,
    _initialAddresses: null,
    _radioCustom: null,
    _radioDefault: null
});

class EditCustomEmailAddressDialog extends Dialogs.ModalDialogO<EditEmailAddressesDialogOptions> {

    private _emailBox: any;
    private _initialAddress: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            minWidth: 300,
            minHeight: 170,
            width: 550,
            height: 170,
            title: AlertsResources.EditCustomEmailAddressDialogTitle,
            cssClass: "alerts-edit-email-dialog-host",
            useLegacyStyle: true
        }, options));
    }

    public initialize() {
        super.initialize();

        this._initialAddress = this._options.initialAddress;

        $("<label for='emailAddressCombo' />").text(AlertsResources.EditCustomEmailAddressDialogLabel).appendTo(this._element);
        this._emailBox = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._element, {
            id: "emailAddressCombo",
            mode: "text",
            allowEdit: true,
            change: delegate(this, this._updateOkEnabledState)
        });
        this._emailBox.setText(this._initialAddress);

        $("<div />")
            .text(AlertsResources.EditCustomEmailAddressDialogInstructionLabel)
            .addClass("singleEmailFormatInfo")
            .appendTo(this._element);
    }

    public onOkClick() {
        var that = this, address = this._emailBox.getText();
        this.updateOkButton(false);
        if ($.isFunction(this._options.onOkClick)) {
            this._options.onOkClick.call(this, address, function () {
                that.close();
            }, function (errorText) {
                alert(VSS.getErrorMessage(errorText));
                    that.updateOkButton(false);
                });
        }
        else {
            this.close();
        }
    }

    private _updateOkEnabledState() {
        this.updateOkButton(this._emailBox.getText() !== this._initialAddress);
    }
}

VSS.initClassPrototype(EditCustomEmailAddressDialog, {
    _emailBox: null,
    _initialAddress: null
});



class ManageAlertsDialog extends Dialogs.ModalDialog {

    private _view: any;
    private _advancedAlertsLink: any;
    private _advancedAlertsLinkHref: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            minWidth: 300,
            minHeight: 300,
            width: 600,
            height: 400,
            title: AlertsResources.ManageAlertsDialogTitle,
            buttons: {
                closeButton: {
                    id: 'cancel',
                    text: AlertsResources.AlertDialogCloseButtonText,
                    click: delegate(this, this.close)
                }
            },
            useLegacyStyle: true
        }, options));
    }

    public initialize() {
        super.initialize();

        this._element.addClass("alerts-manage-view");
        this._view = <ManageAlertsView>Controls.Enhancement.enhance(ManageAlertsView, this._element, $.extend({
            customGridNameColWidth: 300
        }, this._options));

        this._bind(this._view._basicAlertsList, "savingAlertsStarted", delegate(this, this._handleSaveQuickAlertsStarted), true);
        this._bind(this._view._basicAlertsList, "savingAlertsCompleted savingAlertsError", delegate(this, this._handleSaveQuickAlertsCompleted), true);
    }

    private _handleSaveQuickAlertsStarted() {
        this.delayExecute("disableCloseButtons", 500, false, function () {
            if (this._element) {
                this._element.trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: "cancel", enabled: false });
            }
        });
    }

    private _handleSaveQuickAlertsCompleted() {
        this.cancelDelayedFunction("disableCloseButtons");
        if (this._element) {
            this._element.trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: "cancel", enabled: true });

            if (this._advancedAlertsLink) {
                this._advancedAlertsLink.removeClass("disabled-link");
                this._advancedAlertsLink.attr("href", this._advancedAlertsLinkHref);
            }
        }
    }
}

VSS.initClassPrototype(ManageAlertsDialog, {
    _view: null,
    _advancedAlertsLink: null,
    _advancedAlertsLinkHref: null
});

function getTeamAlertsPivotValue() {
    var pivotFilter = <Navigation.PivotFilter>Controls.Enhancement.getInstance(Navigation.PivotFilter, $(".alerts-info-bar-pivot-filter"));
    return pivotFilter ? pivotFilter.getSelectedItem().value : false;
}

function showHideTeamAlertsPivot(show: boolean) {
    var pivotFilter = <Navigation.PivotFilter>Controls.Enhancement.getInstance(Navigation.PivotFilter, $(".alerts-info-bar-pivot-filter"));
    if (pivotFilter) {
        if (show) {
            pivotFilter.showElement();
        }
        else {
            pivotFilter.hideElement();
        }
    }
}

export class AlertDialogs {

    public static editAlert(alert, options?) {
        /// <summary>Display the dialog for editing an alert</summary>     
        return Dialogs.Dialog.show<Dialogs.Dialog>(AlertEditorDialog, $.extend({
            cssClass: "alerts-editor-dialog-host",
            alert: alert,
            useLegacyStyle: true
        }, options));
    }

    public static newAlert(options?) {
        /// <summary>Display the dialog for selecting the type of new alert to create</summary>
        return Dialogs.Dialog.show<Dialogs.Dialog>(NewAlertDialog, $.extend({
            cssClass: "alerts-new-alert-dialog-host",
            useLegacyStyle: true
        }, options));
    }

    public static manageAlerts(options?) {
        /// <summary>Display the dialog for managing personal alerts</summary>
        return Dialogs.Dialog.show<Dialogs.Dialog>(ManageAlertsDialog, $.extend({
            cssClass: "alerts-manage-dialog-host",
            useLegacyStyle: true
        }, options));
    }

    constructor() {
    }
}


Controls.Enhancement.registerEnhancement(ManageAlertsView, ".alerts-manage-view");


Controls.Enhancement.registerEnhancement(AdvancedAlertsView, ".alerts-advanced-view");


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Alerts.Controls", exports);
