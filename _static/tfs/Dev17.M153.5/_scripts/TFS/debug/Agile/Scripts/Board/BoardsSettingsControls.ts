/// <amd-dependency path="jQueryUI/sortable"/>
/// <reference types="jquery" />
/// <reference types="knockout" />
import Tfs_Admin_Controls_TeamSettings = require("Agile/Scripts/Admin/TeamSettings");
import {
    AdditionalFieldComboViewModel,
    ColumnTabCollectionViewModel,
    ColumnTabViewModel,
    FieldTabCollectionViewModel,
    FieldTabViewModel,
    IFieldTabViewModelOptions,
    SwimlaneTabCollectionViewModel,
} from "Agile/Scripts/Board/BoardsSettingsViewModels";
import { loadHtmlTemplate } from "Agile/Scripts/Board/Templates";
import Cards = require("Agile/Scripts/Card/Cards");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import { ITeam } from "Agile/Scripts/Models/Team";
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import ko = require("knockout");
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { BacklogConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import Configurations = require("Presentation/Scripts/TFS/TFS.Configurations");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import { ITabStripControlOptions, TabStripControl } from "Presentation/Scripts/TFS/TFS.UI.TabStripControl";
import TFS_TabStrip_ViewModels = require("Presentation/Scripts/TFS/TFS.ViewModels.TabStripControl");
import Q = require("q");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Work_Contracts = require("TFS/Work/Contracts");
import Work_WebApi = require("TFS/Work/RestClient");
import TeamServices = require("TfsCommon/Scripts/Team/Services");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Notifications = require("VSS/Controls/Notifications");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

TFS_Knockout.overrideDefaultBindings();

var domElem = Utils_UI.domElem;

/**
 * @interface 
 * Interface for board settings options
 */
export interface IBoardSettingTabOptions {
    /**
     * The team that where the tab is being loading on.
     */
    team: ITeam;
    /**
     * Board name or board id. Either board settings or boardIdentity must be provided.
     */
    boardIdentity?: string;
    /**
     * Flag indicated whether the user has permission to edit the settings.  
     */
    isEditable?: boolean;
    /**
     * Referred to Boards.IBoardSettings
     */
    boardSettings?: any;
    /**
     * This is the callback after content has been saved and the dialog has been closed.  
     */
    applyChanges?: Function;
    /**
     * The flag that drives whether or not to refresh the page on successful save.
     */
    requireRefreshOnSave?: boolean;
    /**
     * The category reference name associated with the board.
     */
    categoryReferenceName?: string;
}


/**
 * @interface 
 * Interface for swimlane settings control options
 */
export interface ISwimlaneSettingsControlOptions {
    /**
     * The team that where the tab is being loading on.
     */
    team: ITeam;
    /**
     * Board settings. Either board settings or boardIdentity must be provided.
     */
    boardSettings?: Boards.IBoardSettings;
    /**
     * Board name or board id. Either board settings or boardIdentity must be provided.
     */
    boardIdentity?: string;
    /**
     * onValid: Callback function when valid state of the control changed. 
     */
    onValid?: Function;
    /**
     * The flag that drives whether or not to refresh the page on successful save.
     */
    requireRefreshOnSave?: boolean;
    /**
     * This is the callback after content has been saved and the dialog has been closed.  
     */
    applyChanges?: Function;
}

/**
 * @interface 
 * Interface for swimlane setting changes used for telemetry.
 */
export interface IRowSettingChanges {
    isRowNameChanged: boolean;
    isRowOrderChanged: boolean;
    totalRowCount: number;
    newRowCount: number;
    deletedRowCount: number;
    isRowAdded: boolean;
    isRowDeleted: boolean;
}

/**
 * Swimlane settings control.
 */
export class SwimlaneSettingsControl extends Configurations.TabContentBaseControl<ISwimlaneSettingsControlOptions> {
    public static SWIMLANE_TAB_CONTENT_TEMPLATE = "swimlane-settings-tab-content-template";
    private static DESCRIPTION_AREA_CONTAINER_CLASS = "swimlane-settings-description-area-container";
    private static SECTIONS_AREA_CONTAINER_CLASS = "sections-area-container";
    private static MESSAGE_AREA_CONTAINER_CLASS = "swimlane-settings-message-area-container";
    private static SWIMLANE_CONTROL_OVERLAY_CLASS = "swimlane-settings-control-overlay";
    private static SWIMLANE_ADD_CONTAINER = "add-control";
    private static SWIMLANE_SETTINGS_DESCRIPTION_ID = "swimlaneSettingsDescription";

    public _tabStripControl: TabStripControl<SwimlaneTabCollectionViewModel>;
    private _canEdit: boolean;
    private _$controlOverlay: JQuery;
    private _messageArea: Notifications.MessageAreaControl;
    private _$addButtonContainer: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    protected _swimlaneTabCollectionViewModel: SwimlaneTabCollectionViewModel;
    private _originalSettings: Work_Contracts.BoardRow[];

    /**
     * The flag that drives whether or not to refresh the page on successful save.
     */
    private _requireRefreshOnSave: boolean;

    /**
     * This is the callback after content has been saved and the dialog has been closed.  
     */
    public applyChanges: Function;


    constructor(options?: ISwimlaneSettingsControlOptions) {
        super($.extend(options, { cssClass: "swimlane-settings-container" }));
        this.applyChanges = options.applyChanges;
    }

    /**
     * Initialize the control.
     */
    public initialize() {
        super.initialize();
        this._canEdit = this._options.boardSettings.canEdit;
        this._originalSettings = this._options.boardSettings.rows;
        this._requireRefreshOnSave = this._options.requireRefreshOnSave;

        var $element = this.getElement();
        var $textAreaContainer = $(domElem("div", SwimlaneSettingsControl.DESCRIPTION_AREA_CONTAINER_CLASS));
        var $sectionsAreaContainer = $(domElem("div", SwimlaneSettingsControl.SECTIONS_AREA_CONTAINER_CLASS));

        this._createMessageArea($textAreaContainer);
        this._createDescriptionTextArea($textAreaContainer);
        this._createAddButton($sectionsAreaContainer);

        $element.append($textAreaContainer);
        $element.append($sectionsAreaContainer);

        this._createTab($sectionsAreaContainer);

        if (!this._canEdit) {
            this.showWarning(AgileControlsResources.Swimlane_Settings_NoPermissions);
        }
    }

    public beginLoad($container: JQuery): IPromise<any> {
        ///<summary>Method that renders the actual control, on called by the CSC framework. 
        ///<param name="$container" type="JQuery" optional="false">The DOM element, to which the control should be added</param>
        ///<returns type="IPromise">Resolve if render successfully, reject if failed.</returns>
        var deferred = Q.defer();
        if (!this._options.boardSettings) {
            var boardIdentity = this._options.boardIdentity;
            if (!boardIdentity) {
                deferred.reject("Either board setting or board name should be provided for board column setting control.");
            }
            var successCallback = (boardSettings: Boards.IBoardSettings) => {
                this.beginExecuteAction(() => {
                    this._options.boardSettings = boardSettings;
                    this.createIn($container);
                    deferred.resolve(null);
                });
            };
            var errorCallback = (error: { message: string; serverError: any; }) => {
                this.beginExecuteAction(() => {
                    deferred.reject(error);
                });
            };

            this.getBoardSettings(boardIdentity).then(successCallback, errorCallback);
        }
        else {
            this.createIn($container);
            deferred.resolve(null);
        }
        return deferred.promise;
    }

    public getBoardSettings(boardIdentity: string): IPromise<any> {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        var workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        var teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: this._options.team.id
        };
        return workHttpClient.getBoard(teamContext, boardIdentity);
    }

    /**
     * On tab activated, we need to re-bind the customized handler.
     */
    public onTabActivated(isInit: boolean) {
        if (!isInit) {
            this._tabStripControl.bindCustomHandlers();
        }
    }

    /**
     * Dispose the control.
     */
    public dispose() {
        if (this._messageArea) {
            this._messageArea.dispose();
        }
        if (this._tabStripControl) {
            this._tabStripControl.dispose();
            this._tabStripControl = null;
        }

        if (this._swimlaneTabCollectionViewModel) {
            this._swimlaneTabCollectionViewModel.dispose();
            this._swimlaneTabCollectionViewModel = null;
        }

        super.dispose();
    }

    /**
     * Create tab control.
     */
    private _createTab($container: JQuery) {
        var clonedRows = JSON.parse(JSON.stringify(this._options.boardSettings.rows));
        var swimlaneTabCollectionViewModel = new SwimlaneTabCollectionViewModel(clonedRows);
        this._swimlaneTabCollectionViewModel = swimlaneTabCollectionViewModel;
        var options: ITabStripControlOptions<SwimlaneTabCollectionViewModel> = {
            align: TabStripControl.VERTICAL_ALIGN,
            contentTemplateClassName: SwimlaneSettingsControl.SWIMLANE_TAB_CONTENT_TEMPLATE,
            canEdit: this._canEdit,
            tabCollection: swimlaneTabCollectionViewModel,
            onDirtyStateChanged: () => {
                this.fireDirtyFlagChange(this.isDirty());
            },
            onValidStateChanged: () => {
                this.fireValidFlagChange(this.isValid());
            }
        };

        this._tabStripControl = <TabStripControl<SwimlaneTabCollectionViewModel>>Controls.Control.create(TabStripControl, $container, options);
    }

    private _createMessageArea($container: JQuery) {
        var $messageAreaContainer = $(domElem("div", SwimlaneSettingsControl.MESSAGE_AREA_CONTAINER_CLASS));
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
        var $swimlaneMainHeader = $(domElem("div", "main-header"));
        var $dataIsland = $(".board-page-title-area");
        if ($dataIsland.length > 0) {
            $dataIsland.eq(0).html().trim();
        }
        $swimlaneMainHeader.text(AgileControlsResources.Swimlane_Settings_Main_Header);

        var $swimlaneDescription = $(domElem("div", "main-description"));
        $swimlaneDescription.text(AgileControlsResources.Swimlane_Settings_Description);
        $swimlaneDescription.attr("id", SwimlaneSettingsControl.SWIMLANE_SETTINGS_DESCRIPTION_ID);
        $container.append($swimlaneMainHeader)
            .append($swimlaneDescription);
    }

    private _createAddButton($container: JQuery) {
        this._$addButtonContainer = $(domElem("div", SwimlaneSettingsControl.SWIMLANE_ADD_CONTAINER))
            .attr({
                "aria-label": AgileControlsResources.Swimlane_Settings_Add_Button_Label,
                "role": "button",
                "tabindex": "0",
                "aria-describedby": SwimlaneSettingsControl.SWIMLANE_SETTINGS_DESCRIPTION_ID
            })
            .click((e?: JQueryEventObject) => {
                this._addButtonClickHandler();
            })
            .keydown((e?: JQueryEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
                    this._addButtonClickHandler();
                }
            });

        var $addIconSpan = $("<span>").addClass("add-control-icon");
        var $addIcon = $("<i>").addClass("icon bowtie-icon bowtie-math-plus");
        $addIconSpan.append($addIcon);
        var $addIconText = $("<div>").addClass("control-text").text(AgileControlsResources.Swimlane_Settings_Add_Button);
        if (!this._canEdit) {
            $addIcon.addClass("bowtie-math-plus-gray");
            this._$addButtonContainer.addClass("disable");
            this._$addButtonContainer.attr("aria-disabled", "true");
        }

        this._$addButtonContainer.append($addIconSpan).append($addIconText);
        $container.append(this._$addButtonContainer);
    }

    private _addButtonClickHandler() {
        if (this._canEdit) {
            var activeTabIndex = this._swimlaneTabCollectionViewModel.getActiveTabIndex();
            this._tabStripControl.insertTab(activeTabIndex);
        }
    }

    /**
     * @return Array of board rows.
     */
    public getSwimlanes(): Work_Contracts.BoardRow[] {
        var boardRows: Work_Contracts.BoardRow[] = $.map(this._swimlaneTabCollectionViewModel.tabs(), (tab: TFS_TabStrip_ViewModels.TabViewModel, index: number) => {
            return {
                id: tab.id,
                name: tab.name()
            };
        });

        return boardRows;
    }

    /**
     * Gets the tab settings changes
     * @returns An object with the setting changes.
     */
    public getSettingsChanges(): IRowSettingChanges {
        var oldSettings = this._originalSettings;
        var newSettings = this.getSwimlanes();

        var changes: IRowSettingChanges = {
            isRowNameChanged: false,
            isRowOrderChanged: false,
            totalRowCount: newSettings.length,
            newRowCount: 0,
            deletedRowCount: 0,
            isRowAdded: false,
            isRowDeleted: false
        };
        var deletedRowCount = 0;
        var addedRowCount = 0;

        $.each(newSettings, (index, row: Work_Contracts.BoardRow) => {
            if (row.id == null) {
                addedRowCount++;
            }
        });

        $.each(oldSettings, (index: number, oldRow: Work_Contracts.BoardRow) => {
            var rowFound: boolean = false;
            $.each(newSettings, (index: number, newRow: Work_Contracts.BoardRow) => {
                if (oldRow.id === newRow.id) {
                    rowFound = true;
                    if (Utils_String.ignoreCaseComparer(oldRow.name, newRow.name) !== 0) {
                        changes.isRowNameChanged = true;
                    }
                    return false;
                }
            });
            if (!rowFound) {
                deletedRowCount++;
            }
        });

        changes.newRowCount = addedRowCount;
        changes.isRowAdded = (addedRowCount > 0);
        changes.deletedRowCount = deletedRowCount;
        changes.isRowDeleted = (deletedRowCount > 0);

        // detect row order change. note that if a row was added/deleted, that is considered as order change 
        changes.isRowOrderChanged = changes.isRowAdded || changes.isRowDeleted;
        if (!changes.isRowOrderChanged) {
            for (var index = 0; index < oldSettings.length; index++) {
                if (oldSettings[index].id !== newSettings[index].id) {
                    changes.isRowOrderChanged = true;
                    break;
                }
            }
        }
        return changes;
    }

    /**
     * Shows an overlay over the entire control with a status indicator on top.
     * @param text The text to display next to the spinner.
     * @param options Optional options for the StatusIndicator control.
     */
    public showOverlay(text: string, options?: any) {
        if (!this._$controlOverlay) {
            this._$controlOverlay = $(domElem("div", "control-busy-overlay " + SwimlaneSettingsControl.SWIMLANE_CONTROL_OVERLAY_CLASS))
                .appendTo(this.getElement());
        }

        var statusOptions = options ||
            {
                center: true,
                imageClass: "big-status-progress",
                message: text,
                throttleMinTime: 0
            };
        this._statusIndicator = Controls.Control.create(StatusIndicator.StatusIndicator, this._$controlOverlay, statusOptions);
        this._statusIndicator.start();

        this._$controlOverlay.show();
    }

    /**
     * Hides the overlay.
     */
    public hideOverlay() {
        if (this._$controlOverlay) {
            Diag.Debug.assertIsNotNull(this._statusIndicator, "this._statusIndicator");
            this._statusIndicator.complete();
            this._$controlOverlay.hide();
            this._$controlOverlay.empty();
        }
    }

    /**
     * Sets the error message in the message area control.
     */
    public showError(message: string) {
        this._messageArea.setError(message);
    }

    /**
      * Sets the warning message in the message area control.
      */
    public showWarning(message: string) {
        this._messageArea.setMessage(message, Notifications.MessageAreaType.Warning);
    }

    /**
     * Return isValid state.
     */
    public isValid(): boolean {
        return this._tabStripControl && this._tabStripControl.isValid();
    }

    /**
     * Return isDirty state.
     */
    public isDirty(): boolean {
        return this._tabStripControl && this._tabStripControl.isDirty();
    }

    public beginSave(): IPromise<boolean> {
        if (this.isValid()) {
            var deferred = Q.defer<boolean>();
            var startTime: number = Date.now();

            var boardRows = this.getSwimlanes();
            var successCallback = (value: Work_Contracts.BoardRow[]) => {
                this.beginExecuteAction(() => {
                    // Record telemetry.
                    this._onRowSettingsSave(startTime);
                    // Rebind the view model after save.
                    this._swimlaneTabCollectionViewModel.reset(value);
                    this._originalSettings = value;
                    this._tabStripControl.rebind();
                    deferred.resolve(this._requireRefreshOnSave);
                });
            };
            var errorCallback = (error: { message: string; serverError: any; }) => {
                this.beginExecuteAction(() => {
                    deferred.reject(error);
                });
            };
            new Boards.BoardSettingsManager().beginUpdateRows(boardRows, this._options.boardSettings.id).then(successCallback, errorCallback);
            return deferred.promise;
        }
    }

    /**
     * Called when the control is getting resized.
     * Set tabstrip's tab content height based on common configration setting tab content height.
     */
    public onResize() {
        if (this._tabStripControl) {
            this._tabStripControl.setTabContentHeight();
        }
    }

    /**
     * Called when the control is rendered.
     */
    public onRender() {
        if (this._$addButtonContainer) {
            this._$addButtonContainer.focus();
        }
    }

    private _onRowSettingsSave(startTime: number) {
        var endTime = Date.now();
        var elapsedTime = endTime - startTime;

        var settings: IRowSettingChanges = this.getSettingsChanges();

        var ciData: IDictionaryStringTo<any> = {
            "IsRowNameChanged": settings.isRowNameChanged,
            "IsRowOrderChanged": settings.isRowOrderChanged,
            "TotalRowCount": settings.totalRowCount,
            "NewRowCount": settings.newRowCount,
            "DeletedRowCount": settings.deletedRowCount,
            "IsRowAdded": settings.isRowAdded,
            "IsRowDeleted": settings.isRowDeleted,
            "ElapsedTime": elapsedTime
        };
        Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_UPDATE_LANE_SETTINGS, ciData, true);
    }
}

/**
 * @interface 
 * Interface for column settings control options
 */
export interface IColumnSettingsControlOptions {
    /**
     * The team that where the tab is being loading on.
     */
    team: ITeam;
    /**
     * Board settings. Either board settings or boardIdentity must be provided.
     */
    boardSettings?: Boards.IBoardSettings;
    /**
     * Board name or board id. Either board settings or boardIdentity must be provided.
     */
    boardIdentity?: string;
    /**
     * The flag that drives whether or not to refresh the page on successful save.
     */
    requireRefreshOnSave?: boolean;
    /**
     * This is the callback after content has been saved and the dialog has been closed.  
     */
    applyChanges?: Function;
}

/**
 * @interface 
 * Interface for column setting changes used for telemetry.
 */
export interface IColumnSettingChanges {
    /// <summary>is column name changed?</summary>
    isColumnNameChanged: boolean;

    /// <summary>is WIP limit changed?</summary>
    isWIPLimitChanged: boolean;

    /// <summary>is split column checkbox state changed </summary>
    isSplitColumnStateChanged: boolean;

    /// <summary>is description changed</summary>
    isDescriptionChanged: boolean;

    /// <summary>is column state changed?</summary>
    isColumnStateChanged: boolean;

    /// <summary>is column order changed?</summary>
    isColumnOrderChanged: boolean;

    /// <summary>total number of columns</summary>
    totalColumnCount: number;

    /// <summary>how many new columns are added?</summary>
    newColumnCount: number;

    /// <summary>how many columns are deleted?</summary>
    deletedColumnCount: number;

    /// <summary>number of columns that have description set</summary>
    descriptionColumnCount: number;

    /// <summary>number of columns that are split</summary>
    splitColumnCount: number;

    /// <summary>average WIP limit for in progress column</summary>
    averageWipLimitInProgressColumn: number;

    /// <summary>is column deleted</summary>
    isColumnDeleted: boolean;

    /// <summary>is column added</summary>
    isColumnAdded: boolean;
}

/**
 * Column settings control.
 */
export class ColumnSettingsControl extends Configurations.TabContentBaseControl<IColumnSettingsControlOptions> {
    public static COLUMN_TAB_CONTENT_TEMPLATE = "column-settings-tab-content-template";
    private static DESCRIPTION_AREA_CONTAINER_CLASS = "column-settings-description-area-container";
    private static SECTIONS_AREA_CONTAINER_CLASS = "sections-area-container";
    private static MESSAGE_AREA_CONTAINER_CLASS = "column-settings-message-area-container";
    private static COLUMN_CONTROL_OVERLAY_CLASS = "column-settings-control-overlay";
    private static COLUMN_ADD_CONTAINER = "add-control";
    private static STATE_MAPPING_LABEL_PADDING = 5;
    private static COLUMN_SETTINGS_DESCIRPTION_ID = "columnSettingsDescription";

    public _tabStripControl: TabStripControl<ColumnTabCollectionViewModel>;
    private _canEdit: boolean;
    private _$controlOverlay: JQuery;
    private _messageArea: Notifications.MessageAreaControl;
    private _$addButtonContainer: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _columnTabCollectionViewModel: ColumnTabCollectionViewModel;
    private _originalSettings: Boards.IBoardColumn[];
    private _stateMappingLabelWidth: number;
    /**
     * The flag that drives whether or not to refresh the page on successful save.
     */
    private _requireRefreshOnSave: boolean;

    /**
     * This is the callback after content has been saved and the dialog has been closed.  
     */
    public applyChanges: Function;


    constructor(options?: IColumnSettingsControlOptions) {
        super($.extend(options, { cssClass: "column-settings-container" }));
        this.applyChanges = options.applyChanges;
    }

    /**
     * Initialize the control.
     */
    public initialize() {
        super.initialize();
        this._canEdit = this._options.boardSettings.canEdit;
        this._originalSettings = this._options.boardSettings.columns;
        this._requireRefreshOnSave = this._options.requireRefreshOnSave;

        var $element = this.getElement();
        var $textAreaContainer = $(domElem("div", ColumnSettingsControl.DESCRIPTION_AREA_CONTAINER_CLASS));
        var $sectionsAreaContainer = $(domElem("div", ColumnSettingsControl.SECTIONS_AREA_CONTAINER_CLASS));

        this._createMessageArea($textAreaContainer);
        this._createDescriptionTextArea($textAreaContainer);
        this._createAddButton($sectionsAreaContainer);

        $element.append($textAreaContainer);
        $element.append($sectionsAreaContainer);

        this._createTab($sectionsAreaContainer);

        if (!this._canEdit) {
            this.showWarning(AgileControlsResources.CustomizeColumnsNoPermissions);
        }
    }

    public getBoardSettings(boardIdentity: string): IPromise<any> {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        var workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        var teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: this._options.team.id
        };
        return workHttpClient.getBoard(teamContext, boardIdentity);
    }

    public beginLoad($container: JQuery): IPromise<any> {
        ///<summary>Method that renders the actual control, on called by the CSC framework. 
        ///<param name="$container" type="JQuery" optional="false">The DOM element, to which the control should be added</param>
        ///<returns type="IPromise">Resolve if render successfully, reject if failed.</returns>
        var deferred = Q.defer();

        var boardIdentity = this._options.boardIdentity;
        if (!boardIdentity) {
            deferred.reject("Either board setting or board name should be provided for board column setting control.");
        }

        var successCallback = (boardSettings: Boards.IBoardSettings) => {
            this.beginExecuteAction(() => {
                this._options.boardSettings = boardSettings;
                this.createIn($container);
                deferred.resolve(null);
            });
        };
        var errorCallback = (error: { message: string; serverError: any; }) => {
            this.beginExecuteAction(() => {
                deferred.reject(error);
            });
        };

        this.getBoardSettings(boardIdentity).then(successCallback, errorCallback);

        return deferred.promise;
    }

    /**
     * Dispose the control.
     */
    public dispose() {
        if (this._messageArea) {
            this._messageArea.dispose();
        }

        if (this._tabStripControl) {
            this._tabStripControl.dispose();
            this._tabStripControl = null;
        }

        if (this._columnTabCollectionViewModel) {
            this._columnTabCollectionViewModel.dispose();
            this._columnTabCollectionViewModel = null;
        }

        super.dispose();
    }

    /**
     * Create tab control.
     */
    private _createTab($container: JQuery) {

        var clonedColumns = JSON.parse(JSON.stringify(this._options.boardSettings.columns));
        var clonedAllowedMappings = $.extend(true, {}, this._options.boardSettings.allowedMappings);

        var columnTabCollectionViewModel = new ColumnTabCollectionViewModel(clonedColumns, clonedAllowedMappings);
        this._columnTabCollectionViewModel = columnTabCollectionViewModel;
        var options: ITabStripControlOptions<ColumnTabCollectionViewModel> = {
            align: TabStripControl.HORIZONTAL_ALIGN,
            contentTemplateClassName: ColumnSettingsControl.COLUMN_TAB_CONTENT_TEMPLATE,
            canEdit: this._canEdit,
            tabCollection: columnTabCollectionViewModel,
            onTabSelected: this._alignStateMappingLabels,
            onDirtyStateChanged: () => {
                this.fireDirtyFlagChange(this.isDirty());
            },
            onValidStateChanged: () => {
                this.fireValidFlagChange(this.isValid());
            }
        };

        this._tabStripControl = <TabStripControl<ColumnTabCollectionViewModel>>Controls.Control.create(TabStripControl, $container, options);
    }

    /**
     * On tab activated, we need to re-bind the customized handler.
     */
    public onTabActivated(isInit: boolean) {
        if (!isInit) {
            this._tabStripControl.bindCustomHandlers();
        }
    }

    private _createMessageArea($container: JQuery) {
        var $messageAreaContainer = $(domElem("h2", ColumnSettingsControl.MESSAGE_AREA_CONTAINER_CLASS));
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
        var $columnMainHeader = $(domElem("h2", "main-header"));
        var $dataIsland = $(".board-page-title-area");
        if ($dataIsland.length > 0) {
            $dataIsland.eq(0).html().trim();
        }
        $columnMainHeader.text(AgileControlsResources.Column_Settings_Main_Header);

        var $columnDescription = $(domElem("div", "main-description"));
        $columnDescription.text(AgileControlsResources.Column_Settings_Description);
        $columnDescription.attr("id", ColumnSettingsControl.COLUMN_SETTINGS_DESCIRPTION_ID);

        $container.append($columnMainHeader)
            .append($columnDescription);
    }

    private _createAddButton($container: JQuery) {
        this._$addButtonContainer = $(domElem("div", ColumnSettingsControl.COLUMN_ADD_CONTAINER))
            .attr({
                "aria-label": AgileControlsResources.Column_Settings_Add_Button_Label,
                "role": "button",
                "tabindex": "0",
                "aria-describedby": ColumnSettingsControl.COLUMN_SETTINGS_DESCIRPTION_ID
            })
            .click((e?: JQueryEventObject) => {
                this._addButtonClickHandler();
            })
            .keydown((e?: JQueryEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
                    this._addButtonClickHandler();
                }
            });

        var $addIconSpan = $("<span>").addClass("add-control-icon");
        var $addIcon = $("<i>").addClass("icon bowtie-icon bowtie-math-plus");
        $addIconSpan.append($addIcon);
        var $addIconText = $("<div>").addClass("control-text").text(AgileControlsResources.Column_Settings_Add_Button);
        if (!this._canEdit) {
            $addIcon.addClass("bowtie-math-plus-gray");
            this._$addButtonContainer.attr("aria-disabled", "true");
            this._$addButtonContainer.addClass("disable");
        }

        this._$addButtonContainer.append($addIconSpan).append($addIconText);
        $container.append(this._$addButtonContainer);
    }

    private _addButtonClickHandler() {
        if (this._canEdit) {
            var activeTabIndex = this._columnTabCollectionViewModel.getActiveTabIndex();
            if (activeTabIndex === 0) {
                ++activeTabIndex;
            }
            this._tabStripControl.insertTab(activeTabIndex);
        }
    }

    /**
     * @return Array of board columns.
     */
    public getColumns(): Work_Contracts.BoardColumn[] {
        var boardColumns: Work_Contracts.BoardColumn[] = $.map(this._columnTabCollectionViewModel.tabs(), (tab: ColumnTabViewModel, index: number) => {
            return <any>{
                id: tab.id,
                name: tab.name(),
                itemLimit: tab.itemLimit(),
                stateMappings: tab.getStateMappings(),
                isSplit: tab.isSplit(),
                description: tab.description(),
                columnType: tab.columnType()
            };
        });

        return boardColumns;
    }

    /**
     * Gets the tab settings changes
     * @returns An object with the setting changes.
     */
    public getSettingsChanges(): IColumnSettingChanges {
        var oldSettings = this._originalSettings;
        var newSettings = this.getColumns();

        var changes: IColumnSettingChanges = {
            isColumnNameChanged: false,
            isWIPLimitChanged: false,
            isSplitColumnStateChanged: false,
            isDescriptionChanged: false,
            isColumnStateChanged: false,
            isColumnOrderChanged: false,
            totalColumnCount: newSettings.length,
            newColumnCount: 0,
            deletedColumnCount: 0,
            descriptionColumnCount: 0,
            splitColumnCount: 0,
            averageWipLimitInProgressColumn: 0,
            isColumnAdded: false,
            isColumnDeleted: false
        };

        var deletedColumnCount = 0;
        var addedColumnCount = 0;
        var splitColumnCount = 0;
        var descriptionColumnCount = 0;
        var sumWipLimitForInProgress = 0;
        var inProgressColumnCount = 0;

        $.each(newSettings, (index, column: Work_Contracts.BoardColumn) => {
            if (column.id == null) {
                ++addedColumnCount;
            }

            if (column.isSplit) {
                ++splitColumnCount;
            }

            if (column.description) {
                ++descriptionColumnCount;
            }

            if (column.columnType === Work_Contracts.BoardColumnType.InProgress) {
                sumWipLimitForInProgress += column.itemLimit;
                ++inProgressColumnCount;
            }
        });

        $.each(oldSettings, (index: number, oldColumn: Work_Contracts.BoardColumn) => {
            var columnFound: boolean = false;
            $.each(newSettings, (index: number, newColumn: Work_Contracts.BoardColumn) => {
                if (oldColumn.id === newColumn.id) {
                    columnFound = true;
                    if (Utils_String.ignoreCaseComparer(oldColumn.name, newColumn.name) !== 0) {
                        changes.isColumnNameChanged = true;
                    }
                    if (oldColumn.itemLimit !== newColumn.itemLimit) {
                        changes.isWIPLimitChanged = true;
                    }

                    if (oldColumn.isSplit !== newColumn.isSplit) {
                        changes.isSplitColumnStateChanged = true;
                    }

                    if (Utils_String.localeIgnoreCaseComparer(oldColumn.description, newColumn.description) !== 0) {
                        changes.isDescriptionChanged = true;
                    }

                    if (oldColumn.stateMappings && newColumn.stateMappings) {
                        $.each(oldColumn.stateMappings, function (index, stateName) {
                            if (Utils_String.ignoreCaseComparer(stateName, newColumn.stateMappings[index]) !== 0) {
                                changes.isColumnStateChanged = true;
                                return false;
                            }
                        });
                    }
                    return false;
                }
            });
            if (!columnFound) {
                deletedColumnCount++;
            }
        });

        changes.newColumnCount = addedColumnCount;
        changes.isColumnAdded = (addedColumnCount > 0);
        changes.deletedColumnCount = deletedColumnCount;
        changes.isColumnDeleted = (deletedColumnCount > 0);
        changes.descriptionColumnCount = descriptionColumnCount;
        changes.splitColumnCount = splitColumnCount;
        changes.averageWipLimitInProgressColumn = inProgressColumnCount > 0 ? Math.round(sumWipLimitForInProgress / inProgressColumnCount) : 0;

        // detect column order change. note that if a column was deleted, that is considered as order change 
        var inProgressColumnIndex = 0;
        $.each(newSettings, (index: number, column: Work_Contracts.BoardColumn) => {
            // in-progress column that is not new
            if (column.id !== null && column.columnType === Work_Contracts.BoardColumnType.InProgress) {
                ++inProgressColumnIndex;
                if (oldSettings[inProgressColumnIndex].id !== column.id) {
                    changes.isColumnOrderChanged = true;
                    return false;
                }
            }
        });

        return changes;
    }

    /**
     * Shows an overlay over the entire control with a status indicator on top.
     * @param text The text to display next to the spinner.
     * @param options Optional options for the StatusIndicator control.
     */
    public showOverlay(text: string, options?: any) {
        if (!this._$controlOverlay) {
            this._$controlOverlay = $(domElem("div", "control-busy-overlay " + ColumnSettingsControl.COLUMN_CONTROL_OVERLAY_CLASS))
                .appendTo(this.getElement());
        }

        var statusOptions = options ||
            {
                center: true,
                imageClass: "big-status-progress",
                message: text,
                throttleMinTime: 0
            };
        this._statusIndicator = Controls.Control.create(StatusIndicator.StatusIndicator, this._$controlOverlay, statusOptions);
        this._statusIndicator.start();

        this._$controlOverlay.show();
    }

    /**
     * Hides the overlay.
     */
    public hideOverlay() {
        if (this._$controlOverlay) {
            Diag.Debug.assertIsNotNull(this._statusIndicator, "this._statusIndicator");
            this._statusIndicator.complete();
            this._$controlOverlay.hide();
            this._$controlOverlay.empty();
        }
    }

    /**
     * Sets the error message in the message area control.
     */
    public showError(message: string) {
        this._messageArea.setError(message);
    }

    /**
      * Sets the warning message in the message area control.
      */
    public showWarning(message: string) {
        this._messageArea.setMessage(message, Notifications.MessageAreaType.Warning);
    }

    /**
     * Return isValid state.
     */
    public isValid(): boolean {
        return this._tabStripControl && this._tabStripControl.isValid();
    }

    /**
     * Return isDirty state.
     */
    public isDirty(): boolean {
        return this._tabStripControl && this._tabStripControl.isDirty();
    }

    public beginSave(): IPromise<boolean> {
        if (this.isValid()) {
            var deferred = Q.defer<boolean>();
            var startTime: number = Date.now();
            var boardColumns = this.getColumns();
            var successCallback = (value: Work_Contracts.BoardColumn[]) => {
                this.beginExecuteAction(() => {
                    this._onColumnSettingsSave(startTime);
                    // reset the view model after save.
                    this._columnTabCollectionViewModel.reset(value);
                    this._originalSettings = value;
                    this._tabStripControl.rebind();
                    deferred.resolve(this._requireRefreshOnSave);
                });
            };
            var errorCallback = (error: { message: string; serverError: any; }) => {
                this.beginExecuteAction(() => {
                    deferred.reject(error);
                });
            }

            new Boards.BoardSettingsManager().beginUpdateColumns(boardColumns, this._options.boardSettings.id).then(successCallback, errorCallback);
            return deferred.promise;
        }
    }

    /**
     * Called when the control is getting resized.
     */
    public onResize() {
        if (this._tabStripControl) {
            this._tabStripControl.setTabContentHeight();
        }
    }

    /**
     * Called when the control is rendered.
     */
    public onRender() {
        this._alignStateMappingLabels();
        if (this._$addButtonContainer) {
            this._$addButtonContainer.focus();
        }
    }

    /**
     * Align item labels according to the longest.
     */
    private _alignStateMappingLabels() {
        var stateMappingLabels = $(".column-state-label");
        if (this._stateMappingLabelWidth) {
            stateMappingLabels.outerWidth(this._stateMappingLabelWidth);
        }
        else if (stateMappingLabels.is(":visible")) {
            var max = 0;
            stateMappingLabels.each((index: number, elem: Element) => {
                if ($(elem).outerWidth() > max) {
                    max = $(elem).outerWidth();
                }
            });
            stateMappingLabels.outerWidth(max + ColumnSettingsControl.STATE_MAPPING_LABEL_PADDING);
            this._stateMappingLabelWidth = max + ColumnSettingsControl.STATE_MAPPING_LABEL_PADDING;
        }
    }

    private _onColumnSettingsSave(startTime: number) {
        var endTime = Date.now();
        var elapsedTime = endTime - startTime;
        var settings: IColumnSettingChanges = this.getSettingsChanges();
        var ciData: IDictionaryStringTo<any> = {
            "IsWIPLimitChanged": settings.isWIPLimitChanged,
            "IsColumnNameChanged": settings.isColumnNameChanged,
            "IsSplitColumnStateChanged": settings.isSplitColumnStateChanged,
            "IsDescriptionChanged": settings.isDescriptionChanged,
            "IsColumnStateChanged": settings.isColumnStateChanged,
            "IsColumnOrderChanged": settings.isColumnOrderChanged,
            "AddedColumnCount": settings.newColumnCount,
            "DeletedColumnCount": settings.deletedColumnCount,
            "TotalColumnCount": settings.totalColumnCount,
            "DescriptionColumnCount": settings.descriptionColumnCount,
            "SplitColumnCount": settings.splitColumnCount,
            "AverageWipLimitInProgressColumn": settings.averageWipLimitInProgressColumn,
            "ElapsedTime": elapsedTime,
            "IsColumnDeleted": settings.isColumnDeleted,
            "IsColumnAdded": settings.isColumnAdded
        };
        Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_UPDATE_COLUMN_SETTINGS, ciData, true);
    }
}

export interface IFieldSettingsControlOptions {

    /** The team that where the tab is being loading on */
    teamId: string;

    /** A dictionary of the current cardSettings for various workitemtypes on the board */
    boardCardSettings?: IDictionaryStringTo<Cards.ICardFieldSetting[]>;

    /** For each work item type, list of additional core fields to be shown */
    additionalCoreFields: IDictionaryStringTo<string[]>;

    /** Whether the settings are editable */
    isEditable: boolean;

    /** Type of the board (Kanban or Taskboard) */
    boardType: string;

    /** Save handler */
    saveDelegate?: (cardSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]>, successCallBack: IResultCallback, errorCallback: IErrorCallback) => any;

    /** Work Item type Name which is default for current board */
    defaultWorkItemTypeName?: string;

    /** Whether the page has to refresh after save is successful */
    refreshOnSave?: boolean;

    /** Delegate to be called after save is successful */
    applyChanges?: Function;

    /** Board Id */
    boardIdentity?: string;
}

/**
 * Tab content control for board card ordering.
 */
export class CardReorderingTabContent extends Configurations.TabContentBaseControl<IBoardSettingTabOptions> {
    private static KO_CONTENT_TEMPLATE = "board_options_card_reordering";

    private _boardId: string;
    private _initialValue: boolean;
    private _preserveBacklogOrder: KnockoutObservable<boolean>;
    private _$templateContainer: JQuery;
    private _messageArea: Notifications.MessageAreaControl;

    /** Initialize the control */
    public initialize() {
        super.initialize();

        let $element = this.getElement();
        this._createMessageArea($element);
        this._$templateContainer = loadHtmlTemplate(CardReorderingTabContent.KO_CONTENT_TEMPLATE);
        $element.append(this._$templateContainer);

        this._initialValue = !!this._options.boardSettings.preserveBacklogOrder;
        this._preserveBacklogOrder = ko.observable(this._initialValue);
        this._boardId = this._options.boardSettings.id;

        let viewModel = {
            canEdit: this._options.boardSettings.canEdit,
            preserveBacklogOrder: this._preserveBacklogOrder,
            preserveBacklogOrderBinding: ko.computed({
                read: () => {
                    return this._preserveBacklogOrder().toString();
                },
                write: (value: string) => {
                    this._preserveBacklogOrder(value === "true");
                    this.fireDirtyFlagChange(this._preserveBacklogOrder() !== this._initialValue);
                }
            }),
            toggle: (itemVM: any, event: JQueryEventObject) => {
                let $img = $(event.target);
                itemVM.swapSrc($img); // Toggle the src between image and gif
            },
            onFocus: (itemVM: any, event: JQueryEventObject) => {
                const $input = $(event.target);
                const $img = $input.parent().find("img.card-reordering-image:visible");
                if (!$img.hasClass("show-gif")) { // Do nothing if the gif is already visible
                    itemVM.swapSrc($img);
                }
            },
            onBlur: (itemVM: any, event: JQueryEventObject) => {
                const $input = $(event.target);
                const $img = $input.parent().find("img.card-reordering-image:visible");
                if ($img.hasClass("show-gif")) { // Replace the gif with picture if the gif already visible
                    itemVM.swapSrc($img);
                }
            },
            swapSrc: ($img: JQuery, showGif?: boolean) => {
                const src = $img.attr("src");
                const alt = $img.attr("data-alt");
                $img.attr("src", alt).attr("data-alt", src);
                $img.toggleClass("show-gif");
            }
        };

        ko.applyBindings(viewModel, this._$templateContainer[0]);

        if (!viewModel.canEdit) {
            this._messageArea.setMessage(AgileControlsResources.Board_Card_Ordering_NoPermissions, Notifications.MessageAreaType.Warning);
        }
    }

    /**
     * Save the card ordering to the server
     * @returns promise<bool> - requires page refresh to apply changes.
     */
    public beginSave(): IPromise<boolean> {
        var deferred = Q.defer<boolean>();

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        var workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        var teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: this._options.team.id
        };

        var value = this._preserveBacklogOrder();
        var data: IDictionaryStringTo<string> = {};
        data["cardReordering"] = value ? "1" : "0";
        workHttpClient.setBoardOptions(data, teamContext, this._boardId)
            .then(
                () => {
                    this._initialValue = value;
                    this.fireDirtyFlagChange(false);
                    deferred.resolve(true);
                },
                (error: {
                    message: string;
                    serverError: any;
                }) => {
                    deferred.reject(error);
                });

        return deferred.promise;
    }

    private _createMessageArea($container: JQuery) {
        var $messageAreaContainer = $("<div>");
        var messageAreaOption: Notifications.IMessageAreaControlOptions = {
            closeable: false,
            showIcon: true,
            type: Notifications.MessageAreaType.Warning
        };
        this._messageArea = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, messageAreaOption);
        $container.append($messageAreaContainer);
    }

    public dispose() {
        if (this._$templateContainer) {
            ko.removeNode(this._$templateContainer[0]);
            this._$templateContainer = null;
        }
        if (this._messageArea) {
            this._messageArea.dispose();
        }
        super.dispose();
    }
}

/**
 * Card Field Settings control.
 */
export class FieldSettingsControl extends Configurations.TabContentBaseControl<IFieldSettingsControlOptions> {
    public static FIELD_TAB_CONTENT_TEMPLATE = "field-settings-tab-content-template";

    private static CONTAINER_CLASS = "field-settings-container";
    private static OVERLAY_CLASS = "field-settings-overlay";
    private static DESCRIPTION_AREA_CONTAINER_CLASS = "description-area-container";
    private static SECTIONS_AREA_CONTAINER_CLASS = "sections-area-container";
    private static MESSAGE_AREA_CONTAINER_CLASS = "field-settings-message-area-container";

    public _tabStripControl: TabStripControl<FieldTabCollectionViewModel>;
    protected _fieldTabViewModelOptions: IFieldTabViewModelOptions[] = [];
    private _canEdit: boolean;
    private _messageArea: Notifications.MessageAreaControl;
    private _fieldTabCollectionViewModel: FieldTabCollectionViewModel;
    private _$controlOverlay: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _workItemTypeMap: IDictionaryStringTo<WITOM.WorkItemType>;
    private _boardCardSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]>;
    /**
     * The flag that drives whether or not to refresh the page on successful save.
     */
    private _requireRefreshOnSave: boolean;

    /**
     * This is the callback after content has been saved and the dialog has been closed.  
     */
    public applyChanges: Function;

    constructor(options?: IFieldSettingsControlOptions) {
        super($.extend(options, { cssClass: FieldSettingsControl.CONTAINER_CLASS }));
        this.applyChanges = options.applyChanges;
        this._bindComboControl();
        this._bindSortable();
        this._bindIconControl();
        this._requireRefreshOnSave = options.refreshOnSave ? options.refreshOnSave : false;
    }

    /**
     * Initialize the control.
     */
    public initialize() {
        super.initialize();
        this._canEdit = this._options.isEditable;

        var $element = this.getElement();
        var $textAreaContainer = $(domElem("div", FieldSettingsControl.DESCRIPTION_AREA_CONTAINER_CLASS));

        this._createMessageArea($textAreaContainer);
        this._createDescriptionTextArea($textAreaContainer);

        $element.append($textAreaContainer);

        this.showOverlay(AgileControlsResources.CardFieldOptionsLoading);

        if (!this._options.boardCardSettings) {
            var successCallback = (result: Cards.IBoardCardSettings) => {
                this.beginExecuteAction(() => {
                    this.hideOverlay();
                    this._boardCardSettings = result.cards;
                    this._initializeInternal();
                });
            };
            var errorCallback: IErrorCallback = (error: { message: string; serverError: any; }) => {
                this.beginExecuteAction(() => {
                    this.hideOverlay();
                    this.showError(error.message);
                });
            };

            if (this._options.boardType === AgileUtils.BoardType.Taskboard) {
                this._beginGetBoardCardSettingsForTaskBoard(successCallback, errorCallback);
            } else {
                var boardIdentity = this._options.boardIdentity;
                this._beginGetBoardCardSettingsForKanban(boardIdentity).then(successCallback, errorCallback)
            }
        }
        else {
            this._boardCardSettings = this._options.boardCardSettings;
            this._initializeInternal();
        }
    }

    protected _initializeInternal() {
        if (this.isDisposed()) {
            return; // Control may have been disposed while a xhr is in progress
        }

        var $element = this.getElement();
        var $sectionsAreaContainer = $(domElem("div", FieldSettingsControl.SECTIONS_AREA_CONTAINER_CLASS));
        $element.append($sectionsAreaContainer);

        // Extract wit names
        var witNames = $.map(this._boardCardSettings, (value: Cards.ICardFieldSetting[], key: string) => {
            return key;
        });

        this.showOverlay(AgileControlsResources.CardFieldOptionsLoading);

        //filter hidden witnames
        AgileUtils.WorkItemCategoriesUtils.removeHiddenWorkItemTypeNames(witNames).then((visibleWitNames: string[]) => {

            var visibleWitsBoardCardSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]> = {};

            $.each(this._boardCardSettings, (key: string, value: Cards.ICardFieldSetting[]) => {
                if (Utils_Array.contains(visibleWitNames, key, Utils_String.localeIgnoreCaseComparer)) {
                    visibleWitsBoardCardSettings[key] = value;
                }
            });

            var successCallback = (workItemTypeMap: IDictionaryStringTo<WITOM.WorkItemType>) => {
                this.beginExecuteAction(() => {
                    this.hideOverlay();
                    this._fieldTabViewModelOptions = this._getFieldTabViewModelOptions(visibleWitsBoardCardSettings, workItemTypeMap);
                    this._workItemTypeMap = workItemTypeMap;
                    this._createTab($sectionsAreaContainer);
                });
            };
            var errorCallback = (error: TfsError) => {
                this.beginExecuteAction(() => {
                    this.hideOverlay();
                    this.showError(error.message);
                });
            };

            AgileUtils.WorkItemUtils.beginGetWorkItemTypeMap(visibleWitNames, successCallback, errorCallback);
        });

        if (!this._canEdit) {
            this.showWarning(AgileControlsResources.CardCustomizationsNoPermissions);
        }
    }

    public beginLoad($container: JQuery): IPromise<any> {
        ///<summary>Method that renders the actual control, on called by the CSC framework. 
        ///<param name="$container" type="JQuery" optional="false">The DOM element, to which the control should be added</param>
        ///<returns type="IPromise">Resolve if render successfully, reject if failed.</returns>
        this.createIn($container);
        return Q.resolve(null);
    }

    /**
     * Dispose the control.
     */
    public dispose() {
        if (this._messageArea) {
            this._messageArea.dispose();
        }

        if (this._tabStripControl) {

            if ($(".work-item-icon").length > 0) {
                $(".work-item-icon").each((i, element) => { ko.removeNode(element); });
            }

            this._tabStripControl.dispose();
            this._tabStripControl = null;
        }

        if (this._fieldTabCollectionViewModel) {
            this._fieldTabCollectionViewModel.dispose();
            this._fieldTabCollectionViewModel = null;
        }

        delete ko.bindingHandlers["combo"];
        delete ko.bindingHandlers["additionalFieldsSortable"];
        delete ko.bindingHandlers["handleFocus"];
        delete ko.bindingHandlers["icon"];

        super.dispose();
    }

    private _beginGetBoardCardSettingsForTaskBoard(successCallBack: IResultCallback, errorCallBack: IErrorCallback) {
        const apiLocation = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(
            "getboardcardsettings", /* Action */
            "backlog", /* Controller */
            {
                area: "api",
                teamId: this._options.teamId
            }
        );

        Ajax.getMSJSON(apiLocation, null, (result) => {
            successCallBack(result);
        },
            (error) => {
                errorCallBack(error);
            });
    }

    private _beginGetBoardCardSettingsForKanban(boardIdentity: string): IPromise<any> {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        var workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        var teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: this._options.teamId
        };
        return workHttpClient.getBoardCardSettings(teamContext, boardIdentity);
    }

    private _bindSortable() {
        if (this._options.isEditable) {
            (<any>ko.bindingHandlers).additionalFieldsSortable = {
                init: (element, valueAccessor) => {
                    var additionalFieldVMs: KnockoutObservableArray<AdditionalFieldComboViewModel> = valueAccessor();
                    var movedToNewPosition = false;
                    $(element).sortable({
                        items: ".additional-field",
                        handle: ".gripper",
                        containment: "parent",
                        scroll: true,
                        axis: "y",
                        tolerance: "pointer",
                        distance: 5,
                        update: (event, ui) => {
                            Diag.Debug.assert(ui.item.length === 1, "In reorder scenario, we should only find one and only one match for the ui item being reordered");
                            movedToNewPosition = true;
                            // get old and new position.
                            const oldIndex = ui.item.data("initial-index");
                            const newIndex = ui.item.index();

                            // Move from old index to new index.
                            // Shifting the rules manually (without using the splice's method) does not work well with ko)
                            additionalFieldVMs.splice(newIndex, 0, additionalFieldVMs.splice(oldIndex, 1)[0]);

                            // Because we removed the view model from the list of view model (to insert
                            // it a different place in the same array), the corresponding UI element is constructed 
                            // again.Remove the original UI element
                            ko.removeNode(ui.item[0]);
                        },
                        revert: 5,
                        opacity: 0.5,
                        cursor: "move",
                        start: (event: JQueryEventObject, uiElement: any) => {
                            //store the inital position
                            uiElement.item.data("initial-index", uiElement.item.index());
                        },
                        stop: (event: JQueryEventObject, uiElement: any) => {
                            // Using ko and jquery sortable together can lead to binding issues in ko which then causes 
                            // some additional fields are getting disappeared while performing reorder. For more info refer bug 360393
                            // As a workaround, refresh the ko bindings (remove and add back the view model from the observable array)

                            if (!movedToNewPosition) {
                                var oldIndex = uiElement.item.data("initial-index");
                                var removedItem = additionalFieldVMs.remove(additionalFieldVMs()[oldIndex]);
                                additionalFieldVMs().splice(oldIndex, 0, removedItem[0]);
                                additionalFieldVMs.valueHasMutated();
                                ko.removeNode(uiElement.item[0]);
                            }

                            movedToNewPosition = false;
                        }
                    }).keydown((e?: JQueryEventObject) => {
                        if (e && e.target && (e.keyCode === Utils_UI.KeyCode.DOWN || e.keyCode === Utils_UI.KeyCode.UP) && (e.ctrlKey || e.metaKey)) {
                            const $item = $(e.target);
                            const $parentContainer = $item.closest(".additional-fields-section");
                            const currentIndex = $item.index();
                            const context = ko.contextFor(e.target);
                            if (context && context.$parent) {
                                const fieldTabVM = <FieldTabViewModel>context.$parent;
                                let additionalFieldsVM = fieldTabVM.additionalFields;
                                let newIndex = currentIndex;
                                if (e.keyCode === Utils_UI.KeyCode.DOWN) {
                                    // Ctrl+Down => Shift the row down
                                    newIndex++;
                                }
                                else {
                                    // Ctrl+Up => Shift the row up
                                    newIndex--;
                                }
                                // Check if reordering is required
                                if (newIndex !== currentIndex && newIndex >= 0 && newIndex < additionalFieldsVM().length) {
                                    // Reorder by removing and adding it again at the right index
                                    additionalFieldsVM.splice(newIndex, 0, additionalFieldsVM.splice(currentIndex, 1)[0]);
                                    ko.removeNode(e.target);
                                    // Focus the replaced element
                                    $parentContainer.children(".additional-field").eq(newIndex).focus();
                                }
                            }
                        }
                    });
                }
            };
        }
    }

    private _bindComboControl() {
        (<any>ko.bindingHandlers).combo = {
            init: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                var comboContainerClass: string = allBindings().comboContainer;
                var comboOptions = allBindings().comboOptions;
                var existingChangeHandler: Function = comboOptions.change ? comboOptions.change : $.noop;
                var existingFocusHandler: Function = comboOptions.focus ? comboOptions.focus : $.noop;
                var existingBlurHandler: Function = comboOptions.blur ? comboOptions.blur : $.noop;

                var newComboOptions =
                    $.extend({}, comboOptions, {
                        change: (combo: Combos.Combo) => {
                            existingChangeHandler(combo.getElement().val(), valueAccessor());
                        },
                        value: comboOptions.value || valueAccessor().displayName(),
                        blur: () => {
                            existingBlurHandler(valueAccessor());
                        },
                        focus: () => {
                            existingFocusHandler(valueAccessor());
                        }
                    });
                //initialize combo control with provided options
                Controls.BaseControl.create(Combos.Combo, $(element).find(comboContainerClass), newComboOptions);
                // bring the focus onto newly added combo field
                if (valueAccessor().displayName && valueAccessor().displayName() === "" && valueAccessor().hasError() === false) { //It should be a newly added field and not a field that has been just reordered
                    $(element).find("input").focus();
                }
            },
            update: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                //add the invalid class on the combo when the input is not valid so that combo box shows the right background color
                var $combo = $(element).find(".combo");
                if (valueAccessor().hasError && valueAccessor().hasError()) {
                    $combo.addClass("invalid");
                }
                else {
                    $combo.removeClass("invalid");
                }
            }
        };
    }

    private _bindIconControl() {
        (<any>ko.bindingHandlers).icon = {
            init: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                const input = allBindings().icon as { project: string, type: string, containerSelector: string };
                const $container = $(element).find(input.containerSelector);
                if (input.type && input.project) {
                    WorkItemTypeIconControl.renderWorkItemTypeIcon(
                        $container[0],
                        input.type,
                        input.project);
                }

                ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
                    WorkItemTypeIconControl.unmountWorkItemTypeIcon($container[0]);
                });
            }
        };
    }

    /**
     * Create tab control.
     */
    protected _createTab($container: JQuery) {
        var fieldTabCollectionViewModel = new FieldTabCollectionViewModel(this._fieldTabViewModelOptions);
        this._fieldTabCollectionViewModel = fieldTabCollectionViewModel;
        var options = {
            align: TabStripControl.HORIZONTAL_ALIGN,
            contentTemplateClassName: FieldSettingsControl.FIELD_TAB_CONTENT_TEMPLATE,
            canEdit: this._canEdit,
            tabCollection: fieldTabCollectionViewModel,
            cssClass: "cardfields-settings-tabstrip",
            onDirtyStateChanged: () => {
                this.fireDirtyFlagChange(this.isDirty());
            },
            onValidStateChanged: () => {
                this.fireValidFlagChange(this.isValid());
            }
        } as ITabStripControlOptions<FieldTabCollectionViewModel>;

        this._tabStripControl = <TabStripControl<FieldTabCollectionViewModel>>Controls.Control.create(TabStripControl, $("<div>"), options);
        $container.append(this._tabStripControl.getElement());
        this._tabStripControl.setTabContentHeight();
    }

    private _createMessageArea($container: JQuery) {
        var $messageAreaContainer = $(domElem("div", FieldSettingsControl.MESSAGE_AREA_CONTAINER_CLASS));
        var messageAreaOption: Notifications.IMessageAreaControlOptions = {
            closeable: false,
            showIcon: true,
            type: Notifications.MessageAreaType.Warning
        };
        this._messageArea = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, messageAreaOption);
        $container.append($messageAreaContainer);
    }


    private _createDescriptionTextArea($container: JQuery) {
        var $cardFieldsMainHeader = $(domElem("h2", "main-header"));
        $cardFieldsMainHeader.text(AgileControlsResources.CardFields_Settings_MainHeader);

        var $cardFieldsDescription = $(domElem("div", "main-description"));
        $cardFieldsDescription.text(AgileControlsResources.CardFields_Settings_MainHeader_Description);

        $container.append($cardFieldsMainHeader)
            .append($cardFieldsDescription);
    }

    private _getFieldTabViewModelOptions(boardCardFieldSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]>, workItemTypeMap: IDictionaryStringTo<WITOM.WorkItemType>) {
        var fieldTabViewModelOptions: IFieldTabViewModelOptions[] = [];

        $.each(boardCardFieldSettings, (index: string, value: Cards.ICardFieldSetting[]) => {
            let key = AgileUtils.WorkItemUtils.getKeyFromWorkItemTypeName(index);
            var option: IFieldTabViewModelOptions = {
                name: workItemTypeMap[key].name,
                fieldSettings: value,
                id: index,
                fieldDefinitions: workItemTypeMap[key].fieldMap,
                additionalCoreFields: this._options.additionalCoreFields[index],
                boardType: this._options.boardType,
                canEdit: this._canEdit

            };
            // place the default work item as the first tab
            if (Utils_String.equals(this._options.defaultWorkItemTypeName, index, true)) {
                fieldTabViewModelOptions.splice(0, 0, option);
            }
            else {
                fieldTabViewModelOptions.push(option);
            }
        });

        return fieldTabViewModelOptions;
    }

    private _beginSaveSettingsForTaskBoard(cardFieldSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]>, successCallBack: IResultCallback, errorCallBack: IErrorCallback) {
        const apiLocation = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(
            "setboardcardsettings", /* Action */
            "backlog", /* Controller */
            {
                area: "api",
                teamId: this._options.teamId
            }
        );

        const cardSettings: Cards.IBoardCardSettings = {
            scope: AgileUtils.BoardType.Taskboard,
            scopeId: this._options.teamId,
            cards: cardFieldSettings,
            styles: null
        };

        Ajax.postMSJSON(apiLocation,
            {
                data: Utils_Core.stringifyMSJSON(cardSettings)
            },
            (result) => {
                successCallBack(result);
            },
            errorCallBack);
    }

    private _beginSaveSettingsForKanban(cardFieldSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]>, successCallBack: IResultCallback, errorCallBack: IErrorCallback) {
        // success
        var successHandler = (result) => {
            successCallBack(result);
        };

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        var workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        var teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: this._options.teamId
        };

        workHttpClient.updateBoardCardSettings(this._convertCardFieldSettingsToRestDefinition(cardFieldSettings), teamContext, this._options.boardIdentity)
            .then(successHandler, errorCallBack);
    }

    private _convertCardFieldSettingsToRestDefinition(cardFieldSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]>): Cards.BoardCardSettings {
        var newSettings: Cards.BoardCardSettings = new Cards.BoardCardSettings();
        if (cardFieldSettings) {
            for (var key in cardFieldSettings) {
                if (cardFieldSettings.hasOwnProperty(key)) {
                    var fields: Work_Contracts.FieldSetting[] = [];
                    for (var i = 0; i < cardFieldSettings[key].length; i++) {
                        fields.push(cardFieldSettings[key][i]);
                    }
                    newSettings.addVal(key, fields);
                }
            }
        }
        return newSettings;
    }

    /**
     * @return currently configured card field settings for work item types on the board
     */
    public getCardSettings(): IDictionaryStringTo<Cards.ICardFieldSetting[]> {

        var cardSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]> = {};
        $.map(this._fieldTabCollectionViewModel.tabs(), (tab: FieldTabViewModel, index: number) => {
            cardSettings[tab.name()] = tab.getCardSettings();
        });
        return cardSettings;
    }

    /**
     * Shows an overlay over the entire control with a status indicator on top.
     * @param text The text to display next to the spinner.
     * @param options Optional options for the StatusIndicator control.
     */
    public showOverlay(text: string, options?: any) {
        if (!this._$controlOverlay) {
            this._$controlOverlay = $(domElem("div", "control-busy-overlay " + FieldSettingsControl.OVERLAY_CLASS))
                .appendTo(this.getElement());
        }

        var statusOptions = options ||
            {
                center: true,
                imageClass: "big-status-progress",
                message: text,
                throttleMinTime: 0
            };
        this._statusIndicator = Controls.Control.create(StatusIndicator.StatusIndicator, this._$controlOverlay, statusOptions);
        this._statusIndicator.start();

        this._$controlOverlay.show();
    }

    /**
     * Hides the overlay.
     */
    public hideOverlay() {
        if (this._$controlOverlay) {
            Diag.Debug.assertIsNotNull(this._statusIndicator, "this._statusIndicator");
            this._statusIndicator.complete();
            this._$controlOverlay.hide();
            this._$controlOverlay.empty();
        }
    }

    /**
     * Sets the error message in the message area control.
     */
    public showError(message: string) {
        this._messageArea.setError(message);
    }

    /**
      * Sets the warning message in the message area control.
      */
    public showWarning(message: string) {
        this._messageArea.setMessage(message, Notifications.MessageAreaType.Warning);
    }

    /**
     * Return isValid state.
     */
    public isValid(): boolean {
        // Fix for Bug 887664: Error on Settings Dialog, but no error reason and does not block close/Save
        // _tabStripControl is initialized lazily, so even when the control has still not been initialized, the tab should report the status as valid.
        return !this._tabStripControl || this._tabStripControl.isValid();
    }

    /**
     * Return isDirty state.
     */
    public isDirty(): boolean {
        return this._tabStripControl && this._tabStripControl.isDirty();
    }

    /**
     * Called when the control is getting resized.
     */
    public onResize() {
        if (this._tabStripControl) {
            this._tabStripControl.setTabContentHeight();
        }
    }

    public beginSave(): IPromise<boolean> {
        if (this.isValid()) {
            var deferred = Q.defer<boolean>();

            var successCallBack = () => {
                this.beginExecuteAction(() => {
                    var newFieldTabVMOptions = this._getFieldTabViewModelOptions(cardFieldSettings, this._workItemTypeMap);
                    this._fieldTabCollectionViewModel.reset(newFieldTabVMOptions);
                    this._tabStripControl.rebind();
                    deferred.resolve(this._requireRefreshOnSave);
                });
            };
            var errorCallBack = (error: { message: string; serverError: any; }) => {
                this.beginExecuteAction(() => {
                    deferred.reject(error);
                });
            };

            var cardFieldSettings = this.getCardSettings();
            if ($.isFunction(this._options.saveDelegate)) {
                this._options.saveDelegate(cardFieldSettings, successCallBack, errorCallBack);
            }
            else {
                if (this._options.boardType === AgileUtils.BoardType.Taskboard) {
                    this._beginSaveSettingsForTaskBoard(cardFieldSettings, successCallBack, errorCallBack);
                } else {
                    this._beginSaveSettingsForKanban(cardFieldSettings, successCallBack, errorCallBack);
                }
            }

            return deferred.promise;
        }
    }
}

export interface ITeamSettingTabOptions {
    controlType;
    backlogConfiguration: BacklogConfiguration;
    workHttpClient: Work_WebApi.WorkHttpClient;
    teamSettings: TFS_AgileCommon.ITeamSettings;
    editable?: boolean;
    currentUserTeamPermissions: TeamServices.ITeamPermissions;
    displayNoPermissionsMessage?: boolean;
}

export class TeamSettingTabContent implements Configurations.ITabContent {

    private _controltype: any;
    private _control: Tfs_Admin_Controls_TeamSettings.BaseTeamSettingControl;
    private _options: ITeamSettingTabOptions;
    private _requiresRefresh: boolean = true;

    constructor(options: ITeamSettingTabOptions) {
        this._options = options;
        this._controltype = options.controlType;
    }

    public dispose() {
        this._control.dispose();
    }

    public beginLoad($container: JQuery): IPromise<any> {
        this._control = <Tfs_Admin_Controls_TeamSettings.BaseTeamSettingControl>Controls.Control.createIn(
            this._controltype, $container, this._options);
        return Q.resolve(null);
    }

    public isDirty() {
        return this._control.isDirty();
    }

    public isValid() {
        return this._control.isValid();
    }

    public registerStateChangedEvents(onDirtyStateChanged: Function, onValidStateChanged: Function) {
        this._control.registerStateChangedEvents(onDirtyStateChanged, onValidStateChanged);
    }

    public beginSave(): IPromise<boolean> {
        var deferred = Q.defer<boolean>();
        this._control.beginSave().then(
            () => { deferred.resolve(this._requiresRefresh); },
            () => { deferred.reject(null); }
        );
        return deferred.promise;
    }

    public onResize() {
        this._control.onResize();
    }

    public onTabActivated() {
        this._control.onTabActivated();
    }
}
