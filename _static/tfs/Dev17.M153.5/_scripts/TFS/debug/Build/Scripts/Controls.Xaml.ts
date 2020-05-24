///<amd-dependency path="jQueryUI/button"/>
/// <reference types="jquery" />

import ko = require("knockout");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");
import {BuildReason} from "Build.Common/Scripts/BuildReason";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");

import VCHistoryDialogs = require("VersionControl/Scripts/Controls/HistoryDialogs");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export interface XamlController {
    name: string;
    uri: string;
    url: string;
}

export interface QueueBuildDialogOptions extends Dialogs.IModalDialogOptions {
    controllers?: BuildContracts.BuildController[];
}

export class QueueBuildDialog extends Dialogs.ModalDialogO<QueueBuildDialogOptions> {

    private _definition: BuildContracts.XamlBuildDefinition;
    private _controllerUri: string;

    private _source: any;
    private _shelveset: any;
    private _browse: any;
    private _controllers: any;
    private _priority: any;
    private _dropFolder: any;
    private _msbuildArgs: any;

    public _buildClient: BuildClient.BuildClientService;

    constructor(options?) {
        super(options);

        this._buildClient = options.buildClient;
        this._definition = options.definition;
        this._controllerUri = this._definition.controller ? this._definition.controller.uri : "";
    }

    public initialize() {
        super.initialize();

        this._initDialog();
    }

    public getTitle(): string {
        /// <returns type="string" />

        return BuildResources.QueueBuildDialogTitle;
    }

    public onOkClick() {
        this.updateOkButton(false);
        var that = this, queueOptions;
        var sourceBranch: string;
        var reason: BuildContracts.BuildReason = BuildContracts.BuildReason.Manual;

        // Collecting necessary information to queue a build
        var whatToBuild = this._source.val();
        if (whatToBuild === "latest-with-shelveset") {
            sourceBranch = $.trim(this._shelveset.val());

            // If no shelveset is specified, displaying alert and cancelling the operation
            if (!sourceBranch) {
                alert(BuildResources.QueueBuildShelevetNameNotSpecified);
                this._shelveset.focus();
                this.updateOkButton(true);
                return;
            }

            var checkin = this._element.find("input.check-in").prop("checked") ? true : false;
            if (checkin) {
                reason = BuildContracts.BuildReason.CheckInShelveset;
            }
            else {
                reason = BuildContracts.BuildReason.ValidateShelveset;
            }
        }

        var build: BuildContracts.Build = <BuildContracts.Build><any>{
            definition: {
                id: this._definition.id
            },
            priority: this._priority.val(),
            sourceBranch: sourceBranch,
            reason: reason
        };

        var controllerUri = this._controllers.val();
        if (controllerUri) {
            this._options.controllers.forEach((controller: BuildContracts.BuildController) => {
                if (controller.uri === controllerUri) {
                    build.controller = <BuildContracts.BuildController><any>{
                        id: controller.id
                    }
                }
            });
        }

        // parameters
        var parameters = {
            dropLocation: this._dropFolder.is(":disabled") ? this._definition.defaultDropLocation : $.trim(this._dropFolder.val()),
            buildArgs: $.trim(this._msbuildArgs.val()),
            originalBuildArgs: this._definition.buildArgs
        };
        build.parameters = JSON.stringify(parameters);

        // Beginning queue build operation
        this._buildClient.beginQueueBuild(build).then(
            (queuedBuild: BuildContracts.Build) => {
                // Queue build succeeded. Executing callback and closing the dialog.
                that._options.okCallback(queuedBuild);
                that.close();
            },
            (error: any) => {
                alert(error.message);
                that.updateOkButton(true);
            });
    }

    private _initDialog() {
        // Decorating dialog
        this._decorate();

        // Populating DOM elements
        this._populate();

        // Trying to select the specified definition if specified. If not specified selecting the first one.
        this._selectController(this._controllerUri);

        // Setting MSBuild Args
        this._msbuildArgs.val(this._definition.buildArgs);

        // Enabling ok button at this point
        this.updateOkButton(true);
    }

    private _decorate() {
        var element = this._element;

        element.attr("data-bind", "template: { name: 'queue_xaml_build_dialog' }");

        // Apply binding
        ko.applyBindings(this, element[0]);

        // Getting reference to source types and attaching to change event
        this._source = element.find("select.source").change(delegate(this, this._onSourceChange));

        // Getting reference to controllers combo
        this._controllers = element.find("select.controller");

        // Getting reference to controllers combo
        this._priority = element.find("select.priority");

        // Getting reference to drop folder input
        this._dropFolder = element.find("input.drop-folder");

        // Getting reference to MSBuild args input
        this._msbuildArgs = element.find("input.msbuild-args");
    }

    private _populate() {
        var i, l,
            ctrl: XamlController,
            options = this._options,
            controllers: XamlController[] = options.controllers;

        // Populating controllers
        if ($.isArray(controllers) && controllers.length > 0) {
            var sortedControllers: XamlController[] = controllers.sort((a, b) => {
                return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
            });
            for (i = 0, l = sortedControllers.length; i < l; i++) {
                ctrl = sortedControllers[i];
                this._controllers.append($("<option />")
                    .text(ctrl.name)
                    .attr("value", ctrl.uri));
            }
        }
        else {
            // no controllers are visible
            this._controllers.append($("<option />")
                .text(BuildResources.QueueBuildDefaultController)
                .attr("value", ""));
        }

        // Remove/Add the shelveset options based on supported reasons
        if (BuildReason.containsFlag(this._definition.supportedReasons, BuildContracts.BuildReason.ValidateShelveset) ||
            BuildReason.containsFlag(this._definition.supportedReasons, BuildContracts.BuildReason.CheckInShelveset)) {
            // Enable the drop down
            this._source.attr("disabled", false);
        }
        else {
            // Select the first option (Latest Sources) and disable the drop down
            this._source.first("option");
            this._source.attr("disabled", true);
        }

        // set the drop location
        if (this._definition.defaultDropLocation) {
            this._dropFolder.val(this._definition.defaultDropLocation);
        }
    }

    private _selectController(controllerUri) {
        var controllerElement;

        // If a controller uri is specified, trying to find the dom element
        if (controllerUri) {
            controllerElement = this._controllers.find("option[value='" + controllerUri + "']");

            // If no dom element found, selecting the dom element for the first build controller
            if (controllerElement.length === 0) {
                controllerElement = this._controllers.first("option");
            }
        }

        if (controllerElement) {
            // Selecting the controller
            controllerElement.attr("selected", true);
        }
    }

    private _onSourceChange(e?) {
        var element = this._element,
            source = this._source.val();

        // If "Latest with shelveset" option is selected, displaying shelveset and checkin elements
        if (source === "latest-with-shelveset") {
            element.find("tr.shelveset-picker-container").show();
            element.find("tr.check-in-container").show();

            if (!this._shelveset) {
                this._shelveset = element.find("input.shelveset");
            }

            if (!this._browse) {
                this._browse = element.find("button.browse").click(delegate(this, this._onBrowseClick));
            }
        }
        else {
            // If "Latest" option is selected, hiding shelveset and checkin elements
            element.find("tr.shelveset-picker-container").hide();
            element.find("tr.check-in-container").hide();
        }
    }

    private _onBrowseClick(e?) {
        // Displaying shelveset picker
        VSS.using(['VersionControl/Scripts/Controls/HistoryDialogs'], (_TFS_VersionControl_Controls_History: typeof VCHistoryDialogs) => {
            _TFS_VersionControl_Controls_History.Dialogs.shelvesetPicker({
                tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
                okCallback: function (shelveset) {
                    $("input.shelveset").val(shelveset ? (shelveset.shelvesetName + ";" + shelveset.owner) : "");
                }
            });
        });
    }
}

VSS.initClassPrototype(QueueBuildDialog, {
    _buildServer: null,
    _definitions: null,
    _source: null,
    _shelveset: null,
    _browse: null,
    _controllers: null,
    _priority: null,
    _dropFolder: null,
    _msbuildArgs: null,
    _definitionMap: null
});

export class ManageXamlQualitiesDialog extends Dialogs.ModalDialog {
    private _buildQualityView: XamlQualityView;
    private _qualities: string[];

    constructor(options?) {
        super(options);
        this._qualities = options.qualities || [];
    }

    public initialize() {
        super.initialize();

        // Binding itemadded and itemremoved events for the build qualities list
        this._bind("itemadded itemremoved", delegate(this, this.onItemModified));

        // Disabling ok button
        this.updateOkButton(false);
        this._decorate();

        this._buildQualityView = <XamlQualityView>Controls.Enhancement.ensureEnhancement(XamlQualityView, this._element.find(".build-quality-view"));
        this._buildQualityView.sourceListUpdated(this._qualities);

        // Need to set the focus explicitely
        this.setInitialFocus();
    }

    public onItemModified(e?, args?) {
        // Updating ok button according to selection status
        this.updateOkButton(args.numberOfpendingChanges > 0);
    }

    public getDialogResult() {
        this._buildQualityView.sourceList.sort(function (q1, q2) {
            return Utils_String.localeIgnoreCaseComparer(q1, q2);
        });

        return {
            sourceList: this._buildQualityView.sourceList,
            pendingAdds: this._buildQualityView.pendingAdds,
            pendingDeletes: this._buildQualityView.pendingDeletes
        };
    }

    private _decorate() {
        var outerDiv = $(domElem('div')).addClass('build-quality-view');
        outerDiv.appendTo(this._element);
    }
}

export class XamlQualityView extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.build.BuildQualityView";

    private _buildQualitiesList: XamlQualitiesList;
    private _add: any;
    private _remove: any;
    private _buildQualityInput: any;
    private _originalData: any;
    private _sourceSubscription: KnockoutSubscription<string[]>;

    public sourceListUpdated: KnockoutObservableArray<string> = ko.observableArray([]);
    public sourceList: string[] = [];
    public pendingAdds: any[];
    public pendingDeletes: any[];

    constructor(options?) {
        super(options);
    }

    public initialize() {
        //initialize the source elements
        this.pendingAdds = [];
        this.pendingDeletes = [];

        this._sourceSubscription = this.sourceListUpdated.subscribe((newSource: string[]) => {
            this._init(newSource);
        });
    }

    private _init(source: string[]) {
        this.sourceList = source;
        this._originalData = this.sourceList.slice(0);

        //build html for control
        this._decorate();

        //create the build qualities list
        this._buildQualitiesList = <XamlQualitiesList>Controls.Enhancement.ensureEnhancement(XamlQualitiesList, this._element.find(".build-qualities-list"));
        this._buildQualitiesList.populate(this.sourceList);

        //get add/remove buttons and connect give a handler for click event
        this._add = this._element.find("button.add").click(delegate(this, this._onAddClicked)).button();
        this._remove = this._element.find("button.remove").click(delegate(this, this._onRemovedClicked)).button();
        this._bind("itemdeleted", delegate(this, this._onRemovedClicked));

        //hookup listener for input element
        this._buildQualityInput = this._element.find("input.build-quality");
        this._bind(this._buildQualityInput, 'keyup', delegate(this, this._onKeyUp));
        this._bind(this._buildQualityInput, 'keydown', delegate(this, this._onKeyDown));

        this._evaluateButtonState();
    }

    public getNumberOfPendingChanges() {
        return this.pendingAdds.length + this.pendingDeletes.length;
    }

    private _decorate() {
        var table,
            tr,
            td;

        //create the table
        table = $(domElem('table')).addClass('filter');

        //create the first row
        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr).attr('colspan', '2');
        $(domElem('label')).appendTo(td).text(BuildResources.BuildResourcesQualityName);

        //create second row
        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('input')).attr('type', 'text').addClass('build-quality').attr('id', 'build-quality').attr('name', 'build-quality').appendTo(td);
        td = $(domElem('td')).appendTo(tr).addClass('build-quality-button');
        $(domElem('button')).addClass('add').text(BuildResources.BuildQualitiesAdd).appendTo(td);

        //create thrid row
        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('div')).addClass('build-qualities-list').appendTo(td);
        td = $(domElem('td')).appendTo(tr).addClass('build-quality-button');
        $(domElem('button')).addClass('remove').text(BuildResources.BuildQualitiesRemove).appendTo(td);

        table.appendTo(this._element);
    }

    private _onKeyDown(e?) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onAddClicked();
            // Cancelling event to prevent dialog to be closed which is default behavior
            return false;
        }
    }

    private _onKeyUp(e?) {
        // Evaluating button state after each key stroke
        this._evaluateButtonState();
    }

    private _evaluateButtonState() {
        this._add.button("option", "disabled", this._buildQualityInput.val() ? false : true);
        this._remove.button("option", "disabled", this._buildQualitiesList.hasItems() ? false : true);
    }

    private _onAddClicked() {
        //get the new item and add to source
        var newBuildQuality = $.trim(this._buildQualityInput.val()),
            indexInPendingDelete = $.inArray(newBuildQuality, this.pendingDeletes);

        if (newBuildQuality) {
            //if it does not exist in source, then add it
            if ($.inArray(newBuildQuality, this.sourceList) === -1) {
                this.sourceList.push(newBuildQuality);

                //if it did not exist in original data add to pending adds
                if ($.inArray(newBuildQuality, this._originalData) === -1) {
                    this.pendingAdds.push(newBuildQuality);
                }

                //if it exists in pending deletes, remove it
                if (indexInPendingDelete > -1) {
                    this.pendingDeletes.splice(indexInPendingDelete, 1);
                }

                //udpate the tree
                this._buildQualitiesList.addBuildQuality(newBuildQuality);
            }
            else {
                //if it does exist, just select it
                this._buildQualitiesList.updateSelectedNode(newBuildQuality);
            }
            //clear the input element
            this._buildQualityInput.val('');
            this._evaluateButtonState();
            this._fire("itemadded", { newBuildQuality: newBuildQuality, numberOfpendingChanges: this.getNumberOfPendingChanges() });
        }
    }

    private _onRemovedClicked() {
        var indexOfItem,
            selectedItem = this._buildQualitiesList.getSelectedBuildQuality(),
            indexInPendingAdd = $.inArray(selectedItem, this.pendingAdds);

        indexOfItem = $.inArray(selectedItem, this.sourceList);
        if (indexOfItem > -1) {
            this.sourceList.splice(indexOfItem, 1);
            this._buildQualitiesList.populate(this.sourceList);

            //if it exists in pending deletes, remove it
            if (indexInPendingAdd > -1) {
                this.pendingAdds.splice(indexInPendingAdd, 1);
            } else {
                this.pendingDeletes.push(selectedItem);
            }
            this._evaluateButtonState();
            this._fire("itemremoved", { removedItem: selectedItem, numberOfpendingChanges: this.getNumberOfPendingChanges() });
        }
    }

    dispose(): void {
        if (this._sourceSubscription) {
            this._sourceSubscription.dispose();
        }
    }
}

VSS.initClassPrototype(XamlQualityView, {
    _buildQualitiesList: null,
    _add: null,
    _remove: null,
    _buildQualityInput: null,
    sourceList: null,
    _originalData: null,
    pendingAdds: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    pendingDeletes: [] //TODO: Dangerous member initialization on prototype. Get rid of it.
});

VSS.classExtend(XamlQualityView, TFS_Host_TfsContext.TfsContext.ControlExtensions);

export class XamlQualitiesList extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.build.qualitiesList";

    private _list: any;
    private _all: any;

    constructor(options?) {
        super(options);

        this._all = {};
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            clickToggles: true
        }, options));
    }

    public initialize() {
        super.initialize();
        // Creating inner list control
        this._list = $("<select size=2 class=list />").appendTo(this._element);
        this._bind(this._list, "keydown", delegate(this, this._onKeyDown));
    }

    public populate(buildQualities: string[], selectedQuality?) {
        var i, l, buildQuality, list = this._list;

        list.empty();

        //sort the qualities
        buildQualities.sort(function (q1, q2) {
            return Utils_String.localeIgnoreCaseComparer(q1, q2);
        });

        // add all qualities to the tree
        for (i = 0, l = buildQualities.length; i < l; i++) {
            buildQuality = buildQualities[i];
            list.append(createQualityItem(buildQuality));
        }

        // Selecting the specified or default item
        if (buildQualities.length > 0) {
            this.selectItem(selectedQuality ? selectedQuality : buildQualities[0]);
        }

        Diag.logTracePoint("BuildQualitiesTree.initialize.complete");
    }

    public addBuildQuality(buildQuality) {
        var qualities = this._list.children().map(function () {
            return $(this).text();
        });

        qualities.push(buildQuality);
        this.populate(qualities, buildQuality);
    }

    public updateSelectedNode(buildQuality) {
        var item = this.findItem(buildQuality);
        if (item) {
            item.text(buildQuality);
            item.prop("selected", true);
        }
    }

    public findItem(quality) {
        var item;
        quality = quality || "";
        this._list.children().each(function () {
            if (Utils_String.localeIgnoreCaseComparer(quality, $(this).text()) === 0) {
                item = $(this);
                return false;
            }
        });
        return item;
    }

    public selectItem(quality) {
        var item = this.findItem(quality);
        if (item) {
            item.prop("selected", true);
        }
    }

    public getSelectedBuildQuality() {
        var item = this._list.find("option:selected");
        return item.length > 0 ? item.text() : '';
    }

    public hasItems() {
        return this._list.children().length > 0;
    }

    private _onKeyDown(e?) {
        if (e.keyCode === Utils_UI.KeyCode.DELETE) {
            this._fire("itemdeleted");
        }
    }
}

VSS.initClassPrototype(XamlQualitiesList, {
    _list: null,
    _all: null
});

VSS.classExtend(XamlQualitiesList, TFS_Host_TfsContext.TfsContext.ControlExtensions);

function createQualityItem(q) {
    var qualityText = q || "";
    return $("<option />").text(qualityText).attr("title", qualityText);
}

export class BuildDialogs {
    public static queueBuild(options?: any) {
        /// <summary>Display the dialog for queueing a new build</summary>
        /// <param name="options" type="Object">Following options are supported:
        ///     - okCallback (Function): callback function to run after new build is queued
        /// </param>
        return Dialogs.show(QueueBuildDialog, $.extend({
            cssClass: "queue-build-host",
            height: 420,
        }, options));
    }

    public static manageXamlQualities(options?: any) {
        /// <summary>Displays Manage Build Qualities Dialog</summary>
        /// <param name="options" type="Object">Following options are supported:
        ///     - okCallback (Function): callback function to run after build qualities are added/removed
        /// </param>
        return Dialogs.show(ManageXamlQualitiesDialog, $.extend({
            cssClass: "manage-build-qualities",
            title: BuildResources.BuildQualitiesDialogTitle,
            width: 400,
            height: 420,
            resizable: false
        }, options));
    }

    constructor() {
    }
}

// Converting existing controls to bindings as we need - COPY from VIVA ViewModel
export class ViewModel {
    public disabled: KnockoutObservable<boolean>;
    public dialogTemplate: string;
    public dirty: KnockoutObservableBase<boolean>;
    _disposables: KnockoutDisposable[];

    constructor() {
        this.disabled = ko.observable<boolean>(false);
        this._disposables = [];
    }

    public populateFromObject(object: Object): void {
        ViewModel.copyObject(object, this);
    }

    public static copyObject(source: Object, destination: any) {
        ViewModel._copyObject(source, destination, [], []);
    }

    private static _copyObject(source: Object, destination: any, sourceAncestors: Object[], destinationAncestors: Object[]) {
        var sourceIndex: number,
            key: string;
        sourceAncestors.push(source);
        destinationAncestors.push(destination);
        for (key in source) {
            if (source.hasOwnProperty(key) && source[key] !== undefined) {
                if (Array.isArray(source[key])) {
                    // currently we shallow copy arrays
                    destination[key] = source[key];
                } else if (source[key] instanceof Date) {
                    destination[key] = source[key];
                } else if (typeof source[key] === "object" && source[key] !== null) {
                    sourceIndex = sourceAncestors.indexOf(source[key]);

                    if (sourceIndex >= 0) {
                        // the property points to an ancestor, so we copy the corresponding destination ancestor.
                        destination[key] = destinationAncestors[sourceIndex];
                    } else {
                        if (!destination[key]) {
                            // the property doesn't exist in destination, so we create an anonymous object
                            destination[key] = {};
                        }

                        // deep copy the properties of source[key] to destination[key]
                        ViewModel._copyObject(source[key], destination[key], sourceAncestors, destinationAncestors);
                    }
                } else {
                    // value types, functions (including observables),
                    destination[key] = source[key];
                }
            }
        }
    }

    public dispose(): void {
        if (this._disposables) {
            this._disposables.forEach((disposable: KnockoutDisposable) => {
                disposable.dispose();
            });
            this._disposables = [];
        }
    }
    /**
     * Adds a subscription to be cleaned up in the destroy().
     *
     * @param disposable One KnockoutComputed to be added to this._disposables.
     */
    _addDisposablesToCleanUp(disposable: KnockoutDisposable): void;

    /**
     * Adds a list of computed to be cleaned up in the destroy().
     *
     * @param disposable Array of KnockoutComputed to be added to this._disposables.
     */
    _addDisposablesToCleanUp(disposable: KnockoutDisposable[]): void;
    _addDisposablesToCleanUp(disposable: any): void {
        if (!Array.isArray(disposable)) {
            disposable = [disposable];
        }

        this._disposables = this._disposables.concat(disposable);
    }
}

export class ModalViewModel extends ViewModel {
    public okCallback: (path: ISelectedPathNode) => void;
    public resizable: boolean = false;
    public height: number = 600;
    public width: number = 500;
    public okText: string = "";
    public buttons: Button;
    constructor() {
        super();
    }
}

export interface ButtonOptions {
    id: string;
    text: string;
    click: any;
    disabled: string;
}

export interface Button {
    [text: string]: ButtonOptions;
}

Controls.Enhancement.registerEnhancement(XamlQualitiesList, ".build-qualities-list")

Controls.Enhancement.registerEnhancement(XamlQualityView, ".build-quality-view")

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.Xaml", exports);
