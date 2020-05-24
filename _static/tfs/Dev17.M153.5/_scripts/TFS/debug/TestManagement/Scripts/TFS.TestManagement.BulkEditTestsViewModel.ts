/// <reference types="jquery" />

import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import PageHelper = require("TestManagement/Scripts/TFS.TestManagement.PageHelper");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import EditableGrid = require("VSS/Controls/EditableGrid");
import Events_Document = require("VSS/Events/Document");
import Events_Handlers = require("VSS/Events/Handlers");
import Identities_Picker = require("VSS/Identities/Picker/Controls");
import Identities_Services = require("VSS/Identities/Picker/Services");
import Menus = require("VSS/Controls/Menus");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Dialogs = require("VSS/Controls/Dialogs");
import { Exceptions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { CommonIdentityPickerCellEditor } from "Presentation/Scripts/TFS/Controls/IdentityPickerCellEditors";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

let delegate = Utils_Core.delegate;
let TestCaseCategoryUtils = TMUtils.TestCaseCategoryUtils;
let WITUtils = TMUtils.WorkItemUtils;
let DAUtils = TestsOM.DAUtils;

// Represents a row in the bulk edit test case grid. 
export class RowViewModel {

    constructor(testCaseTitle?: string, actionId?: number, action?: string, expectedResult?: string, testCase?: TestsOM.TestCase, isTestCase?: boolean, isSharedStep?: boolean, refId?: number, additionalFields?: any) {
        this.testCaseTitle = testCaseTitle || "";
        this.action = action || "";
        this.expectedResult = expectedResult || "";
        this.additionalFields = additionalFields || {};
        this.actionId = actionId;
        this.isTestCase = isTestCase;
        this.testCase = testCase || null;
        this.isSharedStep = isSharedStep;
        this.refId = refId;
    }

    public canEdit(propertyName: string): boolean {
        // All conditional editing restrictions apply only when the testCase associated is valid. The ID property is disabled unconditionally in the grid itself.
        if (this.testCase) {
            if (propertyName === "testCaseTitle") {
                return this.isTestCase;
            }
            else if (propertyName === "action" || propertyName === "expectedResult") {
                return !this.isTestCase && !this.isSharedStep;
            }
            else  {
                return this.isTestCase;
            }
        }
        else {
            return true;
        }
    }

    public isEmptyRow() {
        return !this.testCaseTitle && !this.action && !this.expectedResult;
    }

    public getValue(property: string) {
        let value: string,
            $value: JQuery,
            $lines: JQuery;
        if (property === "id") {
            if (this.testCase && this.isTestCase && this.testCase.getId() > 0) {
                return this.testCase.getId();
            }
            else {
                return "";
            }
        }
        else if (property === "action" || property === "expectedResult") {
            value = this[property];
            if ($.trim(value) !== "") {
                $value = $(TestsOM.HtmlUtils.wrapInDiv(value));
                if ($.trim($value.text()) !== "") {
                    $lines = $value.find("p");
                    if ($lines.length > 1) {
                        TestsOM.HtmlUtils.replaceEmptyParagraphTagsWithNbsp($lines);
                        return $value.html();
                    }
                }
            }
            return value;
        }
        else if (this.additionalFields.hasOwnProperty(property)) {
                return this.additionalFields[property];
        }
        else {
            return this[property];
        }
    }

    public setRowHeight(height: number) {
        if (this._rowHeight) {
            this._rowHeight.height = height;
            this._rowHeight.isInvalid = false;
        }
        else {
            this._rowHeight = new EditableGrid.RowHeightInfo(height);
        }
    }

    public getRowHeightInfo(): EditableGrid.RowHeightInfo {
        if (this._rowHeight) {
            return this._rowHeight;
        }
        else {
            return new EditableGrid.RowHeightInfo(0);
        }
    }

    public invalidateRowHeight() {
        if (!this._rowHeight) {
            this._rowHeight = new EditableGrid.RowHeightInfo(0);
        }

        this._rowHeight.isInvalid = true;
    }

    public testCaseTitle: string;
    public action: string;
    public expectedResult: string;
    public additionalFields: any;
    public testCase: TestsOM.TestCase;
    public actionId: number;
    public isTestCase: boolean;
    public isSharedStep: boolean;
    public refId: number;

    // The main purpose of tracking row height is to ensure that whenever we re-draw grid layout, we set the cell size as we create the cells.
    // The other way to do the same is to set the cell size after they are laid out. However, the latter approach causes a slight flicker that is
    // noticeable without the former being there. Please note we still need to have the latter to ensure that when the data is updated from backend,
    // we size the cells appropriately. In this case, the flicker will only happen when setDataSource is called and not on every time layouting is done.
    private _rowHeight: EditableGrid.RowHeightInfo;
}

export class ClipboardDataInfo {
    constructor(gridColumns: any[])
    {
        this._gridColumns = gridColumns;
    }

    public getData() {
        return this._clipboardData.slice(0);
    }

    public setData(clipboardData: RowViewModel[]) {
        let rowViewModels: RowViewModel[] = [],
            rowViewModel: RowViewModel,
            clipboardDataCount: number = clipboardData.length,
            i: number;

        for (i = 0; i < clipboardDataCount; i++) {
            rowViewModel = new RowViewModel(clipboardData[i].testCaseTitle, clipboardData[i].actionId, clipboardData[i].action, clipboardData[i].expectedResult, clipboardData[i].testCase, clipboardData[i].isTestCase, clipboardData[i].isSharedStep, clipboardData[i].refId, clipboardData[i].additionalFields);
            rowViewModels.push(rowViewModel);
        }

        this._clipboardData = rowViewModels;
    }

    public toPlainText(additionalFields?: string[], keepIdColumn?: boolean): string {
        let rowViewModelCount: number,
            rowViewModel: RowViewModel,
            testCaseTitle: string,
            idText: string,
            actionText: string,            
            expectedResultText: string,
            copyIdColumn = this._hasTestCaseRow(),
            additionalProperties: string,
            result: string = "",
            i: number;
        if (this._clipboardData) {
            rowViewModelCount = this._clipboardData.length;
            for (i = 0; i < rowViewModelCount; i++) {
                if (i > 0) {
                    result += "\r\n";
                }
                rowViewModel = this._clipboardData[i];
                idText = this._getTextContent(rowViewModel.getValue("id"));
                if (idText !== "") {
                    idText = Utils_String.format("{0}:{1}", Resources.IdColumnName, idText);
                }

                testCaseTitle = rowViewModel.getValue("testCaseTitle");

                actionText = this._getTextContent(rowViewModel.getValue("action"));             
                actionText = ClipboardDataInfo._formatStringInExcelFormat(actionText);                

                expectedResultText = this._getTextContent(rowViewModel.getValue("expectedResult"));             
                expectedResultText = ClipboardDataInfo._formatStringInExcelFormat(expectedResultText);                
                if (copyIdColumn && keepIdColumn) {
                    result += idText + "\t";
                }

                result += testCaseTitle + "\t" + actionText + "\t" + expectedResultText;
                //get additional fields only if testcase row or if its is a new row that is not a test case or test step row
                if ((rowViewModel.isTestCase || (!rowViewModel.isTestCase && !rowViewModel.testCase))
                    && additionalFields && additionalFields.length > 0) {
                    result += this._getTextForAdditionalProps(rowViewModel, additionalFields);
                }
            }
        }
        return result;
    }

    private _getTextForAdditionalProps(row: RowViewModel, additionalFields: string[]) {
        let prop, copyString = "", value: any, index = 0, l: number;
        for (index = 0, l = additionalFields.length; index < l; index++) {
            value = row.getValue(additionalFields[index]);
            if (value !== 0 && !value) {
                value = "";
            }
            copyString += "\t" + value;
        }
        return copyString;
    }

    public static _formatStringInExcelFormat(stringToFormat: string) {
        let resultString = stringToFormat;
        resultString = resultString.replace(/\r\n/g, "\n");
        if (resultString.indexOf("\n") >= 0) {
            resultString = resultString.replace(/"/g, "\"\"");
            resultString = "\"" + resultString + "\"";
        }
        return resultString;
    }
    
    public static _getInnerTextFromHtmlElement(htmlString: string): string {
        let innerText: string;
        try {
            innerText = $(htmlString)[0].innerText;
        }
        catch (e){
            innerText = $(TestsOM.HtmlUtils.wrapInDiv(htmlString))[0].innerText;
        }
        return innerText;
    }    

    private _getTextContent(htmlString: string): string {
        let textContent: string;

        if (/^<div*>/i.test(htmlString)) {
            textContent = ClipboardDataInfo._getInnerTextFromHtmlElement(htmlString);
        }
        else {
            textContent = $(TestsOM.HtmlUtils.wrapInDiv(htmlString))[0].innerText;            
        }
        return textContent;
    }

    public hasTitleRow(): boolean {
        let i: number,
            rowViewModel: RowViewModel,
            dataLength: number = this._clipboardData.length;

        for (i = 0; i < dataLength; i++) {
            rowViewModel = this._clipboardData[i];
            if (rowViewModel.getValue("testCaseTitle") !== "") {
                return true;
            }
        }
        return false;
    }

    public setGridColumns(columns: any[]) {
        this._gridColumns = columns;
    }

    public hasData(): boolean {
        return this._clipboardData && this._clipboardData.length > 0;
    }

    public getClipboardDataFromPlainText(clipboardData: string, selectedCellInfo: EditableGrid.CellInfo): ClipboardDataInfo {
        let rowViewModels: RowViewModel[] = [],
            rowViewModel: RowViewModel,
            length: number,
            i: number,
            clipboardDataInfo: ClipboardDataInfo,
            clipboardDataRows: string[],
            clipboardDataRow: string;

        Diag.logVerbose("[ClipboardDataInfo.getClipboardDataFromPlainText] clipboardText = " + clipboardData);
        if (clipboardData) {
            clipboardDataRows = clipboardData.split("\r\n");
            length = clipboardDataRows.length;
            if (length > 201) {
                alert(Resources.ClipboardDataPasteInChunks);
                return null;
            }
            for (i = 0; i < length; i++) {
                if (clipboardDataRows[i] !== "") {
                    rowViewModel = this._createRowViewModelFromClipboardText(clipboardDataRows[i], selectedCellInfo);
                    if (!rowViewModel) {//invalid
                        alert(Resources.ClipboardDataInvalidFormat);
                        return null;
                    }
                    else {
                        rowViewModels.push(rowViewModel);
                    }
                }
            }
            clipboardDataInfo = new ClipboardDataInfo(this._gridColumns);
            clipboardDataInfo.setData(rowViewModels);
            return clipboardDataInfo;
        }
    }

    private _createRowViewModelFromClipboardText(clipboardRowText: string, selectedCellInfo: EditableGrid.CellInfo): RowViewModel {
        let clipboardRowColumns: string[],
            rowViewModel: RowViewModel = new RowViewModel(),
            columnName: string,
            index: number,
            i: number,
            j: number,
            columnCount: number;
        Diag.logVerbose("[ClipboardDataInfo._createRowViewModelFromClipboardText] clipboardText = " + clipboardRowText);
        Diag.logVerbose("[ClipboardDataInfo._createRowViewModelFromClipboardText] columnOrder = " + selectedCellInfo.columnOrder);

        clipboardRowColumns = clipboardRowText.split("\t");
        if (clipboardRowColumns) {
            columnCount = clipboardRowColumns.length;

            if (columnCount > this._getColumnsFromCurrentExcludingIdColumn(selectedCellInfo.columnOrder) + 1) { //invalid
                return null;
            }

            index = selectedCellInfo.columnOrder;
            
            for (i = 0; i < columnCount; i++) {
                if (clipboardRowColumns[i].indexOf("\n") >= 0 && clipboardRowColumns[i][0] === "\"" && clipboardRowColumns[i][clipboardRowColumns[i].length - 1] === "\"") {
                    clipboardRowColumns[i] = clipboardRowColumns[i].substr(1, clipboardRowColumns[i].length - 2);
                    clipboardRowColumns[i] = clipboardRowColumns[i].replace(/""/g, "\"");
                }
            }

            for (i = index, j = 0; j < columnCount && i < this._gridColumns.length; i++) {
                if (this._isIdColumn(this._gridColumns[i].index)) {                    
                    continue;
                }
                if (!this._gridColumns[i].isMultiLine) {
                    clipboardRowColumns[j] = clipboardRowColumns[j].replace(/\n/g, " ");
                }
                if (this._gridColumns[i].isRichText) {
                    clipboardRowColumns[j] = Utils_String.htmlEncode(clipboardRowColumns[j]);
                    clipboardRowColumns[j] = clipboardRowColumns[j].replace(/\n/g, "<br />");
                }
                columnName = this._gridColumns[i].index;
                if (rowViewModel.hasOwnProperty(columnName)) {
                    rowViewModel[columnName] = clipboardRowColumns[j++];
                }
                else {
                    rowViewModel.additionalFields[columnName] = clipboardRowColumns[j++];
                }
            
            }

            return rowViewModel;
        }
        else {
            return null;
        }
    }

    private _isIdColumn(columnIndex: string) {
        return BulkEditTestsGrid._idColumn.index === columnIndex;
    }

    private _getColumnsFromCurrentExcludingIdColumn(columnOrder: number) {
        let columnCount: number = this._gridColumns.length,
            count: number = 0,
            i: number;
        for (i = columnOrder; i < columnCount; i++) {
            if (!this._isIdColumn(this._gridColumns[i].index)) {
                count++;
            }
        }
        return count;
    }

    private _hasTestCaseRow(): boolean {
        let i: number,
            clipboardRowsCount: number,
            rowViewModel: RowViewModel;
        if (this._clipboardData) {
            clipboardRowsCount = this._clipboardData.length;
            for (i = 0; i < clipboardRowsCount; i++) {
                rowViewModel = this._clipboardData[i];
                if (rowViewModel.getValue("id") !== "") {
                    return true;
                }
            }
        }
        return false;
    }

    private _clipboardData: RowViewModel[];
    private _gridColumns: any[];
}

class ClipboardAction {

    constructor(bulkEditViewModel: BulkEditTestsViewModel, clipboardData: ClipboardDataInfo) {
        this._bulkEditViewModel = bulkEditViewModel;
        this._clipboardData = clipboardData;
    }

    public _canPerform(dataIndices: number[]): boolean {
        return true;
    }

    public _copyToClipboard(e?) {
        let additionalFields = $.map(this._bulkEditViewModel.getAdditionalWorkItemFields(), (item, i) => {
            return item.referenceName;
        });
        Diag.logVerbose("[ClipboardAction._copyToClipboard] Started copying data to clipboard");
        let progressId = VSS.globalProgressIndicator.actionStarted("copyToClipboard");
        if ((<any>window).clipboardData) {
            (<any>window).clipboardData.setData("Text", this._clipboardData.toPlainText(additionalFields, e.altKey));
        }
        else {
            if (e.originalEvent.clipboardData) {
                e.originalEvent.clipboardData.setData("Text", this._clipboardData.toPlainText(additionalFields, e.altKey));
            }
            else {
                // Copy to clipboard directly if clipboard data was not initialized.
                if (navigator && navigator["clipboard"]) {
                    navigator["clipboard"].writeText(this._clipboardData.toPlainText(additionalFields, e.altKey));
                }
                else {
                    // 'navigator' is not available on edge and IE, use backup method of copying to clipboard instead.
                    this.copyToClipboardDirectly(this._clipboardData.toPlainText(additionalFields, e.altKey));
                }
            }
        }
        VSS.globalProgressIndicator.actionCompleted(progressId);
        Diag.logVerbose("[ClipboardAction._copyToClipboard] Done with copying data to clipboard");
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    private copyToClipboardDirectly(text: string) {

        if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
            var textarea = document.createElement("textarea");
            textarea.textContent = text;
            textarea.style.position = "fixed";
            document.body.appendChild(textarea);
            textarea.select();
            try {
                return document.execCommand("copy");
            } catch (ex) {
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }

    public _bulkEditViewModel;
    public _clipboardData;
}

class CopyAction extends ClipboardAction {

    constructor(bulkEditViewModel: BulkEditTestsViewModel, clipboardData: ClipboardDataInfo) {
        super(bulkEditViewModel, clipboardData);
    }

    public copy(dataIndices: number[], e?) {
        let indicesCount: number = dataIndices.length,
            i: number,
            dataSource: RowViewModel[] = this._bulkEditViewModel.getDataSource(),
            rowViewModels: RowViewModel[] = [];

        for (i = 0; i < indicesCount; i++) {
            rowViewModels.push(dataSource[dataIndices[i]]);
        }
        this._clipboardData.setData(rowViewModels);
        this._copyToClipboard(e);
    }
}

class CutAction extends ClipboardAction {

    constructor(bulkEditViewModel: BulkEditTestsViewModel, clipboardData: ClipboardDataInfo) {
        super(bulkEditViewModel, clipboardData);
    }

    public _canPerform(dataIndices: number[]): boolean {
        let indicesCount: number = dataIndices.length,
            rowViewModel: RowViewModel,
            i: number,
            dataSource = this._bulkEditViewModel.getDataSource();

        for (i = 0; i < indicesCount; i++) {
            rowViewModel = dataSource[dataIndices[i]];
            if (rowViewModel.isTestCase && rowViewModel.getValue("id") !== "") {
                return false;
            }
        }
        return true;
    }

    public cut(dataIndices: number[], e?: any) {
        if (this._canPerform(dataIndices)) {
            let indicesCount: number = dataIndices.length,
                i: number,
                dataSource: RowViewModel[] = this._bulkEditViewModel.getDataSource(),
                rowViewModels: RowViewModel[] = [];

            for (i = 0; i < indicesCount; i++) {
                rowViewModels.push(dataSource[dataIndices[i]]);
            }
            this._clipboardData.setData(rowViewModels);
            this._bulkEditViewModel.deleteRows(dataIndices);
            this._copyToClipboard(e);
        }
    }
}

class PasteAction extends ClipboardAction {

    constructor(bulkEditViewModel: BulkEditTestsViewModel, clipboardData: ClipboardDataInfo) {
        super(bulkEditViewModel, clipboardData);
    }

    public _canPerform(dataIndices: number[], selectionInfo?: ISelectionInfo, cellInfo?: EditableGrid.CellInfo): boolean {
        let canPerform: boolean = false,
            showError: boolean = false;
        if (this._clipboardData.hasData()) {
            if (dataIndices.length === 1) {                
                if (selectionInfo.isTestCaseSelected && this._clipboardData.hasTitleRow()) {
                    canPerform = false;
                    showError = true;
                }
                else if (selectionInfo.isTestStepSelected && this._bulkEditViewModel.isTestStep(dataIndices[0] + 1) && this._clipboardData.hasTitleRow()) {
                    canPerform = false;
                    showError = true;
                }
                else {
                    canPerform = true;
                }
            }
        }
        if (!canPerform && showError) {
            alert(Resources.BulkEditPasteError);
        }
        return canPerform;
    }

    public paste(dataIndices: number[], selectionInfo: ISelectionInfo, selectedCellInfo: EditableGrid.CellInfo, e?: any) {

        let progressId: number,
            rowViewModels: RowViewModel[],
            dataSource: RowViewModel[] = this._bulkEditViewModel.getDataSource(),
            selectedRowViewModel: RowViewModel = dataSource[dataIndices[0]],
            pasteRowIndex: number,
            onPasteComplete: (command: string, affectedRowIndices: number[]) => void ,
            rowViewModelCount: number,
            affectedRowIndices: number[] = [],
            errorOccured: boolean = false,
            i: number;

        errorOccured = this._setClipboardDataIfChanged(selectedCellInfo, e);
        if (errorOccured) { // In this case, we would have shown an error dialog to the user already
            return false;
        }
        if (this._canPerform(dataIndices, selectionInfo)) {
            Diag.logVerbose("[ClipboardAction._copyToClipboard] Started pasting data from clipboard");
            rowViewModels = this._clipboardData.getData();
            rowViewModelCount = rowViewModels.length;

            onPasteComplete = (command: string, affectedRowIndices: number[]) => {
                Diag.logVerbose("[ClipboardAction._copyToClipboard] Completed pasting data from clipboard");
                if (this._bulkEditViewModel.updated) {
                    this._bulkEditViewModel.updated(command, affectedRowIndices);
                }
            };

            if (selectedRowViewModel.isEmptyRow()) {
                pasteRowIndex = dataIndices[0] - 1;
            }
            else {
                pasteRowIndex = dataIndices[0];
            }

            for (i = 0; i < rowViewModelCount; i++) {
                affectedRowIndices.push(pasteRowIndex + i + 1);
            }

            if ((selectionInfo.isTestStepSelected && this._bulkEditViewModel.isTestStep(dataIndices[0] + 1)) || selectionInfo.isTestCaseSelected) {
                this._bulkEditViewModel.insertTestSteps(pasteRowIndex + 1, 
                                                        rowViewModels, 
                                                        selectedRowViewModel.testCase, 
                                                        true, 
                                                        () => { 
                                                            onPasteComplete(BulkEditCommands.insertTestStep, affectedRowIndices);
                                                        });
            }
            else {
                for (i = 0 ; i < rowViewModelCount; i++) {
                    this._bulkEditViewModel.insertRow(pasteRowIndex + i + 1, false, 1, rowViewModels[i], true);
                }

                onPasteComplete(EditableGrid.EditableGrid.Commands.CMD_INSERT_ROW, affectedRowIndices);
                this._bulkEditViewModel.setRowsDirty();
            }
            return true;
        }
        return false;
    }

    private _setClipboardDataIfChanged(selectedCellInfo: EditableGrid.CellInfo, e?): boolean {
        let clipboardData: ClipboardDataInfo,
            currentClipboardDataText: string,
            newClipboardDataText: string,
            additionalFields = $.map(this._bulkEditViewModel.getAdditionalWorkItemFields(), (item, i) => {
            return item.referenceName;
        });

        if (e && e.clipboardDataText) {
            newClipboardDataText = e.clipboardDataText;
        }
        else if ((<any>window).clipboardData) {
            newClipboardDataText = (<any>window).clipboardData.getData("Text");
        }
        else if (e) {
            newClipboardDataText = e.originalEvent.clipboardData.getData("Text");
        }
        clipboardData = this._clipboardData.getClipboardDataFromPlainText(newClipboardDataText, selectedCellInfo);
        if (clipboardData === null) { // Error occurred and error has been shown to the user
            return true;
        }
        currentClipboardDataText = this._clipboardData.toPlainText(additionalFields);
        Diag.logVerbose("[_setClipboardDataIfChanged] New ClipboardData " + newClipboardDataText);
        Diag.logVerbose("[_setClipboardDataIfChanged] Current ClipboardData " + currentClipboardDataText);

        if (newClipboardDataText && clipboardData && (newClipboardDataText !== currentClipboardDataText)) {
            this._clipboardData.setData(clipboardData.getData());
        }
        return false;
    }

}

interface ITestCaseAndRecord {
    testCase: TestsOM.TestCase;
    record: RowViewModel;
}

interface ISelectionInfo {
    isTestCaseSelected: boolean;
    isTestStepSelected: boolean;
    isSingleTestCaseSelected: boolean;    
}

export class BulkEditTestsViewModel {

    constructor() {
        this._workItemType = null;
        this._sharedStepCache = {};
        this._sessionId = 0;
        this._additonalWorkItemFields = [];
        this._totalTestsInSuite = 0;
    }

    // TODO - Add a type to the plan in the Test Management OM.
    public initialize(testCaseIds?: number[], plan?: any, currentTeamFieldInfo?: TestsOM.TeamFieldModel, suite?: TestsOM.ITestSuiteModel, isSuiteLevel?: boolean, numTestCasesInSuite?: number, additionalWitFields?: WITOM.FieldDefinition[], testCaseHasTeamField?: boolean) {
        TMUtils.CommonIdentityPickerHelper.getFeatureFlagState();
        this._plan = plan;
        this._currentTeamFieldInfo = currentTeamFieldInfo;
        this._suite = suite;
        this._isSuiteLevel = isSuiteLevel;
        this._testCaseHasTeamField = testCaseHasTeamField;

        this._testCaseDataToPage = [
                      WITConstants.CoreFieldRefNames.Id,
                      WITConstants.CoreFieldRefNames.Rev,
                      WITConstants.CoreFieldRefNames.Title,
                      WITConstants.CoreFieldRefNames.AreaPath,
                      TCMConstants.WorkItemFieldNames.Actions
        ];  
        
        this._additonalWorkItemFields = additionalWitFields || [];   
        this._totalTestsInSuite = numTestCasesInSuite;
        this._totalTestsShown = testCaseIds.length;

        if (additionalWitFields) {
            this.onColumnOptionsAdded();
            this._mergeFixedAndAdditionalFieldsList();
        }

        this._beginPopulateGrid(testCaseIds);

        let workItemManager = WorkItemManager.get(WITUtils.getWorkItemStore());

        if (this._workItemType === null) {
            // Cache these right away and do not spend time here while creating work items.
            TestCaseCategoryUtils.getDefaultWorkItemTypeInfoForTestCaseCategory((wit) => {
                this._workItemType = wit;
                this._dummyWorkItem = workItemManager.createWorkItem(wit);
                workItemManager.removeWorkItem(this._dummyWorkItem);
            });

            WITUtils.getWorkItemStore().beginGetLinkTypes(function () {
            });
        }

        workItemManager.attachWorkItemChanged(delegate(this, this._workItemChanged));
    }

    public getTotalTestsShown(): number {
        return this._totalTestsShown;
    }

    public getTotalTestsInSuite(): number {
        return this._totalTestsInSuite;
    }

    private _mergeFixedAndAdditionalFieldsList(){
        let testCaseFieldsMap = {},
            length = this._testCaseDataToPage.length,
            i: number;

        for (i = 0, length = this._additonalWorkItemFields.length; i < length; i++) {
            this._testCaseDataToPage.push(this._additonalWorkItemFields[i].referenceName);
        }
        this._testCaseDataToPage = Utils_Array.unique(this._testCaseDataToPage);
    }

    public getAdditionalWorkItemFields(): any[]{
        return this._additonalWorkItemFields;
    }

    public setRequirement(requirement: WITOM.WorkItem) {
        this._requirement = requirement;
    }

    private _beginPopulateGrid(testCaseIds?: number[], callback?: IResultCallback, errorCallback?: IErrorCallback) {

        this._records = [];
        this._cachedTestCases = [];
        this._testCases = [];
        this._isDirty = false;
        this._showParamDeleteWarning = true;
        this._sharedStepIdToTitleMap = new TFS_Core_Utils.Dictionary<string>();
        this._pagingInProgress = false;
        this._sessionId++;
        this._pageHelper = null;
        this._doNotRaiseWorkItemChangedEvent = false;

        if (!testCaseIds || testCaseIds.length === 0) {
            DAUtils.trackAction("BulkEntryWithNoTestCases", "/BulkEntry");
            // There are no test cases, just populate a flat grid.
            this._populateDefaultGridData();

            if (this.initialized) {
                this.initialized();
            }

            if (this.updated) {
                this.updated(BulkEditCommands.pageTestCases);
            }

            if (callback) {
                callback();
            }
        }
        else {

            DAUtils.trackAction("BulkEditWithTestCases", "/BulkEntry", { testCaseCount: testCaseIds.length });
            // Initialization.
            this._pageHelper = new PageHelper.PageHelper(testCaseIds);
            this._records = [];

            Diag.logVerbose("Fetching first page");

            // This is the first page request.
            this._beginPageTestCases(() => {
                let i = 0;

                Diag.logVerbose("First page is fetched");

                if (this.initialized) {
                    this.initialized();
                }

                this._beginAppendCachedTestCases(callback);
            }, errorCallback);
        }
    }

    private _appendEmptyRowsIfNeeded(doNotFireEvent?: boolean): void {
        let i = this._records.length;
        if (i < this._minRowCount) {
            Diag.logVerbose("[_appendEmptyRowsIfNeeded]There are fewer than " + this._minRowCount + ". Appending the extra rows");
            for (; i < this._minRowCount; i++) {
                this._records.push(new RowViewModel());
            }

            if (this.updated && !doNotFireEvent) {
                this.updated(BulkEditCommands.pageTestCases);
            }
        }
    }

    // This method fetches the page and caches it. An extra page is always cached so that when the data is needed for the grid, it is 
    // almost always available in the cache.
    private _beginPageTestCases(callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let testCaseIdsToFetch: number[];

        if (this._pagingInProgress) {
            Diag.logVerbose("[_beginPageTestCases]There is a paging currently in progress. Will not attempt paging.");
            return;
        }

        if (!this._pageHelper || !this._pageHelper.canPage()) {
            return;
        }

        DAUtils.trackAction("PageTestCases", "/BulkEntry");
        testCaseIdsToFetch = this._pageHelper.getIdsToFetch();

        this._pagingInProgress = true;
        this._beginFetchTestCases(testCaseIdsToFetch, this._plan.id, this._suite.id, this._sessionId, (testCases: TestsOM.TestCase[]) => {
            let index = 0, len = testCases.length;

            try {
                Diag.logVerbose("[_beginPageTestCases]Fetched " + testCases.length + " test cases");
                for (index = 0; index < len; index++) {
                    Diag.logVerbose("[_beginPageTestCases]Testcase " + testCases[index].getId() + " fetched");
                    testCases[index].paramDeleteEvent = delegate(this, this._handleParameterDeletion);
                    this._cachedTestCases.push(testCases[index]);
                }

                if (this._pageHelper) {
                    this._pageHelper.pageFetchComplete();
                }

                if (callback) {
                    callback();
                }

                if (this.pageFetched) {
                    this.pageFetched();
                }
            }
            finally {
                this._pagingInProgress = false;
            }
        },
        (e) => {
            this._pagingInProgress = false;
            if (this.showError) {
                this.showError(VSS.getErrorMessage(e));
            }

            if (errorCallback) {
                errorCallback(e);
            }
        });
    }

    private _beginFetchTestCases(testCaseIds: number[], planId: number, suiteId: number, sessionId: number, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        TMUtils.TestCaseUtils.beginGetTestCases(testCaseIds, this._testCaseDataToPage, (testCases: TestsOM.TestCase[]) => {

            // It is possible that the fetch request for an earlier suite is completed after the user shifts
            // to a different plan/suite. We need to ensure that such completed requests are ignored. 
            if (this._plan.id === planId && this._suite.id === suiteId && this._sessionId === sessionId) {
                let length = testCases.length,
                    i = 0;

                for (; i < length; i++) {
                    testCases[i].setSharedStepWorkItemInTestCase();
                }

                if (callback) {
                    callback(testCases);
                }
            }
        }, errorCallback);
    }

    private _beginAppendCachedTestCases(callback?: IResultCallback) {
        let testCases: TestsOM.TestCase[];
        if (this._cachedTestCases.length > 0) {
            Diag.logVerbose("[_beginAppendCachedTestCases]Test cases available in the cache.");
            testCases = Utils_Array.clone(this._cachedTestCases);
            this._cachedTestCases = [];

            this._beginAppendGridData(testCases, () => {

                if (this._pageHelper && !this._pageHelper.canPage()) {
                    Diag.logVerbose("[_beginAppendCachedTestCases]All pages have been fetched.");
                    this._appendEmptyRowsIfNeeded();
                }
                else {
                    Diag.logVerbose("[_beginAppendCachedTestCases]Fetch the next page.");
                    this._beginPageTestCases();
                }

                if (this.updated) {
                    this.updated(BulkEditCommands.pageTestCases);
                }

                if (callback) {
                    callback();
                }
            });
        }
        else {
            Diag.logVerbose("[_beginAppendCachedTestCases]No test cases in the cache");
        }
    }

    public refreshGridData(): boolean {
        DAUtils.trackAction("RefreshGrid", "/BulkEntry");
        let testCaseIdsToRefresh: number[];
        if (this._refreshInProgress) {
            Diag.logVerbose("[refreshGridData]A refresh is currently happening. Ignoring the current refresh request");
            return;
        }

        Diag.logVerbose("[refreshGridData]Refreshing test cases in the grid");
        if (this.cleanup()) {
            this._refreshInProgress = true;
                TMUtils.getTestPlanManager().getTestCaseIdsInTestSuite(this._suite.id, (testCaseIds: number[]) => {
                    this._totalTestsInSuite = testCaseIds.length;
                    if (this._isSuiteLevel) {
                        Diag.logVerbose("[refreshGridData]Refreshing grid with all test cases in the suite.");
                        this._totalTestsShown = testCaseIds.length;
                        testCaseIds.sort(function (a: number, b: number) { return a - b; });
                        this._beginPopulateGrid(testCaseIds, () => {
                            Diag.logVerbose("[refreshGridData]Refreshed grid with all test cases in the suite.");
                            this._refreshInProgress = false;
                        },
                        (e) => {
                            this._refreshInProgress = false;
                        });
                    }
                    else {
                        Diag.logVerbose("[refreshGridData]Refreshing just the test cases in the grid.");
                        testCaseIdsToRefresh = this._getTestCaseIdsInGrid();
                        this._beginPopulateGrid(testCaseIdsToRefresh, () => {
                            Diag.logVerbose("[refreshGridData]Refreshed grid with just the test cases in the grid.");
                            this._refreshInProgress = false;
                        },
                        (e) => {
                            this._refreshInProgress = false;
                        });
                    }
                },
                (error) => {
                    let errorMessage = VSS.getErrorMessage(error);
                    Diag.logError("[refreshGridData]Error in refreshing test cases. Detailed error: " + errorMessage);
                    if (this.showError) {
                        this.showError(errorMessage);
                    }

                    this._refreshInProgress = false;
                });

            if (this.refresh) {
                this.refresh();
            }

            return true;
        }
        else {
            Diag.logVerbose("[refreshGridData]Refresh canceled");
            return false;
        }
    }

    private _getTestCaseIdsInGrid(): number[] {
        let i = 0,
            len = this._records.length,
            testCaseIds: number[] = [],
            record: RowViewModel;

        for (i = 0; i < len; i++) {
            record = this._records[i];
            if (record.isTestCase && record.testCase.getId() > 0) {
                testCaseIds.push(record.testCase.getId());
            }
        }

        return testCaseIds;
    }

    public onHyperLinkClick(dataIndex: number, property: string): void {
        let id: string,
            testCase: TestsOM.TestCase;

        Diag.logVerbose("[onHyperLinkClick]Hyperlink click called on dataIndex = " + dataIndex + " and property = " + property);
        if (property === "id") {
            id = this.getId(dataIndex);
            if (id) {
                testCase = this._records[dataIndex].testCase;
                this.prepareTestCaseForEdit(testCase, () => {
                    this._openTestCase(testCase, parseInt(id), dataIndex);
                });
            }
        }   
    }

    public setRowsDirty(): void {
        this._areRowsDirty = true;
    }

    private _openTestCase(testCase: TestsOM.TestCase, id: number, dataIndex: number) {
        let index = 0,
            record: RowViewModel,
            numRecordsToDelete = 0,
            recordsToInsert: RowViewModel[],
            length = 0,
            indexToSelect = dataIndex;

        this._isTestCaseDialogOpen = true;
        Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
            id: id,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            options: {

                close: (workItem: WITOM.WorkItem) => {
                    try {
                        // Remove the rows for the test case.
                        for (index = dataIndex, length = this._records.length; index < length; index++) {
                            record = this._records[index];
                            if (record.testCase === testCase) {
                                numRecordsToDelete++;
                            }
                            else {
                                break;
                            }
                        }

                        this._records.splice(dataIndex, numRecordsToDelete);

                        // Create rows corresponding to the test case and test steps.
                        testCase.beginRefresh(() => {

                            // TODO: This should ideally happen in the model.
                            this._setParameterInfoForTestCase(testCase);
                            recordsToInsert = this._createRowViewModelsForTestCase(testCase);

                            // Insert the new rows at dataIndex.
                            for (index = 0, length = recordsToInsert.length; index < length; index++, dataIndex++) {
                                this._records.splice(dataIndex, 0, recordsToInsert[index]);
                            }

                            this._evaluateIsDirty();

                            // Refresh the grid.
                            if (this.updated) {
                                this.updated(BulkEditCommands.refreshRecords, [indexToSelect]);
                            }
                        },
                        (error) => {
                            let errorMessage = VSS.getErrorMessage(error);
                            Diag.logError("[beginRefresh]Error in refersh. Detailed error: " + errorMessage);
                            if (this.showError) {
                                this.showError(errorMessage);
                            }
                        });

                    }
                    finally {
                        if (this.commandComplete) {
                            this.commandComplete(BulkEditCommands.refreshRecords);
                        }

                        this._isTestCaseDialogOpen = false;
                    }
                }
            }
        }, null));
    }

    private _evaluateIsDirty(): void {
        let i = 0,
            len = this._testCases.length,
            isDirty = false;

        if (this._areRowsDirty) {
            isDirty = true;
        }
        else {
            for (i = 0; i < len; i++) {
                if (this._testCases[i].getIsDirty()) {
                    isDirty = true;
                    break;
                }
            }
        }

        this._isDirty = isDirty;
    }

    private _createRowViewModelsForTestCase(testCase: TestsOM.TestCase): RowViewModel[]{
        let i = 0,
            title = testCase.getTitle(),
            id = testCase.getId(),
            testActions = testCase.getTestSteps(),
            numSteps = testActions.length,
            testStep: TestsOM.TestStep,
            sharedStep: TestsOM.SharedSteps,
            records: RowViewModel[] = [],
            rowModel: RowViewModel;

        records.push(new RowViewModel(title, 0, "", "", testCase, true, false, 0, testCase.getProperties()));
        for (i = 0; i < numSteps; i++) {

            if (testActions[i] instanceof TestsOM.TestStep) {
                testStep = <TestsOM.TestStep>testActions[i];
                records.push(new RowViewModel("", testStep.id, testStep.action, testStep.expectedResult, testCase, false));
            }
            else {
                sharedStep = <TestsOM.SharedSteps>testActions[i];
                rowModel = new RowViewModel("", sharedStep.id, Resources.NewSharedStep, "", testCase, false, true, sharedStep.ref);
                rowModel.action = Utils_String.format(Resources.BulkEntryGridSharedStepTitleFormat, sharedStep.ref, sharedStep.getTitle());
                if (!this._sharedStepIdToTitleMap.containsKey(sharedStep.ref)) {
                    this._sharedStepIdToTitleMap.set(sharedStep.ref, sharedStep.getTitle());
                }

                records.push(rowModel);
            }

            id = undefined;
        }

        return records;
    }

    public fetchMoreTests() {
        Diag.logVerbose("Requesting to fetch more tests");
        if (this._cachedTestCases.length > 0) {
            Diag.logVerbose("[fetchMoreTests]There are " + this._cachedTestCases.length + " in the cache");
            this._beginAppendCachedTestCases();
        }
        else {
            if (this._pagingInProgress) {
                Diag.logVerbose("[fetchMoreTests]Paging is in progress. Queue the request to page complete.");
                this.pageFetched = () => {
                    this.pageFetched = null;
                    this._beginAppendCachedTestCases();
                };
            }
            else {
                Diag.logVerbose("[fetchMoreTests]Fetch more test cases from the server.");
                this._beginPageTestCases(() => {
                    this._beginAppendCachedTestCases();
                });
            }
        }
    }

    private _workItemChanged(sender: any, args?: any) {
        let workItem: WITOM.WorkItem;

        workItem = args.workItem;
        if (this.workItemChanged && !this._doNotRaiseWorkItemChangedEvent) {
            this.workItemChanged(sender, args);
        }
    }

    private _populateDefaultGridData() {
        let i = 0;
        this._records = [];
        for (i = 0; i < this._minRowCount; i++) {
            this._records.push(new RowViewModel());
        }
    }

    private _beginAppendGridData(testCases: TestsOM.TestCase[], callback?: IResultCallback) {
        let i = 0,
            j = 0,
            numSteps = 0,
            l = testCases.length,
            title: string,
            id: number,
            testActions: TestsOM.TestAction[],
            testStep: TestsOM.TestStep,
            sharedStep: TestsOM.SharedSteps,
            recordIndexToSharedStepIdMap = new TFS_Core_Utils.Dictionary<number>(),
            rowModel: RowViewModel;

        for (i = 0; i < l; i++) {
            this._testCases.push(testCases[i]);
            title = testCases[i].getTitle();
            testActions = testCases[i].getTestSteps();
            numSteps = testActions.length;
            id = testCases[i].getId();

            Diag.logVerbose("[_beginAppendGridData]Adding testcase " + id + " to records");
            
            this._records.push(new RowViewModel(title, 0, "", "", testCases[i], true, false, 0, testCases[i].getProperties()));
            for (j = 0; j < numSteps; j++) {
                if (testActions[j] instanceof TestsOM.TestStep) {
                    testStep = <TestsOM.TestStep>testActions[j];
                    this._records.push(new RowViewModel("", testStep.id, testStep.action, testStep.expectedResult, testCases[i], false));
                }
                else {
                    sharedStep = <TestsOM.SharedSteps>testActions[j];
                    rowModel = new RowViewModel("", sharedStep.id, Resources.NewSharedStep, "", testCases[i], false, true, sharedStep.ref);

                    if (this._sharedStepIdToTitleMap.containsKey(sharedStep.ref)) {
                        rowModel.action = Utils_String.format(Resources.BulkEntryGridSharedStepTitleFormat, sharedStep.ref, this._sharedStepIdToTitleMap.get(sharedStep.ref));
                    }
                    else {
                        recordIndexToSharedStepIdMap.set(this._records.length, sharedStep.ref);
                    }

                    this._records.push(rowModel);
                }
                id = undefined;
            }
        }

        // if any shared steps need to be fetched then call getSharedSteps
        if (recordIndexToSharedStepIdMap.keys().length === 0) {
            if (callback) {
                callback();
            }
        }
        else {
            Diag.logVerbose("[_beginAppendGridData]Shared steps are found in the test case. Fetching the titles for them.");
            this._beginFetchSharedStepsAndUpdateTitle(recordIndexToSharedStepIdMap, callback);
        }
    }

    private _beginFetchSharedStepsAndUpdateTitle(recordIndexToSharedStepIdMap: TFS_Core_Utils.Dictionary<number>, callback?: IResultCallback) {
        TMUtils.SharedStepUtils.beginGetSharedStepsIdToTitleMap(recordIndexToSharedStepIdMap.values(), (sharedStepIdToTitleMap: TFS_Core_Utils.Dictionary<string>) => {
            let rowIndexes = recordIndexToSharedStepIdMap.keys(),
                i: number,
                index: number,
                length = rowIndexes.length,
                formattedTitle: string,
                sharedStepId: number;

            this._updateSharedStepTitleCache(sharedStepIdToTitleMap);

            for (i = 0; i < length; i++) {
                index = parseInt(rowIndexes[i], 10);
                sharedStepId = recordIndexToSharedStepIdMap.get(index);
                const encodedTitle = Utils_String.htmlEncode(sharedStepIdToTitleMap.get(sharedStepId));
                formattedTitle = Utils_String.format(Resources.BulkEntryGridSharedStepTitleFormat, sharedStepId, encodedTitle);
                this._records[index].action = formattedTitle;
                Diag.logVerbose("[_beginFetchSharedStepsAndUpdateTitle]Shared step " + index + " fetched.");
            }

            if (callback) {
                callback();
            }
        },
        (error) => {
            alert(VSS.getErrorMessage(error));
        });
    }

    private _updateSharedStepTitleCache(sharedStepIdToTitleMap: TFS_Core_Utils.Dictionary<string>) {
        let sharedStepIds = sharedStepIdToTitleMap.keys(),
            length = sharedStepIds.length,
            i: number,
            id: number;

        for (i = 0; i < length; i++) {
            id = parseInt(sharedStepIds[i], 10);
            this._sharedStepIdToTitleMap.set(id, sharedStepIdToTitleMap.get(id));
        }
    }

    public canInsertRow(dataIndex): boolean {
        return true;
    }

    // Inserts the row after data index and returns the new record that is inserted.
    public insertRow(dataIndex: number, insertStep: boolean, numRowsToInsert: number, rowToInsert?: RowViewModel, doNotUpdateGrid?: boolean) {
        let insertedRow: RowViewModel,
            i = 0;

        if (!insertStep) {
            Diag.logVerbose("[insertRow]Inserting " + numRowsToInsert + " rows at " + dataIndex);
            DAUtils.trackAction("InsertRow", "/BulkEntry");
            if (dataIndex >= 0 && dataIndex < this._records.length) {
                if (rowToInsert) {
                    insertedRow = new RowViewModel(rowToInsert.testCaseTitle, null, rowToInsert.action, rowToInsert.expectedResult, null, rowToInsert.isTestCase, rowToInsert.isSharedStep, rowToInsert.refId, rowToInsert.additionalFields);
                    this._insertRecord(dataIndex, insertedRow, EditableGrid.EditableGrid.Commands.CMD_INSERT_ROW, doNotUpdateGrid);
                    this._isDirty = true;
                }
                else {
                    for (i = 0; i < numRowsToInsert; i++) {
                        insertedRow = new RowViewModel();
                        this._insertRecord(dataIndex, insertedRow, EditableGrid.EditableGrid.Commands.CMD_INSERT_ROW, true);
                    }

                    if (this.updated) {
                        this.updated(EditableGrid.EditableGrid.Commands.CMD_INSERT_ROW, [dataIndex]);
                    }
                }
            }
        }
        else {
            this.insertTestStep(dataIndex, numRowsToInsert);
        }
    }

    public insertTestStep(dataIndex: number, numStepsToInsert: number) {
        
        let record: RowViewModel,
            testCase: TestsOM.TestCase,
            index = 0,
            stepId: number,
            step: TestsOM.TestAction,
                newRecord: RowViewModel;

        Diag.logVerbose("[insertRow]Inserting " + numStepsToInsert + " test steps at " + dataIndex);
        DAUtils.trackAction("InsertTestStep", "/BulkEntry");

        if (dataIndex >= 0 && dataIndex < this._records.length) {
            record = this._records[dataIndex];
            testCase = record.testCase;
            stepId = record.actionId;
            index = testCase.getIndexForActionId(stepId);

            this.prepareTestCaseForEdit(testCase, () => {

                let i = 0;
                for (i = 0; i < numStepsToInsert; i++) {
                    testCase.insertStepAt(index);
                    step = testCase.getTestSteps()[index];
                    newRecord = new RowViewModel("", step.id, "", "", testCase, false);
                    this._insertRecord(dataIndex, newRecord, BulkEditCommands.insertTestStep, true);
                }

                if (this.updated) {
                    this.updated(BulkEditCommands.insertTestStep, [dataIndex]);
                }

                this._isDirty = true;
            });
        }
    }

    public insertTestSteps(dataIndex: number, rowViewModels: RowViewModel[], testCase: TestsOM.TestCase, doNotUpdateGrid?: boolean, callback?: IResultCallback) {
        let record: RowViewModel,
            index = 0,
            stepId: number,
            step: TestsOM.TestStep,
            rowViewModel: RowViewModel,
            i: number,
            recordsCount: number,
            rowViewModelCount: number = rowViewModels.length,
            newRecord: RowViewModel;

        DAUtils.trackAction("InsertTestSteps", "/BulkEntry");

        this.prepareTestCaseForEdit(testCase, () => {
            for (i = 0 ; i < rowViewModelCount; i++) {
                rowViewModel = rowViewModels[i];
                recordsCount = this._records.length;
                if (dataIndex >= 0 && dataIndex <= recordsCount) {
                    if (dataIndex === recordsCount) {
                        this._records.push(new RowViewModel());
                    }
                    record = this._records[dataIndex];
                    stepId = record.actionId;
                    if (!stepId) {
                        stepId = -1;
                    }
                    index = testCase.getIndexForActionId(stepId);
                    if (rowViewModel.isSharedStep) {
                        testCase.insertSharedStepsAtIndex(index, [rowViewModel.refId]);
                    }
                    else {
                        testCase.insertStepAt(index);
                    }
                    step = <TestsOM.TestStep>testCase.getTestSteps()[index];
                    newRecord = new RowViewModel(rowViewModel.testCaseTitle, testCase.getLastActionId(), rowViewModel.action, rowViewModel.expectedResult, testCase, rowViewModel.isTestCase, rowViewModel.isSharedStep, rowViewModel.refId, rowViewModel.additionalFields);
                    if (!newRecord.isSharedStep) {
                        step.setAction(newRecord.action);
                        step.setExpectedResult(newRecord.expectedResult);
                    }
                    this._isDirty = true;
                    this._insertRecord(dataIndex, newRecord, BulkEditCommands.insertTestStep, doNotUpdateGrid);
                }
                dataIndex++;
            }
            if (callback) {
                callback();
            }
        });

    }

    private _insertRecord(dataIndex: number, record: RowViewModel, command: any, doNotUpdateGrid?: boolean) {
        this._records.splice(dataIndex, 0, record);
        if (this.updated && !doNotUpdateGrid) {
            this.updated(command);
        }
    }

    public canDeleteRows(dataIndices: number[]): boolean {
        return true;
    }

    public getTestCaseAtIndex(dataIndex: number): TestsOM.TestCase {
        let record: RowViewModel;
        if (dataIndex >= 0 && dataIndex < this._records.length) {
            record = this._records[dataIndex];
            return record.testCase;
        }
        else {
            return null;
        }
    }

    public deleteTestCase(dataIndices: number[]): void {
        this._deleteTestCaseRows(dataIndices, true);
    }

    // Deletes the rows at the specified indices.
    public deleteRows(dataIndices: number[]): void {
        DAUtils.trackAction("DeleteRows", "/BulkEntry");

        this._ensureTestCasesFetchedAndPerformOperation(dataIndices,
                                                        () => {
                                                            this._deleteTestCaseRows(dataIndices);
                                                        });
    }

    public canHandleShortCutKeys(): boolean {
        return !this._isTestCaseDialogOpen;
    }

    private _ensureTestCasesFetchedAndPerformOperation(dataIndices: number[], callback?: IResultCallback) {
        let i = 0, length: number,
            rowCount = this._records.length,
            record: RowViewModel,
            rowsToProcess: number,
            testCase: TestsOM.TestCase,
            testCaseIdMap = {},
            testCases: TestsOM.TestCase[] = [],
            descendingComparer = function (a: number, b: number) { return b - a; };

        if (dataIndices) {
            dataIndices.sort(descendingComparer);
            length = dataIndices.length;
            rowsToProcess = length;

            for (i = 0; i < length; i++) {
                if (dataIndices[i] >= 0 && dataIndices[i] < rowCount) {
                    record = this._records[dataIndices[i]];
                    testCase = record.testCase;
                    if (testCase) {
                        if (!testCaseIdMap[testCase.getId()]) {
                            testCases.push(testCase);
                            testCaseIdMap[testCase.getId()] = true;
                        }
                    }
                }
            }

            length = testCases.length;
            rowsToProcess = length;
            if (length > 0) {
                for (i = 0; i < length; i++) {
                    testCase = testCases[i];
                    this.prepareTestCaseForEdit(testCase, () => {
                        testCase.processTestStepAttachments();
                        rowsToProcess--;
                        if (rowsToProcess === 0) {
                            if (callback) {
                                callback(dataIndices);
                            }
                        }
                    });
                }
            }
            else {
                if (callback) {
                    callback(dataIndices);
                }
            }
        }
    }

    private _confirmStepsDelete(dataIndices: number[]): boolean {
        let i = 0,
            length = dataIndices.length,
            rowCount = this._records.length,
            record: RowViewModel,
            testCase: TestsOM.TestCase,
            prevTestCase: TestsOM.TestCase,
            message: string = Resources.ConfirmParameterDeletionWithoutParamDetails,
            testCaseActionIds: number[] = [];

        for (i = 0; i < length; i++) {
            if (dataIndices[i] >= 0 && dataIndices[i] < rowCount) {
                record = this._records[dataIndices[i]];
                testCase = record.testCase;
                if (testCase) {
                    if (!prevTestCase) {
                        prevTestCase = testCase;
                    }

                    if (prevTestCase.getId() === testCase.getId()) {
                        testCaseActionIds.push(record.actionId);
                    }

                    if (prevTestCase.getId() !== testCase.getId() || i + 1 === length) {
                        if (prevTestCase.willParametersBeDeletedOnDeletingSteps(testCaseActionIds)) {
                            if (prevTestCase.isUsingSharedParameters()) {
                                message = Resources.ConfirmParameterDeletionWithoutParamDetailsForTcUsingSP;
                            }
                            else {
                                message = Resources.ConfirmParameterDeletionWithoutParamDetails;
                            }
                            return TMUtils.ParametersHelper.confirmParamsDelete(prevTestCase.getParameters(),
                                                                                prevTestCase,
                                                                                message,
                                                                                false);
                        }

                        prevTestCase = testCase;
                        testCaseActionIds = [];
                        testCaseActionIds.push(record.actionId);

                    }
                }
            }
        }

        return true;
    }

    private _deleteTestCaseRows(dataIndices: number[], isTestCase: boolean = false) {
        let testCase: TestsOM.TestCase,
            rowCount = this._records.length,
            i: number,
            indicesToSelect: number[] = [],
            record: RowViewModel,
            length: number,
            descendingComparer = function (a: number, b: number) { return b - a; };

        if (dataIndices) {
            length = dataIndices.length;
            this._showParamDeleteWarning = false;
            try {
                if (this._confirmStepsDelete(dataIndices)) {
                    dataIndices.sort(descendingComparer);
                    for (i = 0; i < length; i++) {
                        if (dataIndices[i] >= 0 && dataIndices[i] < rowCount) {
                            record = this._records[dataIndices[i]];
                            if (record.isTestCase) {
                                // This case is possible when an invalid test case row is deleted. Remove the test case from the underlying model.
                                this._removeTestCaseFromModel(record.testCase, dataIndices[i]);
                            }
                            else if (record.testCase) {
                                record.testCase.removeStep(record.actionId, 0);
                                if (!isTestCase) {
                                    this._isDirty = true;
                                }
                            }
                            this._records.splice(dataIndices[i], 1);
                        }
                    }

                    indicesToSelect.push(dataIndices[0] - length + 1);
                    this._appendEmptyRowsIfNeeded(true);
                    this.updated(EditableGrid.EditableGrid.Commands.CMD_DELETE_ROWS, indicesToSelect);
                }
            }
            finally {
                this._showParamDeleteWarning = true;
            }
        }
    }

    public removeSelectedTestCase(selectedDataIndices: number[]): boolean {

        DAUtils.trackAction("DeleteTest", "/BulkEntry");

        if (selectedDataIndices.length === 1) {

            return TMUtils.removeSelectedTestCases(([this.getId(selectedDataIndices[0])]), TMUtils.getTestPlanManager(), this._suite,
                (suiteUpdate: TestsOM.ITestSuiteModel) => {
                    if (suiteUpdate) {
                        TMUtils.getTestPlanManager().getTestCaseIdsInTestSuite(this._suite.id, (testCaseIds: number[]) => {
                            this._totalTestsInSuite = testCaseIds.length;
                            this._totalTestsShown -= 1;
                            this.onTestsInSuiteCountUpdated();
                            if (this.refresh){
                                this.refresh();
                            }
                        });
                    }
                },
                (error) => {
                    this.showError(VSS.getErrorMessage(error));
                });
        }
        return false;
    }

    private _removeTestCaseFromModel(testCase: TestsOM.TestCase, dataIndex: number): void {
        let index = 0,
            length = this._testCases.length,
            recordLength = this._records.length;

        for (index = 0; index < length; index++) {
            if (this._testCases[index] === testCase) {
                this._testCases.splice(index, 1);
                break;
            }
        }

        for (index = dataIndex; index < recordLength; index++) {
            if (this._records[index].testCase === testCase) {
                this._records[index].testCase = null;
            }
            else {
                break;
            }
        }

        if (testCase) {
            testCase.reset();
            this._removeWorkItemFromCacheIfNeeded(testCase);
        }
    }

    private _removeWorkItemFromCacheIfNeeded(testCase: TestsOM.TestCase) {
        //Remove unsaved work items from the work item cache. Fix for bug # 1269304
        let witStore: WITOM.WorkItemStore = WITUtils.getWorkItemStore();

        if (testCase.getId() <= 0 && testCase.getWorkItemWrapper()) {
            Diag.logVerbose("[BulkEditTestsViewModel._removeWorkItemFromCacheIfNeeded] Removing work item from cache");
            WorkItemManager.get(witStore).removeWorkItem(testCase.getWorkItemWrapper().getWorkItem());
        }
    }

    public canClearRows(dataIndices: number[]): boolean {
        return true;
    }

    // Clears the rows at the specified indices.
    public clearRows(dataIndices: number[]): void {
        DAUtils.trackAction("ClearRows", "/BulkEntry");

        this._ensureTestCasesFetchedAndPerformOperation(dataIndices,
                                                        () => {
                                                            this._clearTestCaseRows(dataIndices);
                                                        });
    }

    private _clearTestCaseRows(dataIndices: number[]) {
        let length = dataIndices.length,
            rowCount = this._records.length,
            record: RowViewModel,
            i: number;

        this._showParamDeleteWarning = false;

        try {
            if (this._confirmStepsDelete(dataIndices)) {
                for (i = 0; i < length; i++) {
                    if (dataIndices[i] >= 0 && dataIndices[i] < rowCount) {
                        record = this._records[dataIndices[i]];
                        if (record.testCase) {
                            if (record.isTestCase) {
                                // This case is possible when an invalid test case row is deleted. Remove the test case from the underlying model.
                                this._removeTestCaseFromModel(record.testCase, dataIndices[i]);
                            }
                            this._clearTestStepAtIndex(dataIndices[i]);
                            record.isSharedStep = false;
                        }
                        else {
                            this._records[dataIndices[i]] = new RowViewModel();
                        }
                    }
                }

                this.updated(EditableGrid.EditableGrid.Commands.CMD_CLEAR_ROWS);
            }
        }
        finally {
            this._showParamDeleteWarning = true;
        }
    }

    private _clearTestStepAtIndex(dataIndex: number) {
        this.setValue(dataIndex, "action", "");
        this.setValue(dataIndex, "expectedResult", "");
        this.setValue(dataIndex, "testCaseTitle", "");
        this.clearRowHeight(dataIndex);
        this.clearAdditionalProps(dataIndex);
    }

    public canEdit(dataIndex: number, property: string): boolean {
        return this._records[dataIndex] ? this._records[dataIndex].canEdit(property) : false;
    }

    public canAppendRows(rowCount: number): boolean {
        // Append more empty rows on enter only if there are no more rows to page.
        return this._pageHelper ? !this._pageHelper.canPage() : true;
    }

    public isSharedStep(dataIndex: number): boolean {
        return this._records[dataIndex] ? this._records[dataIndex].isSharedStep : false;
    }

    public isDirty(dataIndex: number) {
        let record = this._records[dataIndex];
        if (record && record.isTestCase && record.testCase) {
            return record.testCase.getIsDirty();
        }

        return false;
    }

    public isInvalid(dataIndex: number) {
        let record = this._records[dataIndex];
        if (record && record.isTestCase && record.testCase) {
            return record.testCase.isInvalid();
        }

        return false;
    }

    public getError(dataIndex: number): Error {
        let record = this._records[dataIndex];
        if (record && record.isTestCase && record.testCase) {
            return record.testCase.getError();
        }
        else {
            return null;
        }
    }

    // Appends "rowCount" rows at the end of the grid.
    public appendRows(rowCount: number): void {
        let i = 0;
        DAUtils.trackAction("AppendRows", "/BulkEntry");
        for (i = 0; i < rowCount; i++) {
            this._records.push(new RowViewModel());
        }

        if (this.updated) {
            this.updated(EditableGrid.EditableGrid.Commands.CMD_APPEND);
        }
    }

    public getValue(dataIndex: number, property: string) {
        let id: string;
        if (this._records[dataIndex]) {
            if (property === "id") {
                id = this.getId(dataIndex);
                if (id) {
                    if (this.isDirty(dataIndex)) {
                        return id + "*";
                    }
                    else {
                        return id;
                    }
                }
            }
            else {
                return this._records[dataIndex].getValue(property);
            }
        }
    }

    // The method getValue("id") can no longer be used to get the id of the test case at an index as it will have the dirty indicator also. 
    // Therefore a new method is exposed to just get the id of the test case at an index.
    public getId(dataIndex: number) {
        if (this._records[dataIndex]) {
            return this._records[dataIndex].getValue("id");
        }
    }

    private _isPropertyInAdditionalFields(property: string): boolean{
        let length = this._additonalWorkItemFields.length,
            i: number;

        for (i = 0; i < length; i++){
            if (this._additonalWorkItemFields[i].referenceName === property){
                return true;
            }
        }

        return false;
    }

    public setValue(dataIndex: number, property: string, newValue: string, callback?: IResultCallback) {
        let testCase: TestsOM.TestCase,
            record = this._records[dataIndex],
            oldValue: string,
            valueChanged: boolean,
            savedIsDirty: boolean = this._isDirty;

        if (!record) {
            if (callback) {
                callback();
            }

            return;
        }

        testCase = this._records[dataIndex].testCase;
        oldValue = this._isPropertyInAdditionalFields(property) ? record.additionalFields[property] : record[property];
        if (oldValue !== newValue) {
            this._isDirty = true;
            if (testCase) {
                this.prepareTestCaseForEdit(testCase, () => {
                    let testAction: TestsOM.TestAction;
                    if (property === "action") {
                        testAction = testCase.getTestAction(record.actionId, 0);

                        if (testAction instanceof TestsOM.SharedSteps) {
                            record.actionId = testCase.replaceStep(record.actionId);
                        }
                        else {
                            valueChanged = testCase.setAction(record.actionId, 0, newValue);
                        }
                    }
                    else if (property === "expectedResult") {
                        valueChanged = testCase.setExpectedResult(record.actionId, 0, newValue);
                    }
                    else if (property === "testCaseTitle") {
                        testCase.setTitle(newValue);
                    }
                    else if (this._isPropertyInAdditionalFields(property)) {
                        valueChanged = testCase.setProperty(property, newValue);
                    }

                    if (valueChanged === false) {
                        this._isDirty = savedIsDirty;
                        if (this.updated) {
                            this.updated();
                        }
                    }
                        else{
                            if (record.hasOwnProperty(property)) {
                                record[property] = newValue;
                            }
                            else{
                                record.additionalFields[property] = newValue; 
                            }

                        }

                    if (callback) {
                        callback();
                    }
                });
            }
            else {
                if (property === "testCaseTitle" || property === "expectedResult" || property === "action") {
                    record[property] = newValue;
                }
                else {
                    record.additionalFields[property] = newValue;
                }
                this._areRowsDirty = true;
                if (callback) {
                    callback();
                }
                this._dummyWorkItem.setFieldValue(property === "testCaseTitle" ? "System.Title" : property, newValue);
               
            }
        }
    }

    public prepareTestCaseForEdit(testCase: TestsOM.TestCase, callback?: IResultCallback) {
        if (!testCase.getWorkItemWrapper()) {
            Diag.logVerbose("[prepareTestCaseForEdit]Test case with id " + testCase.getId() + " is being fetched.");
            testCase.beginSetupWorkItemForTestCase(this._sharedStepCache, () => {
                Diag.logVerbose("[prepareTestCaseForEdit]Test case with id " + testCase.getId() + " fetch complete");
                this._setParameterInfoForTestCase(testCase);
                testCase.setIsDirty(false);
                if (callback) {
                    callback();
                }
                testCase.preSave();
                this.onWorkItemFetched(testCase.getWorkItemWrapper().getWorkItem());
            },
            (error) => {
                let errorMessage = VSS.getErrorMessage(error);
                Diag.logError("[prepareTestCaseForEdit]Error in preparing test case for edit. Detailed error: " + errorMessage);
                if (this.showError) {
                    this.showError(errorMessage);
                }
            });
        }
        else {
            if (callback) {
                callback();
            }

            testCase.preSave();
            this.onWorkItemFetched(testCase.getWorkItemWrapper().getWorkItem());
        }
    }

    private _setParameterInfoForTestCase(testCase: TestsOM.TestCase): void {
        let workItem: WITOM.WorkItem = testCase.getWorkItemWrapper().getWorkItem(),
            parametersXmlFieldId = workItem.getField(TCMConstants.WorkItemFieldNames.Parameters).fieldDefinition.id,
            parametersDataXmlFieldId = workItem.getField(TCMConstants.WorkItemFieldNames.DataField).fieldDefinition.id,
            parametersXml = workItem.getFieldValue(parametersXmlFieldId),
            parametersDataFieldValue = workItem.getFieldValue(parametersDataXmlFieldId),
            parameters = TestsOM.ParameterCommonUtils.parseParameters($(Utils_Core.parseXml(parametersXml || ""))),
            parameterDataInfo: TestsOM.TestCaseParameterDataInfo = TestsOM.TestCaseParameterDataInfo.parseTestCaseParametersData(parametersDataFieldValue),
            parametersData: Array<{[index: string]: string; }> = [];

        if (!parameterDataInfo) {
            parametersData = TMUtils.ParametersHelper.parseParametersData($(Utils_Core.parseXml(parametersDataFieldValue || "")), parameters);
        }

        Diag.logVerbose("Setting parameter info for test case with id " + testCase.getId());
        testCase.initializeParameterInfo(parameters, parametersData, parameterDataInfo, parametersDataFieldValue);

        this._readAndMergeSharedStepParameters(testCase);
    }

    private _readAndMergeSharedStepParameters(testCase: TestsOM.TestCase) {
        let steps = testCase.getTestSteps(),
            length = steps.length,
            sharedSteps: TestsOM.SharedSteps,
            workItem: WITOM.WorkItem,
            sharedStepWorkItem: TestsOM.SharedStepWorkItem,
            parametersXmlFieldId: number,
            parametersXml: string,
            parameters: string[],
            $parameterData: JQuery,
            i: number;

        Diag.logVerbose("Merging shared step parameters for test case with id " + testCase.getId());
        testCase.setSharedStepParameters([]);

        //now read parameters for each shared test step included in this test case
        for (i = 0 ; i < length ; i++) {
            if (steps[i] instanceof TestsOM.SharedSteps) {
                sharedSteps = <TestsOM.SharedSteps>steps[i];
                sharedStepWorkItem = sharedSteps.getSharedStep();
                workItem = sharedStepWorkItem.getWorkItemWrapper().getWorkItem();
                parametersXmlFieldId = workItem.getField(TCMConstants.WorkItemFieldNames.Parameters).fieldDefinition.id;
                parametersXml = workItem.getFieldValue(parametersXmlFieldId);
                parameters = TestsOM.ParameterCommonUtils.parseParameters($(Utils_Core.parseXml(parametersXml || "")));
                testCase.mergeSharedStepParameters(parameters);
            }
        }

        // now read parameters data
        if (!testCase.isUsingSharedParameters()) {
            $parameterData = $(Utils_Core.parseXml(testCase.getWorkItemWrapper().getWorkItem().getFieldValue(TCMConstants.WorkItemFieldNames.DataField)));
            TMUtils.ParametersHelper.setTestCaseParametersDataFromXml(testCase, $parameterData, false);
        }
    }

    public clearAdditionalProps(dataIndex: number) {
        let record = this._records[dataIndex];
        record.additionalFields = {};
    }

    // Initiates bulk save for the changes made.
    public beginSave(callback: IResultCallback, error: IErrorCallback): void {

        // Save all the tests in the grid.
        let index = 0,
            length = this._records.length,
            record: RowViewModel,
            currentTestCase: TestsOM.TestCase,
            testCaseAndRecord: ITestCaseAndRecord,
            anyValidStepFound: boolean = false,
            stepRecords: RowViewModel[] = [],
            isBlankStep: boolean,
            newRecord: RowViewModel,
            testCasesBeingPreparedForEdit = 0,
            allRecordsProcessed = false,
            hasError = false;

        this._testCaseRowIndices = [];

        this._doNotRaiseWorkItemChangedEvent = true;
        Diag.logVerbose("[beginSave]Saving all test cases");
        for (index = 0; index < length; index++) {
            record = this._records[index];
            if ($.trim(record.testCaseTitle) !== "") {
                if (currentTestCase) {
                    if (anyValidStepFound) {

                        // Add all the steps found till now to the current testcase.
                        testCasesBeingPreparedForEdit++;

                        this._beginAddTestSteps(currentTestCase, stepRecords, () => {
                            testCasesBeingPreparedForEdit--;

                            if (testCasesBeingPreparedForEdit === 0 && allRecordsProcessed) {
                                Diag.logVerbose("[beginSave]All records processsed.");
                                this._onTestRecordsProcessingCompleted(currentTestCase, anyValidStepFound, stepRecords, hasError, callback, error);
                            }
                        });
                    }
                }
                else {
                    if (anyValidStepFound) {

                        // Valid steps found without any associated test case. Abort.
                        if (this.showError) {
                            this.showError(Resources.TestStepsWithNoTestCaseError);
                        }

                        hasError = true;
                        anyValidStepFound = false;
                        stepRecords = [];
                    }
                }

                if (record.testCase) {
                    // This means it is already a saved test case.
                    Diag.logVerbose("[beginSave]A test case with id: " + record.testCase.getId() + " already exists at index: " + index);
                    currentTestCase = record.testCase;
                    this._testCaseRowIndices.push(index);
                }
                else {
                    Diag.logVerbose("[beginSave]New test case found at record index: " + index);

                    // Create a new test case.
                    testCaseAndRecord = this._createTestCase(record);
                    currentTestCase = testCaseAndRecord.testCase;
                    this._testCases.push(currentTestCase);
                    this._testCaseRowIndices.push(index);
                    newRecord = testCaseAndRecord.record;
                    if (newRecord) {
                        Diag.logVerbose("[beginSave]Steps were added in the same record as title for index: " + index + ". Will add a new record.");
                        this._records.splice(index + 1, 0, newRecord);
                        length++;
                        index++;
                    }

                    record.testCase = currentTestCase;
                }

                anyValidStepFound = false;
                stepRecords = [];
            }
            else {
                if (!record.testCase) {
                    isBlankStep = this._isBlankStep(record);
                    anyValidStepFound = anyValidStepFound || !isBlankStep;
                    if (!isBlankStep) {
                        record.additionalFields = {};
                    }
                    stepRecords.push(record);
                }
            }
        }

        allRecordsProcessed = true;
        if (testCasesBeingPreparedForEdit === 0) {
            Diag.logVerbose("[beginSave]All records processsed.");
            this._onTestRecordsProcessingCompleted(currentTestCase, anyValidStepFound, stepRecords, hasError, callback, error);
        }
    }

    private _onTestRecordsProcessingCompleted(testCase: TestsOM.TestCase,
        anyValidStepFound: boolean,
        stepRecords: RowViewModel[],
        hasError: boolean,
        callback: IResultCallback,
        error: IErrorCallback) {

        if (testCase && anyValidStepFound) {
            this.prepareTestCaseForEdit(testCase, () => {
                this._addTestSteps(testCase, stepRecords);
                this._beginSaveTestCases(hasError, callback, error);
            });
        }
        else if (anyValidStepFound) {
            if (this.showError) {
                this.showError(Resources.TestStepsWithNoTestCaseError);
            }

            return;
        }
        else {
            this._beginSaveTestCases(hasError, callback, error);
        }
    }

    public getDataSource(): RowViewModel[] {
        return this._records;
    }

    public canSaveAllTestCases(): boolean {
        return this._isDirty;
    }

    public canRefreshTestCases(): boolean {
        return true;
    }

    public getMessage(forUnload?: boolean): string {
        let message: string;
        if (this._isDirty) {
            let runningDocumentsTable = Events_Document.getRunningDocumentsTable();
            if (runningDocumentsTable.isModified(null)) {
                message = runningDocumentsTable.getUnsavedItemsMessage();
                if (!forUnload) {
                    message = message + "\r\n\r\n" + Resources.ContinueAndLoseChanges;
                }
            }
            else {
                message = Resources.UnsavedChanges + " " + Resources.ContinueAndLoseChanges;
            }
        }
        return message;
    }

    public cleanup(): boolean {
        let message: string,
            hasCleanedUp = false;

        if (this.preCleanUp) {
            this.preCleanUp();
        }

        message = this.getMessage();
        if (message) {
            if (confirm(message)) {
                this._resetDirtyTests();
                hasCleanedUp = true;
            }
            else {
                hasCleanedUp = false;
            }
        }
        else {
            hasCleanedUp = true;
        }

        if (hasCleanedUp) {
            WorkItemManager.get(WITUtils.getWorkItemStore()).detachWorkItemChanged(delegate(this, this._workItemChanged));
            this._isDirty = false;
            this._areRowsDirty = false;
            this._pagingInProgress = false;
            this._pageHelper = null;
            this._areRowsDirty = false;
            if (this.cleanedUp) {
                this.cleanedUp();
            }
        }

        return hasCleanedUp;
    }

    public getRowHeightInfo(dataIndex: number): EditableGrid.RowHeightInfo {
        return this._records[dataIndex] ? this._records[dataIndex].getRowHeightInfo() : new EditableGrid.RowHeightInfo(0);
    }

    public setRowHeight(dataIndex: number, height: number): void {
        if (this._records[dataIndex]) {
            this._records[dataIndex].setRowHeight(height);
        }
    }

    public clearRowHeight(dataIndex: number): void {
        this.setRowHeight(dataIndex, 0);
    }

    public invalidateRowHeights(): void {
        let index = 0,
            len = this._records.length;

        for (index = 0; index < len; index++) {
            this._records[index].invalidateRowHeight();
        }
    }

    public isValidTestCase(dataIndex: number): boolean {
        let record = this._records[dataIndex];
        return record && record.isTestCase && record.testCase !== null && record.testCase.getId() > 0;
    }

    public isTestStep(dataIndex: number): boolean {
        return !this._records[dataIndex].isTestCase && this._records[dataIndex].testCase !== null;
    }

    public beginEdit(dataIndex: number): void {
        let record: RowViewModel;
        if (dataIndex >= 0 && dataIndex < this._records.length) {
            record = this._records[dataIndex];
            if (record.testCase) {
                this.prepareTestCaseForEdit(record.testCase);
            }
            else {
                this.onWorkItemFetched(this._dummyWorkItem);
            }
        }
    }

    public getMinRowCount(): number {
        return this._minRowCount;
    }

    public onTestsInSuiteCountUpdated: () => void;
    public onWorkItemFetched: (workItem: WITOM.WorkItem) => void;
    public initialized: () => void;
    public updated: (command?: any, indicesToSelect?: number[]) => void;
    public onColumnOptionsAdded: () => void;
    public commandComplete: (command?: string) => void;
    public preCleanUp: () => void;
    public cleanedUp: () => void;
    public showError: (errorMessage) => void;
    public testCasesAdded: (suiteUpdate: TestsOM.ITestSuiteModel) => void;
    public workItemChanged: (sender: any, args: any) => void;
    public refresh: () => void;
    public pageFetched: () => void;

    private _resetDirtyTests() {
        let i = 0,
            len = this._testCases.length;

        for (i = 0; i < len; i++) {
            if (this._testCases[i].getIsDirty()) {
                this._testCases[i].reset();
                this._removeWorkItemFromCacheIfNeeded(this._testCases[i]);
            }
        }
    }

    private _beginGetWorkItemsForTestCasesIfNeeded(callback: IResultCallback, errorCallback?: IErrorCallback): void {
        let l = this._testCases.length, testCase: TestsOM.TestCase, i: number,
            testCaseIds: number[] = [],
            workItem: WITOM.WorkItem,
            testCasesToFetch: TestsOM.TestCase[] = [],
            idToWorkItemMap = {};
        for (i = 0; i < l; i++) {
            testCase = this._testCases[i];
            if (testCase.getIsDirty() && !testCase.getWorkItemWrapper()) {
                testCaseIds.push(testCase.getId());
                testCasesToFetch.push(testCase);
            }
        }

        if (testCaseIds && testCaseIds.length > 0) {
            TMUtils.WorkItemUtils.getWorkItemStore().beginGetWorkItems(testCaseIds, (workItems) => {
                if (workItems) {
                    l = workItems.length;
                    for (i = 0; i < l; i++) {
                        idToWorkItemMap[workItems[i].id] = workItems[i];
                    }
                    l = testCasesToFetch.length;
                    for (i = 0; i < l; i++) {
                        testCase = testCasesToFetch[i];
                        if (idToWorkItemMap[testCase.getId()]) {
                            workItem = idToWorkItemMap[testCase.getId()];
                            testCase.setWorkItemWrapper(new TestsOM.WorkItemWrapper(workItem), true);
                        }
                    }
                    if (callback) {
                        callback();
                    }
                }
            },
            errorCallback);
        }
        else {
            callback();
        }
    }

    private _updateRecordsForTestCasePostSave() {
        //some fields like created date are properly updated only after work item is saved
        // also fields like area id etc need to be updated after a test case is saved after changes to area path
        let index = 0,
            l = this._testCaseRowIndices.length,
            record: RowViewModel,
            testCase: TestsOM.TestCase;

        for (; index < l; index++) {
            record = this._records[this._testCaseRowIndices[index]];
            testCase = record.testCase;
            testCase.setProperties(this._testCaseDataToPage);
            record.additionalFields = testCase.getProperties(); 
            }
    }

    private _handleParameterDeletion(paramsToBeDeleted: string[], testCase: TestsOM.TestBase): boolean {
        let parametersDeleted: boolean = true,
            message: string = Resources.ConfirmParameterDeletionWithoutParamDetails;

        if ((<TestsOM.TestCase>testCase).isUsingSharedParameters()) {
            message = Resources.ConfirmParameterDeletionWithoutParamDetailsForTcUsingSP;
        }

        if (this._showParamDeleteWarning) {
            parametersDeleted = TMUtils.ParametersHelper.confirmParamsDelete(paramsToBeDeleted,
                                                                             <TestsOM.TestCase>testCase,
                                                                             message,
                                                                             false);
        }

        if (parametersDeleted) {
            TMUtils.ParametersHelper.deleteParametersData(paramsToBeDeleted,
                                                          <TestsOM.TestCase>testCase,
                                                          false);
        }

        return parametersDeleted;
    }

    private _beginSaveTestCases(hasError: boolean, callback: IResultCallback, error: IErrorCallback) {
        let i = 0, l = this._testCases.length,
            testCase: TestsOM.TestCase,
            staleWorkItems: WITOM.WorkItem[] = [],
            workItem: WITOM.WorkItem,
            newWorkItems: WITOM.WorkItem[] = [],
            newWorkItemIds: number[] = [],
            validWorkItems: WITOM.WorkItem[] = [],
            validTestCases: TestsOM.TestCase[] = [],
            invalidWorkItems: WITOM.WorkItem[] = [];

        //first get the testcase workitems for testcases which are dirty and the corresponding workitems havent been fetched
        this._beginGetWorkItemsForTestCasesIfNeeded(() => {
            for (i = 0; i < l; i++) {
                testCase = this._testCases[i];
                if (testCase.getIsDirty()) {
                    testCase.preSave();
                    workItem = testCase.getWorkItemWrapper().getWorkItem();
                    if (workItem.isNew() && workItem.isValid()) {
                        newWorkItems.push(workItem);
                    }

                    if (!workItem.isNew() && !testCase.isLatestRevision()) {
                        staleWorkItems.push(workItem);
                    }
                    else {
                        if (workItem.isValid()) {
                            validWorkItems.push(workItem);
                            validTestCases.push(testCase);
                        }
                        else {
                            invalidWorkItems.push(workItem);
                        }
                    }
                }
            }

            // Save all valid work items.
            if (validWorkItems.length > 0) {
                TMUtils.getTestPlanManager().updateSqmPoint(TCMConstants.TcmProperty.UsedWebGridViewForAuthoring, validWorkItems.length);
                DAUtils.trackAction("SaveExistingWorkItems", "/BulkEntry", { numWorkItems: validWorkItems.length });
                WITUtils.getWorkItemStore().beginSaveWorkItemsBatch(validWorkItems, () => {
                    for (i = 0, l = validTestCases.length; i < l; i++) {
                        this._onTestCaseSaved(validTestCases[i]);
                    }

                    for (i = 0, l = newWorkItems.length; i < l; i++) {
                        newWorkItemIds.push(newWorkItems[i].id);
                    }

                    if (invalidWorkItems.length === 0 && staleWorkItems.length === 0 && !hasError) {
                        this._isDirty = false;
                        this._areRowsDirty = false;
                    }
                    else if (staleWorkItems.length > 0) {
                        this._handleStaleWorkItemsSaveError(error);
                    }
                    else {
                        this._handleInvalidWorkItems(invalidWorkItems, error);
                    }
                    this._updateRecordsForTestCasePostSave();
                    if (newWorkItemIds.length > 0) {
                        this._totalTestsInSuite += newWorkItemIds.length;
                        this._totalTestsShown += newWorkItemIds.length;
                        DAUtils.trackAction("SaveNewWorkItems", "/BulkEntry", { newWorkItemCount: newWorkItems.length });
                        TMUtils.TestSuiteUtils.beginAddTestCasesToSuite(newWorkItemIds,
                                                                        this._plan.id,
                                                                        this._suite,
                                                                        (suiteUpdate: TestsOM.ITestSuiteModel) => {
                                                                            if (this.testCasesAdded) {
                                                                                this.testCasesAdded(suiteUpdate);
                                                                            }
                                                                            TMUtils.getTestPlanManager().getTestCaseIdsInTestSuite(this._suite.id, (testCaseIds: number[]) => {
                                                                                this._totalTestsInSuite = testCaseIds.length;
                                                                                this.onTestsInSuiteCountUpdated();
                                                                            });
                                                                        },
                                                                        error);
                    }

                    this._finalizeSave(callback, true);
                },
                (exception) => {
                    if (this._updateGridForSavedTestCases(validTestCases, exception)) {
                        this._finalizeSave(callback, true);
                    }

                    this._handleBulkSaveTestCaseError(exception, validWorkItems, error);
                    this._doNotRaiseWorkItemChangedEvent = false;
                });
            }
            else if (staleWorkItems.length > 0) {
                this._handleStaleWorkItemsSaveError(error);
                this._finalizeSave(callback, true);
            }
            else if (invalidWorkItems.length > 0) {
                this._handleInvalidWorkItems(invalidWorkItems, error);
                this._finalizeSave(callback, true);
            }
            else {
                // There are no valid or invalid work items.
                if (!hasError) {
                    this._isDirty = false;
                    this._areRowsDirty = false;
                }

                this._finalizeSave(callback, false);
            }
        });
    }

    private _finalizeSave(callback: IResultCallback, result: boolean) {
        this._doNotRaiseWorkItemChangedEvent = false;
        if (callback) {
            callback(result);
        }
    }

    private _updateGridForSavedTestCases(testCases: TestsOM.TestCase[], error): boolean {
        let testCaseToIdMap = {}, index: number,
            length = testCases.length,
            testCase: TestsOM.TestCase,
            savedAny = false,
            that = this;

        if (error && error.name === Exceptions.WorkItemBulkSaveException) {
            for (index = 0; index < length; index++) {
                testCase = testCases[index];
                testCaseToIdMap[testCase.getId()] = testCase;
            }
            $.each(error.results, function () {
                if (!this.error) {
                    testCase = testCaseToIdMap[this.workItem.id];
                    if (testCase) {
                        savedAny = true;
                        that._onTestCaseSaved(testCase);
                    }
                }
            });
        }
        return savedAny;
    }

    private _onTestCaseSaved(testCase: TestsOM.TestCase) {
        testCase.setIsDirty(false);
        testCase.updateLocalRevision();

        // Add parameter delete event to newly created test cases.
        if (!testCase.paramDeleteEvent) {
            testCase.paramDeleteEvent = delegate(this, this._handleParameterDeletion);
        }
    }

    private _handleInvalidWorkItems(invalidWorkItems: WITOM.WorkItem[], error: IErrorCallback) {
        if (invalidWorkItems.length > 0) {
            WITUtils.getWorkItemStore().beginSaveWorkItemsBatch(invalidWorkItems, $.noop, (exception) => {
                this._handleBulkSaveTestCaseError(exception, invalidWorkItems, error);
            });
        }
    }

    private _handleStaleWorkItemsSaveError(errorCallback: IErrorCallback) {
        if (this.showError) {
            this.showError(Resources.BulkEntryTestUpdatedError);
        }
    }

    private _handleBulkSaveTestCaseError(exception, dirtyTestCases: WITOM.WorkItem[], errorCallback: IErrorCallback) {
        if (exception && exception.name === Exceptions.WorkItemBulkSaveException) {
            let errorHtml = TMUtils.getBulkSaveErrorMessageHtml(exception, dirtyTestCases.length);
            if (this.showError) {
                this.showError(errorHtml);
            }
        }
        else {
            if (errorCallback) {
                errorCallback(exception);
            }
        }
    }

    private _isBlankStep(record: RowViewModel): boolean {
        return TestsOM.HtmlUtils.isEmptyText(record.action) && TestsOM.HtmlUtils.isEmptyText(record.expectedResult);
    }

    private _updateTestCaseWorkItemFieldsFromRecord(testCase: TestsOM.TestCase, record: RowViewModel) {
        let workItemWrapper = testCase.getWorkItemWrapper(),
            property;
        for (property in record.additionalFields) {
            if (record.additionalFields[property] && TestsOM.FieldUtils.isFieldEditable(this._workItemType.getFieldDefinition(property))) {
                workItemWrapper.setFieldValue(property, record.additionalFields[property]);
            }
        }
		workItemWrapper.setTitle(record.testCaseTitle);
    }

    private _createTestCase(record: RowViewModel): ITestCaseAndRecord {
        let testCase: TestsOM.TestCase,
            newRecord: RowViewModel,
            witStore = WITUtils.getWorkItemStore(),
            workItem = WorkItemManager.get(witStore).createWorkItem(this._workItemType);

        if (this._requirement === null || this._requirement.project.id !== workItem.project.id) {
            WITUtils.setAreaAndIterationPaths(workItem, this._plan.areaPath, this._plan.iteration);
        }
        else {
            WITUtils.setAreaAndIterationPaths(workItem, this._requirement.getFieldValue(WITConstants.CoreField.AreaPath), this._requirement.getFieldValue(WITConstants.CoreField.IterationPath));
        }

        if (this._currentTeamFieldInfo && this._currentTeamFieldInfo.isConfigured && this._testCaseHasTeamField) {
            workItem.setFieldValue(this._currentTeamFieldInfo.refName, this._currentTeamFieldInfo.value);
        }

        // Create test case with the work item.
        testCase = new TestsOM.TestCase(0, 0, record.testCaseTitle, [], [], null, "", this._plan.areaPath, record.additionalFields);
        testCase.setWorkItemWrapper(new TestsOM.WorkItemWrapper(workItem));
        this._updateTestCaseWorkItemFieldsFromRecord(testCase, record);
        testCase.setIsDirty(true);
        record.isTestCase = true;

        // If the action and expected results are not empty, add a step in the tests case.
        if (!this._isBlankStep(record)) {
            this._addTestStep(testCase, record, 1);

            // Create a new record.
            newRecord = new RowViewModel("", record.actionId, record.action, record.expectedResult, testCase, false);

            // Clear the action and expected result in the existing record.
            record.action = "";
            record.expectedResult = "";
            record.setRowHeight(0);
        }

        return {
            testCase: testCase,
            record: newRecord
        };
    }

    private _beginAddTestSteps(testCase: TestsOM.TestCase, records: RowViewModel[], callback?: IResultCallback) {
        this.prepareTestCaseForEdit(testCase, () => {
            this._addTestSteps(testCase, records);

            if (callback) {
                callback();
            }
        });
    }

    private _addTestSteps(testCase: TestsOM.TestCase, records: RowViewModel[]) {
        let index = 0,
            length = records.length,
            lastNonBlankStepIndex = 0,
            testStep: TestsOM.TestStep,
            lastActionId = testCase.getLastActionId(),
            record: RowViewModel;

        for (index = length - 1; index >= 0; index--) {
            if (!this._isBlankStep(records[index])) {
                lastNonBlankStepIndex = index;
                break;
            }
        }

        for (index = 0; index <= lastNonBlankStepIndex; index++) {
            record = records[index];
            lastActionId++;
            this._addTestStep(testCase, record, lastActionId);
            //since these are steps records we no longer need any other field value
            this._clearAdditionalFieldsFromRecord(record);
            record.testCase = testCase;
        }
    }

    private _clearAdditionalFieldsFromRecord(record: RowViewModel) {
        record.additionalFields = {};
    }

    private _addTestStep(testCase: TestsOM.TestCase, record: RowViewModel, lastActionId: number) {
        let testStep: TestsOM.TestStep;
        if (!record.isSharedStep) {
            testStep = TestsOM.TestStep.createStep(lastActionId, this._getStepType(record), record.action, record.expectedResult, true);
            testCase.addStep(testStep);
            record.actionId = lastActionId;
        }
        else {
            testCase.insertSharedStepsAtIndex(testCase.getTestSteps().length, [record.refId]);
            record.actionId = lastActionId + 1;
        }
    }

    private _getStepType(record): string {
        if (TestsOM.HtmlUtils.isEmptyText(record.expectedResult)) {
            return TestsOM.TestStepTypes.Action;
        }
        else {
            return TestsOM.TestStepTypes.Validate;
        }
    }
    private _records: RowViewModel[];
    private _testCases: TestsOM.TestCase[];
    private _cachedTestCases: TestsOM.TestCase[];
    private _workItemType: WITOM.WorkItemType;
    private _isDirty: boolean;
    private _areRowsDirty: boolean;
    private _sessionId: number;
    private _sharedStepCache: any;
    private _doNotRaiseWorkItemChangedEvent: boolean = false;

    // Add a type for test plan and test suite in TCM OM.
    private _plan: any;
    private _currentTeamFieldInfo: TestsOM.TeamFieldModel;
    private _testCaseHasTeamField: boolean;
    private _suite: any;
    private _isSuiteLevel: boolean;
    private _sharedStepIdToTitleMap: TFS_Core_Utils.Dictionary<string>;
    private _testCaseDataToPage: string[];
    private _additonalWorkItemFields: any[];

    // This is the minimum rows that will be created in the grid.
    private _minRowCount: number = 100;

    private _testCaseRowIndices: number[];
    private _totalTestsInSuite: number;
    private _totalTestsShown: number;
    private _refreshInProgress: boolean = false;
    private _pagingInProgress: boolean = false;
    private _showParamDeleteWarning: boolean;
    private _pageHelper: PageHelper.PageHelper;
    private _isTestCaseDialogOpen: boolean = false;
    private _dummyWorkItem: WITOM.WorkItem;
    private _requirement: WITOM.WorkItem;
}

class BulkEditCommands {
    public static saveAllTestCases: string = "save-all-testcases";
    public static refreshTestCases: string = "refresh-testcases";
    public static insertTestStep: string = "insert-test-step";
    public static pageTestCases: string = "page-testcases";
    public static refreshRecords: string = "refresh-records";
}

export class WorkItemFieldComboCellEditor extends EditableGrid.ComboCellEditor{
    
    private _fieldName: string;
    private _field: any;
    private _workItem: WITOM.WorkItem;

    constructor(options) {
        super(options);
        this._fieldName = options.fieldName;
    }    

    public getField() {
        if (this._workItem) {
            return this._workItem.getField(this._fieldName);
        }
        return null;
    }

    public bind(workItem: WITOM.WorkItem) {
        let node, uiNode;
        this._workItem = workItem;
        this._field = this.getField();

        if (this._field) {
            Diag.logVerbose("[WorkItemFieldComboCellEditorbind] called for field" + this._field.fieldDefinition.name);
            if (this._field.fieldDefinition.id === WITConstants.CoreField.AreaPath) {
                node = this._field.workItem.project.nodesCacheManager.getAreaNode();
            } else if (this._field.fieldDefinition.id === WITConstants.CoreField.IterationPath) {
                node = this._field.workItem.project.nodesCacheManager.getIterationNode();
            }

            if (node) {
                uiNode = super._populateUINodes(node, null);
                uiNode.text = this._field.workItem.project.name;
                this.getComboControl().setSource([uiNode]);
            }
            else {
                super._updateEditControl(this._field.getAllowedValues(), this._field.fieldDefinition.type);
            }
        }
    }
}

export class WorkItemFieldCommonIdentityPickerCellEditor extends CommonIdentityPickerCellEditor {

    private _fieldName: string;
    private _field: any;
    private _workItem: WITOM.WorkItem;

    constructor(options) {
        super(options);
        this._fieldName = options.fieldName;
    }

    public getField() {
        if (this._workItem) {
            let value = this._workItem.getField(this._fieldName);
            return value;
        }
        return null;
    }

    public bind(workItem: WITOM.WorkItem) {
        this._workItem = workItem;
        this._field = this.getField();
    }

    public getScope(): WITOM.WorkItemIdentityScope {
        return this.getField() ? this.getField().filterByScope : null;
    }

    public getPreDropdownRender: (entityList: Identities_Picker_RestClient.IEntity[]) => Identities_Picker_RestClient.IEntity[] =
    (entityList: Identities_Picker_RestClient.IEntity[]) => {

       
        let additionalEntities: Identities_Picker_RestClient.IEntity[] = [];
        if (this.getScope() == null) {
            return entityList;
        }
        let scope = this.getScope();
        let filteredEntityList = entityList;
        if (scope.excludeGroups) {
            filteredEntityList = entityList.filter(e => !Utils_String.equals(e.entityType, Identities_Services.ServiceHelpers.GroupEntity, true));
        }
        let nonIdentityValues = scope.nonIdentities;
        if (nonIdentityValues && nonIdentityValues.length > 0) {
            let prefix = this._identityPickerControl.getDropdownPrefix();
            $.each(nonIdentityValues, (i: number, value: string) => {
                let entity: Identities_Picker_RestClient.IEntity = Identities_Picker.EntityFactory.createStringEntity(value);

                if (prefix != null && entity.displayName && entity.displayName.trim().toLowerCase().indexOf(prefix) === 0) {
                    additionalEntities.push(entity);
                }
            });
        }
        return additionalEntities.concat(filteredEntityList);
    }

    public getCustomTooltip: () => string =
    () => {
        const scope = this.getScope();
        return scope && Utils_String.format(scope.displayNames.length <= 10 ?
            WorkItemTrackingResources.ScopedIdentityTooltip :
            WorkItemTrackingResources.ScopedIdentityTooltipWithSuffix, scope.displayNames.join(", "));
    }

    protected getIdentityPickerConsumerId(): string {
        return "d4f43f12-b78c-4669-89d9-7851f54ac200";
    }
}

export class BulkEditTestsGrid extends EditableGrid.EditableGrid {

    constructor(options) {
        super(options);
        this._cellMinWidth = 25;

        this._bulkEditTestsViewModel.initialized = () => {
            this._clearSelections();
            this._cleanUpRows();
            this._viewModelInitialized = true;
        };

        this._bulkEditTestsViewModel.onTestsInSuiteCountUpdated = () => {
            this._updateCountText();
        };

        this._bulkEditTestsViewModel.onWorkItemFetched = (workItem: WITOM.WorkItem) => {
            // We need to bind and set source every time because we have one cell editor per column
            let testCase: TestsOM.TestCase,
                workItemCellEditor: any,
                cellEditor = this._currentlyEditingColumnIndex ? this.getCellEditorForColumn(this._currentlyEditingColumnIndex) : null;

            if (this._inEditMode && cellEditor && (cellEditor instanceof WorkItemFieldComboCellEditor || cellEditor instanceof WorkItemFieldCommonIdentityPickerCellEditor)) {
                testCase = this._bulkEditTestsViewModel.getTestCaseAtIndex(this.getCurrentEditRowIndex());
                if (cellEditor instanceof WorkItemFieldComboCellEditor) {
                    workItemCellEditor = <WorkItemFieldComboCellEditor>cellEditor;
                }
                else if (cellEditor instanceof WorkItemFieldCommonIdentityPickerCellEditor) {
                    workItemCellEditor = <WorkItemFieldCommonIdentityPickerCellEditor>cellEditor;

                    workItemCellEditor._bind(Identities_Picker.IdentityPickerSearchControl.VALID_INPUT_EVENT, (item) => {
                        this._handleIdentityPickerInputChange(workItemCellEditor);
                    }); 

                    workItemCellEditor._bind(CommonIdentityPickerCellEditor.INPUT_CHANGED_EVENT, (item) => {
                        this._handleIdentityPickerInputChange(workItemCellEditor);
                    }); 
                }

                if (this._areSameWorkItems(testCase, workItem) || this._isUnsavedTestCaseAndNewWorkItem(testCase, workItem)) {
                    workItemCellEditor.bind(workItem);
                }
            }
        };

        this._bulkEditTestsViewModel.updated = (command?: any, indicesToSelect?: number[]) => {
            if (command === EditableGrid.EditableGrid.Commands.CMD_CLEAR_ROWS) {
                this.updateRows();
                Diag.logTracePoint("BulkEntry.Grid.Clear.Complete");
            }
            else {
                this._refreshGrid(command, indicesToSelect);
            }

            this._updateToolbarCommandStates();
        };

        this._bulkEditTestsViewModel.onColumnOptionsAdded = () => {
            this._options.columns = this._getColumnInfo();

            //prepare header for our grid
            this.initializeDataSource(true);
            this._drawHeader();
            this._layoutContentSpacer();
            this._clipboardDataModel.setGridColumns(this._columns);
        };

        this._bulkEditTestsViewModel.workItemChanged = (sender: any, args: any) => {
            this._workItemChanged(sender, args);
        };
        this._bulkEditTestsViewModel.commandComplete = (command?: string) => {
            if (command === BulkEditCommands.refreshRecords) {
                this.focus(10);
            }
        };

        this._bulkEditTestsViewModel.showError = (errorMessage: string) => {
            Dialogs.MessageDialog.showMessageDialog(errorMessage, {
                title: Resources.Error,
                buttons: [Dialogs.MessageDialog.buttons.ok]
            });
        };

        this._bulkEditTestsViewModel.cleanedUp = () => {
            this._rowIndexToScrollAfterFetch = 0;
            this._scrollTop = 0;
            this._scrollLeft = 0;
            this._layoutHeader();
            this._canvas[0].scrollTop = 0;
            this._savedSelectedRows = null;
            this._cleanUpGrid();
            this._viewModelInitialized = false;
        };

        this._bulkEditTestsViewModel.preCleanUp = () => {
            this._fireEndEdit();
        };
    }

    public initialize() {
        super.initialize();
        this._clipboardDataModel = new ClipboardDataInfo(this._columns);
        this._copyAction = new CopyAction(this._bulkEditTestsViewModel, this._clipboardDataModel);
        this._cutAction = new CutAction(this._bulkEditTestsViewModel, this._clipboardDataModel);
        this._pasteAction = new PasteAction(this._bulkEditTestsViewModel, this._clipboardDataModel);
        $(window).bind("beforeunload", delegate(this._bulkEditTestsViewModel, this._bulkEditTestsViewModel.getMessage, true));
    }

    public _attachEvents() {
        let userAgent = window.navigator.userAgent.toLowerCase();
        super._attachEvents();
        if (userAgent.indexOf("chrome") !== -1) {
            /* TODO: BUG: 1017278 attach to the grid control instead
               Clipboard events are not getting fired when attached to grid control, 
               Keeping the same behavior as before with binding to document
            */
            this._bind(document, "copy", delegate(this, this._copyToClipboard));
            this._bind(document, "cut", delegate(this, this._cutToClipboard));
            this._bind(document, "paste", delegate(this, this._pasteFromClipboard));
        }
    }

    private _areSameWorkItems(testCase: TestsOM.TestCase, workItem: WITOM.WorkItem): boolean {
        return testCase && testCase.getId() === workItem.getUniqueId();
    }

    private _isUnsavedTestCaseAndNewWorkItem(testCase: TestsOM.TestCase, workItem: WITOM.WorkItem): boolean {
        return (!testCase || testCase.getId() <= 0) && workItem.isNew() ;
    }

    private _selectClosestNavigableCell(next: boolean, considerOnlyEditableCells: boolean): boolean {
            let selectedCellInfo = super._getSelectedCellInfo(),
            selectionChanged = true,
            continueNavigation: boolean = true;
        this._gettingRowIntoView = true;
        do {
            selectionChanged = this._selectNextOrPrevCell(next, true);
            if (!selectionChanged) {
                if (next) {
                    selectionChanged = this._selectNextRowFirstCell(true);
                }
                else {
                    selectionChanged = this._selectPrevRowLastCell(true);
                }
            }
                selectedCellInfo = this._getSelectedCellInfo();
            if (selectionChanged && selectedCellInfo) {
                continueNavigation = considerOnlyEditableCells ? !this._canEdit(selectedCellInfo) : !this._canNavigate(selectedCellInfo);
            }
            else {
                continueNavigation = false;
            }

        } while (continueNavigation);
       
        this.getSelectedCellIntoView();
        this.cancelDelayedFunction("onCellSelectionChanged");
        this.delayExecute("onCellSelectionChanged", 10, true, delegate(this, this.onCellSelectionChanged, this.getSelectedCell()));
        this._gettingRowIntoView = false;
        return selectionChanged;
    }

    private _canNavigate(selectedCellInfo: EditableGrid.CellInfo): boolean{
        if (selectedCellInfo) {
            if (this._canEdit(selectedCellInfo)) {
                return true;
            }
            else {
                return super._isHyperLinkCell(selectedCellInfo);
            }
        }
        else {
            return false;
        }
    }

    private _onInsertComplete() {
        Utils_Core.delay(this, 50, () => {
            Diag.logVerbose("[BulkEditGrid._onInsertComplete]Delayed execution start updating viewport after inserting rows ");
            this._updateViewport();
            if (this._pasteActionProgressId && this._pasteActionProgressId > 0){
                VSS.globalProgressIndicator.actionCompleted(this._pasteActionProgressId);
                Diag.logVerbose("[BulkEditTestsGrid._onInsertComplete]Finish progressIndicator id : " + this._pasteActionProgressId);
                this._pasteActionProgressId = -1;
            }
            Diag.logVerbose("[BulkEditGrid._onInsertComplete]Delayed execution finished updating viewport after inserting rows ");
        });
    }
    
    public whenLayoutComplete(command?: any, indicesToSelect?: number[]) {
        let $cell: JQuery,
            selectionChanged: boolean = true,
            selectedCellInfo = super._getSelectedCellInfo();

        Diag.logVerbose("[BulkEditGrid.whenLayoutComplete]Layout complete called with command " + command);
        this.hideBusyOverlay();
        if (command !== BulkEditCommands.pageTestCases && command !== BulkEditCommands.saveAllTestCases) {
            super.whenLayoutComplete(command, indicesToSelect);
            if (command === EditableGrid.EditableGrid.Commands.CMD_INSERT_ROW || command === BulkEditCommands.insertTestStep) {
                if (selectedCellInfo && !this._canEdit(selectedCellInfo)) {
                    this._selectClosestNavigableCell(true, true);
                }
                this._onInsertComplete();
            }
        }
        else if (command === BulkEditCommands.pageTestCases) {
            if (this._rowIndexToScrollAfterFetch >= 0) {
                this._getRowIntoView(this._rowIndexToScrollAfterFetch);
                this._rowIndexToScrollAfterFetch = -1;
            }

            this._restoreRowSelection();
        }
        else if (command === BulkEditCommands.saveAllTestCases) {
            this._restoreRowSelection();
        }

        this.ensureRowSelectionWhenLayoutComplete(command, indicesToSelect);
        this.focus(10);

        if (!selectedCellInfo) {
            // Select the second cell by default.
            $cell = this._element.find(".grid-cell").eq(1);
            if ($cell.length === 1) {
                super._selectRowAndCell($cell);
            }
        }
        Diag.logTracePoint("BulkEntry.Grid.Layout.Complete");
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        this._bulkEditTestsViewModel = options.bulkEditTestsViewModel;
        this._parentElement = options.parent;
        this._containerClassName = options.containerClassName;

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            cssClass: "bulk-edit-tests-grid",
            allowMoveColumns: false,
            allowMultiSelect: true,
            keepSelection: true,
            extendViewportBy: 10,
            columns: this._getColumnInfo()
        }, options));        
        
        this._createMenuBar();
    }

    private _getColumnInfo(): any[]{
        let columnsToDisplay: any[] = [],
            fields = this._bulkEditTestsViewModel.getAdditionalWorkItemFields();

        // set the fixed columns
        columnsToDisplay.push(BulkEditTestsGrid._idColumn);
        columnsToDisplay.push(BulkEditTestsGrid._titleColumn);
        columnsToDisplay.push(BulkEditTestsGrid._actionColumn);
        columnsToDisplay.push(BulkEditTestsGrid._expectedResultColumn);

        if (fields){
            this._appendAdditionalColumns(columnsToDisplay, fields);
        }

        return columnsToDisplay;
    }

    private _appendAdditionalColumns(columnsToDisplay: any[], fields: any[]){
        let length = fields.length,
            i: number,
            canEditField: boolean,
            columnIndex: string,
            fieldName: string,
            isIdentityField: boolean;

        let identityCellRenderer = function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
            // we dont want to show identity avatar in this identity cell. Hence we pass "false" as the last parameter
            return TFS_UI_Controls_Identities.IdentityViewControl.renderIdentityCellContents(this, rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, false);
        };

        for (i = 0; i < length; i++) {
            columnIndex = fields[i].referenceName;
            fieldName = fields[i].name;
            isIdentityField = fields[i].isIdentity;
            canEditField = TestsOM.FieldUtils.isFieldEditable(fields[i]);
            if (Utils_String.ignoreCaseComparer(columnIndex, "System.Tags") === 0) {
                columnsToDisplay.push({
                    index: columnIndex,
                    text: fieldName,
                    canSortBy: false,
                    width: 100,
                    canEdit: canEditField,
                    editOnSelect: fields[i].rules,
                    isMultiLine: false,
                    isRichText: false
                });
            }
            else if (isIdentityField) {
                columnsToDisplay.push({
                    index: columnIndex,
                    text: fieldName,
                    canSortBy: false,
                    width: 200,
                    canEdit: canEditField,
                    editOnSelect: true,
                    getCellContents: identityCellRenderer,
                    getCellEditor: function (index, text) {
                        return new WorkItemFieldCommonIdentityPickerCellEditor({ cssClass: "identity-picker-cell-editor-" + index, coreCssClass: "identity-picker-cell-editor", fieldName: text });
                    }
                });
            }
            else {
                columnsToDisplay.push({
                    index: columnIndex,
                    text: fieldName,
                    canSortBy: false,
                    width: 100,
                    canEdit: canEditField,
                    editOnSelect: fields[i].rules,
                    getCellEditor: function (index, text) {
                        if (this.canEdit) {
                            return new WorkItemFieldComboCellEditor({ cssClass: "combo-cell-editor-" + index, coreCssClass: "combo-cell-editor", fieldName: text, label: text });
                        }
                        return null;
                    }
                });
            }
        }
    }

    private _updateValueInModel(dataIndex: number, columnIndex: string, newValue: string, ignoreValueChange?: boolean, doNotEdit?: boolean) {
        if (this._valueChanged && !ignoreValueChange) {
            Diag.logVerbose("[BulkEditVM.onEndCellEdit]End cell edit triggered with value " + newValue);
            this._bulkEditTestsViewModel.setValue(dataIndex, columnIndex, newValue, () => {
                this._updateToolbarCommandStates();
                if (!doNotEdit) {
                    super.onEndCellEdit(dataIndex, columnIndex, newValue, ignoreValueChange);
                }
                this._valueChanged = false;
            });
        }
        else {
            super.onEndCellEdit(dataIndex, columnIndex, newValue, ignoreValueChange);
            this._valueChanged = false;
        }
    }

    public onEndCellEdit(dataIndex: number, columnIndex: string, newValue: string, ignoreValueChange?: boolean) {
        this._updateValueInModel(dataIndex, columnIndex, newValue, ignoreValueChange);
    }

    public onCellChanged(dataIndex: number, columnIndex: string, newValue: string) {
        this._valueChanged = true;
        let cellEditor = this.getCellEditorForColumn(columnIndex);
        if (this._inEditMode && cellEditor && (cellEditor instanceof WorkItemFieldComboCellEditor || cellEditor instanceof WorkItemFieldCommonIdentityPickerCellEditor)) {
            //this is for the behavior that on any change to dropdown without blurring out(say selection from dropdown) wit should become dirty
            this._updateValueInModel(dataIndex, columnIndex, newValue, false, true);
        }
       
    }

    public getColumnValue(dataIndex: number, columnIndex: number, columnOrder?: number) {
        let value = this._bulkEditTestsViewModel.getValue(dataIndex, columnIndex.toString());
        if (!this.getCellEditorForColumn(columnIndex)) {
            return this._bulkEditTestsViewModel.isValidTestCase(dataIndex) ? value : "";
        }
        return value;
    }

    public show() {
        let $toolbar = this._parentElement.find(".hub-pivot-toolbar");
        this._parentElement.find(this._containerClassName).show();
        this._menuBar.showElement();
        this._toolbarMargin = $toolbar.css("margin-left");
        $toolbar.css("margin-left", "0px");
    }

    public hide() {
        let $toolbar = this._parentElement.find(".hub-pivot-toolbar");
        this._parentElement.find(this._containerClassName).hide();
        this._menuBar.hideElement();
        $toolbar.css("margin-left", this._toolbarMargin);
    }

    public _drawCell(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
        let $cell = super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder),
            cellInfo = $cell.data("cell-info");

        if (column.index === "id") {
            $cell.addClass("grid-id-cell");
        }
        else if (cellInfo && (!cellInfo.columnInfo.canEdit || !this.canEditCell(cellInfo.dataIndex, cellInfo.columnInfo.index))) {
            $cell.addClass("grid-cell-uneditable");
        }

        if (this.isSharedStepTitleCell(cellInfo.dataIndex, column.index)) {
            $cell.addClass("grid-cell-shared-step-title");
        }
        else {
            $cell.removeClass("grid-cell-shared-step-title");
        }

        if (column.index === "testCaseTitle") {
            $cell.addClass("grid-testCaseTitle-cell");
        }

        return $cell;
    }

    public _appendRow(): boolean {
        if (this._bulkEditTestsViewModel.canAppendRows(20)) {
            this._bulkEditTestsViewModel.appendRows(20);
            return true;
        }
        return false;
    }

    public onHyperLinkClick(dataIndex: number, columnIndex: string): void {
        this._bulkEditTestsViewModel.onHyperLinkClick(dataIndex, columnIndex);
    }

    private _createMenuBar() {
        /// <summary>Creates the MenuBar</summary>
        let $toolbar = this._parentElement.find(".hub-pivot-toolbar");
        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $toolbar, {
            items: this._createMenubarItems(),
            executeAction: delegate(this, this._onMenubarItemClick),
            cssClass: "bulk-edit-tests-toolbar"
        });

        this._updateToolbarCommandStates();
    }

    private _createMenubarItems(): any[] {
        /// <summary>Creates the items list for the toolbar</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items = [];
        items.push({ id: BulkEditCommands.saveAllTestCases, title: Resources.SaveTestsText, showText: false, icon: "bowtie-icon bowtie-save-all" });
        items.push({ id: BulkEditCommands.refreshTestCases, title: Resources.RefreshToolTip, showText: false, icon: "bowtie-icon bowtie-navigate-refresh" });
        return items;
    }

    private _onMenubarItemClick(e?: any) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
         Diag.logTracePoint("BulkEntry.ToolBarMenuItem.Click");
        let command = e.get_commandName();

        // Firefox does not fire 'blur' when toolbar is clicked. So end edit has to be triggered explicitly.
        if (Utils_UI.BrowserCheckUtils.isFirefox()) {
            this._fireEndEdit();
        }

        if (command === BulkEditCommands.saveAllTestCases) {
             this._saveAllTestCases();
        }
        else if (command === BulkEditCommands.refreshTestCases) {
            this.showBusyOverlay();
            try {
                this._bulkEditTestsViewModel.refreshGridData();
            }
            finally {
                this.hideBusyOverlay();
            }

        }
    }

    private _saveAllTestCases() {
        this._bulkEditTestsViewModel.beginSave((result: boolean) => {
            if (result) {
                this._refreshGrid(BulkEditCommands.saveAllTestCases);
            }

            this._updateToolbarCommandStates();
            Diag.logTracePoint("BulkEntry.SaveAll.Complete");
        },
        (error) => {
            alert(VSS.getErrorMessage(error));
        });
    }

    private _refreshGrid(command?: any, indicesToSelect?: number[]): void {        
        this.onLayoutComplete(command, indicesToSelect);
        this._options.source = this._bulkEditTestsViewModel.getDataSource();
        if (command === BulkEditCommands.pageTestCases || command === BulkEditCommands.saveAllTestCases) {
            this._saveRowSelection();
        }

        if (command === BulkEditCommands.pageTestCases || command === EditableGrid.EditableGrid.Commands.CMD_APPEND) {
            this.setDataSource(this._options.source, this._options.expandStates, this._options.columns, this._options.sortOrder, 0, true);
            this._updateViewportForNewlyPagedData();
            Diag.logTracePoint("BulkEntry.Grid.NewlyPagedData.Complete");
        }
        else {
            if (command === EditableGrid.EditableGrid.Commands.CMD_DELETE_ROWS) {
                this._adjustContentSpacerHeightsPostDelete();
            }
            else if (command === BulkEditCommands.insertTestStep || command === EditableGrid.EditableGrid.Commands.CMD_INSERT_ROW) {
                this._includeNewlyInsertedRowsInViewport(indicesToSelect);
            }
            this.setDataSource(this._options.source, this._options.expandStates, this._options.columns, this._options.sortOrder);
        }
        this._updateCountText();
    }

    public _cleanUpGrid() {
        this._removeCountText();
        super._cleanUpGrid();
    }

    private _updateCountText() {
        if (!this._$countTextSpan) {
            this._$countTextSpan = $("<span class='bulk-edit-test-count hub-title-right' />").insertBefore(".hub-title");
        }
        this._$countTextSpan.text(Utils_String.format(Resources.BulkEditCountText, this._bulkEditTestsViewModel.getTotalTestsShown(), this._bulkEditTestsViewModel.getTotalTestsInSuite()));
    }

    private _removeCountText() {
        if (this._$countTextSpan) {
            this._$countTextSpan.remove();
            this._$countTextSpan = null;
        }
    }

    private _saveRowSelection() {
        this._savedSelectedRows = this._selectedRows;
    }

    private _restoreRowSelection() {
        let rowIndex: any;
        if (this._savedSelectedRows) {
            for (rowIndex in this._savedSelectedRows) {
                if (this._savedSelectedRows.hasOwnProperty(rowIndex)) {
                    this._addSelection(parseInt(rowIndex, 10), this._savedSelectedRows[rowIndex], { doNotFireEvent: true, keepSelectionStart: true });
                }
            }

            this._savedSelectedRows = null;
        }
    }

    private _updateToolbarCommandStates() {
        /// <summary>Updates the states of toolbar buttons - refresh and open-test-case based on test case count and selection</summary>
        this._menuBar.updateCommandStates(
            [
            {
                id: BulkEditCommands.refreshTestCases,
                disabled: !this._bulkEditTestsViewModel.canRefreshTestCases()
            },
            {
                id: BulkEditCommands.saveAllTestCases,
                disabled: !this._bulkEditTestsViewModel.canSaveAllTestCases()
            }
            ]);
    }

    private _workItemChanged(sender: any, args?: any) {
        let workItem: WITOM.WorkItem,
            workItemId: number;

        workItem = args.workItem;
        workItemId = workItem.getUniqueId();
        if (workItemId <= 0) {
            return;
        }

        this._updateToolbarCommandStates();

        Utils_Core.delay(this, 250, () => {
            let i,
                dataRows,
                dataRow;

            dataRows = this._getDataRowsForWorkItem(workItemId);
            if (dataRows.length > 0) {
                for (i = 0; i < dataRows.length; i++) {
                    dataRow = dataRows[i];
                    if (dataRow) {
                        this._updateRowStyle(dataRow);
                    }
                    Utils_Core.delay(this, 100, () => {
                        super._updateRow(dataRow, dataRow.rowIndex, dataRow.dataIndex, false, 0, null, true);
                    });
                }
            }
        });
    }

    private _updateTestCaseCellSeparator(rowInfo: any) {
        let i: number, max: number,
            rowViewModel = this._dataSource[rowInfo.dataIndex],
            row = rowInfo.row,
            children = row.children();        

        $.each(children, (i: number, child: JQuery) => {
            $(child).removeClass("testcase-title-cell");

            if (rowViewModel && rowViewModel.isTestCase && rowInfo.dataIndex > 0) {
                $(child).addClass("testcase-title-cell");
            }
        });
    }

    public _updateRowStyle(rowInfo: any) {
        let error: Error,
            $idCell: JQuery,
            idColumnText: string;                        

        if (!rowInfo || !rowInfo.row) {
            return;
        }

        let row = rowInfo.row;
        row.removeClass("dirty-workitem-row invalid-workitem-row");        
        row.attr("title", "");        

        this._updateTestCaseCellSeparator(rowInfo);        
        if (this._bulkEditTestsViewModel.isDirty(rowInfo.dataIndex)) {
            row.addClass("dirty-workitem-row");

            // If the work item is invalid or has an error associated with it, show the work item as invalid.
            if (this._bulkEditTestsViewModel.isInvalid(rowInfo.dataIndex)) {
                row.addClass("invalid-workitem-row");
                error = this._bulkEditTestsViewModel.getError(rowInfo.dataIndex);
                if (error) {
                    row.attr("title", error.message);
                }
            }
        }
    }

    private _getDataRowsForWorkItem(workItemId: number) {
        let rows = this._rows,
            dataRowsForWorkItem = [],
            index,
            row;
        if (rows) {
            for (index in rows) {
                if (rows.hasOwnProperty(index)) {
                    row = rows[index];
                    if (this._dataSource[row.dataIndex] && this._dataSource[row.dataIndex].getValue("id") === workItemId) {
                        dataRowsForWorkItem.push(row);
                    }
                }
            }
        }
        return dataRowsForWorkItem;
    }

    public _handleEditorEndEdit(e?: JQueryEventObject, $currentCell?: JQuery) {
        let testCase: TestsOM.TestCase = this._getCurrentTestCase();
        // Handle Ctrl + S for test case.
        if (testCase && e && Utils_UI.KeyUtils.isExclusivelyCtrl(e) && (String.fromCharCode(e.keyCode).toLowerCase() === "s")) {
            this._bulkEditTestsViewModel.prepareTestCaseForEdit(testCase, () => {
                super._handleEditorEndEdit(e, $currentCell);
            });
        }
        else {
            super._handleEditorEndEdit(e, $currentCell);
        }
    }

    public _onKeyDown(e?: JQueryEventObject): any {
        let keyCode = Utils_UI.KeyCode,
            handled: boolean = false;

        if (!this._viewModelInitialized) {
            return;
        }

        if (!this._bulkEditTestsViewModel.canHandleShortCutKeys()) {
            return;
        }

        if (!(e.keyCode === 67 && e.ctrlKey)) { //Handle Ctrl+C ourselves
            super._onKeyDown(e);
        }

        switch (e.keyCode) {
            case 83: // S
                if (Utils_UI.KeyUtils.isExclusivelyCtrl(e)) {
                    this._saveAllTestCases();
                    handled = true;
                }
                else {
                    return;
                }
                break;
            case 67: // C
                // When alt is pressed along with Ctrl+C, clipboard is empty. But we still want to proceed on the copy path.
                if ((<any>window).clipboardData || e.altKey) {
                    if (e.ctrlKey) {
                        this._copyToClipboard(e);
                    }
                    else {
                        return;
                    }
                }
                break;
            case 86: // V
                if ((<any>window).clipboardData) {
                    if (e.ctrlKey) {
                        this._pasteFromClipboard();
                        handled = true;
                    }
                    else {
                        return;
                    }
                }
                break;
            case 88: //X
                if ((<any>window).clipboardData) {
                    if (e.ctrlKey) {
                        this._cutToClipboard();
                    }
                    else {
                        return;
                    }
                }
                break;

            case 80: //P
                if (e.altKey) {
                    this._handleInsertShortCutKey();
                }
                break;
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    private _getCurrentTestCase(): TestsOM.TestCase {
        let cellInfo = this._getSelectedCellInfo();
        if (cellInfo) {
            return this._bulkEditTestsViewModel.getTestCaseAtIndex(cellInfo.dataIndex);
        }
        else {
            return null;
        }
    }

    private _copyToClipboard(e?): void {

        if (!this._viewModelInitialized) {
            return;
        }

        if (this._inEditMode) {
            return;
        }

        if (!this._bulkEditTestsViewModel.canHandleShortCutKeys()) {
            return;
        }

        if (!this._currentlyCopying) {
            this._currentlyCopying = true;
        }
        else {
            // Stop propagation if this copy event was invoked recursively due to
            // document.execCommand("copy") being called on a temporary child DOM element in an earlier copy flow.
            return;
        }

        Diag.logVerbose("[BulkEditTestsGrid._copyToClipboard] Selected data indices : " + this.getSelectedDataIndices());
        this._copyAction.copy(this.getSelectedDataIndices(), e);

        this._currentlyCopying = false;
    }

    private _pasteFromClipboard(e?, clipboardText?: string): void {
        let selectedDataIndices = this.getSelectedDataIndices();

        if (!this._viewModelInitialized) {
            return;
        }

        if (this._inEditMode) {
            return;
        }

        if (!this._bulkEditTestsViewModel.canHandleShortCutKeys()) {
            return;
        }

        Diag.logVerbose("[BulkEditTestsGrid._pasteFromClipboard] Selected data indices : " + selectedDataIndices);
        $.extend(e, { clipboardDataText: clipboardText });

        let selectionInfo = this._getSelectionInfo(selectedDataIndices);
        Diag.logVerbose("[BulkEditTestsGrid._pasteFromClipboard] Test case selected : " + selectionInfo.isTestCaseSelected + " Test step selected " + selectionInfo.isTestStepSelected);
        if (!this._pasteActionProgressId || this._pasteActionProgressId < 0) {
            this._pasteActionProgressId = VSS.globalProgressIndicator.actionStarted("pasteFromClipboard", true);
            Diag.logVerbose("[BulkEditTestsGrid._pasteFromClipboard]Start progressIndicator id : " + this._pasteActionProgressId);
            if (!this._pasteAction.paste(this.getSelectedDataIndices(), selectionInfo, this._getSelectedCellInfo(), e)) {
                VSS.globalProgressIndicator.actionCompleted(this._pasteActionProgressId);
                Diag.logVerbose("[BulkEditTestsGrid._pasteFromClipboard]Finish progressIndicator id : " + this._pasteActionProgressId);
                this._pasteActionProgressId = -1;
            }
        }
    }    
    
    private _cutToClipboard(e?): void {
        if (!this._viewModelInitialized) {
            return;
        }

        if (this._inEditMode) {
            return;
        }

        if (!this._bulkEditTestsViewModel.canHandleShortCutKeys()) {
            return;
        }

        Diag.logVerbose("[BulkEditTestsGrid._cutToClipboard] Selected data indices : " + this.getSelectedDataIndices());
        this._cutAction.cut(this.getSelectedDataIndices(), e);
    }

    private _handleInsertShortCutKey() {
        let selectedRowIndices = this.getSelectedRowIndices(),
            selectedDataIndices = this.getSelectedDataIndices(),
            selectionInfo = this._getSelectionInfo(selectedDataIndices);

            this._onInsertRow(selectedDataIndices, selectedRowIndices);
    }

    private _handleIdentityPickerInputChange(workItemCellEditor: any ) {
        this._valueChanged = true;
        workItemCellEditor.getValue();
        workItemCellEditor.setValue(workItemCellEditor.getDisplayValue());
    }

    public _invalidateRowHeights(): void {
        this._bulkEditTestsViewModel.invalidateRowHeights();
    }

    public _onInsertRow(selectedDataIndices: number[], selectedRowIndices: number[]) {
        let cellInfo = this._getSelectedCellInfo(),
            selectionInfo = this._getSelectionInfo([selectedDataIndices[0]]),
            selectionLength = selectedDataIndices.length;

        this._bulkEditTestsViewModel.insertRow(selectedDataIndices[0], selectionInfo.isTestStepSelected, selectionLength);
    }

    public _onDeleteRows(selectedDataIndices: number[], selectedRowIndices: number[]) {
        let length = selectedDataIndices.length, i: number,
            newRowsTobeAdded: number,
            selectionInfo = this._getSelectionInfo(selectedDataIndices);
        
        this._rowHeightsDifferencePostDelete = 0;

        if (selectionInfo.isSingleTestCaseSelected) {
            if (!this._bulkEditTestsViewModel.removeSelectedTestCase(selectedDataIndices)) {
                return;
            }
            let totalSteps = this._dataSource[selectedDataIndices[0]].testCase._testSteps.length;
            length = totalSteps + 1;

            for (i = 0; i < totalSteps; i++) {
                selectedDataIndices.push(selectedDataIndices[0] + i);
            }
        }
                
        newRowsTobeAdded = this._bulkEditTestsViewModel.getMinRowCount() - (this._count - length);

        Diag.logVerbose("[BulkEditTestsGrid._onDeleteRows]New empty rows to be added post delete  : " + newRowsTobeAdded);
        if (this._bulkEditTestsViewModel.canDeleteRows(selectedDataIndices)) {
            for (i = 0; i < length; i++) {
                this._rowHeightsDifferencePostDelete += this._getOuterRowHeight(selectedDataIndices[i]);
            }
            if (newRowsTobeAdded > 0) {
                this._rowHeightsDifferencePostDelete -= newRowsTobeAdded * this._emptyRowOuterHeight;
            }

            if (selectionInfo.isSingleTestCaseSelected) {
                this._bulkEditTestsViewModel.deleteTestCase(selectedDataIndices);                
            }
            else {
                this._bulkEditTestsViewModel.deleteRows(selectedDataIndices);
            }
        }
    }

    public _onClearRows(selectedDataIndices: number[], selectedRowIndices: number[]) {
        if (this._bulkEditTestsViewModel.canClearRows(selectedDataIndices)) {
            this._bulkEditTestsViewModel.clearRows(selectedDataIndices);
        }
    }

    public _onDeleteKey(e?: JQueryEventObject): any {
        let selectedCellInfo = super._getSelectedCellInfo(),
            selectedDataIndices = this.getSelectedDataIndices(),
            selectedRowIndices = this.getSelectedRowIndices();
        
        if (selectedCellInfo && selectedCellInfo.columnInfo.index === "id") {
            if (!this._bulkEditTestsViewModel.isValidTestCase(selectedCellInfo.dataIndex)) {
                // This means id is selected. Clear selected rows.
                this._onClearRows(selectedDataIndices, selectedRowIndices);
            }
        }
        else {
            super._onDeleteKey(e);
        }
    }

    public _updateViewportForNewlyPagedData() {
        let lastRowIndex, lastDataIndex, l, newVisible, progressId: number;
        if (this._lastVisibleRange && this._lastVisibleRange.length) {
            l = this._lastVisibleRange.length;
            lastRowIndex = this._lastVisibleRange[l - 1][0] + 1;
            lastDataIndex = this._lastVisibleRange[l - 1][1] + 1;
            newVisible = this._lastVisibleRange;
        }
        else {
            newVisible = [];
            lastDataIndex = 0;
            lastRowIndex = 0;
        }

        Diag.logVerbose("[_updateViewportForNewlyPagedData]Number of rows ofdata now = " + this._count);
        for (; lastDataIndex < this._count; lastDataIndex++, lastRowIndex++) {
            newVisible[newVisible.length] = [lastRowIndex, lastDataIndex];
        }

        progressId = VSS.globalProgressIndicator.actionStarted("updateViewPortForNewlyPagedData");
        Diag.logVerbose("[_updateViewportForNewlyPagedData]Starting drawing rows from " + newVisible[0][1] + "to " + newVisible[newVisible.length - 1][1]);
        //This is needed for the scenario when the user scrolls , while new data is being fetched. Since we draw all the rows ranging from current viewport to the latest data after fetch, this
        //needs to be done to override the current calculations
        this.setHeightForLowerContentSpacer(0);
        this._drawRows(newVisible, false);
        this._measureCanvasSize();

        //doing this because without this we dont have the calculations for _heightForLowerContentSpacer & _heightForUpperContentSpacer, so without doing this if layout is called due to resize, insert,
        //delete it would not work
        Diag.logVerbose("[_updateViewportForNewlyPagedData]Finsished drawing rows from " + newVisible[0][1] + "to " + newVisible[newVisible.length - 1][1]);
        Utils_Core.delay(this, 50, () => {
            Diag.logVerbose("[_updateViewportForNewlyPagedData]Started delayed execution of updating viewport post getting more tests");
            this._updateViewport();
            VSS.globalProgressIndicator.actionCompleted(progressId);
            Diag.logVerbose("[_updateViewportForNewlyPagedData]Finished delayed execution of updating viewport post getting more tests");
        });
    }

    public onBeginCellEdit(dataIndex: number, columnIndex: string) {
        this._currentlyEditingColumnIndex = columnIndex;
        super.onBeginCellEdit(dataIndex, columnIndex);
        this._bulkEditTestsViewModel.beginEdit(dataIndex);
    }

    public _updateContextMenuCommandStates(menu: any) {
        let items: any[] = [],
            selectionInfo = this._getSelectionInfo(this.getSelectedDataIndices()),
            enableDeleteButton = selectionInfo.isSingleTestCaseSelected || !selectionInfo.isTestCaseSelected;

        menu.updateCommandStates([
            { id: EditableGrid.EditableGrid.Commands.CMD_DELETE_ROWS, disabled: !enableDeleteButton },
            { id: EditableGrid.EditableGrid.Commands.CMD_CLEAR_ROWS, disabled: selectionInfo.isTestCaseSelected }
        ]);

        super._updateContextMenuCommandStates(menu);
    }

    public _onContextMenuItemClick(e?: any) {
         Diag.logTracePoint("BulkEntry.Grid.ContextMenu.Click");
         super._onContextMenuItemClick(e);
        this._updateToolbarCommandStates();
    }

    private _getSelectionInfo(selectedDataIndices: number[]): ISelectionInfo {
        let index = 0,
            len = selectedDataIndices.length,
            isTestCaseSelected = false,
            isTestStepSelected = false,
            isSingleTestCaseSelected = false;

        for (index = 0; index < len; index++) {
            if (this._bulkEditTestsViewModel.isValidTestCase(selectedDataIndices[index])) {
                isTestCaseSelected = true;
            }
            else if (this._bulkEditTestsViewModel.isTestStep(selectedDataIndices[index])) {
                    isTestStepSelected = true;
            }            
        }
                
        isSingleTestCaseSelected = (isTestCaseSelected && (len === 1));

        return { isTestCaseSelected: isTestCaseSelected, isTestStepSelected: isTestStepSelected, isSingleTestCaseSelected: isSingleTestCaseSelected };
    }

    public _getRowHeightInfo(dataIndex: number): EditableGrid.RowHeightInfo {
        return this._bulkEditTestsViewModel.getRowHeightInfo(dataIndex);
    }

    public _setRowHeight(dataIndex: number, height: number): void {
        this._bulkEditTestsViewModel.setRowHeight(dataIndex, height);
    }

    public _onLastRowVisible(rowIndex: number) {
        Diag.logTracePoint("BulkEntry.Grid.LastRow.Visible");
        this._rowIndexToScrollAfterFetch = rowIndex;
        Diag.logVerbose("[_onLastRowVisible]Last row of grid is visible. Fetch more tests. Index to scroll to after fetch = " + rowIndex);
        this.delayExecute("fetchMoreTests", 1, true, () => {
            Diag.logVerbose("[_onLastRowVisible]Last row visible. Starting to get more tests");
            this._bulkEditTestsViewModel.fetchMoreTests();
        });
    }

    public canEditCell(dataIndex: number, columnIndex: string): boolean {
        return this._bulkEditTestsViewModel.canEdit(dataIndex, columnIndex);
    }

    public isSharedStepTitleCell(dataIndex: number, columnId: string): boolean {
        return this._bulkEditTestsViewModel.isSharedStep(dataIndex) && columnId === "action";
    }

    public static enhancementTypeName: string = "tfs.tcm.bulkEditTestsGrid";
    private _bulkEditTestsViewModel: BulkEditTestsViewModel;
    private _parentElement: JQuery;
    private _menuBar: Menus.MenuBar;
    private _containerClassName: string;
    private _toolbarMargin: string;
    private _valueChanged: boolean;
    private _rowIndexToScrollAfterFetch: number = -1;
    private _savedSelectedRows: any;

    private _currentlyEditingColumnIndex: string;
    private _clipboardDataModel: ClipboardDataInfo;
    private _copyAction: CopyAction;
    private _cutAction: CutAction;
    private _pasteAction: PasteAction;
    private _pasteActionProgressId: number;
    private _$countTextSpan: JQuery;
    private _viewModelInitialized: boolean = false;
    private _currentlyCopying: boolean = false;

    public static _idColumn: any = {
        index: "id",
        text: Resources.TestPointGridColumnID,
        canSortBy: false,
        width: 75,
        isMultiLine: false,
        canEdit: false,
        isRichText: true,
        editOnSelect: false,
        isHyperLink: true
    };

    private static _titleColumn: any = {
        index: "testCaseTitle",
        text: Resources.TestPointGridColumnTitle,
        canSortBy: false,
        width: 300,
        isMultiLine: false,
        canEdit: true,
        editOnSelect: false,
        isRichText: false
    };

    private static _actionColumn: any = {
        index: "action",
        text: Resources.BulkEditActionColumnTitle,
        canSortBy: false,
        width: 300,
        canEdit: true,
        isMultiLine: true,
        editOnSelect: false,
        isRichText: true
    };

    private static _expectedResultColumn: any = {
        index: "expectedResult",
        text: Resources.BulkEditExpectedColumnTitle,
        canSortBy: false,
        width: 300,
        canEdit: true,
        isMultiLine: true,
        editOnSelect: false,
        isRichText: true
    };
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.BulkEditTestsViewModel", exports);

