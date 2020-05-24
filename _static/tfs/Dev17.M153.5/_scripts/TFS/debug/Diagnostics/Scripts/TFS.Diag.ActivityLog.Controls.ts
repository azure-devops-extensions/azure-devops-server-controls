///<amd-dependency path="jQueryUI/core"/>
///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/dialog"/>

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Events_Action = require("VSS/Events/Action");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import ActivityLog = require("Diagnostics/Scripts/TFS.Diag.ActivityLog");
import diagnosticsResources = require("Diagnostics/Scripts/Resources/TFS.Resources.Diagnostics");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import Grids = require("VSS/Controls/Grids");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import Utils_UI = require("VSS/Utils/UI");
import Diag = require("VSS/Diag");

var domElem = Utils_UI.domElem;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;
var delegate = Utils_Core.delegate;


class ActivityLogGrid extends Grids.GridO<any> {

    public static enhancementTypeName: string = "tfs.diagnostics.ActivityLogGrid";
    private static _commandIdColumn: any = {
        index: "commandId",
        text: diagnosticsResources.ActivityLogId,
        width: 50,
        sortColumnId: ActivityLog.ActivityLogColumns.CommandId,
        canSortBy: true
    };
    private static _applicationColumn: any = {
        index: "application",
        text: diagnosticsResources.ActivityLogApplication,
        width: 100,
        sortColumnId: ActivityLog.ActivityLogColumns.Application,
        canSortBy: true
    };
    private static _commandColumn: any = {
        index: "command",
        text: diagnosticsResources.ActivityLogCommand,
        width: 150,
        sortColumnId: ActivityLog.ActivityLogColumns.Command,
        canSortBy: true
    };
    private static _statusColumn: any = {
        index: "status",
        text: diagnosticsResources.ActivityLogStatus,
        width: 50,
        sortColumnId: ActivityLog.ActivityLogColumns.Status,
        canSortBy: true
    };
    private static _startTimeColumn: any = {
        index: "startTime",
        text: diagnosticsResources.ActivityLogStartTime,
        width: 120,
        sortColumnId: ActivityLog.ActivityLogColumns.StartTime,
        canSortBy: true
    };
    private static _executionTimeColumn: any = {
        index: "executionTime",
        text: diagnosticsResources.ActivityLogExecutionTime,
        width: 120,
        sortColumnId: ActivityLog.ActivityLogColumns.ExecutionTime,
        canSortBy: true
    };
    private static _identityNameColumn: any = {
        index: "identityName",
        text: diagnosticsResources.ActivityLogIdentityName,
        width: 150,
        sortColumnId: ActivityLog.ActivityLogColumns.IdentityName,
        canSortBy: true
    };
    private static _ipAddressColumn: any = {
        index: "ipAddress",
        text: diagnosticsResources.ActivityLogIpAddress,
        width: 100,
        sortColumnId: ActivityLog.ActivityLogColumns.IPAddress,
        canSortBy: true
    };
    private static _uniqueIdentifierColumn: any = {
        index: "uniqueIdentifier",
        text: diagnosticsResources.ActivityLogUniqueIdentifier,
        width: 100,
        sortColumnId: ActivityLog.ActivityLogColumns.UniqueIdentifier,
        canSortBy: true
    };
    private static _userAgentColumn: any = {
        index: "userAgent",
        text: diagnosticsResources.ActivityLogUserAgent,
        width: 100,
        sortColumnId: ActivityLog.ActivityLogColumns.UserAgent,
        canSortBy: true
    };
    private static _commandIdentifierColumn: any = {
        index: "commandIdentifier",
        text: diagnosticsResources.ActivityLogCommandIdentifier,
        width: 100,
        sortColumnId: ActivityLog.ActivityLogColumns.CommandIdentifier,
        canSortBy: true
    };
    private static _executionCountColumn: any = {
        index: "executionCount",
        text: diagnosticsResources.ActivityLogExecutionCount,
        width: 100,
        sortColumnId: ActivityLog.ActivityLogColumns.ExecutionCount,
        canSortBy: true
    };
    private static _authenticationTypeColumn: any = {
        index: "authenticationType",
        text: diagnosticsResources.ActivityLogAuthenticationType,
        width: 100,
        sortColumnId: ActivityLog.ActivityLogColumns.AuthenticationType,
        canSortBy: true
    };
    private static _responseCodeColumn: any = {
        index: "responseCode",
        text: diagnosticsResources.ActivityLogResponseCode,
        width: 100,
        sortColumnId: ActivityLog.ActivityLogColumns.ResponseCode,
        canSortBy: true
    };

    private _activityLogInstanceManager: any;
    private _lastVisibleRange: any;
    private _pageData: any;
    private _entries: any[];
    private _entriesNeeded: any[];
    private _columnMap: any[];
    private _filter: any;
    private _sortFields: any;
    private _rootCount: number;

    public PAGE_SIZE: number;
    public _fetching: boolean;

    constructor (options? ) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            cssClass: 'activity-log-grid',
            columns: this._getColumns(),
            allowMultiSelect: false,
            sortOrder: this._getSortOrder(),
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                executeAction: delegate(this, this._onMenuItemClick)
            }
        }, options));
    }

    public hide() {
        this._element.hide();
    }

    public show() {
        this._element.show();
    }

    public initialize() {
        super.initialize();
        this._filter = {};
        this._activityLogInstanceManager = ActivityLog.ActivityLogInstanceManager.get(this._options.tfsContext);
        this._initColumnMap();
    }

    public refresh(instanceId, userName, sortOrder, sortFields) {
        /// <summary>Refreshes the control according to the specified filters</summary>
        /// <param name="filter" type="Object">New filters to be applied</param>
        // Performing fetch operation

        this._sortOrder = sortOrder || this._sortOrder || this._getSortOrder();
        this._sortFields = sortFields || this._sortFields || this._getSortFields();
        this._filter.instanceId = instanceId;
        this._filter.userName = userName;
        this._fetch(delegate(this, this._updateDataModel));

        Diag.logTracePoint("ActivityLogList.refresh.pending");
    }

    private clearGrid(){
        this._updateDataModel({targetIds: []});
    }

    public initializeDataModel(activityLogModel) {
        this.processDataSource(activityLogModel, false);

        this._pageData = {};
        this.buildCache(activityLogModel.payload);
    }

    public processDataSource(datasource, deleteOriginal) {
        /// <summary>Process the datasource arrays and delete them if needed</summary>
        this._entries = TFS_Core_Utils.unpackIntegerArray(datasource.targetIds);

        this._options.source = this._entries;
        this._options.columns = this._columns;
        this._options.sortOrder = this._sortOrder;

        this._options.expandStates = null;
        this._rootCount = this._entries.length;

        if (deleteOriginal) {
            delete datasource.targetIds;
        }
    }

    public getSelectedItem() {
        return this._dataSource[this._selectedIndex];
    }

    public getRecordCount() {
        return this._entries.length;
    }

    public buildCache(payload) {
        var i, l, row, id;

        if (payload) {
            for (i = 0, l = payload.length; i < l; i++) {
                row = payload[i];
                id = row.commandId;
                this._pageData[id] = row;
            }
        }
    }

    public cacheRows(aboveRange, visibleRange, belowRange) {
        this._lastVisibleRange = visibleRange;
        //no need to delay grid's row updates it is going to be async anyways
        Utils_Core.delay(this, 0, function () {
            this._updateActivitylogCache(aboveRange, visibleRange, belowRange);
        });
    }

    public getColumnValue(dataIndex: number, columnIndex: number, columnOrder?: number): any {
        /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
        /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
        /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
        /// <returns type="any" />

        var commandId, entry;

        // Get the id of the entry we are displaying
        commandId = this._entries[dataIndex];

        // Get entry from cache
        entry = this._pageData[commandId];

        if (!entry) {
            return "";
        }

        // Return data
        return entry[this._columnMap[columnIndex].index];
    }

    public onSort(sortOrder: any, sortColumns?: any): any {
        /// <param name="sortOrder" type="any" />
        /// <param name="sortColumns" type="any" optional="true" />
        /// <returns type="any" />

        var sortFields = [];

        $.each(sortColumns, function (i, v) {
            sortFields.push(
                v.sortColumnId + (sortOrder[i].order === "asc" ? ";asc" : ";desc")
            );
        });

        this.refresh(this._filter.instanceId, this._filter.userName, sortOrder, sortFields);
    }

    private _getColumns() {
        return [
            ActivityLogGrid._commandIdColumn,
            ActivityLogGrid._applicationColumn,
            ActivityLogGrid._commandColumn,
            ActivityLogGrid._statusColumn,
            ActivityLogGrid._startTimeColumn,
            ActivityLogGrid._executionTimeColumn,
            ActivityLogGrid._identityNameColumn,
            ActivityLogGrid._ipAddressColumn,
            ActivityLogGrid._uniqueIdentifierColumn,
            ActivityLogGrid._userAgentColumn,
            ActivityLogGrid._commandIdentifierColumn,
            ActivityLogGrid._executionCountColumn,
            ActivityLogGrid._authenticationTypeColumn,
            ActivityLogGrid._responseCodeColumn
        ];
    }

    private _initColumnMap() {
        var columns = this._getColumns(), i, l;
        for (i = 0, l = columns.length; i < l; i++) {
            this._columnMap[columns[i].index] = columns[i];
        }
    }

    private _getContextMenuItems() {
        var menuItems = [];

        menuItems.push({
            id: "show-command-detail",
            text: diagnosticsResources.ShowDetail,
            title: diagnosticsResources.ShowDetail,
            noIcon: true
        });

        menuItems.push({
            id: "filter-user",
            text: diagnosticsResources.FilterByUser,
            title: diagnosticsResources.FilterByUser,
            noIcon: true
        });

        return menuItems;
    }

    private _onMenuItemClick(e? ) {
        var command = e.get_commandName(),
            selectedItem = this._pageData[this.getSelectedItem()];

        // Checking to see if the command we can handle is executed
        switch (command) {
            case "show-command-detail":
                this._fire("showCommandDetail", selectedItem);
                break;
            case "filter-user":
                this._fire("filterByUser", selectedItem);
                break;
        }

    }

    private _getSortOrder() {
        return [{ index: "commandId", order: "desc" }];
    }

    private _getSortFields() {
        return [ActivityLog.ActivityLogColumns.CommandId + ";desc"];
    }

    private _prepareSource(entries) {
        var i, l, entry, source = [];
        for (i = 0, l = entries.length; i < l; i++) {
            entry = $.extend({}, entries[i]);

            source[source.length] = entry;
        }
        return { source: source };
    }

    private _fetch(callback) {
        this._activityLogInstanceManager.beginGetActivitylog(
            this._filter.instanceId,
            this._filter.userName || undefined,
            this._sortFields,
            callback,
            (error) => {
                this.clearGrid()
                this.redraw();
                this._showError(error);
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: diagnosticsResources.PleaseWait,
                    target: this._element
                }
            }
        );
    }

    private _showError(error) {
        if (this._options.errorCallback && $.isFunction(this._options.errorCallback)) {
            this._options.errorCallback(error);
        }
    }

    private _updateDataModel(activityLogModel) {
        this.initializeDataModel(activityLogModel);
        this.initializeDataSource();

        Diag.logTracePoint("ActivityLogList.refresh.complete");
    }

    private _updateActivitylogCache(aboveRange, visibleRange, belowRange) {
        var al = aboveRange.length,
            bl = belowRange.length,
            i,
            count,
            rows = [],
            commandId,
            entries = this._entries,
            cache = this._pageData;

        count = Math.max(al, bl);

        for (i = 0; i < count; i++) {
            if (i < al) {
                rows[rows.length] = aboveRange[i][1];
            }

            if (i < bl) {
                rows[rows.length] = belowRange[bl - i - 1][1];
            }
        }

        count = visibleRange.length;
        for (i = 0; i < count; i++) {
            rows[rows.length] = visibleRange[i][1];
        }

        count = rows.length;
        for (i = 0; i < count; i++) {
            commandId = entries[rows[i]];

            if (!(commandId in cache)) {
                this._entriesNeeded.push(commandId);
            }
        }

        this.delayExecute("pageLogEntries", 100, true, function () {
            this._pageLogEntries();
        });
    }

    private _pageLogEntries(operationCompleteCallback) {
        var entries, entriesHash, id, grid = this;

        if (!this._fetching) {
            entries = [];
            entriesHash = {};

            while (this._entriesNeeded.length > 0 && entries.length < this.PAGE_SIZE) {
                id = this._entriesNeeded.pop();

                if (!(id in this._pageData) && !(id in entriesHash)) {
                    entries[entries.length] = id;
                    entriesHash[id] = true;
                }
            }

            this._entriesNeeded = [];

            if (entries.length > 0) {
                this._fetching = true;

                this._activityLogInstanceManager.beginPageActivityLogEntries(this._filter.instanceId, entries, function (pagingData) {
                    grid._fetching = false;
                    grid.buildCache(pagingData);
                    grid.redraw();

                    if ($.isFunction(operationCompleteCallback)) {
                        operationCompleteCallback();
                    }
                },
                delegate(this, this._showError),
                {
                    wait: {
                        image: hostConfig.getResourcesFile('big-progress.gif'),
                        message: diagnosticsResources.PleaseWait,
                        target: this._element
                    }
                });
            }
            else if ($.isFunction(operationCompleteCallback)) {
                operationCompleteCallback();
            }
        }
    }
}

VSS.initClassPrototype(ActivityLogGrid, {
    _activityLogInstanceManager: null,
    _lastVisibleRange: null,
    _pageData: {},
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _entries: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _entriesNeeded: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _columnMap: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _filter: null,
    _sortFields: null,
    PAGE_SIZE: 200,
    _rootCount: 0,
    _fetching: false
});

VSS.classExtend(ActivityLogGrid, TfsContext.ControlExtensions);



class CommandEntryParameterList extends Grids.GridO<any> {

    public static enhancementTypeName: string = "tfs.diag.CommandEntryParameterList";
    private static _indexColumn: any = {
        index: "index",
        text: diagnosticsResources.ParameterIndex,
        canSortBy: true,
        width: 75,
        comparer: function (column, order, item1, item2) {
            return item1.index - item2.index;
        }
    };
    private static _nameColumn: any = {
        index: "name",
        text: diagnosticsResources.ParameterName,
        canSortBy: true,
        width: 200
    };
    private static _valueColumn: any = {
        index: "value",
        text: diagnosticsResources.ParameterValue,
        canSortBy: true,
        width: 200
    };

    constructor (options? ) {
        /// <summary>Creates new Paramter Control</summary>

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            cssClass: "command-parameter-list",
            allowMoveColumns: false,
            allowMultiSelect: false,
            sortOrder: [{ index: "index", order: "asc" }],
            columns: [CommandEntryParameterList._indexColumn, CommandEntryParameterList._nameColumn, CommandEntryParameterList._valueColumn]
        }, options));
    }
}

VSS.classExtend(CommandEntryParameterList, TFS_Host_TfsContext.TfsContext.ControlExtensions);

interface DetailCommandDialogOptions extends Dialogs.IModalDialogOptions {
    commandEntry?: any;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

class DetailCommandDialog extends Dialogs.ModalDialogO<DetailCommandDialogOptions> {

    private _commandEntry: any;

    constructor (options? ) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            title: diagnosticsResources.ActivityLogEntry,
            cssClass: "activity-log-detail",
            width: 600,
            height: 600,
            resizable: true
        }, options));
    }

    public initialize() {
        var closeButton;
        super.initialize();

        this._commandEntry = this._options.commandEntry;

        // Add UI elements
        this._decorate();

        // Change dialog to only have a close button
        closeButton = {
            id: 'commandCloseButton',
            text: diagnosticsResources.Close,
            click: delegate(this, this._onCloseClick)
        };

        this._element.dialog('option', 'buttons', [closeButton]);

        // Need to set the focus explicitly
        this._element.siblings(".ui-dialog-buttonpane").find('#commandCloseButton').focus();
    }

    private _decorate() {
        var createContainer, container, fieldContainer;

        // Wrapper
        createContainer = $(domElem('div'));
        this._createField(createContainer, 'commandId', diagnosticsResources.ActivityLogId, this._commandEntry.commandId);
        this._createField(createContainer, 'application', diagnosticsResources.ActivityLogApplication, this._commandEntry.application);
        this._createField(createContainer, 'command', diagnosticsResources.ActivityLogCommand, this._commandEntry.command);
        this._createField(createContainer, 'status', diagnosticsResources.ActivityLogStatus, this._commandEntry.status);
        this._createField(createContainer, 'startTime', diagnosticsResources.ActivityLogStartTime, Utils_Date.localeFormat(this._commandEntry.startTime, "F"));
        this._createField(createContainer, 'executionTime', diagnosticsResources.ActivityLogExecutionTime, this._commandEntry.executionTime);
        this._createField(createContainer, 'identityName', diagnosticsResources.ActivityLogIdentityName, this._commandEntry.identityName);
        this._createField(createContainer, 'ipAddress', diagnosticsResources.ActivityLogIpAddress, this._commandEntry.ipAddress);
        this._createField(createContainer, 'uniqueIdentifier', diagnosticsResources.ActivityLogUniqueIdentifier, this._commandEntry.uniqueIdentifier);
        this._createField(createContainer, 'userAgent', diagnosticsResources.ActivityLogUserAgent, this._commandEntry.userAgent);
        this._createField(createContainer, 'commandIdentifier', diagnosticsResources.ActivityLogCommandIdentifier, this._commandEntry.commandIdentifier);
        this._createField(createContainer, 'executionCount', diagnosticsResources.ActivityLogExecutionCount, this._commandEntry.executionCount);
        this._createField(createContainer, 'authenticationType', diagnosticsResources.ActivityLogAuthenticationType, this._commandEntry.authenticationType);
        this._createField(createContainer, 'responseCode', diagnosticsResources.ActivityLogResponseCode, this._commandEntry.responsCode);

        // Add the parameters grid
        container = $(domElem('div')).addClass('entry-prop').appendTo(createContainer);

        // Create label
        fieldContainer = $(domElem('div')).addClass('entry-label').appendTo(container);
        $(domElem('label')).attr('for', 'parameters').appendTo(fieldContainer).text(diagnosticsResources.Parameters);

        fieldContainer = $(domElem('div')).addClass('entry-input').appendTo(container).attr('id', 'parameters');

        this._commandEntry.parameters.sort(function (q1, q2) {
            return q1.index - q2.index;
        });
        <CommandEntryParameterList>Controls.BaseControl.createIn(CommandEntryParameterList, fieldContainer, {
            tfsContext: this._options.tfsContext,
            source: this._commandEntry.parameters,
            gutter: false,
            width: "100%",
            height: "150px"
        });
        createContainer.appendTo(this._element);
    }

    private _createField(createContainer, fieldId, label, inputValue) {
        var container, fieldContainer;
        container = $(domElem('div')).addClass('entry-prop').appendTo(createContainer);

        // Create label
        fieldContainer = $(domElem('div')).addClass('entry-label').appendTo(container);
        $(domElem('label')).attr('for', fieldId).appendTo(fieldContainer).text(label);

        // Create input
        fieldContainer = $(domElem('div')).addClass('entry-input').appendTo(container);
        return $("<div/>").addClass('requiredInfoLight').attr('id', fieldId).appendTo(fieldContainer).text(inputValue);
    }

    private _onCloseClick() {
        this.close();
    }
}

VSS.initClassPrototype(DetailCommandDialog, {
    _commandEntry: null
});



class ActivityLogViewerControl extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.diagnostics.ActivityLogViewerControl";

    private _entriesGrid: any;
    private _menuBar: any;
    private _hosts: any;
    private _activityLogInstanceManager: any;

    public $findAccountButton: any;
    public $clearButton: any;
    public $filterButton: any;
    public $account: any;
    public $errorContainer: any;
    public $activityLogContainer: any;
    public $secondaryFilters: any;
    public $host: any;
    public $name: any;
    public $activityContent: any;

    constructor (options? ) {
        super(options);
    }

    public initialize() {
        super.initialize();

        // Get the server manager
        this._activityLogInstanceManager = ActivityLog.ActivityLogInstanceManager.get(this._options.tfsContext);

        // Bind to events
        this._element.bind('filterByUser', delegate(this, this._filterByUser));
        this._element.bind('showCommandDetail', delegate(this, this._openCommandDetail));
        this._element.bind("openRowDetail", delegate(this, this._openCommandDetail));

        // Draw the page
        this._decorate();

        // For on premise, load hosts.  For hosted we need to know the account.
        if (!this._options.tfsContext.isHosted) {
            this._findHosts();
        }
    }

    private _decorate() {
        var filterElement,
            container,
            activityContentContainer,
            propContainer;

        // Create error element
        this.$errorContainer = $(domElem('div')).addClass('activity-log-container-error').prependTo(this._element).hide();
        this.$activityLogContainer = this._element.find('.activity-log-container');

        // Get the filter section
        filterElement = this._element.find('.activity-log-filters');
        container = $(domElem('div')).addClass('activity-log-filter').appendTo(filterElement);

        // If this is hosted Create the account filter section
        if (this._options.tfsContext.isHosted) {
            propContainer = $(domElem('div')).addClass('activity-log-property').appendTo(container);

            $(domElem('label')).attr('for', 'accountNameFilter').appendTo(propContainer).text(diagnosticsResources.AccountNameLabel);
            this.$account = $("<input type='text'/>").addClass('requiredInfoLight').attr('id', 'accountNameFilter').appendTo(propContainer);
            this.$account.bind('keyup', delegate(this, this._enableAccountFind));

            // Create account find button
            this.$findAccountButton = $("<button type='button' />")
                .text(diagnosticsResources.Load)
                .click(delegate(this, this._findHosts))
                .addClass("activity-log-button")
                .appendTo(propContainer);

            this.$findAccountButton.button();
            this.$findAccountButton.button('disable');
        }

        // Add the collection/user filters
        // Add hosts combo
        this.$secondaryFilters = $(domElem('div')).addClass('activity-log-filter').addClass('secondary').appendTo(filterElement).hide();
        propContainer = $(domElem('div')).addClass('activity-log-property').appendTo(this.$secondaryFilters);
        $(domElem('label')).attr('for', 'hostFilter').appendTo(propContainer).text(diagnosticsResources.Host);
        this.$host = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, propContainer, {
            cssClass: "hosts-combo",
            enabled: true,
            mode: "drop",
            id: "hostFilter",
            allowEdit: false,
            source: [],
            change: delegate(this, this._hostChanged)
        });

        // Add the name filter
        propContainer = $(domElem('div')).addClass('activity-log-property').appendTo(this.$secondaryFilters);
        $(domElem('label')).attr('for', 'nameFilter').appendTo(propContainer).text(diagnosticsResources.IdentityName);
        this.$name = $("<input type='text'/>").addClass('requiredInfoLight').attr('id', 'nameFilter').addClass('name-filter').appendTo(propContainer);
        this.$name.bind('keyup', delegate(this, this._enableFilterbutton));

        // Add filter button
        this.$filterButton = $("<button type='button' />")
                .text(diagnosticsResources.Filter)
                .click(delegate(this, this._filterCommands))
                .addClass("activity-log-button")
                .appendTo(propContainer);

        this.$filterButton.button();
        this.$filterButton.button('disable');

        // Add clear button
        this.$clearButton = $("<button type='button' />")
                .text(diagnosticsResources.Clear)
                .click(delegate(this, this._clearFilter))
                .addClass("activity-log-button clear-filter")
                .appendTo(propContainer);

        this.$clearButton.button();
        this.$clearButton.button('disable');

        // Find the content section for the grid
        this.$activityContent = this._element.find('.activity-log-content');

        // Add menu bar to grid
        activityContentContainer = $(domElem('div')).addClass('activity-log-menu fixed-header').appendTo(this.$activityContent);
        this._menuBar = this._createMenuBar(activityContentContainer);

        activityContentContainer = $(domElem('div')).addClass('fill-content').appendTo(this.$activityContent);
        <TFS_Admin_Common.VerticalFillLayout>Controls.Enhancement.enhance(TFS_Admin_Common.VerticalFillLayout, this.$activityContent);

        // Create grid
        this._entriesGrid = <ActivityLogGrid>Controls.BaseControl.createIn(ActivityLogGrid, activityContentContainer, { tfsContext: this._options.tfsContext, errorCallback: delegate(this, this._showError) });
    }

    private _enableAccountFind(e? ) {
        if (this.$account.val() && this.$account.val().length > 0) {
            this.$findAccountButton.button('enable');
            if (e.keyCode === $.ui.keyCode.ENTER) {
                this._findHosts();
            }
        } else {
            this.$findAccountButton.button('disable');
        }
    }

    private _enableFilterbutton() {
        if (this._hosts.length > 0 && this.$name.val() && this.$name.val().length > 0) {
            this.$filterButton.button('enable');
        } else {
            this.$filterButton.button('disable');
        }
    }

    private _clearFilter() {
        this.$name.val('');
        this.$filterButton.button('disable');
        this.$clearButton.button('disable');
        this._entriesGrid.refresh(this._hosts[this.$host.getSelectedIndex()].instanceId, this.$name.val());
    }

    private _openCommandDetail(event, args? ) {
        var commandId = this._entriesGrid.getSelectedItem();
        this._activityLogInstanceManager.beginGetActivitylogEntry(
            this._hosts[this.$host.getSelectedIndex()].instanceId,
            commandId,
            delegate(this, this._displayActivityLogEntry),
            delegate(this, this._showError),
            {
                wait: {
                    image: TFS_Host_TfsContext.TfsContext.getDefault().configuration.getResourcesFile('big-progress.gif'),
                    message: diagnosticsResources.PleaseWait,
                    target: $('.content-section')
                }
            }
        );
    }

    private _displayActivityLogEntry(entry) {
        Dialogs.show(DetailCommandDialog, {
            commandEntry: entry
        });
    }

    private _filterByUser(event, args? ) {
        // Set the user name text box and filter grid
        this.$name.val(args.identityName);
        this._filterCommands();
    }

    private _filterCommands() {
        this._hideError();
        this.$clearButton.button('enable');
        this._entriesGrid.refresh(this._hosts[this.$host.getSelectedIndex()].instanceId, this.$name.val());
    }

    private _findHosts() {
        this._hideFilters();
        this._hideError();

        this._activityLogInstanceManager.beginGetHosts(
            this._options.tfsContext.isHosted ? this.$account.val() : '',
            delegate(this, this._hostsFound),
            delegate(this, this._showError),
            {
                wait: {
                    image: TFS_Host_TfsContext.TfsContext.getDefault().configuration.getResourcesFile('big-progress.gif'),
                    message: diagnosticsResources.PleaseWait,
                    target: $('.content-section')
                }
            }
        );
    }

    private _hostsFound(data) {
        this._hosts = data;
        if (this._hosts.length > 0) {
            //  Set the host name and show filters
            this.$host.setSource($.map(this._hosts, function (host) {
                return host.name;
            }));

            this.$host.setSelectedIndex(0);
            this.$secondaryFilters.show();

            // Update the menu bar to enable refresh button
            this._menuBar.updateItems(this._createMenubarItems(false));

            // Refresh the grid
            this._entriesGrid.refresh(this._hosts[this.$host.getSelectedIndex()].instanceId, null);
        }
    }

    private _hostChanged(e? ) {
        this._hideError();
        this._entriesGrid.refresh(this._hosts[this.$host.getSelectedIndex()].instanceId, null);
    }

    private _hideFilters() {
        this.$secondaryFilters.hide();
        this.$name.val('');
        this._hosts = [];
        this.$host.setSource([]);
        this.$filterButton.button('disable');
    }

    private _showError(error) {
        this.$activityLogContainer.addClass('activity-error');
        this.$errorContainer.text(error.message).show();
    }

    private _hideError() {
        this.$activityLogContainer.removeClass('activity-error');
        this.$errorContainer.hide();
    }

    private _createMenuBar(element) {
        // Creating the menu bar
        var menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, element, {
            items: this._createMenubarItems(true),
            executeAction: Utils_Core.delegate(this, this._onMenuItemClick)
        });

        return menuBar;
    }

    private _createMenubarItems(disabled) {
        var items = [];

        items.push({ id: "refresh-activity-log", text: diagnosticsResources.Refresh, title: diagnosticsResources.Refresh, icon: "icon-refresh", showText: false, disabled: disabled });
        items.push({ separator: true });
        items.push({ id: "export-activity-log", text: diagnosticsResources.Export, title: diagnosticsResources.Export, noIcon: true, showText: true, disabled: disabled });

        return items;
    }

    private _onMenuItemClick(e? ) {
        var command = e.get_commandName(),
            href;

        // Checking to see if the command we can handle is executed
        switch (command) {
            case "refresh-activity-log":
                this._entriesGrid.refresh(this._hosts[this.$host.getSelectedIndex()].instanceId, this.$name.val());
                break;
            case "export-activity-log":
                href = this._options.tfsContext.getActionUrl("export", "diagnostics", { area: "api", instanceId: this._hosts[this.$host.getSelectedIndex()].instanceId, userName: this.$name.val() });

                Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                    url: href,
                    target: "_blank"
                });
                break;
        }
    }
}

VSS.initClassPrototype(ActivityLogViewerControl, {
    _entriesGrid: null,
    _menuBar: null,
    _hosts: null,
    _activityLogInstanceManager: null,
    $findAccountButton: null,
    $clearButton: null,
    $filterButton: null,
    $account: null,
    $errorContainer: null,
    $activityLogContainer: null,
    $secondaryFilters: null,
    $host: null,
    $name: null,
    $activityContent: null
});

VSS.classExtend(ActivityLogViewerControl, TfsContext.ControlExtensions);


Controls.Enhancement.registerEnhancement(ActivityLogViewerControl, ".activity-log-view")


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Diag.ActivityLog.Controls", exports);
