///<amd-dependency path="jQueryUI/core"/>
///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/dialog"/>

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Array = require("VSS/Utils/Array");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import TreeView = require("VSS/Controls/TreeView");
import Grids = require("VSS/Controls/Grids");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import diagResources = require("Diagnostics/Scripts/Resources/TFS.Resources.Diagnostics");
import Diag = require("VSS/Diag");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;
var delegate = Utils_Core.delegate;
var defaultTraceManager;


class TraceManager {

    public static pageSize: number = 200;

    public static get(tfsContext) {
        if (!defaultTraceManager) {
            defaultTraceManager = new TraceManager(tfsContext);
        }

        return defaultTraceManager;
    }

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _traceDefinitions: any;

    constructor (tfsContext) {
        this._tfsContext = tfsContext;
        this._traceDefinitions = {};

    }

    public beginGetTraceDefinitions(callback: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="callback" type="IResultCallback" />
        /// <param name="errorCallback" type="IErrorCallback"/>
        /// <param name="ajaxOptions" type="any"/>

        var that = this;
        this._ajaxJson("QueryForTraces", null, function (data) {
            that._storeTraceDefinitions(data);
            callback(data);
        }, errorCallback);
    }

    public beginGetTraces(traceId, since, callback: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any, clearView? ) {
        /// <param name="callback" type="IResultCallback" />
        /// <param name="errorCallback" type="IErrorCallback"/>
        /// <param name="ajaxOptions" type="any"/>

        this._ajaxJson("QueryTraceData",
            {
                // Use the round-trip format
                traceId: traceId ? traceId : undefined,
                since: since,
                pageSize: TraceManager.pageSize
            },
            function (data) {
                callback(data, clearView);
            }, errorCallback);
    }

    public deleteTraceDefinition(trace, callback: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="callback" type="IResultCallback" />
        /// <param name="errorCallback" type="IErrorCallback"/>
        /// <param name="ajaxOptions" type="any"/>

        var that = this;
        this._ajaxPost("DeleteTrace",
            {
                traceId: trace.traceId
            },
            function (data) {
                that._removeTraceDefinition(trace);
                if (callback && $.isFunction(callback)) {
                    callback();
                }
            },
            errorCallback,
            ajaxOptions);
    }

    public getTrace(traceId) {
        return this._traceDefinitions[traceId];
    }

    public getTraceDefinitions() {
        return this._traceDefinitions;
    }

    public saveTraceDefinition(trace, callback, errorCallback? , ajaxOptions? ) {
        var that = this;
        this._ajaxPost("SaveTrace",
            trace,
            function (data) {
                Diag.Debug.assertIsObject(data, "data");
                that._storeTraceDefinitions([data]);

                if (callback && $.isFunction(callback)) {
                    callback(data);
                }
            },
            errorCallback,
            ajaxOptions);
    }

    private _ajaxJson(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.getMSJSON(this._getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ajaxPost(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.postMSJSON(this._getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _removeTraceDefinition(trace) {
        delete (this._traceDefinitions[trace.traceId]);
    }

    private _getApiLocation(action: string): string {
        /// <param name="action" type="string" />
        /// <returns type="string" />

        return this._tfsContext.getActionUrl(action || "", "diagnostics", { area: "api" });
    }

    private _storeTraceDefinitions(definitions) {
        var i, l, definition;
        for (i = 0, l = definitions.length; i < l; i++) {
            definition = definitions[i];
            this._traceDefinitions[definition.traceId] = definition;
        }
    }

    private _updateTraceDefinitions(trace) {
        this._traceDefinitions[trace.traceId] = trace;
    }
}

VSS.initClassPrototype(TraceManager, {
    _tfsContext: null,
    _traceDefinitions: {} //TODO: Dangerous member initialization on prototype. Get rid of it.

});


module TraceMenuActions {
    export var NEW_TRACE = "new-trace";
    export var EDIT_TRACE = "edit-trace";
    export var DELETE_TRACE = "delete-trace";
    export var REFRESH_FILTERS = "refresh-trace-filters";
    export var REFRESH_GRID = "refresh-trace-grid";
}



class TraceLevel {

    private static _traceLevels: any = null;

    public static Off: any = {
    };
    public static Error: any = {

        text: diagResources.Error,
        icon: "icon-tfs-build-failed"
    };
    public static Warning: any = {
        text: diagResources.Warning,
        icon: "icon-warning"
    };
    public static Info: any = {
        text: diagResources.Information,
        icon: "icon-info"
    };
    public static Verbose: any = {
        text: diagResources.Verbose,
        icon: "icon-info"
    };

    public static getTraceLevels() {
        if (!TraceLevel._traceLevels) {
            TraceLevel._traceLevels = [
                    TraceLevel.Off,
                    TraceLevel.Error,
                    TraceLevel.Warning,
                    TraceLevel.Info,
                    TraceLevel.Verbose
            ];
        }

        return TraceLevel._traceLevels;
    }

    constructor () {
    }
}



class TraceProperties {

    private static _names: any = null;
    private static _fields: any = null;

    private static _ensureNames() {
        var names;

        if (!TraceProperties._names) {
            names = {};
            names[TraceProperties.ServiceHost] = { name: "traceServiceHost", displayName: diagResources.TraceServiceHost };
            names[TraceProperties.ProcessName] = { name: "processName", displayName: diagResources.TraceProcessname };
            names[TraceProperties.Tracepoint] = { name: "tracePoint", displayName: diagResources.TracePoint };
            names[TraceProperties.UserLogin] = { name: "userLogin", displayName: diagResources.TraceUserLogin };
            names[TraceProperties.Service] = { name: "service", displayName: diagResources.TraceService };
            names[TraceProperties.Method] = { name: "method", displayName: diagResources.TraceMethod };
            names[TraceProperties.Area] = { name: "area", displayName: diagResources.TraceArea };
            names[TraceProperties.Level] = { name: "level", displayName: diagResources.TraceLevel };
            names[TraceProperties.UserAgent] = { name: "userAgent", displayName: diagResources.TraceUserAgent };
            names[TraceProperties.Layer] = { name: "layer", displayName: diagResources.TraceLayer };
            names[TraceProperties.Uri] = { name: "uri", displayName: diagResources.TraceUri };
            names[TraceProperties.Path] = { name: "path", displayName: diagResources.TracePath };
            names[TraceProperties.UserDefined] = { name: "userDefined", displayName: diagResources.TraceUserDefined };
            names[TraceProperties.ActivityId] = { name: "activityId", displayName: diagResources.TraceActivityId };
            TraceProperties._names = names;
        }
    }

    private static _ensureFields() {
        var fields;

        if (!TraceProperties._fields) {
            fields = {};
            fields.traceServiceHost = diagResources.TraceServiceHost;
            fields.processName = diagResources.TraceProcessname;
            fields.tracePoint = diagResources.TracePoint;
            fields.userLogin = diagResources.TraceUserLogin;
            fields.service = diagResources.TraceService;
            fields.method = diagResources.TraceMethod;
            fields.area = diagResources.TraceArea;
            fields.level = diagResources.TraceLevel;
            fields.userAgent = diagResources.TraceUserAgent;
            fields.layer = diagResources.TraceLayer;
            fields.uri = diagResources.TraceUri;
            fields.path = diagResources.TracePath;
            fields.userDefined = diagResources.TraceUserDefined;
            fields.activityId = diagResources.TraceActivityId;
            TraceProperties._fields = fields;
        }
    }

    public static None: number = 0;
    public static ServiceHost: number = 1;
    public static Tracepoint: number = 2;
    public static ProcessName: number = 3;
    public static UserLogin: number = 4;
    public static Service: number = 5;
    public static Method: number = 6;
    public static Area: number = 7;
    public static Level: number = 8;
    public static UserAgent: number = 9;
    public static Layer: number = 10;
    public static Uri: number = 11;
    public static Path: number = 12;
    public static UserDefined: number = 13;
    public static ActivityId: number = 14;
    public static Message: number = 15;
    public static Last: number = 16;

    public static getName(propertyName, display): string {
        /// <returns type="string" />

        TraceProperties._ensureNames();

        var st = TraceProperties._names[propertyName];

        if (!st) {
            return undefined;
        }
        return st[display === true ? "displayName" : "name"];
    }

    public static getField(propertyName) {
        var st;
        TraceProperties._ensureFields();

        if (TraceProperties._fields.hasOwnProperty(propertyName)) {
            st = TraceProperties._fields[propertyName];
        }

        return st;
    }

    constructor () {
    }
}

interface TracesDialogOptions extends Dialogs.IModalDialogOptions {
    trace?: any;
    mode?: string;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    itemSavedCallback?: Function;
}

class ManageTracesDialog extends Dialogs.ModalDialogO<TracesDialogOptions> {

    private _properties: any[];
    private _traceManager: any;

    public $saveButton: any;
    public $traceId: any;
    public $propertyName: any;
    public $propertyValue: any;
    public $traceProperties: any;
    public $errorContainer: any;

    constructor (options? ) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._properties = [];
        this._decorate();

        this._traceManager = TraceManager.get(this._options.tfsContext);

        // If this is an edit request then populate the fields with the existing values
        if (this._options.mode === 'edit') {
            this._updateFieldsWithExistingTrace();
        }
        this._initializeButtons();
    }

    public _evaluateSaveButtonState(): any {
        /// <returns type="any" />

        var enableSaveButton = false;

        if (this._properties.length > 0) {
            enableSaveButton = true;
        }

        this._enableSaveButton(enableSaveButton);
    }

    private _decorate() {
        var i,
            outerDiv,
            table,
            tr,
            td,
            that = this;

        outerDiv = $(domElem('div')).addClass('manage-trace-view');
        outerDiv.appendTo(this._element);

        //create the table
        table = $(domElem('table')).addClass('trace-table');

        //create the error row
        tr = $(domElem('tr')).appendTo(table);
        this.$errorContainer = $(domElem('td')).appendTo(tr).attr('colspan', '2');

        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('label')).appendTo(td).text(diagResources.DialogTraceId);
        td = $(domElem('td')).appendTo(tr);
        this.$traceId = $(domElem('span')).appendTo(td).text(this._guid());

        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr).attr('colspan', '2');
        $(domElem('label')).appendTo(td).text(diagResources.DialogAddFilters);

        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr);
        this.$propertyName = $(domElem('select')).addClass('type-combo').attr('id', 'tracePropertyName').attr('name', 'tracePropertyName').appendTo(td);
        this.$propertyName.append($("<option />").text('').attr("value", "0"));
        for (i = 1; i < TraceProperties.Message; i++) {
            this.$propertyName.append($("<option />").text(TraceProperties.getName(i, true)).attr("value", i.toString()));
        }
        td = $(domElem('td')).appendTo(tr);
        this.$propertyValue = $(domElem('input')).attr('type', 'text').addClass('trace-property-value').attr('id', 'tracePropertyValue').attr('name', 'tracePropertyValue').appendTo(td);
        this.$propertyValue.keydown(function (args) {
            if (args.keyCode === $.ui.keyCode.ENTER) {
                that._onAddClick();
                return false;
            }
        });
        td = $(domElem('td')).appendTo(tr);
        $(domElem('a')).text(diagResources.DialogAdd).appendTo(td).click(delegate(this, this._onAddClick));

        table.appendTo(outerDiv);

        this.$traceProperties = $(domElem('tbody')).appendTo(table);
        this._renderTraceProperties();
    }

    private _updateFieldsWithExistingTrace() {
        var i;
        this.$traceId.text(this._options.trace.traceId);

        this._properties = [];

        for (i = 1; i < TraceProperties.Message; i++) {
            if (this._options.trace[TraceProperties.getName(i, false)]) {
                this._properties.push({
                    id: i,
                    value: this._options.trace[TraceProperties.getName(i, false)]
                });
            }
        }

        this._renderTraceProperties();
    }

    private _renderTraceProperties() {
        var i,
            tr,
            td;

        this.$traceProperties.empty();

        tr = $(domElem('tr')).appendTo(this.$traceProperties);
        td = $(domElem('td')).appendTo(tr).attr('colspan', '2');
        $(domElem('label')).appendTo(td).text(diagResources.DialogTraceFilters);

        for (i = 0; i < this._properties.length; i++) {
            tr = $(domElem('tr')).appendTo(this.$traceProperties);
            td = $(domElem('td')).appendTo(tr);
            $(domElem('span')).appendTo(td).text(TraceProperties.getName(this._properties[i].id, true));
            td = $(domElem('td')).appendTo(tr);
            $(domElem('span')).appendTo(td).text(this._properties[i].value);
            td = $(domElem('td')).appendTo(tr);
            $(domElem('a')).attr('href', "#").text(diagResources.DialogRemove).appendTo(td).click(delegate(this, this._onRemoveClick, i));
        }
    }

    private _appendErrors(errors, container) {
        var notificationArea, ul, i;
        container.empty();
        notificationArea = $(domElem('div')).appendTo(container)
            .addClass('validation-summary invalid');
        ul = $(domElem('ul')).appendTo(notificationArea);
        for (i = 0; i < errors.length; i++) {
            $(domElem('li')).appendTo(ul).text(errors[i].message);
        }
    }

    private _initializeButtons() {
        this._options.buttons = {
            'ok': {
                id: 'save-trace',
                text: this._options.mode === 'edit' ? diagResources.DialogSaveChanges : diagResources.DialogCreateTrace,
                disabled: true,
                click: delegate(this, this._saveTrace)
            },
            'cancel': {
                id: 'cancel',
                text: diagResources.DialogClose,
                click: function () {
                    $(this).dialog('close');
                }
            }
        };
        this._element.dialog('option', 'buttons', this._options.buttons);
        this.$saveButton = this._element.siblings(".ui-dialog-buttonpane").find('#save-trace');
        this._evaluateSaveButtonState();

    }

    private _randomHexDigit() {
        return Math.floor(Math.random() * 16).toString(16);
    }

    private _random4() {
        return this._randomHexDigit() + this._randomHexDigit() + this._randomHexDigit() + this._randomHexDigit();
    }

    private _guid() {
        return (this._random4() + this._random4() + "-" + this._random4() + "-" + this._random4() + "-" + this._random4() + "-" + this._random4() + this._random4() + this._random4());
    }

    private _onAddClick() {
        var that = this;

        if (that.$propertyName.val() !== "0" && that.$propertyValue.val()) {
            that._properties.push({
                id: that.$propertyName.val(),
                value: that.$propertyValue.val()
            });

            that.$propertyName.val(0);
            that.$propertyValue.val('');
            that._renderTraceProperties();
            that._evaluateSaveButtonState();
        }
    }

    private _onRemoveClick(data, index) {
        var that = this,
            newProperties = [],
            i;

        for (i = 0; i < this._properties.length; i++) {
            if (i !== index) {
                newProperties.push(this._properties[i]);
            }
        }

        that._properties = newProperties;
        that._renderTraceProperties();
        that._evaluateSaveButtonState();
    }

    private _enableSaveButton(enableSaveButton) {
        if (this.$saveButton) {
            if (enableSaveButton) {
                this.$saveButton.button('enable');
            } else {
                this.$saveButton.button('disable');
            }
        }
    }

    private _getTrace() {
        var i,
            trace = {
                traceId: this.$traceId.text()
            };

        for (i = 0; i < this._properties.length; i++) {
            trace[TraceProperties.getName(this._properties[i].id, false)] = this._properties[i].value;
        }

        return trace;
    }

    private _mergeTraces(updatedTrace, oldTrace) {

        if (!oldTrace) {
            return updatedTrace;
        }
        if (updatedTrace) {
            for (var field in updatedTrace) {
                if (updatedTrace.hasOwnProperty(field)) {
                    oldTrace[field] = updatedTrace[field];
                }
            }
        }//if there is no updated trace just return the old trace


        //the old trace is now the new trace
        return oldTrace;
    }

    private _saveTrace() {
        var that = this,
            oldTrace = this._traceManager.getTrace(that._getTrace().traceId),
            newTrace = this._mergeTraces(that._getTrace(), oldTrace);

        this._traceManager.saveTraceDefinition(newTrace,
            function (trace) {
                if (that._options.itemSavedCallback && $.isFunction(that._options.itemSavedCallback)) {
                    that._options.itemSavedCallback.call(that, trace);
                }
                that._element.dialog('close');
            },
             function (error) {
                 var errors = [];
                 errors.push(error);
                 that._appendErrors(errors, that.$errorContainer);
             },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: 'please wait',
                    target: this._element.closest('.ui-dialog')
                }
            });
    }
}

VSS.initClassPrototype(ManageTracesDialog, {
    _properties: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _traceManager: null,
    $saveButton: null,
    $traceId: null,
    $propertyName: null,
    $propertyValue: null,
    $traceProperties: null,
    $errorContainer: null
});

VSS.classExtend(ManageTracesDialog, TfsContext.ControlExtensions);

class TraceDetailsDialog extends Dialogs.ModalDialogO<TracesDialogOptions> {

    private _closeButton: any;
    private _properties: any[];

    constructor (options? ) {
        super(options);
    }

    public initialize() {
        var i;
        super.initialize();

        this._properties = [];

        for (i = 1; i < TraceProperties.Message; i++) {
            if (this._options.trace[TraceProperties.getName(i, false)]) {
                this._properties.push({
                    id: i,
                    value: this._options.trace[TraceProperties.getName(i, false)]
                });
            }
        }

        this._decorate();

        this._initializeButtons();
    }

    private _decorate() {
        var div,
            table,
            tr,
            td,
            panels = [],
            i;

        //create the table
        div = $(domElem('div')).attr('id', 'traceTable').appendTo(this._element);
        table = $(domElem('table')).addClass('trace-table');

        for (i = 0; i < this._properties.length; i++) {
            tr = $(domElem('tr')).appendTo(table);
            td = $(domElem('td')).appendTo(tr);
            $(domElem('span')).attr('style', 'font-weight: bold').appendTo(td).text(TraceProperties.getName(this._properties[i].id, true) + ':');
            td = $(domElem('td')).appendTo(tr);
            $(domElem('span')).appendTo(td).text(this._properties[i].value);
        }

        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('span')).attr('style', 'font-weight: bold').appendTo(td).text(diagResources.ViewDialogMessage);

        table.appendTo(div);

        div = $(domElem('div')).attr('id', 'traceMessage').appendTo(this._element);
        $(domElem('textarea')).attr('style', 'width: 100%; height: 100%; display: block').attr('readonly', 'readonly').text(this._options.trace.message).appendTo(div);


        //setup the panels
        panels.push({ id: 'traceTable' });
        panels.push({ id: 'traceMessage', size: '99%' });

        (<any>this._element).HorizontalPanel({
            useExisting: true,
            panels: panels
        }).data('TFS-HorizontalPanel');
    }

    private _initializeButtons() {

        this._closeButton = {
            id: 'close',
            text: diagResources.DialogClose,
            click: function () {
                $(this).dialog('close');
            }
        };

        this._element.dialog('option', 'buttons', [this._closeButton]);

    }
}

VSS.initClassPrototype(TraceDetailsDialog, {
    _closeButton: null,
    _properties: [] //TODO: Dangerous member initialization on prototype. Get rid of it.

});

VSS.classExtend(TraceDetailsDialog, TfsContext.ControlExtensions);



class TraceDataList extends Grids.GridO<any> {

    public static enhancementTypeName: string = "tfs.admin.TraceDataList";

    private _baseTime: any;
    private _mostRecentTime: any;
    private _filter: any;
    private _tracesManager: any;
    private _master: any[];
    private _requestNumber: any;

    constructor (options? ) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: true,
            enabledEvents: {
                "rowupdated": true
            },
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                executeAction: delegate(this, this._onMenuItemClick)
            },
            cssClass: this._getCssClass(),
            columns: this._getColumns(),
            sortOrder: this._getSortOrder()
        }, options));
    }

    public _bindObject(build, index?: number) {
        /// <param name="index" type="number" optional="true" />

        var grid = this;

        build.setValue = function (column, value) {
            if (column in this) {
                this[column] = value;
                grid.updateRow(-1, grid.getIndexById(this.id));
            }
        };
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

    public getRecordCount() {
        return this._master.length;
    }

    public getSelectedItem() {
        return this._dataSource[this._selectedIndex];
    }

    public hide() {
        this._element.hide();
    }

    public initialize() {
        super.initialize();
        this._baseTime = new Date();
        this._requestNumber = 0;
        this._baseTime.setHours(this._baseTime.getHours() - 1);
        this._mostRecentTime = this._baseTime;
        this._tracesManager = TraceManager.get(this._options.tfsContext);
    }

    public refresh(filter: any, clearView) {
        /// <summary>Refreshes the control according to the specified filters</summary>
        /// <param name="filter" type="Object">New filters to be applied</param>
        var that = this,
            selectedItem = this.getSelectedItem(),
            i,
            l,
            requestNumber = this._incrementRequestNumber();

        if (clearView) {
            this.resetBaseTime();
        }

        // Performing fetch operation
        this._fetch(filter, function (source, clearTheView) {
            if (requestNumber !== that._requestNumber) {
                return;
            }

            that.setSource(source, clearTheView);
            if (selectedItem) {
                for (i = 0, l = that._dataSource.length; i < l; i++) {
                    if ((that._dataSource[i].id && that._dataSource[i].id === selectedItem.id) ||
                        (that._dataSource[i].name && that._dataSource[i].name === selectedItem.name)) {
                        that.setSelectedRowIndex(i);
                        break;
                    }
                }
            }

            if (source.length >= TraceManager.pageSize) {
                // We have to go back again for more data
                that.refresh(filter, false);
            }
            //when we're done reset the base time so that we retrieve all
            //traces for the next navigation switch
            that.resetBaseTime();

            that._fire("traceDataRefreshed", null);
            Diag.logTracePoint("TraceDataList.refresh.complete");
        }, clearView);

        Diag.logTracePoint("TraceDataList.refresh.pending");
    }

    public resetBaseTime() {
        this._baseTime = new Date();
        this._baseTime.setHours(this._baseTime.getHours() - 1);
    }

    public setSource(rawSource, clearView?: boolean) {
        /// <param name="clearView" type="boolean" optional="true" />

        var options = this._options, source;

        // Letting deriving list object to prepare the source before
        // the underlying grid renders it
        source = this._prepareSource(rawSource);

        if (source.source.length > 0) {
            //change the msot recent time
            this._mostRecentTime = source.source[source.source.length - 1].timeCreated;

            if (!clearView) {

                this._master = this._master.concat(source.source);

            }
            else {
                //don't reset this._baseTime here because we may go back for more data.
                //this._baseTime  will be reset in the refresh function if we have retreived
                //all the data.
                this._master = source.source;
            }
        }
        else {
            if (clearView) {
                this._master = [];
            }

        }

        options.source = this._master;
        options.expandStates = source.expandStates;
        options.columns = this._columns;
        options.sortOrder = this._sortOrder;

        // Feeding the grid with the new source
        this.initializeDataSource();

        // Performing initial sorting
        this.onSort(options.sortOrder);
    }

    public show() {
        this._element.show();
    }

    private _fetch(filter, callback, clearView) {

        this._filter = filter;

        if (clearView) {
            this._tracesManager.beginGetTraces(filter, Utils_Date.localeFormat(this._baseTime, "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffffzz", true), callback, null, null, clearView);
        }
        else {
            this._tracesManager.beginGetTraces(filter, Utils_Date.localeFormat(this._mostRecentTime, "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffffzz", true), callback, null, null, clearView);
        }
    }

    private _getColumns() {
        return <any[]>[
            {
                index: "level",
                text: diagResources.TraceLevel,
                width: 100,
                canSortBy: true,
                comparer: function (column, order, item1, item2) {
                    return item1.level - item2.level;
                },
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var traceLevel = TraceLevel.getTraceLevels()[this.getColumnValue(dataIndex, column.index, columnOrder)],
                        cell = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder).empty();

                    $(domElem('span')).addClass('icon').addClass(traceLevel.icon).css('opacity', '1').appendTo(cell);
                    $(domElem('span')).addClass('text').text(traceLevel.text).appendTo(cell);
                    return cell;
                }
            }, {
                index: "timeCreated",
                text: diagResources.TraceViewTimeCreated,
                width: 140,
                canSortBy: true,
                comparer: function (column, order, item1, item2) {
                    return item1.timeCreated > item2.timeCreated ? 1 : -1;
                },
                getColumnValue: function (dataIndex, columnIndex, columnOrder) {
                    /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
                    /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
                    /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
                    /// <returns type="any" />

                    return Utils_Date.localeFormat(this._dataSource[dataIndex][columnIndex], "yyyy'-'MM'-'dd HH':'mm':'ss'.'fff", true);
                }
            }, {
                index: "tracePoint",
                text: diagResources.TracePoint,
                width: 80,
                canSortBy: true,
                comparer: function (column, order, item1, item2) {
                    return item1.tracePoint - item2.tracePoint;
                }
            }, {
                index: "userLogin",
                text: diagResources.TraceUserLogin,
                width: 140,
                canSortBy: true
            }, {
                index: "area",
                text: diagResources.TraceArea,
                width: 150,
                canSortBy: true
            }, {
                index: "layer",
                text: diagResources.TraceLayer,
                width: 150,
                canSortBy: true
            }, {
                index: "uri",
                text: diagResources.TraceUri,
                width: 40,
                canSortBy: true
            }, {
                index: "activityId",
                text: diagResources.TraceActivityId,
                width: 150,
                canSortBy: true
            }, {
                index: "message",
                text: diagResources.ViewDialogMessage,
                width: 800,
                canSortBy: true
            }
        ];
    }

    private _getContextMenuItems() {
        var menuItems = [];

        menuItems.push({
            id: "view-trace",
            text: "View",
            title: diagResources.View,
            icon: "icon-properties"
        });

        return menuItems;

    }

    private _getCssClass() {
        return "tracing-list";
    }

    private _getSortOrder() {
        return [{ index: "timeCreated", order: "desc" }];
    }

    private _onMenuItemClick(e? ) {
        this._fire("traceItemClicked", e);
    }

    private _prepareSource(traces) {
        var i, l, trace, source = [];
        for (i = 0, l = traces.length; i < l; i++) {
            trace = $.extend({}, traces[i]);

            source[source.length] = trace;
        }
        return { source: source };
    }

    private _incrementRequestNumber() {
        this._requestNumber++;
        return this._requestNumber;
    }
}

VSS.initClassPrototype(TraceDataList, {
    _baseTime: null,
    _mostRecentTime: null,
    _filter: null,
    _tracesManager: null,
    _master: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _requestNumber: null
});

VSS.classExtend(TraceDataList, TfsContext.ControlExtensions);



export class TraceViewerControl extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.diagnostics.TraceViewerControl";

    private _toolbar: any;
    private _tracesGrid: any;
    private _tracesManager: any;
    private _lastSeenTraceId: any;

    constructor (options? ) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._createTraceViewerControl();
    }

    public refresh(traceId, clearView) {
        this._tracesGrid.refresh(traceId, clearView);
    }

    public setTraceId(traceId) {
        this._lastSeenTraceId = traceId;

    }

    private _createMenuBar(element) {
        // Creating the menu bar
        var menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, element, {
            items: this._createMenubarItems(),
            executeAction: Utils_Core.delegate(this, this._onMenuItemClick)
        });

        return menuBar;
    }

    private _createMenubarItems() {
        var items = [];

        items.push({ id: "refresh-tracing-grid", text: diagResources.Refresh, title: "Refresh", icon: "icon-refresh" });

        return items;
    }

    private _createTraceViewerControl() {
        var div;

        this._tracesManager = TraceManager.get(this._options.tfsContext);

        div = $(domElem('div')).addClass('tracing-toolbar toolbar').attr('id', 'tracingToolbar').appendTo(this._element);
        this._toolbar = this._createMenuBar(div);

        div = $(domElem('div')).addClass('tracing-grid').attr('id', 'tracingGrid').appendTo(this._element);
        this._tracesGrid = <TraceDataList>Controls.Enhancement.enhance(TraceDataList, div, { tfsContext: this._options.tfsContext });

        this._element.bind("traceDataRefreshed", delegate(this, this._onTraceDataRefreshed));
        this._element.bind("traceItemClicked", delegate(this, this._onContextMenuItemClick));
        this._bind("openRowDetail", delegate(this, this._onOpenTrace));
    }

    private _onContextMenuItemClick(e? , args? ) {
        this._onMenuItemClick(args);
    }

    private _onMenuItemClick(e? ) {
        var command = e.get_commandName();

        // Checking to see if the command we can handle is executed
        switch (command) {
            case "refresh-tracing-grid":
                this.refresh(this._lastSeenTraceId, false);
                break;
            case "view-trace":
                this._openTrace();
                break;
        }
    }

    private _onOpenTrace(sender, eventArgs) {
        this._openTrace();
    }

    private _onTraceDataRefreshed(e? , args? ) {
        this._fire('recordCountChanged', this._tracesGrid.getRecordCount());
    }

    private _openTrace() {
        var trace = this._tracesGrid.getSelectedItem();
        Dialogs.show(TraceDetailsDialog, {
            cssClass: "trace-details",
            title: "View Trace Details",
            minWidth: 420,
            minHeight: 300,
            width: 800,
            height: 600,
            trace: trace,
            resizable: true
        });
    }
}

VSS.initClassPrototype(TraceViewerControl, {
    _toolbar: null,
    _tracesGrid: null,
    _tracesManager: null,
    _lastSeenTraceId: null
});

VSS.classExtend(TraceViewerControl, TfsContext.ControlExtensions);


Controls.Enhancement.registerEnhancement(TraceViewerControl, ".trace-viewer")


function createEmptyNode(text) {
    var node = TreeView.TreeNode.create(text || diagResources.TraceDefinitionEmptyNode);
    node.noFocus = true;
    node.noTreeIcon = true;
    node.noContextMenu = true;
    node.config = { css: "trace-empty-node", unselectable: true };
    return node;
}
function createTraceOwnerRootNode() {
    var node = TreeView.TreeNode.create(diagResources.TraceDefinitionOwnerRootNode);
    node.noContextMenu = true;
    node.folder = true;
    node.config = { css: "trace-owner-root-node", unselectable: true };
    node.expanded = true;
    node.hasExpanded = true;
    return node;
}
function createAllTracesNode() {
    var node = TreeView.TreeNode.create(diagResources.TraceDefinitionAllTracesNode);
    node.noTreeIcon = false;
    node.noContextMenu = true;
    node.config = { css: "all-trace-node" };
    node.link = Navigation_Services.getHistoryService().getFragmentActionLink("filter");
    return node;
}
function createOwnerNode(traceDefinition) {
    var node = TreeView.TreeNode.create(traceDefinition.owner ? traceDefinition.owner : diagResources.TraceDefinitionOwnerUndefiend);
    node.folder = true;
    node.owner = traceDefinition.owner;
    node.config = { css: "trace-node", unselectable: true };
    node.noContextMenu = true;
    return node;
}
function createTraceNode(traceString, traceId) {
    var node = TreeView.TreeNode.create(traceString);
    node.noTreeIcon = false;
    node.tag = traceId;
    node.noContextMenu = false;
    node.config = { css: "trace-node" };
    node.link = Navigation_Services.getHistoryService().getFragmentActionLink("filter", { id: traceId });
    return node;
}

interface TraceFilterListOptions extends TreeView.ITreeOptions {
    tfsContext: TFS_Host_TfsContext.TfsContext;
}

class TraceFilterList extends TreeView.TreeViewO<TraceFilterListOptions> {

    private _traces: any;
    private _rootOwnersNode: any;
    private _selectedTraceId: any;
    private _allTracesNode: any;
    private _tracesManager: any;
    private _setSelectOwner: any;

    constructor (options? ) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            contextMenu: {
                items: this._getContextMenuItems(),
                executeAction: delegate(this, this._onMenuItemClick),
                'arguments': function (contextInfo) {
                    return {
                        item: contextInfo.item
                    };
                }
            },
            clickToggles: true
        }, options));
    }

    public initialize() {
        super.initialize();

        this._tracesManager = TraceManager.get(this._options.tfsContext);

        // Load the control data
        this._load();
    }

    public concatTraceDisplayName(trace) {
        var name = "", attr, namePart;
        for (attr in trace) {
            if (trace.hasOwnProperty(attr)) {
                namePart = TraceProperties.getField(attr);
                if (namePart) {
                    name += trace[attr] ? namePart + ': ' + trace[attr] + ' ' : "";
                }
            }
        }
        return name;
    }

    public onDelete() {
        this.refresh();
        window.location.href = this._allTracesNode.link;
    }

    public refresh(traceId?: string) {
        /// <summary>Refreshes the control by reloading its data</summary>
        /// <param name="traceId" type="string"  optional="true" />

        var traces = [],
            tracesObject = this._tracesManager.getTraceDefinitions(),
            trace;

        this._selectedTraceId = traceId ? traceId : undefined;

        for (trace in tracesObject) {
            if (tracesObject.hasOwnProperty(trace)) {
                traces[traces.length] = tracesObject[trace];
            }
        }

        this.populate(traces, this._selectedTraceId);
    }

    public setSelectedNode(node, suppressChangeEvent?: boolean) {
        /// <param name="suppressChangeEvent" type="boolean" optional="true" />

        if (node) {

            // Skipping selection of unselectable nodes
            if (node.config && node.config.unselectable) {
                return;
            }
        }

        // update the selected owner
        this._setSelectedOwner(node.tag);
        super.setSelectedNode(node);
    }

    public populate(traces, selectedId) {

        // Initialize traces array if needed
        this._traces = traces || [];

        // Sort the traces array
        this._traces.sort(function (q1, q2) {
            return Utils_String.localeIgnoreCaseComparer(q1.owner, q2.owner);
        });

        // Draw the tree
        this._redraw(this._traces, selectedId);
    }

    private _load() {
        /// <summary>Loads the control data by using the OM</summary>

        var that = this;

        this._rootOwnersNode = null;

        //call TraceDefinitionList loading function
        this._tracesManager.beginGetTraceDefinitions(function (definitions) {
            that.populate(definitions, that._selectedTraceId);
        }, that._showError);
    }

    private _showError(message) {
        /// <summary>Displays the provided error message.</summary>

        VSS.handleError(message);
    }

    private _setSelectedOwner(owner) {
        this._setSelectOwner = owner;
    }

    private _redraw(traces, selectedId) {
        var i,
            l,
            rootNode = this.rootNode,
            ownerNode,
            traceNode,
            selectedNode,
            trace,
            ownersAlreadySeen;

        rootNode.clear();

        // Add the all traces node
        this._allTracesNode = createAllTracesNode();
        selectedNode = this._allTracesNode;
        rootNode.add(selectedNode);

        // Add the root node for owners
        this._rootOwnersNode = createTraceOwnerRootNode();
        rootNode.add(this._rootOwnersNode);

        // Getting all traces
        if (traces.length) {
            ownersAlreadySeen = [];

            // Populating traces
            for (i = 0, l = traces.length; i < l; i++) {
                trace = traces[i];

                //If the owner hasn't been seen add an owner node
                if (!Utils_Array.contains(ownersAlreadySeen, trace.owner)) {
                    ownerNode = createOwnerNode(trace);
                    this._rootOwnersNode.add(ownerNode);
                    ownersAlreadySeen.push(trace.owner);

                }
                //Otherwise the owner has been seen and do not create an owner node
                //always add a trace node

                //assume we are viewing the traces in alphabetic order 
                //by owner, because we sort them in the 'populate' function above.
                traceNode = createTraceNode(this.concatTraceDisplayName(trace), trace.traceId);
                ownerNode.add(traceNode);
                if (trace.traceId === selectedId) {
                    selectedNode = traceNode;
                }
            }
        }
        else {
            this._rootOwnersNode.add(createEmptyNode(null));
        }

        this._draw();

        // Keeping the selection
        this.setSelectedNode(selectedNode);

        Diag.logTracePoint("TraceFilterTree.initialize.complete");
    }

    private _getContextMenuItems() {
        var menuItems = [];

        menuItems.push({
            id: "edit-trace",
            text: diagResources.Edit,
            title: "Edit",
            icon: "icon-properties"
        });

        menuItems.push({
            id: "delete-trace",
            text: diagResources.Stop,
            title: "Stop",
            icon: "icon-tfs-build-status-stopped"
        });

        return menuItems;
    }

    private _onContextMenuItemClick(e? , args? ) {
        this._onMenuItemClick(args);
    }

    private _editTraces() {
        //reload and redraw all traces
        this.refresh(this._selectedTraceId);
    }

    private _onMenuItemClick(e? ) {
        var command = e.get_commandName(),
            trace = this._tracesManager.getTrace(e.get_commandArgument().item.tag);

        // Checking to see if the command we can handle is executed
        switch (command) {
            case "delete-trace":
                this._tracesManager.deleteTraceDefinition(trace, delegate(this, this.onDelete), null, {
                    wait: {
                        image: hostConfig.getResourcesFile('big-progress.gif'),
                        message: diagResources.PleaseWait,
                        target: this._element
                    }
                });
                break;
            case "edit-trace":
                Dialogs.show(ManageTracesDialog, {
                    cssClass: "manage-traces",
                    title: diagResources.TraceDefinitionEdit,
                    minWidth: 420,
                    minHeight: 300,
                    width: 450,
                    height: 400,
                    trace: trace,
                    resizable: true,
                    mode: "edit",
                    itemSavedCallback: delegate(this, this._editTraces)
                });
                break;
        }
    }
}

VSS.initClassPrototype(TraceFilterList, {
    _traces: null,
    _rootOwnersNode: null,
    _selectedTraceId: null,
    _allTracesNode: null,
    _tracesManager: null,
    _setSelectOwner: null
});

VSS.classExtend(TraceFilterList, TfsContext.ControlExtensions);


Controls.Enhancement.registerEnhancement(TraceFilterList, ".tracing-filter-list")



class ManageTraceView extends Navigation.NavigationView {

    private _$leftPane: any;
    private _$rightPane: any;
    private _toolbar: any;
    private _traceFilterList: any;
    private _traceViewer: any;
    private _currentTrace: any;
    private _tracesManager: any;

    constructor (options? ) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._$leftPane = this.getElement().find('.tracing-view-left-pane');
        this._$rightPane = this.getElement().find('.tracing-view-right-pane');

        this._tracesManager = TraceManager.get(this._options.tfsContext);

        this._element.bind('recordCountChanged', delegate(this, this._onRecordCountChanged));

        this._createFilterSection();

        this._createContentSection();

        this._setupNavigation();

    }

    public setLastSeenTraceId(traceId) {
        this._traceViewer.setTraceId(traceId);
    }

    private _addTrace() {
        this._refresh();
    }

    private _createFilterSection() {
        /// <summary>Create the left hand side of the screen containing the trace filter section.</summary>

        this._toolbar = this._createFilterMenuBar(this._$leftPane.find('.filter-toolbar'));
        this._traceFilterList = <TraceFilterList>Controls.Enhancement.ensureEnhancement(TraceFilterList, this._$leftPane);

    }

    private _createContentSection() {
        this._traceViewer = <TraceViewerControl>Controls.Enhancement.ensureEnhancement(TraceViewerControl, this._$rightPane);
    }

    private _createFilterMenuBar($container: JQuery) {
        /// <summary>Create the menu bar which will be displayed above the filter list on the left hand side of the UI.</summary>
        /// <param name="$container" type="jQuery">Container to create the menu bar in.</param>
        Diag.Debug.assertParamIsObject($container, "$container");

        var menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, {
            items: this._createFilterMenubarItems(),
            executeAction: Utils_Core.delegate(this, this._onMenuItemClick)
        });
        return menuBar;
    }

    private _createFilterMenubarItems() {
        /// <summary>Create the menu items for the filter menu bar.</summary>

        var items = [];

        items.push({
            id: TraceMenuActions.NEW_TRACE,
            text: diagResources.NewTrace,
            title: "New Trace",
            noIcon: true
        });

        items.push({ separator: true });

        items.push({
            id: TraceMenuActions.REFRESH_FILTERS,
            text: diagResources.Refresh,
            title: "Refresh",
            showText: false,
            icon: "icon-refresh"
        });

        return items;
    }

    private _displayTraces(traceId?: string, clearView?: boolean) {
        /// <summary>Display the traces for the provided trace owner.</summary>
        /// <param name="traceId" type="String" optional="true">OPTIONAL: Trace definition to display the traces for.</param>
        /// <param name="clearView" type="Boolean" optional="true">OPTIONAL:Indicates if we should clear the display and reload, or concatenate new results onto old</param>

        this._currentTrace = traceId;

        // Start the population of the data manager with the new filter criteria.
        this._traceViewer.refresh(traceId, clearView);
    }

    private _navigate(traceId?: string, clearView?: boolean) {
        /// <summary>Filter the traces based on the trace definition.</summary>
        /// <param name="traceId" type="String" optional="true">OPTIONAL: trace ID to filter on.</param>
        /// <param name="clearView" type="boolean" optional="true">OPTIONAL: Indicates we should clear the trace view and reload it with new values.</param>

        this._traceFilterList.refresh(traceId);

        this._displayTraces(traceId, clearView);
    }

    private _onNewTrace(trace) {
        window.location.href = Navigation_Services.getHistoryService().getFragmentActionLink("filter", { id: trace.traceId });
    }

    private _onMenuItemClick(e?: any) {
        /// <summary>Called when a toolbar menu item is clicked.</summary>
        /// <param name="e" type="object">Event information</param>
        Diag.Debug.assertParamIsObject(e, "e");

        var command = e.get_commandName();

        // Invoke the appropriate action based on the command which was clicked.
        switch (command) {
            case TraceMenuActions.NEW_TRACE:
                Dialogs.show(ManageTracesDialog, {
                    cssClass: "manage-traces",
                    title: diagResources.TraceDefinitionEdit,
                    minWidth: 420,
                    minHeight: 300,
                    width: 450,
                    height: 400,
                    resizable: true,
                    mode: "new",
                    itemSavedCallback: delegate(this, this._onNewTrace)
                });
                break;
            case TraceMenuActions.REFRESH_FILTERS:
                this._refresh();
                break;
        }
    }

    private _onRecordCountChanged(event, args? ) {
        this._updateViewTitle(args);
    }

    private _refresh() {
        this._traceFilterList._load();
    }

    private _setupNavigation() {
        /// <summary>Setup all of the navigation events and perform the initial navigation.</summary>

        var that = this,
            performedDefaultNavigation = true, defaultNavigation = true;

        var historySvc = Navigation_Services.getHistoryService();

        // This will be called when filter action is added to url fragment
        historySvc.attachNavigate(function (sender, state) {
            if (!historySvc.getCurrentFragment()) {
                defaultNavigation = false;
                that._navigate(null, true);
            }
        });

        // Called when the filter action is navigated to.  Will invoke the handler immediately if
        // the filter was provided on the initial URL.
        historySvc.attachNavigate("filter",
            function (sender, state) {
                that.setLastSeenTraceId(state.id);
                that._navigate(state.id, true);
                performedDefaultNavigation = false;
            },
            true);

        // If a filter was not provided in the URL, then we will not have done navigation yet so do it.
        if (performedDefaultNavigation) {
            this._navigate();
        }
    }

    private _updateViewTitle(numberOfRecords) {
        var trace = this._currentTrace ? this._tracesManager.getTrace(this._currentTrace) : undefined;
        this.setViewTitle(Utils_String.format('{0} ({1} {2})', trace ? this._traceFilterList.concatTraceDisplayName(trace) : "All Traces", numberOfRecords, diagResources.ViewTitleRecords));
    }
}

VSS.initClassPrototype(ManageTraceView, {
    _$leftPane: null,
    _$rightPane: null,
    _toolbar: null,
    _traceFilterList: null,
    _traceViewer: null,
    _currentTrace: null,
    _tracesManager: null
});

VSS.classExtend(ManageTraceView, TfsContext.ControlExtensions);


Controls.Enhancement.registerEnhancement(ManageTraceView, ".tracing-view")


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Diag.Tracing", exports);
