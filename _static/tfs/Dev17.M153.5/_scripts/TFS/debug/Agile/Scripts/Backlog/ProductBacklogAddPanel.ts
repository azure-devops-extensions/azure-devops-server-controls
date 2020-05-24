/// <reference types="jquery" />

import * as Q from "q";

import * as AgileProductBacklogResources from "Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_TeamAwarenessService from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import * as TFS_Agile_Utils from "Agile/Scripts/Common/Utils";
import * as TFS_UI_Controls_Identities from "Presentation/Scripts/TFS/TFS.UI.Controls.Identities";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Controls from "VSS/Controls";
import * as Combos from "VSS/Controls/Combos";
import * as Diag from "VSS/Diag";
import * as Events_Handlers from "VSS/Events/Handlers";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";
import { FieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/FieldControl";
import { WorkItemClassificationControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemClassificationControl";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { BacklogAddPanelConsts } from "Agile/Scripts/Backlog/Constants";
import { IReferencedNodes } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";

const delegate = Utils_Core.delegate;
const TfsContext = TFS_Host_TfsContext.TfsContext;
const TeamAwarenessService = TFS_TeamAwarenessService.TeamAwarenessService;

/** Add Panel settings data. KEEP IN SYNC WITH AddPanelViewModel.cs. */
export interface IAddPanelSettings {
    teamId: string;
    projectId: string;
    workItemTypes: string[];
    defaultWorkItemType: string;
    fieldRefNames: string[];
    announcer?: ProgressAnnouncer;
}

/** An event handler for the Add Panel's focus-changed event. */
export interface IFocusChangedEventHandler extends IEventHandler {
    (sender: ProductBacklogAddPanel, hasFocus: boolean): void;
}

namespace AddPanelEvents {
    export const EVENT_ADD: string = "event-add";
    export const EVENT_CLOSE: string = "event-close";
    export const EVENT_TYPECHANGED: string = "event-typechanged";
    export const EVENT_DISPLAYCOMPLETE: string = "event-bindcomplete";
    export const EVENT_FOCUS_CHANGED: string = "event-focus-changed";
}

namespace AddPanelConstants {
    export const CSSCLASS_ADD_PANEL_TABLE: string = "add-panel-table";
    export const CSSCLASS_ADD_PANEL_LOADING: string = "add-panel-loading";
    export const CSSCLASS_ADD_PANEL_INPUT = "add-panel-input";
    export const TYPE_CONTROL_ID: string = "typeId";
}

export class ProductBacklogAddPanel {

    private static _fullWidthFields: string[] = [WITConstants.CoreFieldRefNames.Title, WITConstants.CoreFieldRefNames.AreaPath, WITConstants.CoreFieldRefNames.IterationPath];

    /**
     * Deserialize JSON information into configuration object for the add panel object.
     * Create a new instance of the ProductBacklogAddPanel using this configuration and return it.
     *
     * @param $addPanelContainer Container to create Add Panel in
     */
    public static getOptions($addPanelContainer: JQuery): IAddPanelSettings {

        // Deserialize JSON
        var $island: JQuery = $("script", $addPanelContainer);
        if ($island.length <= 0) {
            return null;
        }

        var addPanelConfig: IAddPanelSettings = Utils_Core.parseMSJSON($island.html(), false);

        return addPanelConfig;
    }

    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _addEvent: Events_Handlers.Event<ProductBacklogAddPanel, any>;
    private _workItemTypes: string[];
    private _defaultWorkItemType: string;
    private _fieldRefNames: string[];
    private _teamId: string;
    private _projectId: string;
    private _table: any;
    private _$witTypeContainer: JQuery;
    private _selectedWorkItemType: string;
    private _witTypeControl: any;
    private _witStore: WITOM.WorkItemStore;
    private _project: WITOM.Project;
    private _currentWorkItem: WITOM.WorkItem;
    private _witTypeFieldMap: { [witName: string]: WITOM.FieldDefinition[] };
    private _controls: WorkItemControl[];
    private _iterationPath: string;
    private _teamFieldName: string;
    private _teamFieldValue: string;
    private _teamSettingsReferencedNodes: IReferencedNodes;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _container: JQuery;
    private _$addButton: any;
    private _hasFocus: boolean;
    private _disabled: boolean;
    private _disableTitle: string;
    private _uiReady: boolean;
    private _lastRenderCount: number = 0;
    private _addPanelAnnouncer: ProgressAnnouncer;

    private _setupWitTypeCanceable: Utils_Core.Cancelable;

    private _richContentTooltip: RichContentTooltip;

    /**
     * Creates a new ProductBacklogAddPanel control
     *
     * @param payload Configuration options used to construct ProductBacklogAddPanel instance
     */
    constructor(payload: IAddPanelSettings, container: JQuery, tfsContext?: TFS_Host_TfsContext.TfsContext) {

        this._initialize(payload, container, tfsContext);
    }

    /**
     * The provided function will be called with the source of the event and an argument object that look like
     * {
     *  workItem, the workitem added
     *  callback
     * }
     * the WorkItem instance that is bound to the controls on the Add Panel.
     * signature: func(workitem, callback)
     *
     * @param func The function that will be called when the add button is clicked
     */
    public registerAddEvent(func: Function) {
        Diag.Debug.assert(Boolean(func), "Expected function for add event");
        this._addEvent.getHandlers().subscribe(<any>func);
    }

    /**
     * The provided function will be called when the close button is pressed on the add panel
     *
     * @param func The function that will be called when the close button is clicked
     */
    public registerCloseEvent(func: Function) {
        Diag.Debug.assertParamIsFunction(func, "func");

        this._events.subscribe(AddPanelEvents.EVENT_CLOSE, <any>func);
    }

    /**
     * The provided function will be called when the Type drop down selection changes
     * signature: func()
     *
     * @param func The function that will be called when the Type drop down is changed
     */
    public registerTypeChangedEvent(func: Function) {
        Diag.Debug.assertParamIsFunction(func, "func");

        this._events.subscribe(AddPanelEvents.EVENT_TYPECHANGED, <any>func);
    }

    /**
     * The provided function will be called when the bind complete
     *
     * @param handler The function that will be called when the bind complete
     */
    public registerDisplayCompleteEvent(handler: IEventHandler) {
        this._events.subscribe(AddPanelEvents.EVENT_DISPLAYCOMPLETE, <any>handler);
    }

    /**
     * Removes a handler for the 'display complete' event.
     *
     * @param func The handler to remove
     */
    public detachDisplayCompleteEvent(handler: IEventHandler) {
        this._events.unsubscribe(AddPanelEvents.EVENT_DISPLAYCOMPLETE, <any>handler);
    }

    /**
     * Registers an handler which will be called any time the add panel receives or looses focus.  The handler will
     * should have the following function signature handler(sender, hasFocus) where the sender is the add panel and
     * the has focus is a boolean indicating if the add panel has focus.
     *
     * @param handler The function that will be called when the add panel focus changes.
     */
    public registerFocusChangedEvent(handler: IFocusChangedEventHandler) {

        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(AddPanelEvents.EVENT_FOCUS_CHANGED, handler);
    }

    /**
     * Removes a focus changed handler.
     *
     * @param handler The function to remove.
     */
    public detachFocusChangedEvent(handler: IEventHandler) {

        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(AddPanelEvents.EVENT_FOCUS_CHANGED, <any>handler);
    }

    /**
     * Reconfigures all Add Panel data from the payload object
     *
     * @param payload Configuration options used to construct ProductBacklogAddPanel instance
     */
    public reconfigure(payload: IAddPanelSettings) {
        Diag.Debug.assert(Boolean(payload), "Expected payload data to reconfigure add panel");

        this._setPayloadConfiguration(payload);

        // TODO: Do we really want to enable/disable explicitly here? Check and uncomment
        // this._disabled = false;
        this._setTeamSpecificSettings();

        // Array initialization
        this._witTypeFieldMap = {};
        this._controls = [];
    }

    /**
     * Sets payload configuration data
     *
     * @param payload Payload data for this control
     */
    private _setPayloadConfiguration(payload: IAddPanelSettings) {
        this._teamId = payload.teamId;
        this._workItemTypes = payload.workItemTypes;
        this._defaultWorkItemType = payload.defaultWorkItemType;
        this._fieldRefNames = payload.fieldRefNames;
        this._projectId = payload.projectId;
        this._addPanelAnnouncer = payload.announcer;
    }

    /**
     * Sets team specific settings
     */
    private _setTeamSpecificSettings() {
        const teamAwareness = TFS_OM.ProjectCollection.getConnection(this._tfsContext).getService<TFS_TeamAwarenessService.TeamAwarenessService>(TeamAwarenessService);
        const teamSettings = teamAwareness.getTeamSettings(this._teamId);

        this._teamSettingsReferencedNodes = teamSettings.referencedNodes;
        this._iterationPath = teamSettings.backlogIteration.friendlyPath;
        this._teamFieldName = teamSettings.teamFieldName;
        this._teamFieldValue = teamSettings.teamFieldDefaultValue;
    }

    /**
     * Called publicly to build and render the add panel
     */
    public render(): IPromise<{}>[] {
        var projectsReady = false,
            linksReady = false;

        this._container.empty();

        // Append the "Loading..." element to the Add Panel
        this._container.append($("<div/>")
            .addClass(AddPanelConstants.CSSCLASS_ADD_PANEL_LOADING)
            .text(AgileProductBacklogResources.AddPanel_Loading));

        let promises: IPromise<{}>[] = [];

        promises.push(
            (() => {
                let deferred = Q.defer<{}>();
                this._witStore.beginGetProject(this._projectId, (project) => {
                    this._project = project;
                    this._project.nodesCacheManager.addReferencedNodes(this._teamSettingsReferencedNodes);

                    Diag.Debug.assert(Boolean(this._project), "Project guid passed from server does not exist");

                    projectsReady = true;
                    if (projectsReady && linksReady) {
                        deferred.resolve(this._beginFinishRender());
                    } else {
                        deferred.resolve(null);
                    }
                });
                return deferred.promise;
            })());

        promises.push(
            (() => {
                let deferred = Q.defer<{}>();
                this._witStore.beginGetLinkTypes(() => { // we need to get wit links as well

                    linksReady = true;
                    if (projectsReady && linksReady) {
                        deferred.resolve(this._beginFinishRender());
                    } else {
                        deferred.resolve(null);
                    }
                });
                return deferred.promise;
            })());

        return promises;
    }

    /**
     * hide the add panel
     */
    public hide() {
        this._container.css("display", "none");
        this._raiseDisplayComplete();
    }

    /**
     * show the add panel
     */
    public show(dontFocus?: boolean) {
        this._container.css("display", "block");

        // if the add panel is enabled, focus the first input when showing it via the new button (click or enter).
        if (!this._disabled && !dontFocus) {
            var focusFirstInput = () => {
                var $input = this._container.find("." + BacklogAddPanelConsts.CSSCLASS_ADD_PANEL_INPUT + " :input:first");
                if ($input.length > 0) {
                    $input.focus();
                    this.detachDisplayCompleteEvent(focusFirstInput);
                }
            };
            this.registerDisplayCompleteEvent(focusFirstInput);
        }

        this._raiseDisplayComplete();
    }

    public disable(title?: string) {
        /// <summary>Disable the add panel</summary>
        /// <parameter name= "title" optional="true">Title for the whole Add Panel while it is disabled</summary>
        if (!this._disabled) {
            this._disabled = true;
            this._disableTitle = title;
            this._updateUIStatus();
        }
    }

    /**
     * Enable the add panel
     */
    public enable() {
        if (this._disabled && !this._areAllWitTypesHidden()) {
            this._disabled = false;
            this._updateUIStatus();
        }
    }

    /**
     * Updates the UI to reflect the disabled state
     */
    private _updateUIStatus($container?: JQuery) {
        if (this._uiReady) {
            // Enable/Disable the WIT Type control if it exists
            if (this._witTypeControl) {
                this._witTypeControl.setEnabled(!this._disabled);
            }

            $container = $container || this._container;

            // Enable/Disable all WIT controls
            $.each($container.find("." + BacklogAddPanelConsts.CSSCLASS_ADD_PANEL_INPUT), (i, element) => {
                var $element = $(element);
                if ($element.hasClass("combo")) {
                    var combo = <Combos.Combo>Controls.Enhancement.getInstance(Combos.Combo, $element);
                    combo.setEnabled(!this._disabled);
                }
                else if ($element.hasClass("mru-identity-picker")) {
                    var identityPicker = <TFS_UI_Controls_Identities.MruIdentityPickerControl>Controls.Enhancement.getInstance(TFS_UI_Controls_Identities.MruIdentityPickerControl, $element);
                    identityPicker.setEnabled(!this._disabled);
                }
            });

            if (this._disabled) {
                // Disable the Add button and add optional title
                this._$addButton.attr("disabled", "disabled");
                if (this._disableTitle) {
                    this._richContentTooltip = RichContentTooltip.add(this._disableTitle, $container);
                }
                this._container.attr("aria-disabled", "true");
            } else {
                // Enable the Add button & remove title
                this._$addButton.removeAttr("disabled");
                if (this._richContentTooltip) {
                    this._richContentTooltip.dispose();
                    this._richContentTooltip = null;
                }
                this._container.removeAttr("aria-disabled");
            }

            this._container.toggleClass("disabled", this._disabled);
        }
    }

    /** Determines if the add panel is currently focused. */
    public hasFocus(): boolean {
        return this._hasFocus;
    }

    /** Determines if the add panel is currently disabled. */
    public isDisabled(): boolean {
        return this._disabled;
    }

    /**
     * Initializes all Add Panel data from the payload object
     *
     * @param payload Configuration options used to construct ProductBacklogAddPanel instance
     */
    private _initialize(payload: IAddPanelSettings, container: JQuery, tfsContext?: TFS_Host_TfsContext.TfsContext) {
        Diag.Debug.assert(Boolean(payload), "Expected payload data to initialize add panel");

        this._setPayloadConfiguration(payload);

        // Container to create add panel in
        this._container = container;
        this._container.addClass("add-panel");

        this._disabled = false;

        this._tfsContext = tfsContext || TfsContext.getDefault();

        // Get WITStore service
        this._witStore = this._getWitStore(this._tfsContext);

        // Get the defaults for the team.
        this._setTeamSpecificSettings();

        // Array initialization
        this._witTypeFieldMap = {};
        this._controls = [];

        this._events = new Events_Handlers.NamedEventCollection();
        this._addEvent = new Events_Handlers.Event();
    }

    /**
     * Retrieves work item tracking store object given a collection name
     *
     * @param tfsContext The current TFS context
     */
    private _getWitStore(tfsContext: any) {
        Diag.Debug.assert(Boolean(tfsContext), "Expected collection name to retrieve WIT Store");

        return TFS_OM.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
    }

    /**
     * raise the event of display complete.
     */
    private _raiseDisplayComplete() {
        this._events.invokeHandlers(AddPanelEvents.EVENT_DISPLAYCOMPLETE, this);
    }

    /**
     * Internally handle the click event for the add button. Provide the fully populated
     * work item type to the external add event handler.
     * After completion, focus will be set to the first input in the Add Panel (excluding the Type input).
     *
     * @param sender object raising the event
     */
    private _raiseAddEvent(sender: any) {
        var that = this;

        if (!this._disabled && this._addEvent.getHandlers().getHandlers().length > 0) {
            this._$addButton.attr("disabled", true);

            this._addEvent.invokeHandlers(this, {
                workItem: this._currentWorkItem,
                callback: function () {
                    var typeInput = $("input", that._$witTypeContainer);

                    that._refreshForm();

                    that._$addButton.attr("disabled", false);

                    // Give focus to the first input that is not the "type" input.
                    $("input", that._container)
                        .not(typeInput)
                        .eq(0)
                        .focus();

                    // explicitly raise the focus-changed event because of differences in behavior of the
                    // focusin and focusout behaviors between browsers when focus is explicitly set on
                    // a contained element.
                    that._hasFocus = true;
                    that._raiseFocusChangedEvent();
                }
            });
        }
    }

    /**
     * Reacts to the Work Item Type drop down value being changed
     *
     * @param index current index in drop down (not used)
     */
    private _witTypeSelectionChanged(index: number) {

        var selectedWitType = this._witTypeControl.getText();
        // this._isValidWorkItemType(selectedWitType) protects us from the user entering a valid Work Item Type for the
        // Team Project which is not configured to be a Work Item Type that appears on the product backlogb
        if (this._selectedWorkItemType !== selectedWitType && this._isValidWorkItemType(selectedWitType)) {
            this._beginSetupForWitType(selectedWitType);
        }

        // Call the external event handler that was provided by the options passed to the constructor
        this._events.invokeHandlers(AddPanelEvents.EVENT_TYPECHANGED);
    }

    /**
     * Raise the focus changed event.
     */
    private _raiseFocusChangedEvent() {

        this._events.invokeHandlers(AddPanelEvents.EVENT_FOCUS_CHANGED, this, this._hasFocus);
    }

    /**
     * bind all controls to the current work item
     */
    private _bindAllControls() {
        var i, l;

        for (i = 0, l = this._controls.length; i < l; i += 1) {
            this._controls[i].bind(this._currentWorkItem);
        }

        this._setDefaults();
    }

    /**
     * unbinds all controls from the current work item
     */
    private _unbindAllControls() {
        var i, l;

        for (i = 0, l = this._controls.length; i < l; i += 1) {
            this._controls[i].unbind();
        }
    }

    private _beginFinishRender(): IPromise<void> {
        this._lastRenderCount++;
        var $container = $(this._container),
            $innerContainer = $("<div/>"); // this is for building the content off the DOM

        this._createTableSkeleton($innerContainer);
        return this._beginPopulateWitTypeControl().then((shouldRender) => {

            // should render is false if the wit type control is not populated
            // due a new refresh request, only the last refresh will be honored
            if (!shouldRender) {
                return;
            }

            // When the add panel is initialized, the table containing add panel
            // fields is added to the container in the call back. When the add panel is in a disabled state,
            // the WIT controls, and other field controls are not yet added to the add panel
            // So we are passing in the table skeleton here, so that the updateUIStatus method operates on this
            // JQuery element if available, otherwise on the add panel container
            this._beginSetupForWitType(this._selectedWorkItemType, $innerContainer, () => {
                // Remove the "Loading..." element & place the HTML content in the DOM
                $("." + AddPanelConstants.CSSCLASS_ADD_PANEL_LOADING, $container).remove();
                $container.append($innerContainer);
                // Accesible loading experience
                if (this._addPanelAnnouncer) {
                    this._addPanelAnnouncer.announceCompleted();
                }
                if (!this._disabled) {
                    // After we finish rendering the add panel we need to, again, notify listeners. This is so the grid can react to the add panel height change.
                    this._raiseDisplayComplete();
                }
            });

            // Raise bind complete is called to trigger the PBL to react to add panel rendering. For example, resizing the Grid.
            this._raiseDisplayComplete();

            this._project.beginGetWorkItemTypes(this._workItemTypes, $.noop);

            if (this._areAllWitTypesHidden()) {
                this.disable();
            }

            Diag.logTracePoint("ProductBacklogAddPanel.show.complete");
        });
    }

    /**
     * Creates the initial table structure that contains static fields. Dynamic content will add rows to this struture as needed
     *
     * @param container container to create the add panel inside
     */
    private _createTableSkeleton(container: any) {
        Diag.Debug.assert(Boolean(container), "Expected container to create table in");

        var that = this,
            $container = $(container),
            $table,
            $witTypeContainer;

        // Track if the add panel has focus.
        $container
            .focusin(function () {
                // If we do not already have focus, raise the event.
                if (!that._hasFocus) {
                    that._hasFocus = true;
                    that._raiseFocusChangedEvent();
                }
            })
            .focusout(function () {
                // If we had focus, raise the event.
                if (that._hasFocus) {
                    that._hasFocus = false;
                    that._raiseFocusChangedEvent();
                }
            });

        $witTypeContainer = $("<div/>");
        $table = $("<table/>")
            .addClass(AddPanelConstants.CSSCLASS_ADD_PANEL_TABLE)
            .append($("<tr/>")
                .addClass("add-panel-row")
                .append($("<td/>").append(
                    $("<label/>")
                        .addClass("add-panel-labelcell")
                        .text(AgileProductBacklogResources.AddPanel_Type)
                        .attr("for", AddPanelConstants.TYPE_CONTROL_ID + "_txt")
                ).addClass("add-panel-label"))
                .append($("<td/>").addClass("add-panel-controlcell").append($witTypeContainer))
                .append($("<td/>").addClass("add-panel-buttoncell").append(this._createCloseImageButton()))
            );

        $container.append($table);

        this._table = $table.get(0);
        this._$witTypeContainer = $witTypeContainer;
    }

    /**
     * Create the [x] image to close the add panel and wires up click event
     *
     * @return
     */
    private _createCloseImageButton(): any {

        var that = this,
            $closeImage;

        $closeImage = $("<div/>")
            .attr("aria-label", AgileProductBacklogResources.AddPanel_CloseAltText)
            .addClass("add-panel-close-button icon bowtie-icon bowtie-navigate-close")
            .attr("tabindex", 0)
            .attr("role", "button")
            .bind("click.VSS.Agile", function () {
                that.hide();
                that._events.invokeHandlers(AddPanelEvents.EVENT_CLOSE);
            })
            .bind("keyup.VSS.Agile", function (e) {
                if (e.result !== false && e.keyCode === Utils_UI.KeyCode.ENTER) {
                    that.hide();
                    that._events.invokeHandlers(AddPanelEvents.EVENT_CLOSE);
                    return false;
                }
            });

        RichContentTooltip.add(AgileProductBacklogResources.AddPanel_Close, $closeImage);

        return $closeImage;
    }

    /**
     * Given a work item type populates all the labels and controls necessary
     *
     * @param witType The name of the WIT type
     * @param callback Callback to invoke when we have finished drawing the rows for the WIT type
     */
    private _beginSetupForWitType(witType: string, $container?: JQuery, callback?: IResultCallback) {
        Diag.Debug.assert(Boolean(witType), "witType should be supplied");

        var fieldDefinitions: WITOM.FieldDefinition[] = [];
        var cachedTitle: string;

        if (this._currentWorkItem) {
            // Cache the title of the current work item so we can repopulate the new work item
            var hasTitle = $.inArray(WITConstants.CoreFieldRefNames.Title, this._fieldRefNames) >= 0;
            if (hasTitle) {
                cachedTitle = this._currentWorkItem.getFieldValue(WITConstants.CoreFieldRefNames.Title)
            }
        }

        // Set the selected work item type
        this._selectedWorkItemType = witType;

        // Clear the add panel before drawing again
        this._deleteDynamicRows();
        this._controls = [];

        if (this._setupWitTypeCanceable) {
            this._setupWitTypeCanceable.cancel();
        }

        this._setupWitTypeCanceable = new Utils_Core.Cancelable(this);

        var canceableCallback = this._setupWitTypeCanceable.wrap((workItemType: WITOM.WorkItemType) => {
            this._setupWitTypeCanceable = null;

            // If we dont have the wit type fields already cached then calculate valid fields
            if (!this._witTypeFieldMap.hasOwnProperty(witType)) {
                for (let fieldRefName of this._fieldRefNames) {
                    let fieldDef = workItemType.getFieldDefinition(fieldRefName);
                    if (fieldDef) {
                        fieldDefinitions.push(fieldDef);
                    }
                }

                this._witTypeFieldMap[witType] = fieldDefinitions;
            }

            for (let i = 0, l = this._witTypeFieldMap[witType].length; i < l; i += 1) {
                let buildLastRow = i === l - 1;
                this._drawRow(this._witTypeFieldMap[witType][i], buildLastRow);
            }

            this._setCurrentWorkItem(this._selectedWorkItemType);

            // Copy cached title from the previous work item into this workitem.
            if (cachedTitle) {
                this._currentWorkItem.setFieldValue(WITConstants.CoreFieldRefNames.Title, cachedTitle);
            }
            this._bindAllControls();

            // update the ui to reflect the disabled/enabled state
            this._uiReady = true;
            this._updateUIStatus($container);

            Diag.logTracePoint("ProductBacklogAddPanel._setupForWitType.complete");
            if ($.isFunction(callback)) {
                callback();
            }
        });

        this._project.beginGetWorkItemType(
            this._selectedWorkItemType,
            <any>canceableCallback,
            (error) => { // error handler for beginGetWorkItemType
                this._addPanelAnnouncer.announceError();
                VSS.errorHandler.show(error);
            });
    }

    /**
     *   Gets form back into initial state. Clears previous control bindings, creates a new Work Item instance and binds controls to that.
     *   Note that this function should only be called when the WorkItemType will remain the same. Hence the term "refresh". Additional
     *   logic is necessary to switch to another WorkItemType
     */
    private _refreshForm() {

        //Unbind all controls since this is a quick add panel and not to be used for edits
        this._unbindAllControls();

        // Create new work item and bind controls to it
        this._setCurrentWorkItem(this._selectedWorkItemType);
        this._bindAllControls();
    }

    /**
     * Draw a single row for the specified field. If this is a button row then we will also
     * need to draw the buttons on this row.
     *
     * @param fieldDef information on the wit field used to choose which control to create
     * @param buttonRow true if we need to create buttons on this row, othwerwise false
     */
    private _drawRow(fieldDef: WITOM.FieldDefinition, buttonRow: boolean) {
        Diag.Debug.assert(Boolean(fieldDef), "Expected configured field information for Add Panel");
        Diag.Debug.assert(buttonRow !== undefined && buttonRow !== null && typeof (buttonRow) === "boolean",
            "Expected true or false for buttonRow");

        var $addPanelTable = $(this._table),
            $tr,
            $tdLabel,
            $tdControl,
            $tdButtons,
            $control,
            $fullWidthFieldContainer;

        $tr = $("<tr/>")
            .addClass("add-panel-row")
            .addClass("dynamic-add-panel-row");

        // Remove '.' from controlId since it's not valid as ID attribute
        var controlId = fieldDef.referenceName.replace(/\./g, "_");

        $control = this._createControl(fieldDef, controlId);

        $tdLabel = $("<td/>").append(
            $("<label/>")
                .text(fieldDef.name)
                .attr("for", controlId + "_txt")
                .addClass("add-panel-label")
        ).addClass("add-panel-labelcell");
        $tdControl = $("<td/>");
        $tdButtons = null;

        if (buttonRow) {
            this._$addButton = $("<button type='button' />")
                .text(AgileProductBacklogResources.AddPanel_Add)
                .click(delegate(this, this._raiseAddEvent))
                .addClass("add-panel-button");
        }

        var isFullWidthField = Utils_Array.contains(ProductBacklogAddPanel._fullWidthFields, fieldDef.referenceName, Utils_String.ignoreCaseComparer);
        if (isFullWidthField) {
            $tdControl.attr("colspan", 2);
            if (buttonRow) {
                // we need to create another table to split the cell between full width field and the button
                $fullWidthFieldContainer = $("<table cellpadding='0' cellspacing='0' />")
                    .addClass("addpanel-full-width-row")
                    .append($("<tr/>")
                        .append($("<td/>").append($control))
                        .append($("<td/>").addClass("add-panel-full-width-row-button").append(this._$addButton)));
                $tdControl.append($fullWidthFieldContainer);
            }
            else {
                // just add the control to the 2 colspan cell
                $tdControl.append($control);
            }
        }
        else {
            $tdControl.append($control);
            $tdButtons = $("<td/>");
            if (buttonRow) {
                $tdButtons.append(this._$addButton);
            }
            else {
                $tdButtons.append("&nbsp;");
            }
        }

        $tr.append($tdLabel)
            .append($tdControl);
        if ($tdButtons !== null) {
            $tr.append($tdButtons);
        }

        $addPanelTable.append($tr);
    }

    /**
     * Deletes all dynamic add panel rows
     */
    private _deleteDynamicRows() {

        // We must unbind the controls from their corresponding work item fields prior to removing the rows from the DOM
        this._unbindAllControls();
        $(".dynamic-add-panel-row", this._table).remove();
    }

    /**
     * Determines which type of control to create based on wit field type
     *
     * @param fieldDef The WIT field definition
     * @param controlId The controlID
     */
    private _createControl(fieldDef: WITOM.FieldDefinition, controlId: string) {
        Diag.Debug.assert(Boolean(fieldDef), "Expected field reference name in order to create the control");

        const $controlContainer = $("<div class='add-panel-control'/>");

        let control: WorkItemControl;
        switch (fieldDef.type) {
            case WITConstants.FieldType.String:
            case WITConstants.FieldType.Integer:
            case WITConstants.FieldType.Double:
            case WITConstants.FieldType.DateTime:
                control = this._createLiteralControl($controlContainer, fieldDef, controlId);
                break;
            case WITConstants.FieldType.TreePath:
                control = this._createTreeControl($controlContainer, fieldDef, controlId);
                break;
            default:
                break;
        }

        // Add aria description to give screen readers context
        let $ariaDescription = $("<div/>")
            .attr("id", controlId + "ariadescription")
            .css("display", "none")
            .text(Utils_String.format(AgileProductBacklogResources.AddPanel_AriaDescription, fieldDef.name));
        $controlContainer.append($ariaDescription);

        $("input", $controlContainer).keypress((e) => {
            // we will only handle the enter if not handled by the underlying control
            if (e.result !== false && e.keyCode === Utils_UI.KeyCode.ENTER) {
                for (let wiControl of this._controls) {
                    if (wiControl instanceof FieldControl || wiControl instanceof WorkItemClassificationControl) {
                        wiControl.flush();
                    }
                }
                this._raiseAddEvent(this);
                return false;
            }
        }).attr("aria-describedby", controlId + "ariadescription");

        Diag.Debug.assert(Boolean(control), "WIT Field Type should be string, integer, double, datetime or treepath");

        this._controls.push(control);

        return $controlContainer;
    }

    /**
     * Manages creating a control for wit types String, Integer, DateTime, Double
     *
     * @param $controlContainer container that the control needs to be created inside
     * @param fieldDef wit field type used to create the control
     */
    private _createLiteralControl($controlContainer: JQuery, fieldDef: WITOM.FieldDefinition, controlId: string) {
        return new FieldControl($controlContainer, {
            controlId,
            fieldName: fieldDef.referenceName,
            comboCssClass: BacklogAddPanelConsts.CSSCLASS_ADD_PANEL_INPUT,
            allowEmpty: true,
        },
            fieldDef.workItemType);
    }

    /**
     * Manages creating a control for wit type TreePath
     *
     * @param $controlContainer container that the control needs to be created inside
     * @param fieldDef wit field type used to create the control
     */
    private _createTreeControl($controlContainer: JQuery, fieldDef: WITOM.FieldDefinition, controlId: string) {
        return new WorkItemClassificationControl($controlContainer,
            {
                controlId,
                fieldName: fieldDef.referenceName,
                comboCssClass: BacklogAddPanelConsts.CSSCLASS_ADD_PANEL_INPUT,
                allowEmpty: true,
                useLegacy: true
            },
            fieldDef.workItemType);
    }

    /**
     * Creates simple label or drop down based on configured parent types
     */
    private _beginPopulateWitTypeControl(): IPromise<boolean> {
        let currentRenderCount = this._lastRenderCount;
        let deferred = Q.defer<boolean>();

        TFS_Agile_Utils.WorkItemCategoriesUtils.removeHiddenWorkItemTypeNames(this._workItemTypes)
            .then((visibleWorkItemTypes: string[]) => {

                // if the user switches between different backlog levels
                // only populate the WitTypeControl for the last backlog level
                // else the promise will be resolved multiple times and multiple controls will
                // be rendered and poplated
                if (currentRenderCount != this._lastRenderCount) {
                    deferred.resolve(false);
                    return;
                }
                else {
                    this._workItemTypes = visibleWorkItemTypes;

                    var $addPanelWitType = this._$witTypeContainer,
                        witTypeOptions,
                        selectedWorkItemType;

                    if (this._defaultWorkItemType !== null && this._defaultWorkItemType !== undefined) {
                        if (this._workItemTypes.length > 0 && this._workItemTypes.indexOf(this._defaultWorkItemType) < 0) {
                            selectedWorkItemType = this._workItemTypes[0]
                        }
                        else {
                            selectedWorkItemType = this._defaultWorkItemType;
                        }
                    } else {
                        selectedWorkItemType = this._workItemTypes[0];
                    }

                    // If there is only 1 work item type then create simple text field, otherwise create drop down control
                    if (this._workItemTypes.length === 1) {
                        $addPanelWitType.append(Utils_String.htmlEncode(selectedWorkItemType))
                            .addClass("add-panel-wit-type-single");
                    }
                    else {
                        witTypeOptions = {
                            source: this._workItemTypes,
                            width: "100%",
                            id: AddPanelConstants.TYPE_CONTROL_ID,
                            indexChanged: delegate(this, this._witTypeSelectionChanged),
                            allowEdit: false
                        };
                        this._witTypeControl = Controls.BaseControl.createIn(Combos.Combo, $addPanelWitType, witTypeOptions);
                        this._witTypeControl.setText(Utils_String.htmlEncode(selectedWorkItemType));

                        // Add aria description to give screen readers context
                        let $ariaDescription = $("<div/>")
                            .attr("id", AddPanelConstants.TYPE_CONTROL_ID + "ariadescription")
                            .css("display", "none")
                            .text(Utils_String.format(AgileProductBacklogResources.AddPanel_AriaDescription, AgileProductBacklogResources.AddPanel_Type));
                        $addPanelWitType.append($ariaDescription);
                        $("input", $addPanelWitType).attr("aria-describedby", AddPanelConstants.TYPE_CONTROL_ID + "ariadescription");
                    }

                    this._selectedWorkItemType = selectedWorkItemType;
                    deferred.resolve(true);
                }
            });

        return deferred.promise;
    }

    /**
     * Checks if all work item types in the backlog level category are hidden
     */
    private _areAllWitTypesHidden(): boolean {
        return !this._workItemTypes || this._workItemTypes.length === 0;
    }

    /**
     * Sets the current work item instance that will be bound to generated controls
     *
     * @param workItemTypeName The Work Item Type name to create a new WorkItem instance of
     */
    private _setCurrentWorkItem(workItemTypeName) {

        this._project.beginGetWorkItemType(workItemTypeName,
            (workItemType) => {
                //create work item out of work item manager
                this._currentWorkItem = workItemType.create();
            },
            (error) => {
                // error handler for beginGetWorkItemType
                VSS.errorHandler.show(error);
            });
    }

    /**
     * determines whether the work item is in the configured list of work items
     *
     * @param workItemType The work item type name (e.g. "User Story")
     */
    private _isValidWorkItemType(workItemType) {
        var i, l;
        for (i = 0, l = this._workItemTypes.length; i < l; i += 1) {
            if (workItemType === this._workItemTypes[i]) {
                return true;
            }
        }
        return false;
    }

    /**
     * sets default fields on the work item
     */
    private _setDefaults() {
        this._currentWorkItem.getField(WITConstants.CoreField.IterationPath).setValue(this._iterationPath);
        this._currentWorkItem.getField(this._teamFieldName).setValue(this._teamFieldValue);
    }
}
