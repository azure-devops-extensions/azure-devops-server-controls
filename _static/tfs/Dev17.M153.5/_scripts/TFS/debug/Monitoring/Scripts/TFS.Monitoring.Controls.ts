///<amd-dependency path="jQueryUI/dialog"/>

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Service = require("VSS/Service");
import Grids = require("VSS/Controls/Grids");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Dialogs = require("VSS/Controls/Dialogs");
import Monitoring = require("Monitoring/Scripts/TFS.Monitoring");
import monitoringResources = require("Monitoring/Scripts/Resources/TFS.Resources.Monitoring");
import Controls = require("VSS/Controls");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Menus = require("VSS/Controls/Menus");
import Utils_UI = require("VSS/Utils/UI");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;
var TfsContext = TFS_Host_TfsContext.TfsContext;

export interface ViewJobHistoryDetailsDialogOptions extends Dialogs.IModalDialogOptions {
    data?: any;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export class ViewJobHistoryDetailsDialog extends Dialogs.ModalDialogO<ViewJobHistoryDetailsDialogOptions> {

    private _cancelButton: any;
    private _monitorManager: any;

    public table: any;
    public outerDiv: any;
    public tr: any;
    public td: any;

    constructor (options? ) {
        super(options);
    }

    public initialize() {
        var that = this;

        this._monitorManager = TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService<Monitoring.MonitorManager>(Monitoring.MonitorManager);

        super.initialize();
        this._decorate();
        this._initializeButtons();
        this._element.dialog('option', 'buttons', [this._cancelButton]);

        that._element.find('.title').text('[' + this._options.data.historyId + '] ' + this._options.data.hostName + ':' + this._options.data.jobName);

        that._element.find('.result').text(this._options.data.resultString);
        that._element.find('.priority').text(this._options.data.priority);
        that._element.find('.queued-reason').text(this._options.data.queuedReasonsString);
        that._element.find('.host').text(this._options.data.hostName);
        that._element.find('.job-name').text(this._options.data.jobName);
        that._element.find('.host-id').text(this._options.data.jobSource);
        that._element.find('.job-id').text(this._options.data.jobId);
        that._element.find('.agent').text(this._options.data.agentName);
        that._element.find('.weekly-success-rate').text(this._options.data.passRates);
        that._element.find('.agent-id').text(this._options.data.agentId);
        that._element.find('.queue-time').text(Utils_Date.localeFormat(this._options.data.queueTime, "f"));
        that._element.find('.queue-duration').text(this._options.data.queueDuration);
        that._element.find('.start-time').text(Utils_Date.localeFormat(this._options.data.startTime, "f"));
        that._element.find('.run-duration').text(this._options.data.runDuration);
        that._element.find('.end-time').text(Utils_Date.localeFormat(this._options.data.endTime, "f"));
        that._element.find('.result-message').text(this._options.data.resultMessage);
    }

    private _addRowToTable(table, col1text, col1className, col2text, col2classname) {
        this.tr = $(domElem('tr')).appendTo(table);

        this.td = $(domElem('td')).appendTo(this.tr).addClass('def');
        $(domElem('td')).appendTo(this.tr).text(col1text);
        $(domElem('td')).appendTo(this.tr).addClass(col1className);

        if (col2text) {
            this.tr = $(domElem('tr')).appendTo(table);
            this.td = $(domElem('td')).appendTo(this.tr).addClass('def');
            $(domElem('td')).appendTo(this.tr).text(col2text);
            $(domElem('td')).appendTo(this.tr).addClass(col2classname);
        }
    }

    private _decorate() {
        this.outerDiv = $(domElem('div')).addClass('monitor-dialog');
        this.outerDiv.appendTo(this._element);

        // add title
        $(domElem('h3')).appendTo(this.outerDiv).addClass('title').text(monitoringResources.DialogHistoryTitle);

        // add table and details 
        this.table = $(domElem('table')).addClass('jobhistory-detail-class');

        // history id and result row
        this._addRowToTable(this.table, monitoringResources.DialogHistoryResult, 'result', null, null);
        this._addRowToTable(this.table, monitoringResources.DialogHistoryPriority, 'priority', monitoringResources.DialogHistoryQueuedReasons, 'queued-reason');
        this._addRowToTable(this.table, monitoringResources.DialogHistoryHost, 'host', monitoringResources.DialogHistoryJobName, 'job-name');
        this._addRowToTable(this.table, monitoringResources.DialogHistoryAgent, 'agent', monitoringResources.DialogHistoryQueueTime, 'queue-time');
        this._addRowToTable(this.table, monitoringResources.DialogHistoryQueueDuration, 'queue-duration', monitoringResources.DialogHistoryStartTime, 'start-time');
        this._addRowToTable(this.table, monitoringResources.DialogHistoryRunDuration, 'run-duration', monitoringResources.DialogHistoryEndTime, 'end-time');
        this._addRowToTable(this.table, monitoringResources.DialogHistoryResultMessage, 'result-message', null, null);
        this._addRowToTable(this.table, monitoringResources.DialogHistoryHostId, 'host-id', null, null);
        this._addRowToTable(this.table, monitoringResources.DialogHistoryJobId, 'job-id', null, null);
        this._addRowToTable(this.table, monitoringResources.DialogHistoryAgentId, 'agent-id', null, null);

        this.table.appendTo(this.outerDiv);
    }

    private _initializeButtons() {
        this._cancelButton = {
            id: 'cancel',
            text: monitoringResources.DialogCloseButtonText,
            click: function () {
                $(this).dialog('close');
            }
        };
    }
}

VSS.initClassPrototype(ViewJobHistoryDetailsDialog, {
    _cancelButton: null,
    _monitorManager: null,
    table: null,
    outerDiv: null,
    tr: null,
    td: null
});

export interface ViewJobDefinitionDetailsDialogOptions extends Dialogs.IModalDialogOptions {
    jobId?: string;
    hostId?: string;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}


export class ViewJobDefinitionDetailsDialog extends Dialogs.ModalDialogO<ViewJobDefinitionDetailsDialogOptions> {

    public static jobId: any = null;
    public static hostId: any = null;

    private _cancelButton: any;
    private _monitorManager: any;

    public table: any;
    public outerDiv: any;
    public tr: any;
    public td: any;

    constructor (options? ) {
        super(options);
    }

    public initialize() {
        var that = this;

        this._monitorManager = TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService<Monitoring.MonitorManager>(Monitoring.MonitorManager);

        super.initialize();
        this._decorate();
        this._initializeButtons();
        this._element.dialog('option', 'buttons', [this._cancelButton]);

        this._monitorManager.getJobDefinitionDetails(this._options.hostId, this._options.jobId, function (result) {
            // fill out data
            that._element.find('.title').text(result.hostName + ':' + result.jobName);

            that._element.find('.job-name').text(result.jobName);
            that._element.find('.extension').text(result.extensionName);
            that._element.find('.job-id').text(result.jobId);
            that._element.find('.enabled-state').text(result.enabledStateString);
            that._element.find('.priority-class').text(result.priorityClassString);
            that._element.find('.job-data').text(result.data);
        });
    }

    private _addRowToTable(table, col1text, col1className, col2text, col2classname) {
        this.tr = $(domElem('tr')).appendTo(table);

        this.td = $(domElem('td')).appendTo(this.tr).addClass('def');
        $(domElem('td')).appendTo(this.tr).text(col1text);
        $(domElem('td')).appendTo(this.tr).addClass(col1className);

        if (col2text) {
            this.tr = $(domElem('tr')).appendTo(table);
            this.td = $(domElem('td')).appendTo(this.tr).addClass('def');
            $(domElem('td')).appendTo(this.tr).text(col2text);
            $(domElem('td')).appendTo(this.tr).addClass(col2classname);
        }
    }

    private _decorate() {
        var outerDiv;

        outerDiv = $(domElem('div'));
        outerDiv.appendTo(this._element);

        // add title
        $(domElem('h3')).appendTo(outerDiv).addClass('title').text(monitoringResources.DialogDefinitionTitle);

        // add table and details
        this.table = $(domElem('table')).addClass('jobdefinition-detail-class');

        // history id and result row
        this._addRowToTable(this.table, monitoringResources.DialogDefinitionJobName, 'job-name', null, null);
        this._addRowToTable(this.table, monitoringResources.DialogDefinitionPriorityClass, 'priority-class', null, null);
        this._addRowToTable(this.table, monitoringResources.DialogDefinitionExtension, 'extension', null, null);
        this._addRowToTable(this.table, monitoringResources.DialogDefinitionEnabledState, 'enabled-state', null, null);
        this._addRowToTable(this.table, monitoringResources.DialogDefinitionJobId, 'job-id', null, null);
        this._addRowToTable(this.table, monitoringResources.DialogDefinitionJobData, 'job-data', null, null);

        this.table.appendTo(outerDiv);
    }

    private _initializeButtons() {
        this._cancelButton = {
            id: 'cancel',
            text: monitoringResources.DialogCloseButtonText,
            click: function () {
                $(this).dialog('close');
            }
        };
    }
}

VSS.initClassPrototype(ViewJobDefinitionDetailsDialog, {
    _cancelButton: null,
    _monitorManager: null,
    table: null,
    outerDiv: null,
    tr: null,
    td: null
});



export class JobQueueGrid extends Grids.GridO<any> {

    private static _priorityColumn: any = {
        index: "priority",
        text: monitoringResources.QueueGridPriority,
        width: 50
    };
    private static _queueDurationColumn: any = {
        index: "displayTime",
        text: monitoringResources.QueueGridQueueDuration,
        width: 150
    };
    private static _jobNameColumn: any = {
        index: "jobName",
        text: monitoringResources.QueueGridJobName,
        width: 350
    };
    private static _hostNameColumn: any = {
        index: "hostName",
        text: monitoringResources.QueueGridHostName,
        width: 250
    };

    constructor (options? ) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: true,
            cssClass: "jobhistory-grid",
            gutter: {
                contextMenu: true
            },
            columns: this._getColumns(),
            initialSelection: false
        }, options));
    }

    public initialize() {
        super.initialize();
        this.layout();
    }

    public setJobQueue(jobQueue) {
        this.setDataSource(jobQueue, null, this._getColumns());
        this.layout();
    }

    private _getColumns() {
        return [
            JobQueueGrid._priorityColumn,
            JobQueueGrid._queueDurationColumn,
            JobQueueGrid._jobNameColumn,
            JobQueueGrid._hostNameColumn
        ];
    }
}

VSS.classExtend(JobQueueGrid, TfsContext.ControlExtensions);



export class JobHistoryGrid extends Grids.GridO<any> {

    private static _historyIdColumn: any = {
        index: "historyId",
        text: monitoringResources.HistoryGridHistoryId,
        width: 70
    };
    private static _priorityColumn: any = {
        index: "priority",
        text: monitoringResources.HistoryGridPriority,
        width: 50
    };
    private static _jobNameColumn: any = {
        index: "jobName",
        text: monitoringResources.HistoryGridJobName,
        width: 300
    };
    private static _resultStringColumn: any = {
        index: "resultString",
        text: monitoringResources.HistoryGridResult,
        width: 75
    };
    private static _hostNameColumn: any = {
        index: "hostName",
        text: monitoringResources.HistoryGridHostName,
        width: 250
    };
    private static _queueDurationColumn: any = {
        index: "queueDuration",
        text: monitoringResources.HistoryGridTimeInQueue,
        width: 100
    };
    private static _runDurationColumn: any = {
        index: "runDuration",
        text: monitoringResources.HistoryGridRunTime,
        width: 100
    };
    private static _jobSourceColumn: any = {
        index: "jobSource",
        text: monitoringResources.HistoryGridJobSource,
        width: 250
    };
    private static _jobIdColumn: any = {
        index: "jobId",
        text: monitoringResources.HistoryGridJobId,
        width: 250
    };
    private static _queueTimeColumn: any = {
        index: "queueTime",
        text: monitoringResources.HistoryGridQueueTime,
        width: 130,
        comparer: function (column, order, item1, item2) {
            return item1.queueTime - item2.queueTime;
        }
    };
    private static _startTimeColumn: any = {
        index: "startTime",
        text: monitoringResources.HistoryGridStartTime,
        width: 130,
        comparer: function (column, order, item1, item2) {
            return item1.startTime - item2.startTime;
        }
    };
    private static _endTimeColumn: any = {
        index: "endTime",
        text: monitoringResources.HistoryGridEndTime,
        width: 130,
        comparer: function (column, order, item1, item2) {
            return item1.endTime - item2.endTime;
        }
    };

    constructor (options? ) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: true,
            cssClass: "jobhistory-grid",
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                executeAction: delegate(this, this._onMenuItemClick)
            },
            columns: this._getColumns(),
            initialSelection: false
        }, options));
    }

    public initialize() {
        super.initialize();
        this.layout();
    }

    public setJobHistory(jobHistory) {
        this.setDataSource(jobHistory, null, this._getColumns());
        this.layout();
    }

    public viewJobHistory() {
        var selectedRowIndex = this.getSelectedDataIndex(), historyId;

        // see if something is selected and if so, then return it
        if (selectedRowIndex > -1 && selectedRowIndex < this._dataSource.length) {
            historyId = this._dataSource[selectedRowIndex].historyId;
        }

        Dialogs.show(ViewJobHistoryDetailsDialog, {
            cssClass: "monitoring",
            title: monitoringResources.TitleJobHistoryDetails,
            minWidth: 650,
            minHeight: 400,
            width: 850,
            height: 450,
            resizable: true,
            tfsContext: this._options.tfsContext,
            data: this.getRowData(selectedRowIndex)
        });
    }

    public viewJobDefinition() {
        var selectedRowIndex = this.getSelectedDataIndex(), hostId, jobId;

        // see if something is selected and if so, then return it
        if (selectedRowIndex > -1 && selectedRowIndex < this._dataSource.length) {
            hostId = this.getRowData(selectedRowIndex).jobSource;
            jobId = this.getRowData(selectedRowIndex).jobId;
        }

        ViewJobDefinitionDetailsDialog.jobId = jobId;
        ViewJobDefinitionDetailsDialog.hostId = hostId;

        Dialogs.show(ViewJobDefinitionDetailsDialog, {
            cssClass: "monitoring",
            title: monitoringResources.TitleJobDefinitionDetails,
            minWidth: 420,
            minHeight: 300,
            width: 800,
            height: 400,
            resizable: true,
            hostId: hostId,
            jobId: jobId,
            tfsContext: this._options.tfsContext,
            data: this.getRowData(selectedRowIndex)
        });
    }

    private _getColumns() {
        return [
            JobHistoryGrid._historyIdColumn,
            JobHistoryGrid._priorityColumn,
            JobHistoryGrid._resultStringColumn,
            JobHistoryGrid._hostNameColumn,
            JobHistoryGrid._jobNameColumn,
            JobHistoryGrid._queueTimeColumn,
            JobHistoryGrid._queueDurationColumn,
            JobHistoryGrid._runDurationColumn
        ];
    }

    private _getContextMenuItems() {
        return [{ rank: 5, id: "view-history", text: monitoringResources.ContextMenuViewHistory, icon: "icon-open" },
                { rank: 15, id: "view-definition", text: monitoringResources.ContextMenuViewDefinition, icon: "icon-open" }];
    }

    private _onMenuItemClick(e? ) {
        var command = e.get_commandName();

        switch (command) {
            case "view-history":
                this.viewJobHistory();
                break;
            case "view-definition":
                this.viewJobDefinition();
                break;
        }
    }
}

VSS.classExtend(JobHistoryGrid, TfsContext.ControlExtensions);


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Monitoring.Controls", exports);
