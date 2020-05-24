///<amd-dependency path="jQueryUI/button"/>

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import BladeConfigQuery = require("Widgets/Scripts/Shared/BladeConfigurationQueryControl");
import BladeConfiguration = require("Dashboards/Scripts/BladeConfiguration");
import { ErrorMessageControl } from "Dashboards/Scripts/ErrorMessageControl";
import { SettingsField, SettingsFieldOptions } from "Dashboards/Scripts/SettingsField";
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");

import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");
import Dashboards_UIContracts = require("Dashboards/Scripts/Contracts");
import MyWorkResources = require("MyWork/Scripts/Resources/TFS.Resources.MyWork");
import QueryScalar = require("Widgets/Scripts/QueryScalar");
import SDK = require("VSS/SDK/Shim");
import TFS_WorkItemTracking_Contracts = require("TFS/WorkItemTracking/Contracts");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import WidgetLiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");
import WIT_RestClient = require("TFS/WorkItemTracking/RestClient");
import WITContracts = require("TFS/WorkItemTracking/Contracts");
import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Q = require("q");

var delegate = Utils_Core.delegate;

export module CssClasses {
    export var COLUMN_PICKER_RIGHT_CONTAINER = "wit-config-column-picker-right-container";
    export var COLUMN_PICKER_LEFT_CONTAINER = "wit-config-column-picker-left-container";
    export var COLUMN_PICKER_ADD_BUTTON = "wit-config-column-picker-add-button";
    export var COLUMN_PICKER_REMOVE_BUTTON = "wit-config-column-picker-remove-button";
    export var COLUMN_PICKER_UP_BUTTON = "wit-config-column-picker-up-button";
    export var COLUMN_PICKER_DOWN_BUTTON = "wit-config-column-picker-down-button";
    export var COLUMN_PICKER_ADD_ICON = "wit-config-column-picker-add-icon";
    export var COLUMN_PICKER_REMOVE_ICON = "wit-config-column-picker-remove-icon";
    export var COLUMN_PICKER_UP_ICON = "wit-config-column-picker-up-icon";
    export var COLUMN_PICKER_DOWN_ICON = "wit-config-column-picker-down-icon";
    export var COLUMN_PICKER_AVAILABLE_COLUMNS = "wit-config-column-picker-available-columns";
    export var COLUMN_PICKER_SELECTED_COLUMNS = "wit-config-column-picker-selected-columns";
    export var COLUMN_PICKER_RIGHT_LABEL = "wit-config-column-picker-left-label";
    export var COLUMN_PICKER_LEFT_LABEL = "wit-config-column-picker-right-label";
    export var COLUMN_PICKER_CORE_CSS = "wit-config-column-picker";
    export var COLUMN_PICKER_LABEL = "wit-config-column-picker-label";
    export var COLUMN_PICKER_ERROR_CONTAINER = "wit-config-column-picker-error-container";
    export var QUERY_SELECTOR_CONTAINER = "wit-config-query-selector-container";
}

export interface IQueryResultConfiguration extends WidgetLiveTitle.ITrackName{
    query: QueryScalar.IQueryInformation,
    selectedColumns: WITContracts.WorkItemFieldReference[]
}

export interface ColumnSelectorOptions extends Dashboards_UIContracts.ConfigurationControlOptions<WITContracts.WorkItemFieldReference[]> {
    webContext: Contracts_Platform.WebContext,
    availableColumns: WITContracts.WorkItemFieldReference[]
}

export class ColumnSelector extends Controls.Control<ColumnSelectorOptions> implements Dashboards_UIContracts.IConfigurationControl<WITContracts.WorkItemFieldReference[]> {
    private static htmlTemplate = 
          `<div class='${CssClasses.COLUMN_PICKER_LEFT_CONTAINER}'> 
             <div class='${CssClasses.COLUMN_PICKER_LEFT_LABEL}'/> 
             <select class='${CssClasses.COLUMN_PICKER_AVAILABLE_COLUMNS}' multiple='multiple'/> 
             <button class='${CssClasses.COLUMN_PICKER_ADD_BUTTON}'/>        
             <button class='${CssClasses.COLUMN_PICKER_REMOVE_BUTTON}'/> 
          </div> 
          <div class='${CssClasses.COLUMN_PICKER_RIGHT_CONTAINER}'> 
             <div class='${CssClasses.COLUMN_PICKER_RIGHT_LABEL}'/>
             <select class='${CssClasses.COLUMN_PICKER_SELECTED_COLUMNS}' multiple='multiple'/>
             <button class='${CssClasses.COLUMN_PICKER_UP_BUTTON}'/>
             <button class='${CssClasses.COLUMN_PICKER_DOWN_BUTTON}'/>
          </div>`;
        
    private static MAX_SELECTED_COUNT = 5;

    private _addButton: JQuery;
    private _removeButton: JQuery;
    private _upButton: JQuery;
    private _downButton: JQuery;
    private _available: JQuery;
    private _selected: JQuery;

    constructor(options?) {
        super(options);
    }
    
    public __test() {
        return {
            addButton: this._addButton,
            removeButton: this._removeButton,
            upButton: this._upButton,
            downButton: this._downButton,
            available: this._available,
            selected: this._selected
        };
    } 
    
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: CssClasses.COLUMN_PICKER_CORE_CSS
        }, options));
    }

    public initialize() {
        this._decorate();        
        
        if (this._options.availableColumns) {
            this.populateAvailableColumns(this._options.availableColumns);
            if (this._options.initialValue) {
                this._populateSelectedColumns(this._options.initialValue);
            }
        }
        
        this._attachEvents();
        this._updateButtons();
          
        super.initialize();    
    }

    public getCurrentValue(): WITContracts.WorkItemFieldReference[] {
        return $.map(this._selected.children(), ColumnSelector._htmlToColumn);
    }    

    /**
    * Repopulates available columns. Also removes all the previously selected columns.
    */
    public populateAvailableColumns(columns: WITContracts.WorkItemFieldReference[], populateSelected?: boolean) {
        this._available.empty();
        this._selected.empty();
        
        (columns || []).forEach((val, ind) => {
            this._available.append(ColumnSelector._columnToHtml(val));
        });
        
        if (populateSelected && columns) {
            this._populateSelectedColumns(columns.slice(0, ColumnSelector.MAX_SELECTED_COUNT));
        }
    }
        
    public getErrorMessage(): string {
        if (this._selected.children().length == 0) {
            return MyWorkResources.WITWIdgetConfigurationNoColumnsSelected;
        }
        
        if (this._selected.children().length > ColumnSelector.MAX_SELECTED_COUNT) {
            return MyWorkResources.WITWidgetConfigurationMaxColumnsSelected;
        }
        
        return null;
    }
    
    private static _columnToHtml(column: WITContracts.WorkItemFieldReference, selected?): JQuery {
        return $(Utils_String.format("<option value='{0}'{1}>{2}</option>", column.referenceName, selected ? " selected" : "", column.name));
    }
    
    private static _htmlToColumn(column: JQuery): WITContracts.WorkItemFieldReference {
        return <WITContracts.WorkItemFieldReference>{
            name: $(column).text(),
            referenceName: $(column).attr('value') 
        };       
    }
    
    private _populateSelectedColumns(columns: WITContracts.WorkItemFieldReference[]) {
        (columns || []).forEach((val, ind) => {
            this._selected.append(ColumnSelector._columnToHtml(val));
            this._available.children().filter((ind, el) => {
                return $(el).attr('value') === val.referenceName;
            }).remove();
        });        

        if(this._initialized && this._options.onChange) {
            this._options.onChange();
        }
    }
    
    private _getElementByClass(className: string): JQuery {
        return this.getElement().find("." + className);
    }
    
    private _decorate() {
        this._element.html(ColumnSelector.htmlTemplate);
         
        this._addButton = this._getElementByClass(CssClasses.COLUMN_PICKER_ADD_BUTTON);
        this._removeButton = this._getElementByClass(CssClasses.COLUMN_PICKER_REMOVE_BUTTON);
        this._upButton = this._getElementByClass(CssClasses.COLUMN_PICKER_UP_BUTTON);
        this._downButton = this._getElementByClass(CssClasses.COLUMN_PICKER_DOWN_BUTTON);
        this._selected = this._getElementByClass(CssClasses.COLUMN_PICKER_SELECTED_COLUMNS);
        this._available = this._getElementByClass(CssClasses.COLUMN_PICKER_AVAILABLE_COLUMNS);
        
        this._getElementByClass(CssClasses.COLUMN_PICKER_LEFT_LABEL).text(MyWorkResources.WITWidgetConfigurationAvailabileColumnsHeader);
        this._getElementByClass(CssClasses.COLUMN_PICKER_RIGHT_LABEL).text(MyWorkResources.WITWidgetConfigurationSelectedColumnsHeader);
    }

    private _attachEvents() {
        this._available.bind("change", delegate(this, this._onAvailableListChange))
            .bind("dblclick", delegate(this, this._onAvailableListDblClick));
        this._selected.bind("change", delegate(this, this._onSelectedListChange))
            .bind("dblclick", delegate(this, this._onSelectedListDblClick));

        this._addButton.bind("click", delegate(this, this._onAddColumnClick)).button().find("span").addClass(CssClasses.COLUMN_PICKER_ADD_ICON + " icon icon-next-2");
        this._removeButton.bind("click", delegate(this, this._onRemoveColumnClick)).button().find("span").addClass(CssClasses.COLUMN_PICKER_REMOVE_ICON + " icon icon-prev-2");
        this._upButton.bind("click", delegate(this, this._onMoveColumnUpClick)).button().find("span").addClass(CssClasses.COLUMN_PICKER_UP_ICON + " icon icon-up");
        this._downButton.bind("click", delegate(this, this._onMoveColumnDownClick)).button().find("span").addClass(CssClasses.COLUMN_PICKER_DOWN_ICON + " icon icon-down");
    }
    
    private _addColumns() {
        this._available.find("option:selected").each((ind, elem) => {
            this._selected.append($(elem));
            $(this).remove();
        });

        this._selected.find('option').removeAttr("selected");
        this._updateButtons();
        this._selected.focus();
        
        if(this._options.onChange) {
            this._options.onChange();
        }
    }

    private _removeColumns() {        
        this._selected.find("option:selected").each((ind, elem) => {
            this._available.append($(elem));
            $(this).remove();
        });
        
        this._available.find('option').removeAttr("selected");
        this._updateButtons();
        this._available.focus();
        
        if(this._options.onChange) {
            this._options.onChange();
        }
    }

    private _moveColumnUp() {
        this._selected.find("option:selected").each(function () {
            var $prev = $(this).prev();
            if (!$prev.prop("selected")) {
                $(this).insertBefore($prev);
            }
        });
        
        if(this._options.onChange) {
            this._options.onChange();
        }
    }

    private _moveColumnDown() {
        $.each(this._selected.find("option:selected").toArray().reverse(), function () {
            var $next = $(this).next();
            if (!$next.prop("selected")) {
                $(this).insertAfter($next);
            }
        });
        
        if(this._options.onChange) {
            this._options.onChange();
        }
    }
    
    private _updateButtons() {
        var availableDisabled = this._available.children(":selected").length === 0;                                
        var selectedDisabled = this._selected.children(":selected").length === 0;        

        this._addButton.button("option", "disabled", availableDisabled);
        this._removeButton.button("option", "disabled", selectedDisabled);
        this._upButton.button("option", "disabled", selectedDisabled);
        this._downButton.button("option", "disabled", selectedDisabled);
    }

    private _onAvailableListChange(e?) {
        this._selected.find('option').removeAttr("selected");
        this._updateButtons();
        return false;
    }
    
    private _onSelectedListChange(e?) {
        this._available.find('option').removeAttr("selected");
        this._updateButtons();
        return false;
    }

    private _onAvailableListDblClick(e?) {
        this._addColumns();
        return false;
    }

    private _onSelectedListDblClick(e?) {
        this._removeColumns();
        return false;
    }

    private _onAddColumnClick(e?) {
        this._addColumns();
        return false;
    }

    private _onRemoveColumnClick(e?) {
        this._removeColumns();
        return false;
    }

    private _onMoveColumnUpClick(e?) {
        this._moveColumnUp();
        return false;
    }

    private _onMoveColumnDownClick(e?) {
        this._moveColumnDown();
        return false;
    }
}

export class WitConfigurationView
    extends Base.BaseWidgetConfiguration<Dashboards_UIContracts.WidgetConfigurationOptions>
    implements Dashboards_WidgetContracts.IWidgetConfiguration{    
    public static WitConfigEnhancementName: string = "Microsoft.VisualStudioOnline.MyWork.WITConfiguration";    
    
    private _liveTitleState: WidgetLiveTitle.WidgetLiveTitleEditor;
    private _querySelector: BladeConfigQuery.QuerySelectorControl;
    private _querySelectorContainer: JQuery;
    private _querySelectorSection: SettingsField<Controls.Control<any>>;
    private _columnSelector: ColumnSelector;
    private _columnSelectorError: ErrorMessageControl;   

    private newWidgetConfigurationContext: Dashboards_WidgetContracts.IWidgetConfigurationContext;

    constructor(options: any) {
        if (options == null) {
            throw new Error("Options must be defined.");
        }

        super(options);
    }
    
    public __test() {
        return {
            querySelector: this._querySelector,
            columnSelector: this._columnSelector,
            onQueryChange: () => { this._onQueryChange(); },
        };
    }  

    public load(
        widgetSettings: Dashboards_WidgetContracts.WidgetSettings,
        widgetConfigurationContext: Dashboards_WidgetContracts.IWidgetConfigurationContext):
        IPromise<Dashboards_WidgetContracts.WidgetStatus> {

        this.newWidgetConfigurationContext = widgetConfigurationContext;

        var initialConfiguration: IQueryResultConfiguration =
            <IQueryResultConfiguration>JSON.parse(widgetSettings.customSettings.data)
            || { query: null, selectedColumns: null };

        this._liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(initialConfiguration, MyWorkResources.QueryResultsWidgetDefaultName);

        if (initialConfiguration.query) {
            this._liveTitleState.updateTitleOnLatestArtifact(this.configureName, initialConfiguration.query.queryName);
        }

        this._querySelectorContainer = $('<div>').addClass(CssClasses.QUERY_SELECTOR_CONTAINER);
        this._querySelectorSection = SettingsField.createSettingsFieldForJQueryElement({
            labelText: MyWorkResources.WITWidgetConfigurationQuerySectionHeader,            
            initialErrorMessage: MyWorkResources.WITWidgetConfigurationNoQuerySelectedMsg,
        }, this._querySelectorContainer);

        this._querySelector = <BladeConfigQuery.QuerySelectorControl>Controls.BaseControl.createIn(
            BladeConfigQuery.QuerySelectorControl,
            this._querySelectorContainer,
            <BladeConfigQuery.QuerySelectorOptions>{
                onChange: delegate(this, this._onQueryChange),
                initialValue: initialConfiguration.query,
                webContext: Context.getDefaultWebContext()
            });

        this.getElement().append(this._querySelectorSection.getElement());

        var displayColumnsHeader = MyWorkResources.WITWidgetConfigurationDisplayColumnsHeader;
        
        $("<label>")
            .text(displayColumnsHeader)
            .addClass(CssClasses.COLUMN_PICKER_LABEL)
            .addClass("bowtie")
            .appendTo(this.getElement());

        // create a container for the error control so we can overwrite the style to have a default space to show the error message
        var $columnErrorContainer = $("<div/>").addClass(CssClasses.COLUMN_PICKER_ERROR_CONTAINER);
        this._columnSelectorError = <ErrorMessageControl>Controls.BaseControl.createIn(ErrorMessageControl, $columnErrorContainer);
        this.getElement().append($columnErrorContainer);
        if (initialConfiguration.query && initialConfiguration.query.queryId) {

            return this._beginGetQueryResultById(initialConfiguration.query.queryId).then(
                (queryResult: TFS_WorkItemTracking_Contracts.WorkItemQueryResult) => {
                    this._columnSelector = <ColumnSelector>Controls.BaseControl.createIn(ColumnSelector, this.getElement(), <ColumnSelectorOptions>{
                        initialValue: initialConfiguration.selectedColumns,
                        availableColumns: queryResult.columns,
                        onChange: delegate(this, this._onColumnChange),
                    });
                    return WidgetHelpers.WidgetStatusHelper.Success();
                },
                (error: any) => {
                    this._columnSelector = <ColumnSelector>Controls.BaseControl.createIn(ColumnSelector, this.getElement(), <ColumnSelectorOptions>{
                        onChange: delegate(this, this._onColumnChange)
                    });
                    return WidgetHelpers.WidgetStatusHelper.Failure(error);
                });
        } else {
            this._columnSelector = <ColumnSelector>Controls.BaseControl.createIn(ColumnSelector, this.getElement(), <ColumnSelectorOptions>{
                onChange: delegate(this, this._onColumnChange)
            });
            return WidgetHelpers.WidgetStatusHelper.Success();
        }
    }

    public _getCustomSettings(): Dashboards_WidgetContracts.CustomSettings {
        return { data: JSON.stringify(this._getCurrentConfiguration()) };
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSave(): IPromise<Dashboards_WidgetContracts.SaveStatus> {
        this._repaintErrors();
        
        if (!this._hasErrors()) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }
    
    private _beginGetQueryResultById(queryId: string): IPromise<TFS_WorkItemTracking_Contracts.WorkItemQueryResult> {

        var webContext = Context.getDefaultWebContext();
        var teamContext = TFS_Dashboards_Common.getDashboardTeamContext();

        var projectId = webContext.project ? webContext.project.id : null;
        var teamId = teamContext ? teamContext.id : null;

        var promise = WIT_RestClient.getClient().queryById(queryId, projectId, teamId);

        return promise;
    }

    private _repaintErrors(): void {
        this._querySelectorSection.toggleError(this._querySelector.getErrorMessage() ? true : false);

        this._columnSelectorError.setErrorMessage(this._columnSelector.getErrorMessage());
    }
    
    private _getCurrentConfiguration(): IQueryResultConfiguration {
        var queryInfo = this._querySelector.getCurrentValue();

        var updatedConfiguration: IQueryResultConfiguration = {
            query: queryInfo,
            selectedColumns: this._columnSelector.getCurrentValue()
        };

        this._liveTitleState.appendToSettings(updatedConfiguration);

        return updatedConfiguration;
    }
    
    private _hasErrors(): boolean {
        var errorMessage = this._querySelector.getErrorMessage() || this._columnSelector.getErrorMessage();
        return errorMessage ? true : false;
    }
    
    private _onQueryChange() {
        this._querySelectorSection.toggleError(this._querySelector.getErrorMessage() ? true : false);

        this.notifyConfigurationChange();
        
        var query: QueryScalar.IQueryInformation = this._querySelector.getCurrentValue();

        if (!query || !query.queryId) {
            return;
        }

        this._querySelector.focus();
        this._liveTitleState.updateTitleOnLatestArtifact(this.configureName, query.queryName);

        var queryResult = this._beginGetQueryResultById(query.queryId).then(
            (queryResult: TFS_WorkItemTracking_Contracts.WorkItemQueryResult) => {
                this._columnSelector.populateAvailableColumns(queryResult.columns, true);
            }, (error) => {

                this._columnSelector.populateAvailableColumns(null);
                this._columnSelectorError.setErrorMessage(error.message);
            });

        return queryResult;
    }
    
    private _onColumnChange() {
        this._columnSelectorError.setErrorMessage(this._columnSelector.getErrorMessage());
        this.notifyConfigurationChange()
    }

    private notifyConfigurationChange() {
        this._repaintErrors();
        if (!this._hasErrors()) {
            this.newWidgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
        }
    }
}

SDK.VSS.register(WitConfigurationView.WitConfigEnhancementName, () => WitConfigurationView);
SDK.registerContent("Microsoft.VisualStudioOnline.MyWork.WITConfiguration.Initialize", (context) => {
    return Controls.create(WitConfigurationView, context.$container, context.options);
});
