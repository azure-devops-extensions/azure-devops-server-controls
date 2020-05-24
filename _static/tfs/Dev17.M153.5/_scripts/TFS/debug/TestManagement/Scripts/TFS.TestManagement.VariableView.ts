import q = require("q");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import DefinitionTree = require("TestManagement/Scripts/TFS.TestManagement.Configurations.DefinitionTree");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import Controls = require("VSS/Controls");
import Contracts = require("TFS/TestManagement/Contracts");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;

class RightPaneUIControls {
    _variableToolbar: Menus.MenuBar;
    _variableTitle: JQuery;
    _variableDescription: JQuery;
    _variableValuesTable: JQuery;
    _addVariableValueElement: JQuery;
}

class TestVariableToolbarCommands {        
    public static deleteTestVariable: string = "delete-test-variable";
    public static refreshTestVariableSingle: string = "refresh-test-variable";
    public static saveTestVariable: string = "save-test-variable";    
}

export class TestVariableView extends Navigation.NavigationView {

    private _hubTitle: any;

    private _$rightPane: JQuery;
        
    private _selectedVariable: Contracts.TestVariable;
    private _rightPaneUIControls: RightPaneUIControls;
    private _currentVariableDetailsDirty: boolean;
    private _configurationsManager: TestsOM.TestConfigurationManager;    
    private _$errorDiv: any;
    
    //for tree control
    private _selectedDefinition: KnockoutObservable<DefinitionTree.ConfigurationDefinitionModel>;

    //Error handling
    private DeletedDefinitionError: number = 404;

    constructor(options?) {
        super(options);
        this._currentVariableDetailsDirty = false;
        this._configurationsManager = TMUtils.getTestConfigurationManager();
        this._selectedDefinition = DefinitionTree.definitionContext.selectedDefinition;        
    }

    public initialize() {
        super.initialize();
        this._initializeUIControls();
    }
    
    public _clearDirtyState() {
        /// <summary>Clears Variable view dirty state</summary>        
        this._clearDirtyFlags();
        this._setSaveVariableButtonDisabledState();
    }

    public isDirty(): boolean {
        /// <summary>Returns dirty state of variable view</summary>        
        return this._currentVariableDetailsDirty;
    }

    public _save(): void {
        /// <summary>Saves current test variable if dirty</summary>  
        if (this._getToolbarButtonDisabledState(TestVariableToolbarCommands.saveTestVariable) === false) {
            this.saveTestVariable();
        }
    }
    
    public _fetchAndPopulateDataInRightPaneControls(variableId: number): IPromise<Contracts.TestVariable> {
        /// <summary>Fetches latest test variable object and displays its details</summary>
        /// <param name="variableId" type="String">Id of the variable to be displayed</param>

        if (variableId < -1) {
            //Todo: Instead of alert show banner
            alert(Resources.InvalidVariableIdError);
            return null;
        }

        if (variableId === -1) {
           
            //Create new variable
            this._$rightPane.show();
            this._selectedVariable = null;
            this.clearRightPaneUIControls();
            this._setViewTitleConsideringDirtyState(-1, Resources.NewTestVariableDirtyState);
            this._populateVariableValues();

            this._setRefreshVariableButtonDisabledState();

            this._rightPaneUIControls._variableTitle.focus();
            return null;
        }

        let deferred: Q.Deferred<Contracts.TestVariable> = q.defer<Contracts.TestVariable>();

        this._configurationsManager.beginGetTestVariableById(variableId).then((variable: Contracts.TestVariable) => {
            this._populateVariableDataInRightPaneControls(variable);
            deferred.resolve(variable);
        },
            (error) => {
                //Todo: Instead of alert show banner
                alert(error.message);
                if (error.status === this.DeletedDefinitionError) {

                    // remove this from tree also.
                    this._fire("deleteDefinition", { definitionId: variableId });
                
                    //TODO: show the next configuration data
                
                    deferred.reject(error);
                }
            });

        return deferred.promise;
    }

    private _initializeUIControls(): void {

        this._$rightPane = this.getElement();

        this._hubTitle = this._$rightPane.parents().find(".right-hub-content").siblings(".hub-title");
        this._hubTitle.addClass("variable-tab-title"); //Ineffective. ToDo.

        this._initializeRightPaneControls();
    }
    
    private showError(message: string) {
        /// <summary>shows an error mesage</summary>
        /// <param name="message" type="String">the message to be displayed</param>
        if (!this._$errorDiv) {
            this._$errorDiv = $("<div class='inline-error' />").text(message).insertBefore(this._element.find(".hub-title")[0]);
            this._element.find(".hub-title, .right-hub-content").hide();
        }
    }

    private _clearError() {
        /// <summary>clears the error mesage</summary>
        let $errorDiv = this._$errorDiv || this._element.find(".inline-error");
        if ($errorDiv) {
            $errorDiv.remove();
            this._$errorDiv = null;
        }
        this._element.find(".hub-title, .right-hub-content").show();
    }

    private _onToolbarItemClick(e?: any) {

        let command = e.get_commandName();
        switch (e.get_commandName()) {

            case TestVariableToolbarCommands.deleteTestVariable:
                this._clearError();
                this.deleteTestVariable();
                break;

            case TestVariableToolbarCommands.saveTestVariable:
                this.saveTestVariable();
                break;

            case TestVariableToolbarCommands.refreshTestVariableSingle:
                this.refreshTestVariableSingle();
                break;
        }
    }

    private deleteTestVariable() {
        if (confirm(Resources.DefinitionDelete_ConfirmMessage)) {
            if (this._selectedVariable === null || this._selectedVariable === undefined) {

                this._fire("deleteDefinition", { definitionId: -1 }); //New test variable scenario
                return;
            }

            this._configurationsManager.beginDeleteTestVariable(this._selectedVariable.id).then((a: any) => {

                this._fire("deleteDefinition", { definitionId: this._selectedVariable.id });
            }
                ,
                (error) => {
                    //Todo: Instead of alert show banner
                    if (error.status == this.DeletedDefinitionError) {
                        // remove this from tree also.

                        this._fire("deleteDefinition", { definitionId: this._selectedVariable.id });
                        alert(error.message);
                    }
                    else if (Utils_String.ignoreCaseComparer(error.serverError.typeKey, "TestObjectInUseException") === 0) {
                        alert(Utils_String.format(Resources.TestVariableInUseError, this._selectedVariable.name));
                    }
                    else {
                        alert(error.message);
                    }
                });
            TelemetryService.publishEvents(TelemetryService.featureDeleteTestVariable, {});
        }
    }

    private saveTestVariable() {

        let varTitle: string = this._rightPaneUIControls._variableTitle.val();

        if (varTitle) {

            varTitle = varTitle.trim();

            if (varTitle === Utils_String.empty) {
                alert(Resources.TestVariableTitleBlankError);
                return;
            }
        }

        let variableValues: string[] = this._getVariableValues();

        let atleastOneVariableValueExist: boolean = (variableValues && variableValues.length > 0);

        if (atleastOneVariableValueExist === false) {

            alert(Resources.NoVariableValueSpecifiedError);

            let rows: JQuery = this._rightPaneUIControls._variableValuesTable.find("tr");

            if (rows && rows.length > 0) {
                $(rows[0]).find("input").select();
            }
            else {
                this._addRowInVariableValuesTable(Utils_String.empty, "0");
            }

            return;
        }

        let varDescription: string = this._rightPaneUIControls._variableDescription.val();
        if (varDescription) {
            varDescription = varDescription.trim();
        }

        let variable: Contracts.TestVariable = <Contracts.TestVariable>{
            description: varDescription,            
            name: varTitle,            
            values: variableValues
        };

        if (this._selectedVariable !== null && this._selectedVariable.id > 0) {
            variable.revision = this._selectedVariable.revision;
            
            // update variable
            this._configurationsManager.beginUpdateTestVariable(variable, this._selectedVariable.id).then(                
                (updatedVariable: Contracts.TestVariable) => {
                    this._populateVariableDataInRightPaneControls(updatedVariable);
                    this._fire("saveOrRefreshDefinition", { variable: updatedVariable, isNewVariable: false });
                },
                (error) => {
                    alert(error.message);
                });
            TelemetryService.publishEvent(TelemetryService.featureUpdateTestVariable, TelemetryService.valueCount, variableValues.length);
        }
        else {
            //create new variable
            this._configurationsManager.beginCreateTestVariable(variable).then(
                (createdVariable: Contracts.TestVariable) => {
                    this._populateVariableDataInRightPaneControls(createdVariable);
                    this._fire("saveOrRefreshDefinition", { variable: createdVariable, isNewVariable: true });
                },
                (error) => {
                    //Todo: Instead of alert show banner
                    alert(error.message);
                });
            TelemetryService.publishEvent(TelemetryService.featureCreateTestVariable, TelemetryService.valueCount, variableValues.length);
        }
    }

    private refreshTestVariableSingle() {

        if (!this._confirmUserForUnsavedData()) {
            if (this._selectedVariable !== null && this._selectedVariable !== undefined) {
                this._configurationsManager.beginGetTestVariableById(this._selectedVariable.id).then(
                    (variable: Contracts.TestVariable) => {
                        this._populateVariableDataInRightPaneControls(variable);
                        this._fire("saveOrRefreshDefinition", { variable: variable, isNewVariable: false });
                    }
                    ,
                    (error) => {
                        //Todo: Instead of alert show banner
                        alert(error.message);
                    });
            }
            else {
                //clear the right pane for new defintion 
                this.clearRightPaneUIControls();
            }
        }
    }

    private _confirmUserForUnsavedData(): boolean {
        let isCancel: boolean = true;
        if (!(this.isDirty() === true &&
            !confirm(Resources.DefinitionDirtyWindow_ConfirmMessage))) {

            this._clearDirtyFlags();
            this._setSaveVariableButtonDisabledState();
            isCancel = false;
        }
        return isCancel;
    }
    
    //Right Pane Controls region
    
    private _initializeRightPaneControls() {

        this._rightPaneUIControls = new RightPaneUIControls();

        this._createVariableTabToolbar();
        this._createVariableDetailsControls();   
        this._createVariableValuesTable();     
        this._createAddVariableValueElement();
    }

    private clearRightPaneUIControls() {

        if (this._rightPaneUIControls !== undefined) {

            this._clearVariableTitleField();

            this._rightPaneUIControls._variableDescription.val(Utils_String.empty);       
            
            this._rightPaneUIControls._variableValuesTable.empty();                 
        }
        else {
            this._initializeRightPaneControls();
        }
    }

    private _clearVariableTitleField() {

        this._rightPaneUIControls._variableTitle.val(Utils_String.empty);
        this._rightPaneUIControls._variableTitle.addClass("invalid");
        this._setSaveVariableButtonDisabledState();
    }
    
    private _populateVariableDataInRightPaneControls(variable: Contracts.TestVariable = undefined) {

        if (variable !== null && variable !== undefined) {

            this._selectedVariable = variable;

            this._rightPaneUIControls._variableTitle.val(variable.name);
            this._rightPaneUIControls._variableTitle.removeClass("invalid");

            this._rightPaneUIControls._variableDescription.val(variable.description);

            this._populateVariableValues();  
            this._setRefreshVariableButtonDisabledState();

            //Set cursor at end of title
            let title: string = this._rightPaneUIControls._variableTitle.val();
            this._rightPaneUIControls._variableTitle.focus().val("").val(title);

            this._clearDirtyState();

            this._setViewTitleConsideringDirtyState(variable.id, variable.name);
        }
    }

    private _setViewTitleConsideringDirtyState(variableId: number, variableTitle: string) {

        if (variableId === -1) {
            this._hubTitle.text(variableTitle);
        }
        else {
            this._hubTitle.text(Utils_String.format((this.isDirty() === true ? Resources.TestVariableTitleDirtyState : Resources.TestVariableTitle), variableId, variableTitle));
        }
    }

    private _updateViewTitleConsideringDirtyState() {

        let varTitle: string = this._rightPaneUIControls._variableTitle.val();
        if (varTitle) {

            varTitle = varTitle.trim();
        }

        let varId: number = -1;
        if (this._selectedVariable !== null && this._selectedVariable !== undefined && this._selectedVariable.id > 0) {

            varId = this._selectedVariable.id;
            this._setViewTitleConsideringDirtyState(varId, varTitle);
        }
        else {

            //New variable scenario
            if (Utils_String.ignoreCaseComparer(varTitle, Utils_String.empty) === 0) {
                this._setViewTitleConsideringDirtyState(varId, Resources.NewTestVariableDirtyState);
            }
        }
    }

    private _createVariableTabToolbar() {

        let hubPivotToolbar: JQuery = $("<div />").addClass("toolbar hub-pivot-toolbar");
        this._$rightPane.append(hubPivotToolbar);

        this._rightPaneUIControls._variableToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, hubPivotToolbar, {
            items: this._createVariableTabMenubarItems(),
            executeAction: delegate(this, this._onToolbarItemClick),
        });
    }

    private _createVariableTabMenubarItems(): any[] {
        let items: any[] = [];

        items.push({
            id: TestVariableToolbarCommands.saveTestVariable,
            text: Resources.SaveText,
            showText: true,
            icon: "bowtie-icon bowtie-save",
            hidden: false
        });

        items.push({ separator: true });

        items.push({
            id: TestVariableToolbarCommands.deleteTestVariable,
            text: Resources.DeleteText,
            title: Resources.DeleteText,
            showText: false,
            icon: "bowtie-icon bowtie-edit-delete"
        });

        items.push({
            id: TestVariableToolbarCommands.refreshTestVariableSingle,
            text: Resources.Refresh,
            title: Resources.Refresh,
            showText: false,
            icon: "bowtie-icon bowtie-navigate-refresh"
        });

        return items;
    }

    private _createVariableDetailsControls() {
        let $layoutTable = $("<table class ='variable-details-table' />");
        this._rightPaneUIControls._variableTitle = this._createVariableTitleRow($layoutTable);
        this._rightPaneUIControls._variableDescription = this._createVariableDescriptionRow($layoutTable);
        
        this._$rightPane.append($("<div />").addClass("variable-view-right-pane").append($("<div />").addClass("variable-details").append($layoutTable)));
    }

    private _createVariableTitleRow($table: JQuery): JQuery {
        let id = "test-variable-title-input";
        let $inputText: JQuery = $("<input />")
            .attr("type", "text")
            .attr("id", id)
            .attr("maxlength", "256")
            .addClass("test-variable-title-input");

        Utils_UI.Watermark($inputText, { watermarkText: Resources.VariableTitleWatermark });

        $("<tr/>").addClass("create-test-artifact-name-row")
            .append($("<td />").append($("<label />").attr("for", id).addClass("variable-title-label-cell").text(Resources.ConfigurationName)))
            .append($("<td colspan='2' />").append($inputText).addClass("create-test-artifact-value-cell"))
            .appendTo($table);

        this._bind($inputText, "input change", () => {
            this._currentVariableDetailsDirty = true;

            let variableTitle = $inputText.val();
            variableTitle = $.trim(variableTitle);

            if (variableTitle === Utils_String.empty) {
                $inputText.addClass("invalid");
            }
            else {
                $inputText.removeClass("invalid");
            }

            let variableId: number = -1;
            if (this._selectedVariable !== null && this._selectedVariable !== undefined && this._selectedVariable.id > 0) {
                variableId = this._selectedVariable.id;
            }
            else if (Utils_String.ignoreCaseComparer(variableTitle, Utils_String.empty) === 0) {
                variableTitle = Resources.NewTestVariableDirtyState;
            }

            this._setViewTitleConsideringDirtyState(variableId, variableTitle);

            this._setSaveVariableButtonDisabledState();
        });

        return $inputText;
    }

    private _createVariableDescriptionRow($table: JQuery): JQuery {
        let id = "test-variable-description-input";
        let $inputText: JQuery = $("<textarea />")
            .attr("type", "text")
            .attr("id", id)
            .attr("maxlength", "4095")
            .addClass("variable-description-input");

        Utils_UI.Watermark($inputText, { watermarkText: Resources.VariableDescriptionWatermark });

        $("<tr/>").addClass("create-test-artifact-name-row").height("5em")
            .append($("<td />").addClass("variable-description-label-td").append($("<label />").attr("for", id).addClass("variable-description-label-cell").text(Resources.ConfigurationDescription)))
            .append($("<td colspan='2' />").append($inputText).addClass("variable-description-value-cell"))
            .appendTo($table);

        this._bind($inputText, "input change", () => {
            this._onVariableChange();
        });

        return $inputText;
    }
    
    private _createVariableValuesTable() {

        let $variableValuesRightPaneDiv = this._$rightPane.find(".variable-view-right-pane");
        let $testVariableValuesDiv = $("<div />").addClass("test-variable-values");
        $testVariableValuesDiv.appendTo($variableValuesRightPaneDiv);

        let $variableValuesLabel = $("<div class='variable-values-label' />").append($("<label />", { id: "test-variable-values-label", text: Resources.VariableValues }));       
        $variableValuesLabel.appendTo($testVariableValuesDiv);

        let $valuesTable = $("<table class ='test-variable-values-table' />");
        this._rightPaneUIControls._variableValuesTable = $valuesTable;

        this._bind($valuesTable, "input change", () => {
            this._onVariableChange();
        });

        $valuesTable.appendTo($testVariableValuesDiv);       
    }

    private _onVariableChange() {
        this._currentVariableDetailsDirty = true;
        this._setSaveVariableButtonDisabledState();
        this._updateViewTitleConsideringDirtyState();
    }

    private _populateVariableValues() {

        this._rightPaneUIControls._variableValuesTable.empty();

        if (this._selectedVariable && this._selectedVariable.values && this._selectedVariable.values.length > 0) {

                // When table gets populated by default first row is tabale.
                this._selectedVariable.values.forEach((value, index) => {
                let tabindex = "-1";
                if (index === 0){
                   tabindex = "0";
                }
                this._addRowInVariableValuesTable(value, tabindex);
               
            });
        }
        else {
            this._addRowInVariableValuesTable(Utils_String.empty, "0");            
        }
    }
    
    private _getVariableValues(): string[] {

        let that = this;
        let rows: JQuery = this._rightPaneUIControls._variableValuesTable.find("tr");
       
        let variableValues: string[] = [];

        if (rows && rows.length > 0) {

            rows.each(function (i, row) {
            
                let $row: JQuery = $(row);
                let value: string = $row.find("input").val().trim();

                if (Utils_String.ignoreCaseComparer(value, Utils_String.empty) !== 0 &&
                    that._searchValueInArrayIgnoreCase(value, variableValues) === -1) {
                    variableValues.push($row.find("input").val().trim());
                }
            });   
        }
        
        return variableValues;
    }   

    private _searchValueInArrayIgnoreCase(searchStr: string, array: string[]): number {
        //Iterates over an array of items to return the index of the first item that matches the provided searchStr in a case-insensitive way.  
        //Returns - 1 if no match found.
        
        let result: number = -1;
        array.forEach((value, index) => {
            if (Utils_String.ignoreCaseComparer(searchStr, value) === 0) {
                result = index;
                return false;
            }
        });

        return result;
    }

    private _appendRemoveVariableButtonToCell(cell: JQuery, row: JQuery, rowIndex: number) {

        let $removeConfigVariableDiv: JQuery = $("<div class = 'variable-value-remove' />");

        let $removeButton = $("<button />").addClass("variable-value-remove bowtie-icon bowtie-edit-delete");
        $removeButton.attr("aria-label", Resources.DeleteRow);
        $removeButton.attr("tabindex", "0");
        RichContentTooltip.add(Resources.DeleteRow, $removeButton);
        $removeButton.appendTo(cell);

        $removeButton.click(() => {

            row.remove();
            this._onVariableChange();

            let rows: JQuery = this._rightPaneUIControls._variableValuesTable.find("tr");
            if (rows === null || rows === undefined || rows.length === 0) {

                //Add an empty row as there must be at least one variable value specified
                this._addRowInVariableValuesTable(Utils_String.empty);                
            }

            this._setStateOfAddNewValueElement();
        });

        $removeButton.hide();
        
        $removeButton.focusout(() => {
              $removeButton.hide();
        });

        row.hover(() => {
            $removeButton.show();
        }, () => {
            $removeButton.hide();
        });
  
        $removeConfigVariableDiv.appendTo(cell);        
    }  

    private _addRowInVariableValuesTable(value: string, tabindex?: string) {
        let testVariableValuesLabelId = "test-variable-values-label";

        let $variableValue: JQuery = $("<input />")
            .attr("type", "text")
            .attr("aria-labelledby", testVariableValuesLabelId)
            .attr("maxlength", "256")
            .addClass("test-variable-title-input")
            .val(value);

        let $row: JQuery = $("<tr />").addClass("test-variable-value-row");
        let variableValueDeleteButtonCell: JQuery = $("<td />").addClass("test-variable-value-row-delete-button-cell").css("width", "24px");
        this._appendRemoveVariableButtonToCell(variableValueDeleteButtonCell, $row, 0);
        this._rightPaneUIControls._variableValuesTable.append($row.append($("<td />").addClass("test-variable-value-cell").append($variableValue)));
        $row.append(variableValueDeleteButtonCell);

        if (Utils_String.ignoreCaseComparer(value, Utils_String.empty) === 0) {
            $variableValue.select();
        }

        if (!tabindex){
             tabindex = "-1";
        }
        $variableValue.attr("tabindex", tabindex);

        $variableValue.focus(() => {
              // Next time the current row will get focus when tabbed into the table.
              $variableValue.attr("tabindex", "0");
              this._showRemoveButton($row, true);
        });

        $variableValue.keydown($row, delegate(this, this._onKeyDown));

        this._bind($variableValue, "input change", () => {
          
            let rowContent = $variableValue.val();
            rowContent = $.trim(rowContent);

            let rows: JQuery = this._rightPaneUIControls._variableValuesTable.find("tr");
            if (rows.length === 1 && rowContent === Utils_String.empty) {
                $(rows[0]).addClass("invalid");
                Utils_UI.Watermark($variableValue, { watermarkText: Resources.VariableValue });
            }
            else {
                $(rows[0]).removeClass("invalid");
                Utils_UI.Watermark($variableValue, { watermarkText: Utils_String.empty });
            }

            this._setStateOfAddNewValueElement();
        });
        
        let variableViewRightPaneDiv: JQuery = this._$rightPane.children(".variable-view-right-pane");
        
        variableViewRightPaneDiv.get(0).scrollTop = variableViewRightPaneDiv.position().top +
            this._rightPaneUIControls._variableTitle.parents().eq(4).outerHeight() +
            this._rightPaneUIControls._variableValuesTable.outerHeight();

        this._setStateOfAddNewValueElement();
    }
    
    private _createAddVariableValueElement() {
        let addVariableDiv: JQuery = $("<div />").attr({
                "role": "button",
                "tabIndex": "0"
            }).addClass("add-new-value-container add-variable-value").click(delegate(this, this._addNewValueClicked)).keydown(Utils_UI.buttonKeydownHandler);

        addVariableDiv.append($("<span />").addClass("add-icon bowtie-icon bowtie-math-plus"))
            .append($("<span />").addClass("add-new-value-link").text(Resources.AddNewValue));

        this._$rightPane.find(".variable-view-right-pane").find(".test-variable-values").append(addVariableDiv)
            .append($("<div />").addClass("add-new-value-empty-div")); //Adding an empty div at bottom to give some space below Add variable element;
        this._rightPaneUIControls._addVariableValueElement = addVariableDiv;

    }

    private _addNewValueClicked() {
        if (this._rightPaneUIControls._addVariableValueElement.hasClass("disabled") !== true) {
            this._addRowInVariableValuesTable(Utils_String.empty);
        }
    }

    private _setStateOfAddNewValueElement(): void {
    
        if (this._isAnyEmptyRowPresentInVariableValuesTable() === true) {
            this._rightPaneUIControls._addVariableValueElement.addClass("disabled").attr("aria-disabled", "true");
        }
        else {
            this._rightPaneUIControls._addVariableValueElement.removeClass("disabled").attr("aria-disabled", "false");
        }
    }

    private _onKeyDown(e?) {
    
        switch (e.keyCode) {

            case Utils_UI.KeyCode.ENTER:
                this._handleEnterKeyPressEvent(e.data);
                break;

            case Utils_UI.KeyCode.UP:              
                this._selectRowInVariableValuesTable(e.data, Utils_UI.KeyCode.UP);
                break;

            case Utils_UI.KeyCode.DOWN:
                this._selectRowInVariableValuesTable(e.data, Utils_UI.KeyCode.DOWN);
                break;
        }        
    }

    private _isAnyEmptyRowPresentInVariableValuesTable(rows: JQuery = undefined) {

        if (!rows) {
            rows = this._rightPaneUIControls._variableValuesTable.find("tr");
        }

        if (rows && rows.length > 0) {
        
            for (let counter = 0; counter < rows.length; counter++) {

                if (rows[counter]) {
                    let val: string = $(rows[counter]).find("input").val();

                    if (val) {
                        val = val.trim();
                    }

                    if ( val === null || val === undefined || Utils_String.ignoreCaseComparer(val, Utils_String.empty) === 0 ) {
                        return true;
                    }
                }
            }
        }

        return false;
    }    

    private _handleEnterKeyPressEvent(selectedRow: JQuery) {
         
        let rows: JQuery = this._rightPaneUIControls._variableValuesTable.find("tr");
        let selectedRowIndex: number = rows.index(selectedRow);

        this._showRemoveButton(selectedRow, false);
        if (rows && rows.length > 0) {

            if (selectedRowIndex === $(rows[rows.length - 1]).index() &&
                this._isAnyEmptyRowPresentInVariableValuesTable(rows) === false) {
                // Last row. Create a new row only if there is no existing empty row
                this._addRowInVariableValuesTable(Utils_String.empty);
            }
            else {

                for (let counter: number = 0; counter < rows.length; counter++) {

                    if ($(rows[counter]).index() === selectedRowIndex && rows[counter + 1]) {
                        $(rows[counter + 1]).find("input").select();
                        return false;
                    }
                }
            }
        }
    }    

    private _selectRowInVariableValuesTable(selectedRow: JQuery, key: Utils_UI.KeyCode) {

        let rows: JQuery = this._rightPaneUIControls._variableValuesTable.find("tr");
        let selectedRowIndex: number = rows.index(selectedRow);        

        if (selectedRowIndex > -1) {

            let nextNode: number = 0;
            if (key === Utils_UI.KeyCode.UP) {
                nextNode = -1;
            }
            else if (key === Utils_UI.KeyCode.DOWN) {
                nextNode = 1;
            }

            if (nextNode !== 0) {
                let rows: JQuery = this._rightPaneUIControls._variableValuesTable.find("tr");

                for (let counter: number = 0; counter < rows.length; counter++) {

                    if ($(rows[counter]).index() === selectedRowIndex && rows[counter + nextNode]) {
                        this._showRemoveButton(selectedRow, false);
                        $(rows[counter + nextNode]).find("input").select();

                        // Removing tab index of the last selected row.
                        selectedRow.find(".input").attr("tabindex", "-1");
                        return false;
                    }
                }
            }
        } 
    }

    private _showRemoveButton(row, showDeleteButton: boolean){
        let deleteButton = row.find("button.variable-value-remove").first();
        
        if (!deleteButton){
            return;
        }
        if (showDeleteButton){
            deleteButton.show();
        }
        else{
            deleteButton.hide();
        }
    }

    private _setSaveVariableButtonDisabledState() {

        let isDisabled: boolean = true;

        if (Utils_String.ignoreCaseComparer(this._rightPaneUIControls._variableTitle.val().trim(), Utils_String.empty) !== 0 &&
            this.isDirty() === true &&
            this._isAnyNonEmptyRowPresentInVariableValuesTable() === true) {
            isDisabled = false;
        }

        this._setToolbarButtonDisabledState(TestVariableToolbarCommands.saveTestVariable, isDisabled);
    }

    private _isAnyNonEmptyRowPresentInVariableValuesTable() {

        let rows: JQuery = this._rightPaneUIControls._variableValuesTable.find("tr");

        if (rows && rows.length > 0) {

            for (let counter = 0; counter < rows.length; counter++) {

                if (rows[counter]) {
                    let val: string = $(rows[counter]).find("input").val();

                    if (val) {
                        val = val.trim();
                    }

                    return val && Utils_String.ignoreCaseComparer(val, Utils_String.empty) !== 0;
                }
            }
        }

        return false;
    }
    
    private _setRefreshVariableButtonDisabledState() {

        let isDisabled: boolean = true;

        if (this._selectedVariable && this._selectedVariable.id !== -1) {
            isDisabled = false;
        }

        this._setToolbarButtonDisabledState(TestVariableToolbarCommands.refreshTestVariableSingle, isDisabled);        
    }

    private _setToolbarButtonDisabledState(buttonId: string, isDisabled: boolean) {

        this._rightPaneUIControls._variableToolbar.updateCommandStates
            ([{
                id: buttonId,
                disabled: isDisabled
            }]);
    }

    private _getToolbarButtonDisabledState(buttonId: string): boolean {

        return (this._rightPaneUIControls._variableToolbar.getCommandState(buttonId) === Menus.MenuItemState.Disabled);
    }

    private _clearDirtyFlags() {
        this._currentVariableDetailsDirty = false;
    }
    //Right Pane Controls region ends
}

// TFS plugin model requires this call for each tfs module. 
VSS.tfsModuleLoaded("TFS.TestManagement.VariableView", exports);
