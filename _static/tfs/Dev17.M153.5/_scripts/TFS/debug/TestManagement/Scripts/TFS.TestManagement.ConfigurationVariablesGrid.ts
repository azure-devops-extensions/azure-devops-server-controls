import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import Controls = require("VSS/Controls");
import Contracts = require("TFS/TestManagement/Contracts");
import Combos = require("VSS/Controls/Combos");
import Grids = require("VSS/Controls/Grids");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;

class ConfigurationVariablesGridUIControls {
    variableName: Combos.Combo;
    variableValue: Combos.Combo;
}

class ColumnIndices {
    public static Name: string = "name";
    public static Value: string = "value";
    public static RemoveVariable: string = "removeVariable";
}

export class ConfigurationVariablesGrid extends Grids.GridO<Grids.IGridOptions> {

    allTestVariables: Contracts.TestVariable[];   
    selectedConfiguration: Contracts.TestConfiguration;    
    currentConfigVariablesGridDirtyFlag: boolean;
    testVariablesNameList: string[];    
    
    private configVariablesCombos: ConfigurationVariablesGridUIControls[];

    constructor(options: Grids.IGridOptions) {        
        super(options);     

        this.allTestVariables = [];   
        this.configVariablesCombos = [];   
        this.currentConfigVariablesGridDirtyFlag = false;  
    }

    public initialize() {
        super.initialize(); 
    }  

    public initializeOptions(options: Grids.IGridOptions) {
    
        super.initializeOptions($.extend({            
            columns: this._getColumns(),            
            allowMultiSelect: false,
            allowMoveColumns: false,
            header: true
        }, options));     
    }

    public _drawRows(visible, includeNonDirtyRows){
        super._drawRows(visible, includeNonDirtyRows);
        let configData = this.getConfigurationVariablesData();

        $.each(this._rows, (dataIndex, rowInfo) => {
                let currentRow = rowInfo.row;
                if (currentRow){
                 if (configData && configData[dataIndex]){
                      currentRow.attr("aria-label", 
                              Utils_String.format(
                              Resources.ConfigurationVariableRowLabel, 
                              configData[dataIndex].name));
                 } else{
                       currentRow.attr("aria-label", 
                              Utils_String.format(
                              Resources.EmptyConfigurationVariableRowLabel, 
                              dataIndex));
                 }
              }
            });
    }

    public _onFocus(e?: JQueryEventObject): any {
        this._showDeleteButton(true);
        super._onFocus(e);
    }

    public _clearSelection(){
        this._showDeleteButton(false);
        super._clearSelection();
    }

    public _addSelection(rowIndex: number, dataIndex?: number, options?: any) {
        super._addSelection(rowIndex, dataIndex, options);
        this._showDeleteButton(true);
    }
    
    public reset() {
        
    /// <summary>
    /// Removes all rows from the grid and clears all data structures associated with it
    /// </summary>

        this._cleanUpRows();
        delete this.configVariablesCombos;
        this.selectedConfiguration = null;
        
        this._options.source = [];    
        this.setDataSource(this._options.source);    
        this.currentConfigVariablesGridDirtyFlag = false;
        
        this.getElement().height(this._rowHeight);  //sets initial height of the grid. This helps in placing Add variable button at right location on grid reset

        this._contentSize.height = 0;
    }

    public addRow() {
    
    /// <summary>
    /// Appends a new row at the end of the grid
    /// </summary>

        if (this.allTestVariables && this.allTestVariables.length > 0) {
        
            delete this.configVariablesCombos;
            this.configVariablesCombos = [];

            if (this._options.source === undefined || this._options.source === null) {
                this._options.source = [];
            }

            this._options.source.push([Utils_String.empty, Utils_String.empty]);
            this.setDataSource(this._options.source);

            this.currentConfigVariablesGridDirtyFlag = true;

            this._setConfigurationVariablesGridHeight();

            this.focus(10);
            this.setSelectedDataIndex(this.getLastRowDataIndex());
        }
    }

    public getConfigurationVariablesData(): Contracts.NameValuePair[] {

    /// <summary>
    /// Returns all selected test variables and their values
    /// </summary>
        
        let variablesData: Contracts.NameValuePair[] = [];
    
        let gridSource: string[][] = this._options.source;

        let variablesList: string[] = [];
        if (gridSource !== null && gridSource !== undefined && gridSource.length > 0) {

            gridSource.forEach((rowData: string[]) => {
                if (rowData !== null && rowData !== undefined
                    && Utils_String.ignoreCaseComparer(rowData[0], Utils_String.empty) !== 0
                    && Utils_String.ignoreCaseComparer(rowData[1], Utils_String.empty) !== 0) { // As per discussion with Ravi, variables having no values will not be allowed and will not be saved. 
                                                                                                // This needs to be revisited when variables work will be done in configurations hub.
                    variablesData.push({name: rowData[0], value: rowData[1]});
                }
            });
        }
        
        return variablesData;        
    }

    public _populateConfigurationVariablesData(configuration: Contracts.TestConfiguration, allTestVariables: Contracts.TestVariable[]) {

    /// <summary>
    /// <param name="configuration" type= "Contracts.TestConfiguration" > Test configuration object from which test variables will get populated in the grid</param>
    /// <param name="allTestVariables" type= "Contracts.TestVariable[]" > Array of test variables</param>
    /// Populates grid with configuration variables data present in the specified configuration        
    /// </summary>

        this.reset();

        this.allTestVariables = allTestVariables;
        this.testVariablesNameList = [];
            
        if (this.allTestVariables !== null && this.allTestVariables !== undefined && this.allTestVariables.length > 0) {
            this.allTestVariables.forEach((variable: Contracts.TestVariable) => {
                this.testVariablesNameList.push(variable.name);
            });
        }

        this._rowHeight = 35;

        this.selectedConfiguration = configuration;

        if (this.selectedConfiguration && this._options.source) {
            this._options.source = function () {
                let result = [];

                configuration.values.forEach((variable: Contracts.NameValuePair) => {
                    if (variable !== null && variable !== undefined) {
                        result[result.length] = [variable.name, variable.value];
                    }
                });

                return result;
            } ();

            this.setDataSource(this._options.source);
        }   
                            
        this._setConfigurationVariablesGridHeight();           
    }

    private _showDeleteButton(showButton: boolean){
        let rowInfo = this.getRowInfo(this._selectedIndex);
        if (rowInfo && rowInfo.row){
           let deleteButton = rowInfo.row.find("button.configuration-variable-grid-remove").first();

           if (!deleteButton){
               return;
           }
           if (showButton){
                 deleteButton.show();
           } else{
                 deleteButton.hide();
           }
        }
    }

    
    private _getColumns(): Grids.IGridColumn[] {
        let columns: Grids.IGridColumn[] = [];

        columns.push({
            index: ColumnIndices.Name,
            text: Resources.ConfigurationVariableGridColumnTitleName,
            canSortBy: false,
            width: 395,            
            rowCss: "configuration-variables-grid-layout-grid-row",
            getCellContents: delegate(this, this._getNameCellContents),
            tooltip: Resources.ConfigurationVariableName
        });
        
        columns.push({
            index: ColumnIndices.Value,
            text: Resources.ConfigurationVariableGridColumnTitleValue,
            canSortBy: false,
            width: 395,    
            rowCss: "configuration-variables-grid-layout-grid-row",      
            getCellContents: delegate(this, this._getValueCellContents),
            tooltip: Resources.ConfigurationVariableValue          
        });     
        
        columns.push({
            index: ColumnIndices.RemoveVariable,
            canSortBy: false,
            width: 24,
            getCellContents: delegate(this, this._getRemoveVariableCellContents),
            fixed: true,
            rowCss: "configuration-variables-grid-layout-grid-row"                       
        });

        return columns;
    }    
        
    private _getListOfAllSelectedConfigurationVariables(): string[] {

        let gridSource: string[][] = this._options.source;

        let variablesList: string[] = [];
        if (gridSource !== null && gridSource !== undefined && gridSource.length > 0) {

            gridSource.forEach((rowData: string[]) => {
                if (rowData !== null && rowData !== undefined && Utils_String.ignoreCaseComparer(rowData[0], Utils_String.empty) !== 0) {
                    variablesList.push(rowData[0]);
                }
            });
        }

        return variablesList;        
    }

    private _getVariableNameInSelectedRow(dataIndex: number): string {

        let selectedVariableInCurrentRow: string = Utils_String.empty;

        if (dataIndex > -1) {

            let data: string[] = this.getRowData(dataIndex);

            if (data !== null && data !== undefined && data.length > 0) {
                let selectedVariable: string = data[0].trim();

                if (Utils_String.ignoreCaseComparer(selectedVariable, Utils_String.empty) !== 0) {
                    selectedVariableInCurrentRow = selectedVariable;
                }
            }
        }
        return selectedVariableInCurrentRow;
    }

    private _computeConfigurationVariableNameSource(dataIndex: number): string[] {

        let allVariablesList: string[] = this.testVariablesNameList;
        let selectedVariablesList: string[] = this._getListOfAllSelectedConfigurationVariables();
        let selectedVariableInCurrentRow: string = this._getVariableNameInSelectedRow(dataIndex);

        let testVariableSource: string[] = [];

        allVariablesList.forEach((variable: string) => {

            if (Utils_String.ignoreCaseComparer(variable, selectedVariableInCurrentRow) === 0) {
                testVariableSource.push(variable);
            }
            else if (selectedVariablesList.indexOf(variable) < 0) {
                testVariableSource.push(variable);
            }
        });

        return testVariableSource;
    }

    private _configurationVariableNameDropDownClicked(eventObject: JQueryMouseEventObject) {

        let selectedRowNumber: number = eventObject.data;

        if (this.configVariablesCombos !== null && this.configVariablesCombos !== undefined && this.configVariablesCombos.length > selectedRowNumber) {

            let allVariablesList: string[] = this.testVariablesNameList;
            let selectedVariablesList: string[] = this._getListOfAllSelectedConfigurationVariables();

            let selectedVariableInCurrentCombo: string = this.configVariablesCombos[selectedRowNumber].variableName.getText().trim();

            let testVariableSource: string[] = [];

            allVariablesList.forEach((variable: string) => {

                if (Utils_String.ignoreCaseComparer(variable, selectedVariableInCurrentCombo) === 0) {
                    testVariableSource.push(variable);
                }
                else if (selectedVariablesList.indexOf(variable) < 0) {
                    testVariableSource.push(variable);
                }
            });

            this.configVariablesCombos[selectedRowNumber].variableName._options.source = testVariableSource;
            this.configVariablesCombos[selectedRowNumber].variableName.setSource(testVariableSource);
        }
    }

    private _getNameCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
    
        let TestVariableChangedDelegate: IEventHandler;

        let $configStateDiv = $("<div class = 'configuration-variables-grid-Name' />");

        let controlOptions = <Combos.IComboOptions>{
            height: "2.0em",
            allowEdit: false,
            indexChanged: delegate(this, this._configurationVariableChanged),
            source: this._computeConfigurationVariableNameSource(dataIndex),
            maxAutoExpandDropWidth: this.getColumns()[1].width - 10
        };

        let enhancementOptions = <Controls.EnhancementOptions>{
            ariaAttributes: {
                label: Resources.ConfigurationVariableGridColumnTitleName
            }
        };

        let combo = <Combos.Combo>Controls.BaseControl.create(Combos.Combo, $configStateDiv, controlOptions, enhancementOptions);

        combo.getElement().mousedown(dataIndex, delegate(this, this._configurationVariableNameDropDownClicked));
        
        let data = this.getRowData(dataIndex);
        combo.setText(data[0]);
        
        if (this.configVariablesCombos === undefined) {
            this.configVariablesCombos = [];
        }

        if (this.configVariablesCombos[dataIndex] === undefined) {
            this.configVariablesCombos[dataIndex] = new ConfigurationVariablesGridUIControls();            
        }

        this.configVariablesCombos[dataIndex].variableName = combo;
                
        let $cell = super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        $cell.text(""); //Required to remove an nbsp which gets added by _drawCell call.

        $configStateDiv.appendTo($cell);
                        
        return $cell;
    }

    private _configurationVariableChanged(index: number) {          

        if (this.allTestVariables !== null && this.allTestVariables !== undefined && this.allTestVariables.length > 0) {

            let variableName: string = this.configVariablesCombos[this.getSelectedRowIndex()].variableName.getText();
            let variableValues: string[] = this._getVariableValues(variableName);
            
            this.configVariablesCombos[this.getSelectedRowIndex()].variableValue._options.source = variableValues;
            this.configVariablesCombos[this.getSelectedRowIndex()].variableValue.setSource(variableValues);

            if (this.getRowInfo(this.getSelectedRowIndex())){
                  this.getRowInfo(this.getSelectedRowIndex()).row.attr("aria-label", 
                              Utils_String.format(
                              Resources.ConfigurationVariableRowLabel, 
                              variableName));
            }
            
            if (variableValues !== null && variableValues !== undefined && variableValues.length > 0) {
                this.configVariablesCombos[this.getSelectedRowIndex()].variableValue.setSelectedIndex(0);
            }

            this._options.source[this.getSelectedRowIndex()] = [variableName, variableValues.length > 0 ? variableValues[0] : Utils_String.empty];

            this.currentConfigVariablesGridDirtyFlag = true;  

            this._fireChange();          
        }
    }
    
    private _getVariableValues(variableName: string): string[] {

        let variableValues: string[] = [];

        if (variableName !== null && variableName !== undefined && variableName !== Utils_String.empty) {
            if (this.allTestVariables && this.allTestVariables.length > 0) {
                this.allTestVariables.forEach((variable: Contracts.TestVariable) => {
                    if (Utils_String.ignoreCaseComparer(variable.name, variableName) === 0) {
                        variableValues = variable.values;
                    }
                });
            }
        }

        return variableValues;
    }
    
    private _configurationVariableValueChanged(index: number) {

        let variableName: string = this.configVariablesCombos[this.getSelectedRowIndex()].variableName.getText();
        let variableValue: string = this.configVariablesCombos[this.getSelectedRowIndex()].variableValue.getText();

        this._options.source[this.getSelectedRowIndex()] = [variableName, variableValue];

        this.currentConfigVariablesGridDirtyFlag = true;

        this._fireChange();
    }

    private _getValueCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
    
        let data = this.getRowData(dataIndex);

        let $configStateDiv = $("<div class = 'configuration-variables-grid-Value' />");

        let controlOptions = <Combos.IComboOptions>{
            cssClass: "configuration-variables-grid-value-combo",
            width: "100%",
            height: "2.0em",
            allowEdit: false,
            indexChanged: delegate(this, this._configurationVariableValueChanged),
            source: this._getVariableValues(data[0]),
            maxAutoExpandDropWidth: this.getColumns()[2].width - 10
        };

        let enhancementOptions = <Controls.EnhancementOptions>{
            ariaAttributes: {
                label: Resources.ConfigurationVariableGridColumnTitleValue
            }
        };

        let combo = <Combos.Combo>Controls.BaseControl.create(Combos.Combo, $configStateDiv, controlOptions, enhancementOptions);

        combo.setSource(combo._options.source);        
                
        combo.setText(data[1]);
        
        this.configVariablesCombos[dataIndex].variableValue = combo;
                 
        let $cell = super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        $cell.text("");

        $configStateDiv.appendTo($cell);
       
        this._fireChange();

        return $cell;
    }
    
    private _onRemoveVariableFromConfigurationButtonClick(eventData: any) {
    
        this.getRowInfo(eventData.data).row.remove();   
        
        this.configVariablesCombos.splice(eventData.data, 1);
        
        let rowData: string[] = this.getRowData(eventData.data);        
        
        this._options.source = this._options.source.filter(function (elem) {
            return elem !== rowData;
        });
        
        this.setDataSource(this._options.source);

        if (this.selectedConfiguration !== null && this.selectedConfiguration !== undefined) {
            for (let key in this.selectedConfiguration.values) {
                if (Utils_String.ignoreCaseComparer(key, rowData[0]) === 0) {
                    delete this.selectedConfiguration.values[key];
                }
            }
        } 

        this.currentConfigVariablesGridDirtyFlag = true;
        
        this._setConfigurationVariablesGridHeight(true);
        this._fireChange();    

        this.focus(10);
        // focus will goto same index row and if there is no row then focus will goto add button below
        if (this._count > 0) {
            if (eventData.data < this._count) {
                this.setSelectedDataIndex(eventData.data);
            } else {
                this.setSelectedDataIndex(eventData.data - 1);
            }
        } else {
            $(".add-configuration-variable").focus();
        }
        
    }

    private _getRemoveVariableCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {

        let $removeConfigVariableDiv: JQuery = $("<div class = 'configuration-variable-grid-remove' />");

        let $removeButton = $("<button />").addClass("configuration-variable-grid-remove bowtie-icon bowtie-edit-delete");
        $removeButton.attr("aria-label", Resources.DeleteRow).attr("tabindex", "-1");
        RichContentTooltip.add(Resources.DeleteRow, $removeButton);
        $removeButton.click(dataIndex, delegate(this, this._onRemoveVariableFromConfigurationButtonClick)).appendTo($removeConfigVariableDiv);
        
        $removeButton.hide();

        let gridRow: JQuery = this.getRowInfo(dataIndex).row;

        $removeButton.focusout(() => {
             $removeButton.hide();
        });

        gridRow.hover(() => {
            $removeButton.show();
        }, () => {
            $removeButton.hide();            
        });
        
        gridRow.mouseleave(() => {
            gridRow.removeClass("grid-row-current");
            gridRow.removeClass("grid-row-selected-blur");
            gridRow.removeClass("grid-row-selected");
        });

        //Limit row selection to actual contents. Extra 15px is for right margin
        this.getElement().parent().width(this._contentSpacer.width() + 15);

        let $cell: JQuery = super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        $cell.text("");

        $removeConfigVariableDiv.appendTo($cell);
        
        return $cell;
    }    

    private _setConfigurationVariablesGridHeight(rowdelete: boolean = false) {

        let currentContentSize = this._contentSize.height;

        if (rowdelete) {
            currentContentSize = currentContentSize - this._rowHeight;
        }
        
        let gridMaxHeight = parseInt(this._canvas.css("max-height"), 10);
        if (currentContentSize < gridMaxHeight) {

            let gridHeightToSet = this._rowHeight * (this._options.source.length) + 30; //Additional 30px are for header and padding
            if (gridHeightToSet > gridMaxHeight) {
                gridHeightToSet = gridMaxHeight;
            }
            this.getElement().height(gridHeightToSet);
        }

        this._scrollTop = this._canvasHeight;

        let configViewRightPaneDiv: JQuery = this.getElement().parents().find(".configurations-view-right-pane");

        configViewRightPaneDiv.get(0).scrollTop = configViewRightPaneDiv.position().top +
                                                  this._canvasHeight +
                                                  this.getElement().parent().siblings(".configuration-details").outerHeight();    
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.ConfigurationVariablesGrid", exports);