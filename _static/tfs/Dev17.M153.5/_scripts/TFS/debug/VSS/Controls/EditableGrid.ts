/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import TreeView = require("VSS/Controls/TreeView");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var log = Diag.log;
var verbose = Diag.LogVerbosity.Verbose;
var delegate = Utils_Core.delegate;
var HtmlNormalizer = Utils_Html.HtmlNormalizer;
var domElem = Utils_UI.domElem;

// Base class for a control that can be hosted in the cell editor. 
// All over-ridden functions and functions called from derived classes follow the convention of starting with "_". They have to be public to be able to be called
// from derived class. To distingish them from interface functions, "_" is added before the name.
export class CellEditor extends Controls.BaseControl {

    constructor(options) {
        super(options);
    }

    public initialize() {
        super.initialize();
    }

    public getValue(): string {
        return "";
    }

    public getDisplayValue(): string {
        return this.getValue();
    }

    public setValue(value: string, doNotSavePrevious?: boolean) {
    }

    public clearValue(setEmpty?: boolean) {
    }

    // Cell context is the cell hosting the editor.
    public setSize($cellContext: JQuery) {
    }

    public dispose() {
        if (this._element) {
            this._element.remove();
        }
    }

    public setPosition(top: number, left: number) {
        this._attachEvents();
        this._inEditMode = true;
    }

    // This should return the height of the content of the editor.
    public getHeight() {
        return 0;
    }

    public focus() {
    }

    // This is a way to trigger end edit from outside the editor. This is needed for cases where editing should be ended but the
    // editor itself cannot internally handle it. For instance when the grid is scrolled, we cannot determine this from within the
    // editor.
    public fireEndEdit(e?: JQueryEventObject) {
        if (this._inEditMode) {
            this._resetPosition();
            if (this.endEdit) {
                this.endEdit(e);
            }

            this._inEditMode = false;
        }
    }

    public beginEdit(initValue: string) {
        this._initValue = initValue;
    }

    // Start - Overridden functions.
    
    public _attachEvents() {
    }

    public _detachEvents() {
    }

    public _fireChangedIfNeeded() {
        var newValue = this.getValue();
        if (this._prevValue !== newValue) {
            this._prevValue = newValue;
            if (this.valueChanged) {
                this.valueChanged();
            }
        }
    }

    public _handleKeydown(e: JQueryEventObject):boolean {
        var keyCode = Utils_UI.KeyCode,
            event: JQueryEventObject,
            handled = false;

        switch (e.keyCode) {

            case keyCode.ESCAPE:
                Diag.logVerbose("[EditableGrid._handleKeyDown]Escape pressed. Reverting the value of the cell to " + this._initValue);
                if (this._initValue) {
                    this.setValue(this._initValue);
                }
                else {
                    this.clearValue();
                }
                this.fireEndEdit(e);
                handled = true;
                break;

            case keyCode.TAB:
                this.fireEndEdit(e);
                handled = true;
                break;

            case keyCode.ENTER:
                if (!e.shiftKey) {
                    this.fireEndEdit(e);
                }
                handled = true;
                break;

            case 83: // S
                if (Utils_UI.KeyUtils.isExclusivelyCtrl(e)) {
                    this.fireEndEdit(e);
                    e.preventDefault();
                    e.stopPropagation();
                    handled = true;
                }
                break;

            case 80: // P
                if (e.altKey) {
                    this.fireEndEdit(e);
                    e.preventDefault();
                    e.stopPropagation();
                    handled = true;
                }
                break;
        }
        return handled;
    }

    public _insertNewLineAtCursor() {
    }

    public _setCaretPositionToEnd($element: JQuery) {
    }

    // End - Overridden functions.

    public _decorateElement() {
        if (this._options.id) {
            this._element.attr("id", this._options.id)
        }
    }

    public _resetPosition() {
        this._detachEvents();
    }

    // Delegates.
    public valueChanged: () => void;
    public endEdit: (e?: JQueryEventObject) => void;

    public _prevValue: string;

    private _inEditMode: boolean;
    private _initValue: string;
}

export class TextCellEditor extends CellEditor {

    public initialize() {
        super.initialize();

        // Get the element after it is added in the container. This is needed to ensure that positioning works fine.
        this._editableArea = this._element.closest("." + this._options.cssClass);
        if (this._editableArea.length === 0) {
            this._editableArea = this._element;
        }
        this._editableArea.css({ top: 0, left: -100000, position: "fixed" });
        this._editableArea.attr("tabIndex", "-1");
    }

    public setPosition(top: number, left: number) {
        this._editableArea[0].style.top = top + "px";
        this._editableArea[0].style.left = left + "px";
        this._editableArea[0].style.position = "absolute";

        super.setPosition(top, left);
    }

    // This should return the height of the content of the editor.
    public getHeight() {
        return this._editableArea.outerHeight();
    }

    public focus() {
        Utils_UI.tryFocus(this._editableArea);
        if (this.getValue() !== "&nbsp;") {
            this._setCaretPositionToEnd(this._editableArea);
        }
    }

    // Start - Overridden functions.

    public _attachEvents() {
        this._bind(this._editableArea, "keydown", (e: JQueryEventObject) => {
            let handled = this._handleKeydown(e);
            if (handled) {
                // If already handled stop Propagation
                e.stopPropagation();
            }
        });
    }

    public _detachEvents() {
        this._unbind(this._editableArea, "keydown");
    }

    public _handleKeydown(e: JQueryEventObject):boolean {
        var keyCode = Utils_UI.KeyCode,
            event: JQueryEventObject,
            handled = false;

        switch (e.keyCode) {

            case keyCode.ENTER:
                if (e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    this._insertNewLineAtCursor();
                    handled = true;
                }
                break;
        }

        return handled || super._handleKeydown(e);
    }

    // End - Overridden functions.

    public _resetPosition() {
        this._editableArea.css({ top: 0, left: -100000, position: "fixed" });
        super._resetPosition();
    }

    public _editableArea: JQuery;
}

// Control for editing rich text within the grid.
export class RichTextCellEditor extends TextCellEditor {

    public getValue(): string {
        var $element: JQuery, html: string, $copyElement: JQuery;

        if (Utils_UI.BrowserCheckUtils.isIEVersion(11)) {
            //creating a copyelement and then returning because getvalue is used during edit mode as well and that time we dont want to remove the "&nbsp;"
            $copyElement = this._editableArea.clone();
            $element = this._getLastHtmlTag($copyElement);
            if (this._hasNonbreakingSpaceAtEnd($element)) {
                html = $element.html();
                $element.html(html.substring(0, html.length - 6));
                return $copyElement.html();
            }
        }
        return this._editableArea.html();
    }

     private _getLastHtmlTag($searchElem?: JQuery): JQuery {
        if (!$searchElem) {
            $searchElem = this._editableArea;
        }
        var $element = $searchElem.find("p:last");
        if ($element.length === 0) {
            $element = $searchElem.find("div:last");
            if ($element.length === 0) {
                $element = $searchElem;
            }
        }
        return $element;
    }

    private _hasNonbreakingSpaceAtEnd($element: JQuery): boolean {
        var html = $element.html(),
            len = html.length;
        return len >= 6 && html.substr(len - 6) === "&nbsp;";
    }

    public setValue(htmlString: string, doNotSavePrevious?: boolean) {
        var $element;
        this._editableArea.html(htmlString);

        if (Utils_UI.BrowserCheckUtils.isIEVersion(11)) {
            //adding an extra nbsp at the end because of bug 1279292 wherein bulk entry grid rich text field were not editable unless you have an extra nbsp at the end and set cursor before this nbsp
            $element = this._getLastHtmlTag();
            if (!this._hasNonbreakingSpaceAtEnd($element)) {
                $element.append("&nbsp;");
            }
        }

        if (!doNotSavePrevious) {
            this._prevValue = this.getValue();
        }
    }

    public clearValue(setEmpty?: boolean) {
        if (setEmpty) {
            this.setValue("");
        }
        else {
            this.setValue("&nbsp;");
        }
    }

    public setSize($cellContext: JQuery) {
        // This is to fix an issue after JQuery 1.8.3 migration. Earlier the width was set based on outer width of the cell. 
        // There is a likelihood that this may regress again. Need to revisit if we migrate JQuery again.
        this._editableArea.width($cellContext.width());
    }

    public _insertNewLineAtCursor() {
        Utils_UI.HtmlInsertionUtils.pasteHtmlAtCaret("<br/>");
    }

    public _attachEvents() {
        super._attachEvents();
        this._bind(this._editableArea, "blur paste keyup drop", (e: JQueryEventObject) => {
            if (e.type === "drop") {
                e.stopPropagation();
                e.preventDefault();
                return;
            }

            this._fireChangedIfNeeded();
            if (e.type === "blur") {
                this.fireEndEdit();
            }
        });
    }

    public _detachEvents() {
        super._detachEvents();
        this._unbind(this._editableArea, "blur paste keyup drop");
    }

    public _createElement() {
        super._createElement();
        this._decorateElement();
    }

    public _decorateElement() {
        super._decorateElement();
        this._element.attr("contenteditable", "true");
    }

    public _handleKeydown(e: JQueryEventObject):boolean {
        var handled = super._handleKeydown(e);

        if (this.getValue() === "&nbsp;") {
            this.setValue("");
        }
        return handled;
    }

    public _setCaretPositionToEnd($element: JQuery) {

        var $elem, html, len, element, $innerDiv, innerText: string, $innerElement: JQuery, $children: JQuery, $innerChildren: JQuery;


        if (Utils_UI.BrowserCheckUtils.isIEVersion(11)) {
            $elem = this._getLastHtmlTag();
            element = $elem[0].lastChild;

            try {
                var range, sel;

                if (element) {
                    if (document.createRange) {
                        range = document.createRange();
                        sel = window.getSelection();
                        len = $(element).text().length;
                        range.setStart(element, len - 1);

                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } else if (Utils_Core.documentSelection && Utils_Core.documentSelection.createRange) {

                        Utils_Core.documentSelection.empty();
                        range = Utils_Core.documentSelection.createRange();
                        range.collapse(false);
                        range.select();
                    }
                }
            } catch (ex) {

                if (!(ex instanceof DOMException)) {
                    throw ex;
                }
            }
        }
        else {
            element = $element[0],
            // If there exists a div which is the only child of the element and there exists a p element that is the only child of that div, set the
            // cursor at the end of that element instead. This is a special handling for test steps but should not hurt in generic case also.
            $innerDiv = $element.children("div").first();
            innerText = $element[0].innerText;
            $children = $element.children();

            while ($children.length === 1 && $innerDiv.length === 1 && $innerDiv[0].innerText === innerText) {
                $innerChildren = $innerDiv.children("p");
                $innerElement = $innerChildren.first();
                $children = $innerDiv.children();
                if ($children.length === 1 && $innerElement.length === 1 && $innerElement[0].innerText === innerText) {
                    element = $innerElement[0];
                    break;
                }
                // Handle the scenario where the inner most div has multiple paragraphs. In such case, set the cursor
                // to the last paragraph element.
                else if ($children.length === $innerChildren.length && $innerChildren.text() === $element.text()) {
                    element = $innerChildren.last()[0];
                    break;
                }
                else {
                    $innerDiv = $innerDiv.children("div").first();
                    $children = $innerDiv.children();
                }
            }

            try {
                var range, sel;
                if (element) {
                    if (document.createRange) {
                        range = document.createRange();
                        range.selectNodeContents(element);
                        sel = window.getSelection();
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    else if (Utils_Core.documentSelection && Utils_Core.documentSelection.createRange) { //For IE8
                        Utils_Core.documentSelection.empty();
                        range = Utils_Core.documentSelection.createRange();
                        range.collapse(false);
                        range.select();
                    }
                }
            }
            catch (ex) { //An exception is thrown by range.setStart in case the element is not visible on the screen
                if (!(ex instanceof DOMException)) {
                    throw ex;
                }
            }
        }
    }
}

export class PlainTextCellEditor extends TextCellEditor {

    constructor(options) {
        super($.extend({ tagName: "input" }, options));
    }

    public getValue(): string {
        return this._editableArea.val();
    }

    public setValue(value: string, doNotSavePrevious?: boolean) {
        this._editableArea.val(value);
        if (!doNotSavePrevious) {
            this._prevValue = this.getValue();
        }
    }

    public clearValue(setEmpty?: boolean) {
        this.setValue("");
    }

    public setSize($cellContext: JQuery) {
        this._editableArea.width($cellContext.outerWidth() - 1);
        this._editableArea.height($cellContext.outerHeight());
    }

    public _createElement() {
        super._createElement();
        super._decorateElement();
    }

    public _attachEvents() {
        super._attachEvents();
        this._bind(this._editableArea, "blur input change keyup", (e: JQueryEventObject) => {
            this._fireChangedIfNeeded();
            if (e.type === "blur") {
                this.fireEndEdit();
            }
        });
    }

    public _detachEvents() {
        super._detachEvents();
        this._unbind(this._editableArea, "blur input change keyup");
    }

    public _setCaretPositionToEnd($element: JQuery) {
        var length = $element.val().length,
            element: any = $element[0];

        if (element.createTextRange) {
            var range = element.createTextRange();
            range.move('character', length);
            range.select();
        }
        else if (element.selectionStart >= 0) {
            element.setSelectionRange(length, length);
        }
    }
}

export class ComboCellEditor extends CellEditor {

    private _comboControl: Combos.Combo;
    private _label: string;

    constructor(options) {
        super(options);
        if (options.label) {
            this._label = options.label;
        }
    }

    public initialize() {
        super.initialize();
        this._resetPosition();
    }

    public _populateUINodes(node: any, uiNode: any) {
        this._comboControl.setType("tree");
        this._comboControl.setMode("drop");
        var i, l, nodes = node.children, newUINode;
        if (uiNode) {
            newUINode = TreeView.TreeNode.create(node.name);
            uiNode.add(newUINode);
            uiNode = newUINode;
        } else {
            uiNode = TreeView.TreeNode.create(node.name);
        }
        if (nodes) {
            for (i = 0, l = nodes.length; i < l; i++) {
                node = nodes[i];
                this._populateUINodes(node, uiNode);
            }
        }
        return uiNode;
    }

    public _updateEditControl(values: string[], controlType: string) {
        var that;
        if (Utils_String.localeIgnoreCaseComparer("tree", controlType) === 0) {
            this._comboControl.setSource(() => {
                that = this;
                return $.map(values, function (node) {
                    return that._populateUINodes(node, null);
                });
            });
        } else {
            Diag.logVerbose("updatingEditControl " + values.length);
            this._comboControl.setType("list");
            if (values && values.length > 0) {
                this._comboControl.setMode("drop");
                this._comboControl.setSource(values);
            } else {
                this._comboControl.setMode("text");
                this._comboControl.setSource([]);
            }
        }
    }

    public getComboControl() {
        return this._comboControl;
    }

    public createIn(container) {
        super.createIn(container);
        this._comboControl = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._element, {
            mode: "text",
            change: () => {
                this._fireChangedIfNeeded();
            },
            label: this._label
        });
        this._resetPosition();
    }

    public _attachEvents() {
        this._bind(this._comboControl.getElement(), "keydown blur ", (e: JQueryEventObject) => {
            if (e.type === "keydown") {
                if (!this._handleKeydown(e)) {
                    this._fireChangedIfNeeded();
                } else {
                    // If already handled stop Propagation
                    e.stopPropagation();
                }
            }
            else {
                this._fireChangedIfNeeded();
                this.fireEndEdit();
            }
            
        });
    }

    public _detachEvents() {
        this._unbind(this._comboControl.getElement(), "blur keydown");
    }

    public setSize($cellContext: JQuery) {
        this._comboControl.getElement().width($cellContext.outerWidth() - 1);
        this._comboControl.getElement().height($cellContext.outerHeight());
    }

    public setPosition(top: number, left: number) {
        this._comboControl.getElement().css({ top: top, left: left, position: "absolute" });

        super.setPosition(top, left);
    }

    public getHeight() {
        return this._comboControl.getElement().outerHeight();
    }

    public focus() {
        Utils_UI.tryFocus(this._comboControl.getInput(), 20);
    }

    public _resetPosition() {
        if (this._comboControl) {
            this._comboControl.getElement().css({ top: 0, left: -100000, position: "fixed" });
            super._resetPosition();
        }
    }

    public getValue(): string {
        return this._comboControl.getInputText();
    }

    public setValue(value: string, doNotSavePrevious?: boolean) {
        var isValidValue = true,
            dataSource,
            items;

        if (this._comboControl.getMode() === "drop") {
            dataSource = this._comboControl.getBehavior().getDataSource();
            items = dataSource.getItems();
            if (this._comboControl.getComboType() === "list") {
                if ($.inArray(value.toString(), items) < 0) {
                    isValidValue = false;
                }
            }
            else if (this._comboControl.getComboType() === "tree") {
                if (!dataSource.root.findNode(value, "\\")) {
                    isValidValue = false;
                }
            }
        }

        if (isValidValue) {
            this._comboControl.setInputText(value, false);

            if (!doNotSavePrevious) {
                this._prevValue = this.getValue();
            }
        }
    }

    public clearValue(setEmpty?: boolean) {
        this._comboControl.setText("");
        this._prevValue = "";
    }

    public _createElement() {
        super._createElement();
        super._decorateElement();
    }
}

export class CellInfo {
    constructor(rowInfo: any, dataIndex: number, columnInfo: any, columnOrder: number) {
        this.rowInfo = rowInfo;
        this.columnInfo = columnInfo;
        this.dataIndex = dataIndex;
        this.columnOrder = columnOrder;
    }

    public rowInfo: any;
    public columnInfo: any;
    public dataIndex: number;
    public columnOrder: number;
}

export class RowHeightInfo {

    constructor(height: number) {
        this.height = height;
        this.isInvalid = false;
    }

    public height: number;
    public isInvalid: boolean;
}

// Implementation for the editable grid.
export class EditableGrid extends Grids.GridO<any> {

    public static Commands = {
        CMD_APPEND: "append-rows",
        CMD_CUT: "cut-rows",
        CMD_COPY: "copy-rows",
        CMD_PASTE: "paste-rows",
        CMD_INSERT_ROW: "insert-row",
        CMD_DELETE_ROWS: "delete-rows",
        CMD_CLEAR_ROWS: "clear-rows",
        CMD_INSERT_COLUMNS: "insert-columns",
        CMD_DELETE_COLUMNS: "delete-columns",
        CMD_RENAME_COLUMN: "rename-column"
    };

    constructor(options?: any) {
        super(options);
        this._$selectedCell = null;
        this._inEditMode = false;
        this._editRowIndex = -1;
    }

    public initialize() {
        super.initialize();
        this._element.addClass("editable-grid");
        this._element.attr("aria-readonly", "false");
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {
        var contextMenu = {
            items: delegate(this, this._getContextMenuItems),
            updateCommandStates: delegate(this, this._updateContextMenuCommandStates),
            executeAction: delegate(this, this._onContextMenuItemClick)
        };

        super.initializeOptions($.extend({
            contextMenu: contextMenu,
        }, options));
    }

    public getPinAndFocusElementForContextMenu(eventArgs): { pinElement: JQuery; focusElement: JQuery; } {
        var columnIndex = this._getClickedColumnIndex(eventArgs.event),
            rowInfo = eventArgs.rowInfo,
            pinElement: JQuery,
            focusElement: JQuery;

        pinElement = rowInfo.row.children().eq(columnIndex);
        focusElement = pinElement.children().length > 0 ? pinElement.children().eq(0) : this._canvas;
        return { pinElement: pinElement, focusElement: focusElement };
    }

    public _getClickedColumnIndex(e?: JQueryEventObject): number {
        var cellInfo = this._getCellInfoFromEvent(e, ".grid-cell");
        if (cellInfo) {
            return cellInfo.columnOrder;
        }
        else {
            return 0;
        }
    }

    protected _onHeaderKeyDown(e?: JQueryEventObject): void {
        let keyCode = Utils_UI.KeyCode;

        // Make parameter header column editable on F2
        if(e.keyCode === keyCode.F2){
            this._onHeaderDblClick(e);

            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Delete parameter header column on DELETE key press
        if(e.keyCode === keyCode.DELETE){
            this._onDeleteHeader(e);

            e.preventDefault();
            e.stopPropagation();
            return;
        }

        super._onHeaderKeyDown(e);
    }

    protected _getNextHeaderElement($target: JQuery): JQuery{
        return $target.next(this._editableHeaderColumnClassName);
    }

    protected _getPreviousHeaderElement($target: JQuery): JQuery{
        return $target.prev(this._editableHeaderColumnClassName);
    }

    protected _getFocusableHeaderElement(): JQuery{
        return this._getHeaderSortColumn(this._editableHeaderColumnClassName);
    }

    public _shouldAttachContextMenuEvents(): boolean {
        return this._options.contextMenu;
    }

    public onContextMenu(eventArgs): any {
        if (this._currentCellEditor) {
            this._currentCellEditor.fireEndEdit();
        }
        this._showContextMenu(eventArgs);
    }

    /**
     * gets context menu items list
     * 
     * @return new list of context menu items
     */
    public _getContextMenuItems(): any {
        return <any[]>[
            { rank: 9, id: EditableGrid.Commands.CMD_INSERT_ROW, text: Resources_Platform.InsertRowText, title: Resources_Platform.InsertRowText, showText: true },
            { rank: 10, id: EditableGrid.Commands.CMD_DELETE_ROWS, text: Resources_Platform.DeleteRowText, title: Resources_Platform.DeleteRowText, showText: true },
            { rank: 11, id: EditableGrid.Commands.CMD_CLEAR_ROWS, text: Resources_Platform.ClearRowText, title: Resources_Platform.ClearRowText, showText: true }];
    }

    public _updateContextMenuCommandStates(menu: any) {
    }

    public _onContextMenuItemClick(e?: any) {
        var command = e.get_commandName(),
            selectedDataIndices = this.getSelectedDataIndices(),
            selectedRowIndices = this.getSelectedRowIndices();

        if (command === EditableGrid.Commands.CMD_INSERT_ROW) {
            this._onInsertRow(selectedDataIndices, selectedRowIndices);
        }
        else if (command === EditableGrid.Commands.CMD_DELETE_ROWS) {
            this._onDeleteRows(selectedDataIndices, selectedRowIndices);
        }
        else if (command === EditableGrid.Commands.CMD_CLEAR_ROWS) {
            this._onClearRows(selectedDataIndices, selectedRowIndices);
        }
    }

    public _onInsertRow(selectedDataIndices: number[], selectedRowIndices: number[]) {
    }

    public _onDeleteRows(selectedDataIndices: number[], selectedRowIndices: number[]) {
    }

    public _onClearRows(selectedDataIndices: number[], selectedRowIndices: number[]) {
    }

    public getSelectedRowIndices(): number[] {
        var index,
            rows = this._selectedRows,
            indices = [];

        if (rows) {
            for (index in rows) {
                if (rows.hasOwnProperty(index)) {
                    indices.push(index);
                }
            }
        }

        return indices;
    }

    public _drawCell(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
        var $cell = super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder),
            cellInfo = new CellInfo(rowInfo, dataIndex, column, columnOrder),
            columnValue: string;

        // TODO: Modify this to sanitize input.
        columnValue = this.getColumnValue(dataIndex, column.index, columnOrder);
        if (column.isRichText) {
            if (column.isHyperLink && columnValue) {
                $cell.html("");
                var $hyperLink = $("<a>")
                         .attr("title", columnValue)
                         .attr("id", "link-" + column.index + "-" + dataIndex)
                         .text(columnValue)
                         .click(() => {
                             this.onHyperLinkClick(dataIndex, column.index);
                         });

                $cell.append($hyperLink);
            }
            else {
                this._setCellValue($cell, columnValue, true);
            }

            $cell.addClass("rich-text-cell");
        }
        else if (!column.getCellEditor) {
            $cell.addClass("plain-text-cell");
            $cell.attr("title", columnValue);
        }

        $cell.data("cell-info", cellInfo);
        $cell.attr("role", "gridcell");
        if (this._areCellInfoEqual(cellInfo, this._selectedCellInfo)) {
            this._selectCell($cell, false, this._inEditMode, false, false, true);
        }

        return $cell;
    }

    public onHyperLinkClick(dataIndex: number, columnIndex: string) : void {
    }

    public onBeginCellEdit(dataIndex: number, columnIndex: string) {
        this._inEditMode = true;
        this._editRowIndex = dataIndex;
    }

    public onEndCellEdit(dataIndex: number, columnIndex: string, newValue: string, ignoreValueChange?: boolean) {
        this._inEditMode = false;
        this.focus(10);
    }

    public canEditCell(dataIndex: number, columnIndex: string): boolean {
        return true;
    }

    public onCellChanged(dataIndex: number, columnIndex: string, newValue: string) {
        this._dataSource[dataIndex][columnIndex] = newValue;
    }

    public _appendRow() {
        //overridden        
    }

    public _applyColumnSizing(columnIndex: number, initialWidth?: number, finish?: boolean) {
        this._columnResizeInProgress = true;
        try {
            super._applyColumnSizing(columnIndex, initialWidth, finish);
            this._invalidateRowHeights();
        }
        finally {
            this._columnResizeInProgress = false;
        }
    }

    public _invalidateRowHeights(): void {
    }

    public ensureRowSelectionWhenLayoutComplete(command: any, indicesToSelect?: number[]) {
        var indexToSelect: number;
        if (command === EditableGrid.Commands.CMD_APPEND) {
            //select Next row
            this._onEnterKey();
        }
        else {
            if (!indicesToSelect) {
                indicesToSelect = [];
                indicesToSelect.push(this._selectedIndex);
            }

            this._validateIndicesToSelect(indicesToSelect);

            this._setSelection(indicesToSelect);
            this._handleCellSelectionAfterViewPortUpdate();
            if (command === EditableGrid.Commands.CMD_INSERT_COLUMNS) {
                this._selectNextOrPrevCell(true);
            }
        }

        // we are handling tab index here for canvas
        if (this._dataSource.length > 0) {
            this._canvas.attr({ tabIndex: "0" });
        }
        else {
            this._canvas.removeAttr("tabIndex");
        }
    }

    protected _onDeleteHeader(e: JQueryEventObject){
         // Overwritten by derived class for handling DELETE key on header.
    }

    private _focusGrid() {
        this.focus(10);
    }

    public whenLayoutComplete(command: any, indicesToSelect?: number[]) {
        this.ensureRowSelectionWhenLayoutComplete(command, indicesToSelect);
        this._focusGrid();
    }

    private _setSelection(indicesToSelect: number[]) {
        var i: number;
        length = indicesToSelect.length;

        if (length === 1) {
            this.setSelectedRowIndex(indicesToSelect[0]);
        }
        else {
            for (i = 0; i < length; i++) {
                this._addSelection(indicesToSelect[i]);
            }
        }
    }

    private _validateIndicesToSelect(indicesToSelect: number[]) {
        var i: number;
        length = indicesToSelect.length;

        for (i = 0; i < length; i++) {
            if (indicesToSelect[i] < 0) {
                indicesToSelect[i] = 0;
            }
            else if (indicesToSelect[i] >= this._count) {
                indicesToSelect[i] = this._count - 1;
            }
        }
    }

    public onLayoutComplete(command: any, indicesToSelect?: number[]) {

        this._bind("updateViewPortCompleted", () => {
            var row = this._rows[this._count - 1];
            if (row && this._isScrolledIntoView(row.row)) {
                this._onLastRowVisible(row.rowIndex);
            }

            this.whenLayoutComplete(command, indicesToSelect);
            this._unbind("updateViewPortCompleted");
        });
    }

    public _getRowHeightInfo(dataIndex: number): RowHeightInfo {
        return new RowHeightInfo(0);
    }

    public _setRowHeight(dataIndex: number, height: number): void {
    }
     
    private _setCellValue($cell: JQuery, value: string, isRichText: boolean, title?: string): void {
        var textValue: string;
        if (!value) {
            $cell.html("&nbsp;");
        }
        else if (isRichText) {
            value = HtmlNormalizer.normalize(value)
            textValue = $("<div>" + value + "</div>").text();
            $cell.html(value);
            if ($.trim(textValue) && $.trim(textValue) != "&nbsp;") {
                $cell.attr("title", title || textValue);
            }
            else {
                $cell.removeAttr("title");
            }
            $cell.find('a').attr("target", "_blank");
        }
        else {
            $cell.text(value);
            if ($.trim(value)) {
                $cell.attr("title", title || value);
            }
            else {
                $cell.removeAttr("title");
            }
        }
    }

    public _setColumnInfo(column: any, index: number) {
        var cellEditor: CellEditor;
        super._setColumnInfo(column, index);

        if (!this._columnIndexToEditorMap[column.index]) {
            // Create editors for all the columns. A single editor is created per column.
            if (column.getCellEditor) {
                // If the column provides its own implementation of grid, then use it. This is the extension point to 
                // host any control within a column. The control needs to derive from CellEditor and support all the 
                // interface functions.
                cellEditor = column.getCellEditor(column.index, column.text);
            }
            else if (column.isRichText) {
                // If the column supports rich text, create a rich text editor.
                cellEditor = new RichTextCellEditor({ cssClass: "rich-text-cell-editor-" + column.index, coreCssClass: "rich-text-cell-editor" });
            }
            else {
                // For all other columns create a plain text editor.
                cellEditor = new PlainTextCellEditor({ cssClass: "plain-text-cell-editor-" + column.index, coreCssClass: "plain-text-cell-editor" });
            }

            if (cellEditor) {
                // Create the control within the grid.
                cellEditor.createIn(this._element);
                this._columnIndexToEditorMap[column.index] = cellEditor;
            }
        }
    }

    public getCellEditorForColumn(index: any) {
        return this._columnIndexToEditorMap[index];
    }

    public getCurrentEditRowIndex():number {
        return this._editRowIndex;
    }

    public layout() {
        if (!this._isLayoutInProgress) {
            this._isLayoutInProgress = true;
            try {
                var $cell: JQuery;
                if (this._currentCellEditor && this._inEditMode) {
                    this._currentCellEditor.fireEndEdit();
                }
                this._layoutInternal();
                if (!this._selectedCellInfo) {
                    // Select the first cell by default.
                    $cell = this._element.find(".grid-cell").first();
                    if ($cell.length === 1) {
                        this._selectRowAndCell($cell);
                    }
                }
            } finally {
                this._isLayoutInProgress = false;

                // This is to handle cases where selection row and selected cell have gone out of synch because the selection operation is triggered when the layout 
                // is currently in progress.
                this._handleCellSelectionAfterViewPortUpdate();
                this.handleHeaderSelectionAfterViewPortUpdate();
            }
        }
    }

    private _layoutInternal() {
        this._measureCanvasSize();
        this._cleanUpRows();
        this._layoutContentSpacer();
        this._updateViewport();
        this._layoutHeader();

        this._drawHeader();
        this._fixScrollPos();
        this._setRole();
        Diag.logTracePoint("Grid.layout.complete");
    }

    public _getSelectedCellInfo(): CellInfo {
        return this._selectedCellInfo;
    }

    public _onContainerMouseDown(e?) {
        if (!this._inEditMode) {
            super._onContainerMouseDown(e);
        }
    }

    private _setRole(){
        var currentElement = this.getElement();
        if(currentElement){
           this.getElement().attr("role", "grid");
        }
    }

    private _setCellEditor($currentCell: JQuery, clearExisting: boolean) {

        if (!$currentCell || !$currentCell.data("cell-info")) {
            Diag.logError("[EditableGrid/_setCellEditor] Could not find the current cell or data information for the current cell");
            return;
        }

        var columnValue: string,
            cellInfo = $currentCell.data("cell-info"),
            column = cellInfo.columnInfo,
            columnOrder = cellInfo.columnOrder,
            rowInfo = cellInfo.rowInfo,
            dataIndex = cellInfo.dataIndex,
            offset = $currentCell.offset(),
            elementOffset = this._element.offset(),
            cellLeftEnd = offset.left - elementOffset.left,//from the divider and does not include the scrolled part
            cellRightEnd = cellLeftEnd + $currentCell.width(),
            rowWidth = this._canvas[0].clientWidth,
            scrollLeft = this._canvas.scrollLeft();

        Diag.logVerbose("[_setCellEditor]Start positioning the cell editor ");
        if (this._columnIndexToEditorMap[column.index]) {
            this._currentCellEditor = this._columnIndexToEditorMap[column.index];
        }
        else {
            return;
        }

        columnValue = this.getColumnValue(dataIndex, column.index, columnOrder);
        this._currentCellEditor.beginEdit(columnValue);
        if (columnValue && !clearExisting) {
            this._currentCellEditor.setValue(columnValue);
        }
        else {
            this._currentCellEditor.clearValue(clearExisting);
        }
        //see if it is required to scroll the canvas
        this._ignoreScroll = true;
        if (cellRightEnd > rowWidth) {
            this._canvas.scrollLeft(scrollLeft + cellRightEnd - rowWidth);
        }
        else if (cellLeftEnd < 0) {
            this._canvas.scrollLeft(scrollLeft + cellLeftEnd);
        }
        this._ignoreScroll = false;
        offset = $currentCell.offset();

        // Position and size the editor of the column on top of the cell.
        this._currentCellEditor.setPosition(offset.top - elementOffset.top - 1, offset.left - elementOffset.left);
        this._currentCellEditor.setSize($currentCell);

        // Clear the content of the current cell.
        $currentCell.html("&nbsp");
        $currentCell.addClass("grid-cell-edit");

        this._currentCellEditor.valueChanged = () => {
            var newValue = this._currentCellEditor.getValue();
            this.onCellChanged(dataIndex, column.index, newValue);
        };

        this._currentCellEditor.endEdit = (e?: JQueryEventObject) => {
            this._handleEditorEndEdit(e, $currentCell);
        };
        Diag.logVerbose("[_setCellEditor]Finish positioning the cell editor ");
        return $currentCell;
    }

    public _handleEditorEndEdit(e?: JQueryEventObject, $currentCell?: JQuery) {
        this._handleEndEdit($currentCell, e && e.type === "keydown" && e.keyCode === Utils_UI.KeyCode.ESCAPE);
        if (e && e.type === "keydown") {
            this._onKeyDown(e);
        }
    }

    private _handleEndEdit($currentCell: JQuery, ignoreValueChange?: boolean) {

        var cellInfo = $currentCell.data("cell-info"),
            columnValue: string,
            columnTitle: string;

        if (!cellInfo) {
            // This can happen if the row has re-drawn while in edit mode. Below is the scenario:
            // 1. Edit action cell in a saved test case and make some changes
            // 2. Edit the title cell by directly double clicking the title cell
            //
            // In this scenario the row containing test case is re-drawn to show dirty test case. This redraw causes the 
            // selected cell to change. In such cases, the end edit context can have invalid cell info if the update row
            // happens before end edit. In that case fallback to selected cell. 
            $currentCell = this._$selectedCell;
            cellInfo = this._selectedCellInfo;
        }

        var column = cellInfo.columnInfo,
            dataIndex = cellInfo.dataIndex,
            columnOrder = cellInfo.columnOrder,
            $row = this._getRowFromCell($currentCell);

        this._allowCellResize($row);
        $currentCell.removeClass("grid-cell-edit");

        // Get the height of the contents within the cell editor.
        var editorHeight = this._currentCellEditor.getHeight();

        columnValue = this._currentCellEditor.getDisplayValue();
        columnTitle = this._currentCellEditor.getValue();;
        
        this._setCellValue($currentCell, columnValue, column.isRichText, columnTitle);

        this._setRowHeight(dataIndex, $row.height());
        this._resizeCellsInRowToHeight($row, dataIndex);

        this._currentCellEditor.clearValue();
        this.onEndCellEdit(dataIndex, column.index, columnValue, ignoreValueChange);
        this._inEditMode = false;
        this._editRowIndex = -1;
    }

    private _allowCellResize($row: JQuery) {
        $row.find(".grid-cell").css("height", "");
    }

    private _resizeCellsInRowToHeight($row: JQuery, dataIndex: number) {
        var height = this._getRowHeightInfo(dataIndex).height;
        if (height) {
            $row.find(".grid-cell").css("height", height);
        }
    }

    public _onKeyDown(e?: JQueryEventObject): any {
        var setEmpty = false,
            cellInfo: CellInfo;
        if (!this._inEditMode) {
            super._onKeyDown(e);
            if (this._$selectedCell) {
                 if (e.keyCode === Utils_UI.KeyCode.IME_INPUT) {
                        cellInfo = this._$selectedCell.data("cell-info");
                        if (this._canEdit(cellInfo)) {
                            this._editCell(this._$selectedCell, false, true);
                        }
                        else {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                    else if (e.keyCode === Utils_UI.KeyCode.F2) {
                        this._editCell(this._$selectedCell, true, setEmpty);
                    }
                }
        }
    }

    public _createFocusElement(): JQuery {
        var $focus = super._createFocusElement();
        if (Utils_UI.BrowserCheckUtils.isIE()) {
            $focus.attr("contenteditable", "true").css({ top: 0, left: -100000, position: "fixed" });
        }
        return $focus;
    }

    private _selectCellForSelectedRowIndex(delayEdit?:boolean): boolean {
        var $row: JQuery,
            cellInfo: CellInfo,
            $cell: JQuery;

        if (this._rows[this._selectedIndex]) {
            Diag.logVerbose("[_selectCellForSelectedRowIndex]Selecting cell for row index " + this._selectedIndex);
            $row = this._rows[this._selectedIndex].row
            if (this._$selectedCell) {
                $cell = this._getCellForRow($row, this._selectedCellInfo.columnInfo.index);
                if ($cell) {
                    cellInfo = $cell.data("cell-info");
                    if (cellInfo.dataIndex !== this._selectedCellInfo.dataIndex) {
                        this._selectCell($cell, false, false, false, delayEdit);
                    }
                }
            }

            return true;
        }
        else {
            Diag.logError("[_selectCellForSelectedRowIndex]The row for cell selection is not valid.");
            return false;
        }
    }

    private _getCellForRow($row: JQuery, columnIndex: string) {
        var $cell: JQuery;
        $row.find(".grid-cell").each(function (index, item) {
            var cellInfo = $(this).data("cell-info");
            if (cellInfo.columnInfo.index === columnIndex) {
                $cell = $(this);
                return false;
            }
        });

        return $cell;
    }

    public _onUpKey(e?: JQueryEventObject, bounds?) {
        super._onUpKey(e, bounds);
        this._handleCellSelectionAfterViewPortUpdate();
    }

    public _onDownKey(e?: JQueryEventObject, bounds?) {
        super._onDownKey(e, bounds);
        this._handleCellSelectionAfterViewPortUpdate();
    }

    public _onRightKey(e?: JQueryEventObject) {
        super._onRightKey(e);
        this._selectNextOrPrevCell(true);
    }

    public _onLeftKey(e?: JQueryEventObject) {
        super._onLeftKey(e);
        this._selectNextOrPrevCell(false);
    }

    public _selectNextOrPrevCell(next: boolean, doNotGetCellIntoView?: boolean): boolean {
        var $cell: JQuery;
        if (this._$selectedCell) {
            if (next) {
                $cell = this._$selectedCell.next(".grid-cell");
            }
            else {
                $cell = this._$selectedCell.prev(".grid-cell");
            }

            if ($cell.length === 1) {
                this._selectCell($cell, false, false, doNotGetCellIntoView);
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }

    public _getRowsPerPage(e?: JQueryEventObject): number {
        var keyCode = Utils_UI.KeyCode,
            span = this._canvas[0].clientHeight,
            selectedIndex = this._selectedIndex,
            numRows = 0,
            index = 0;

        if (e.keyCode === keyCode.PAGE_DOWN) {
            for (index = selectedIndex; index < this._count; index++) {
                span -= this._getOuterRowHeight(index);
                if (span < 0) {
                    break;
                }

                numRows++;
            }
        }
        else if (e.keyCode === keyCode.PAGE_UP) {
            for (index = selectedIndex; index >= 0; index--) {
                span -= this._getOuterRowHeight(index);
                if (span < 0) {
                    break;
                }

                numRows++;
            }
        }

        return numRows;
    }

    public _onPageUpPageDownKey(e?: JQueryEventObject, bounds?) {
        var prevSelectedIndex = this._selectedIndex,
            totalRowHeight = 0,
            index = 0,
            keyCode = Utils_UI.KeyCode,
            result = false;

        if (this._gettingRowIntoView) {
            return;
        }

        super._onPageUpPageDownKey(e, bounds);
        if (e.keyCode === keyCode.PAGE_DOWN) {
            if (!e.shiftKey) {
                result = this._scrollCanvasDown(prevSelectedIndex, this._selectedIndex - 1);
            }
        }
        else {
            if (!e.shiftKey) {
                result = this._scrollCanvasUp(this._selectedIndex + 1, prevSelectedIndex);
            }
        }

        this._gettingRowIntoView = result;
        if (result) {
            this._selectCellOnLayoutComplete = true;
        }
        else {
            this._selectCellForSelectedRowIndex();
        }
    }

    public _onHomeKey(e?: JQueryEventObject, bounds?) {
        super._onHomeKey(e, bounds);
        this._handleCellSelectionAfterViewPortUpdate();
    }

    public _onEndKey(e?: JQueryEventObject, bounds?) {
        super._onEndKey(e, bounds);
        this._handleCellSelectionAfterViewPortUpdate();
    }

    public _handleCellSelectionAfterViewPortUpdate() {
        if (this._getRowIntoView(this._selectedIndex)) {
            this._selectCellOnLayoutComplete = true;
        }
        else {
            this.getSelectedRowIntoView();
            this._selectCellForSelectedRowIndex();
            this.getSelectedCellIntoView();
        }
    }

    public handleHeaderSelectionAfterViewPortUpdate() {
    }

    public _onEnterKey(e?: JQueryEventObject, bounds?): any {
        var indexToSelect = bounds ? Math.min(this._selectedIndex + 1, bounds.hi) : Math.min(this._selectedIndex + 1, this._count - 1);
        if (this._isHyperLinkCell(this._selectedCellInfo)) {
            var columnInfo = this._selectedCellInfo.columnInfo;
            this.onHyperLinkClick(this._selectedCellInfo.dataIndex, columnInfo.index);
            e.preventDefault();
            e.stopPropagation();
        }
        else if (this._count === this._selectedIndex + 1) {//case for add a new row
            this._appendRow();
            this.focus(10);
        }
        else {
            this._clearSelection();
            this._addSelection(indexToSelect);
            //we need a delay edit here because we of the way we handle keydown on a cell editor. We handle keydown while the ditor is going 
            //in end edit mode. An enter may cause it to come back to edit mode for combo editors. Hence adding a delay
            this._selectCellForSelectedRowIndex(true);
            this.getSelectedRowIntoView();
            this.focus(10);
        }
        
    }

    public _isHyperLinkCell(cellInfo: CellInfo): boolean {
        var columnInfo: any,
            columnValue: any;

        if (cellInfo) {
            columnInfo = cellInfo.columnInfo;
            if (columnInfo.isHyperLink) {
                columnValue = this.getColumnValue(cellInfo.dataIndex, columnInfo.index, cellInfo.columnOrder);
                return <boolean>columnValue;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }

    public _onBackSpaceKey(e?: JQueryEventObject): void {
        if (this._$selectedCell && this._canEdit(this._selectedCellInfo) && !this._inEditMode) {
            this._clearSelection();
            this.onCellChanged(this._selectedCellInfo.dataIndex, this._selectedCellInfo.columnInfo.index, "");
            this._selectRowAndCell(this._$selectedCell);
            this._editCell(this._$selectedCell, true, true);
        }

        e.preventDefault();
        e.stopPropagation();
    }

    public _onDeleteKey(e?: JQueryEventObject): any {
        if (this._$selectedCell && this._canEdit(this._selectedCellInfo)) {

            // TODO: Have a logic to refresh the current cell only.
            this._$selectedCell.html("&nbsp;");

            this.onCellChanged(this._selectedCellInfo.dataIndex, this._selectedCellInfo.columnInfo.index, "");
            this.onEndCellEdit(this._selectedCellInfo.dataIndex, this._selectedCellInfo.columnInfo.index, "");
        }
    }

    public cacheRows(aboveRange, visibleRange, belowRange) {
        this._lastVisibleRange = visibleRange;
    }

    public _drawRows(visibleRange, includeNonDirtyRows) {
        var fragments: { rowsFragment: HTMLElement; gutterFragment: HTMLElement; },
            rows = this._rows,
            l = visibleRange.length,
            canvasDom = this._canvas[0], wasFirstRowRedrawn = false,
            rowHolder = this._gridRowHolder[0];

        wasFirstRowRedrawn = !rows[visibleRange[0][1]] && rows[visibleRange[l - 1][1]]
        Diag.logVerbose("[_drawRows]Drawing " + l + "no of rows in dom");
        fragments = this._drawRowsInternal(visibleRange, includeNonDirtyRows),

        this._contentSpacer.height(this._heightForUpperContentSpacer);
        this._belowContentSpacer.height(this._heightForLowerContentSpacer);

        if (wasFirstRowRedrawn) {
            //this is also to draw row properly because of relative positioningIn case we are scrolling up
            //we would be drawing newer rows at lower indices
            rowHolder.insertBefore(fragments.rowsFragment, rowHolder.firstChild);
        }
        else {
            rowHolder.appendChild(fragments.rowsFragment);
        }
    }

    public setHeightForLowerContentSpacer(height: number) {
        this._heightForLowerContentSpacer = height;
    }

    public setHeightForUpperContentSpacer(height: number) {
        this._heightForUpperContentSpacer = height;
    }

    public _includeNewlyInsertedRowsInViewport(affectedIndices: number[]) {
        var lastRowIndex: number,
            lastDataIndex: number,
            l: number,
            i = 0,
            count = affectedIndices ? affectedIndices.length : 0;
        if (this._lastVisibleRange && this._lastVisibleRange.length && count > 0) {
            l = this._lastVisibleRange.length;
            Diag.logVerbose("[_includeNewlyInsertedRowsInViewport]Start: range of rows to draw = " + this._lastVisibleRange[0][1] + " to " + this._lastVisibleRange[l - 1][1]);
            lastRowIndex = this._lastVisibleRange[l - 1][0] + 1;
            lastDataIndex = this._lastVisibleRange[l - 1][1] + 1;
            for (; i < count; lastDataIndex++, lastRowIndex++, i++) {
                this._lastVisibleRange[this._lastVisibleRange.length] = [lastRowIndex, lastDataIndex];
            }
            l = this._lastVisibleRange.length;
            Diag.logVerbose("[_includeNewlyInsertedRowsInViewport]Finish: range of rows to draw = " + this._lastVisibleRange[0][1] + " to " + this._lastVisibleRange[l - 1][1]);
        }
    }

    public _adjustContentSpacerHeightsPostDelete() {
        Diag.logVerbose("[BulkEditTestsGrid._adjustContentSpacerHeightsPostDelete] HeightDifference post delete : " + this._rowHeightsDifferencePostDelete);
        Diag.logVerbose("[BulkEditTestsGrid._adjustContentSpacerHeightsPostDelete]Start height now for upperContentspacr  : " + this._heightForUpperContentSpacer + "lowerContentSpacer : " + this._heightForLowerContentSpacer);

        if (this._rowHeightsDifferencePostDelete > 0) {
            if (this._heightForUpperContentSpacer > 0) {
                if (this._heightForUpperContentSpacer >= this._rowHeightsDifferencePostDelete) {
                    this.setHeightForUpperContentSpacer(this._heightForUpperContentSpacer - this._rowHeightsDifferencePostDelete);
                    this._rowHeightsDifferencePostDelete = 0;
                }
                else {
                    this._rowHeightsDifferencePostDelete -= this._heightForUpperContentSpacer;
                    this.setHeightForUpperContentSpacer(0);
                }
            }
            if (this._heightForLowerContentSpacer > 0 && this._rowHeightsDifferencePostDelete > 0) {
                if (this._heightForLowerContentSpacer >= this._rowHeightsDifferencePostDelete) {
                    this.setHeightForLowerContentSpacer(this._heightForLowerContentSpacer - this._rowHeightsDifferencePostDelete);
                    this._rowHeightsDifferencePostDelete = 0;
                }
                else {
                    this._rowHeightsDifferencePostDelete -= this._heightForLowerContentSpacer;
                    this.setHeightForLowerContentSpacer(0);
                }
            }
        }
        Diag.logVerbose("[BulkEditTestsGrid._adjustContentSpacerHeightsPostDelete]Finish height now for upperContentspacr  : " + this._heightForUpperContentSpacer + "lowerContentSpacer : " + this._heightForLowerContentSpacer);
    }

    private _calculateHeightForUpperContentSpacer(firstVisibleIndex: number, firstVisibleIndexTop: number) {
        var i = firstVisibleIndex,
            index: number,
            rowHeight: number,
            borderHeight = this._borderHeight,
            index: number;
        for (i = 1; i <= this._options.extendViewportBy; i++) {
            index = firstVisibleIndex - i;
            if (index >= 0) {
                rowHeight = this._getOuterRowHeight(index);
                firstVisibleIndexTop -= rowHeight;
            }
        }
        if (index <= 0) {
            this.setHeightForUpperContentSpacer(0);
        }
        else {
            this.setHeightForUpperContentSpacer(firstVisibleIndexTop);
        }
        Diag.logVerbose("[_calculateHeightForUpperContentSpacer]The height for upper content spacer is " + this._heightForUpperContentSpacer);
    }

    private _calculateHeightForLowerContentSpacer(lastVisibleIndex: number, lastVisibleIndexTop: number, totalHeight: number) {
        var i = lastVisibleIndex,
            index: number,
            rowHeight: number;

        for (i = 1; i <= this._options.extendViewportBy; i++) {
            index = lastVisibleIndex + i;
            if (index < this._count) {
                rowHeight = this._getOuterRowHeight(index);
                lastVisibleIndexTop += rowHeight;
            }
        }
        if (index < this._count && totalHeight > lastVisibleIndexTop) {
            this.setHeightForLowerContentSpacer(totalHeight - lastVisibleIndexTop)
        }
        else {
            this.setHeightForLowerContentSpacer(0);
        }
        Diag.logVerbose("[_calculateHeightForLowerContentSpacer]The height for lower content spacer is " + this._heightForLowerContentSpacer);
    }

    public _getOuterRowHeight(index: number): number {
        var rowHeight = this._getRowHeightInfo(index).height;
        if (!rowHeight) {
            rowHeight = this._emptyRowOuterHeight;
        }
        else {
            rowHeight += this._borderHeight;
        }

        return rowHeight;
    }

    protected _addSpacingElements() {
        super._addSpacingElements();
        this._gridRowHolder = $(domElem("div", "grid-row-holder"));
        this._belowContentSpacer = $(domElem("div", "grid-content-spacer-below"));
        this._canvas.append(this._gridRowHolder);
        this._canvas.append(this._belowContentSpacer);
    }

    public getSelectedCellIntoView(): boolean {
        if (this._getSelectedCellInfo() && this._columns.length > 0) {

            var totalWidth = this._canvas[0].scrollHeight,
                left = this._scrollLeft,
                selectedColumnIndex = this._getSelectedCellInfo().columnInfo.index,
                viewPortRightBoundary = left + this._canvas[0].clientWidth,
                columnLeftBoundary = 0,
                columnRightBoundary = 0, i: number,
                len: number,
                column;

            for (i = 0, len = this._columns.length; i < len; i++) {
                column = this._columns[i];
                if (column.width && column.index !== selectedColumnIndex) {
                    columnLeftBoundary += column.width;
                }
                else {
                    break;
                }
            }
            columnRightBoundary = columnLeftBoundary + column.width;
            if (columnLeftBoundary < left) {
                this._canvas[0].scrollLeft = columnLeftBoundary;
                return true;
            }
            else if (columnRightBoundary > viewPortRightBoundary) {
                this._canvas[0].scrollLeft = left + columnRightBoundary - viewPortRightBoundary;
                return true;
            }
        }
        return false;
    }

    public _getVisibleRowIndices() {
        var range = this._getVisibleRowIndicesAndDoCalculations();
        return range;
    }

    public _getVisibleRowIndicesAndDoCalculations() {
        var top = this._scrollTop,
            totalHeight = this._canvas[0].scrollHeight,
            heightNow: number,
            viewPortLowerBoundary = top + this._canvas[0].clientHeight,
            emptyRowHeight = 0,
            first = -1,
            last = -1,
            rowHeight: number,
            borderHeight = this._borderHeight,
            i: number;

        if (!this._isLayoutInProgress) {
            //if layout is in progress  we cant do these calculations properly as existing rows would have cleaned up and we would get wrong values for
            //scrollHeight etc.
            heightNow = 0;
            for (i = 0; i < this._count; i++) {
                rowHeight = this._getOuterRowHeight(i);
                if (first == -1 && (heightNow + rowHeight) >= top) {
                    first = i;
                    this._calculateHeightForUpperContentSpacer(i, heightNow);
                }
                else if (i === this._count - 1 || (heightNow + rowHeight) >= viewPortLowerBoundary) {
                    last = i;
                    this._calculateHeightForLowerContentSpacer(i, heightNow + rowHeight, totalHeight);
                    break;
                }
                heightNow += rowHeight;
            }

            Diag.logVerbose("[_getVisibleRowIndicesAndDoCalculations]Total height" + totalHeight + ",sum of height of all rows till in view " + heightNow);

        }

        return {
            first: first,
            last: last
        };
    }

    public _layoutContentSpacer() {
        var width = 0, height, i, l, columns = this._columns, scrollTop, scrollLeft;

        for (i = 0, l = columns.length; i < l; i++) {
            if (columns[i].hidden) {
                continue;
            }
            width += (columns[i].width || 20) + this._cellOffset;
        }

        // TODO: Magic number 2 here means 1px left border + 1px right border. Come up with a
        // better solution for this. We might set the box model to content-box but borders don't
        // fit very well in this case. If we don't apply this hack, cells don't fit in the row
        // and last cell breaks into next line.
        width = width + 2;
        this._contentSpacer.width(width);
        this._ignoreScroll = true;
        try {
            scrollLeft = Math.max(0, Math.min(this._scrollLeft, width - this._canvasWidth));

            if (scrollLeft !== this._scrollLeft) {
                this._scrollLeft = scrollLeft;
                this._canvas[0].scrollLeft = scrollLeft;
            }
        } finally {
            this._ignoreScroll = false;
        }

        this._contentSize.width = width;
    }

    public _onCanvasScroll(e?) {
        if (this._currentCellEditor) {
            this._currentCellEditor.fireEndEdit();
        }

        this.cancelDelayedFunction("onScroll");
        this.delayExecute("onScroll", 10, true, delegate(this, this._onScroll, e));

        return false;
    }

    private _onScroll(e?: JQueryEventObject) {
        Diag.logVerbose("[_onScroll]Delayed execution start");
        var result = super._onCanvasScroll(e),
            row = this._rows[this._count - 1];

        if (row && this._isScrolledIntoView(row.row)) {
            this._onLastRowVisible(row.rowIndex);
        }
        Diag.logVerbose("[_onScroll]Delayed execution finished");
        return result;
    }

    public _onLastRowVisible(rowIndex: number) {
        // Over-ridden function.
    }

    private _isScrolledIntoView($elem: JQuery) {
        var documentTop = $(window).scrollTop(),
            documentBottom = documentTop + $(window).height(),
            elemTop = $elem.offset().top,
            elemBottom = elemTop + $elem.height();

        return ((elemBottom <= documentBottom) && (elemTop >= documentTop));
    }

    public _tryFinishColumnSizing(cancel) {
        if (this._currentCellEditor) {
            this._currentCellEditor.fireEndEdit();
        }

        super._tryFinishColumnSizing(cancel);
    }

    public _onContainerResize(e?: JQueryEventObject): any {
        if (this._currentCellEditor) {
            this._currentCellEditor.fireEndEdit();
        }

        super._onContainerResize(e);
    }

    public _selectRowAndCell($cell: JQuery, doNotGetCellIntoView?: boolean) {
        var $row: JQuery = this._getRowFromCell($cell),
            cellInfo: CellInfo;

        cellInfo = $cell.data("cell-info");
        this._selectRow(cellInfo.rowInfo.rowIndex, cellInfo.dataIndex);
        this._selectCell($cell, false, false, doNotGetCellIntoView);
    }

    public getSelectedCell(): JQuery {
        return this._$selectedCell;
    }

    public selectSameRowNthCell(n: number, doNotGetCellIntoView?: boolean) {
        var $row: JQuery,
            $cell: JQuery;

        $row = this._$selectedCell.parent(".grid-row");
        if ($row.length === 1) {
            $cell = $row.children(".grid-cell").eq(n);
            if ($cell.length > 0) {
                this._selectRowAndCell($cell, doNotGetCellIntoView);
                return true;
            }
        }
        return false;
    }

    public _selectNextRowNthCell(n: number, doNotGetCellIntoView?: boolean): boolean {
        var $row: JQuery,
            $cell: JQuery;

        $row = this._$selectedCell.parent(".grid-row").next(".grid-row");
        if ($row.length === 1) {
            $cell = $row.children(".grid-cell").eq(n);
            this._selectRowAndCell($cell, doNotGetCellIntoView);
            return true;
        }
        else {
            return false;
        }
    }

    public _selectPrevRowLastCell(doNotGetCellIntoView?: boolean): boolean {
        var $row: JQuery,
            $cell: JQuery;

        $row = this._$selectedCell.parent(".grid-row").prev(".grid-row");
        if ($row.length === 1) {
            $cell = $row.children(".grid-cell").last();
            this._selectRowAndCell($cell, doNotGetCellIntoView);
            return true;
        }
        else {
            return false;
        }
    }

    public _selectNextRowFirstCell(doNotGetCellIntoView?: boolean): boolean {
        var $row: JQuery,
            $cell: JQuery;

        return this._selectNextRowNthCell(0, doNotGetCellIntoView);
    }

    private _areEqual($cell1: JQuery, $cell2: JQuery): boolean {
        var cellInfo1: CellInfo,
            cellInfo2: CellInfo;

        if (!$cell1 || !$cell2) {
            return false;
        }

        cellInfo1 = $cell1.data("cell-info");
        cellInfo2 = $cell2.data("cell-info");

        if (!cellInfo1 || !cellInfo2) {
            return false;
        }

        return (cellInfo1.dataIndex === cellInfo2.dataIndex && cellInfo1.columnInfo.index === cellInfo2.columnInfo.index);

    }

    public _onKeyPress(e?: JQueryEventObject): any {
        if (!this._$selectedCell || this._inEditMode) {
            return;
        }

        if (this._isChar(e)) {
            var cellInfo: CellInfo = this._$selectedCell.data("cell-info");
            if (this._canEdit(cellInfo)) {
                this._editCell(this._$selectedCell, false, true, e.charCode);
            }
            else {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }

    private _isChar(e?: JQueryEventObject): boolean {
        return (e.which === null || (e.which > 0 && e.charCode > 0 && e.charCode !== Utils_UI.KeyCode.ENTER && !e.ctrlKey && !e.altKey));
    }

    public _onRowDoubleClick(e?: JQueryEventObject): any {
        var $cell = this._getCellFromEvent(e, ".grid-cell");

        if (!this._inEditMode) {
            super._onRowDoubleClick(e);
            if ($cell.length > 0) {
                this._editCell($cell, true, false);
            }
        }
    }

    public _cleanUpGrid() {
        this.cancelDelayedFunction("onScroll");
        this._cleanUpRows();
        this._currentCellEditor = null;
        this.setHeightForUpperContentSpacer(0);
        this.setHeightForLowerContentSpacer(0);
        this._contentSpacer.height(this._heightForUpperContentSpacer);
        this._belowContentSpacer.height(this._heightForLowerContentSpacer);
        this._lastVisibleRange = [];
        this._emptyRowOuterHeight = 0;
        this._borderHeight = 0;
        this._deleteEditors();
    }

    private _deleteEditors() {
        var editor, i: number, l: number;
        for (i = 0, l = this._columns.length; i < l; i++){
            editor = this.getCellEditorForColumn(this._columns[i].index);
            if (editor) {
                editor.dispose();
            }
        }
        this._columnIndexToEditorMap = {};
    }

    public _editCell($cell: JQuery, delayEdit: boolean, clearExisting: boolean, charCode?: number) {
        var cellInfo: CellInfo;

        if (!$cell) {
            Diag.logError("[EditableGrid/_editCell] could not find the current cell");
            
            return;
        }
        cellInfo = $cell.data("cell-info");
        if (this._canEdit(cellInfo)) {
            if (delayEdit) {
                // We are setting the cell editor in a delayed way for two reasons:
                // 1. If we bring row into view, we have to delay setting cell editor to ensure that the cell editor is shown properly.
                // 2. There is an intermittent issue with double click not working sometimes. Adding a delay in setting the cell editor fixes that issue.
                this._getRowIntoView(cellInfo.dataIndex);
                this.getSelectedCellIntoView();
                Utils_Core.delay(this, 50, () => {
                    this._editCellInternal($cell, cellInfo, clearExisting, charCode);
                });
            }
            else {
                this._editCellInternal($cell, cellInfo, clearExisting, charCode);
            }
        }
    }

    private _editCellInternal($cell: JQuery, cellInfo: CellInfo, clearExisting: boolean, charCode?: number) {
        this.onBeginCellEdit(cellInfo.dataIndex, cellInfo.columnInfo.index);
        this._setCellEditor($cell, clearExisting);
        if (clearExisting && charCode && Utils_UI.BrowserCheckUtils.isFirefox()) {
            this._currentCellEditor.setValue(String.fromCharCode(charCode), true);
        }
        this._currentCellEditor.focus();
    }

    public _canEdit(cellInfo: CellInfo) {
        return cellInfo && cellInfo.columnInfo.canEdit && this.canEditCell(cellInfo.dataIndex, cellInfo.columnInfo.index);
    }

    public _onRowMouseDown(e?: JQueryEventObject): any {
        var $cell = this._getCellFromEvent(e, ".grid-cell"),
            $row = this._getRowFromEvent(e, ".grid-row");

        super._onRowMouseDown(e);
        this.focus();
        Utils_Core.delay(this, 0, () => {
            //prevent edit if any thing other than left mouse click
            this._selectCell($cell, true, false, false, false, !(e.which===1));
        });
    }

    public _onRowClick(e?: JQueryEventObject): any {
    }

    private _getRowFromCell($cell: JQuery) {
        return $cell.closest(".grid-row");
    }

    private _getRowFromEvent(e?: JQueryEventObject, selector?: string): JQuery {
        return $(e.target).closest(selector);
    }

    private _areCellInfoEqual(cellInfo1: CellInfo, cellInfo2: CellInfo): boolean {
        if (!cellInfo1 || !cellInfo2) {
            return false;
        }

        return (cellInfo1.dataIndex === cellInfo2.dataIndex && cellInfo1.columnInfo.index === cellInfo2.columnInfo.index);
    }

    public onCellSelectionChanged($cell?: JQuery, delayEdit?: boolean) {
        var cellInfo = $cell ? $cell.data("cell-info") : this._getSelectedCellInfo();
        if (cellInfo) {
            var columnIndex = cellInfo.columnInfo.index,
                editorForColumn = this.getCellEditorForColumn(columnIndex);
            if (cellInfo.columnInfo.editOnSelect) {
                this._editCell($cell, delayEdit, false);
            }
        }
    }

    private _selectCell($cell: JQuery, doNotBringRowToView?: boolean, doNotFireEndEdit?: boolean, doNotBringCellIntoView?: boolean, delayEdit?: boolean, preventEdit?: boolean) {
        var didScroll: boolean;
        if ($cell.length > 0 && $cell.data("cell-info")) {
            if (this._currentCellEditor && this._inEditMode && !doNotFireEndEdit) {
                this._currentCellEditor.fireEndEdit();
            }
            if (this._$selectedCell) {
                this._$selectedCell.removeClass("grid-cell-selected");
            }

            $cell.addClass("grid-cell-selected");
            this._$selectedCell = $cell;
            this._selectedCellInfo = $cell.data("cell-info");
            if (!doNotBringRowToView) {
                this.getSelectedRowIntoView();
            }
            if (!doNotBringCellIntoView) {
                didScroll = this.getSelectedCellIntoView();
            }
            if (!preventEdit) {
                this.onCellSelectionChanged($cell, delayEdit || didScroll);
            }
        }
    }

    private _getCellFromEvent(e?: JQueryEventObject, selector?: string): JQuery {
        return $(e.target).closest(selector)
    }

    private _getCellInfoFromEvent(e?: JQueryEventObject, selector?: string) {
        return this._getCellFromEvent(e, selector).data("cell-info");
    }

    public _updateViewport(includeNonDirtyRows?: boolean) {
        if (!this._isLayoutInProgress) {
            super._updateViewport(includeNonDirtyRows);
        }
        else if (this._lastVisibleRange && this._lastVisibleRange.length) {
            //1: When layout in progress like in resize, we just want to reuse eralier values for this and _heightForLowerContentSpacer & _heightForUpperContentSpacer because they cant be
            //correctly calculated as are rows would be cleaned up
            //2: Viewport was expanding due to the buffer kept in updateviewport method, so we dont want to draw more rows, was causing issues after save scroll
            this._drawRows(this._lastVisibleRange, includeNonDirtyRows);
        }
        this._fire("updateViewPortCompleted", {});

        this.postUpdateViewPort();
    }

    public postUpdateViewPort() {
        if (this._selectCellOnLayoutComplete) {
            Diag.logVerbose("[EditableGrid._updateViewPort]Selecting cell after the layout is complete.");
            if (this._selectCellForSelectedRowIndex()) {
                // Selection has happened. No need to select again.
                this._selectCellOnLayoutComplete = false;
            }
        }

        this._gettingRowIntoView = false;
    }

    public _ensureRowDrawn(dataIndex): boolean {
        var i: number, heightsSum = 0, rowHeight: number, borderHeight = this._borderHeight, totalHeight: number, viewportHeight: number;

        if (dataIndex >= 0 && dataIndex < this._count && !this._rows[dataIndex]) {
            totalHeight = this._canvas[0].scrollHeight;
            viewportHeight = this._canvas[0].clientHeight

            for (i = 0; i < dataIndex; i++) {
                rowHeight = this._getOuterRowHeight(i);
                heightsSum += rowHeight;
            }

            this._canvas[0].scrollTop = Math.min(heightsSum, totalHeight - viewportHeight);
            return true;
        }

        return false;
    }

    /**
     * @param rowIndex 
     * @param force 
     * @return 
     */
    public _getRowIntoView(rowIndex: number, force?: boolean): boolean {

        var visibleIndices,
            firstIndex: number,
            lastIndex: number,
            count: number,
            totalRowHeight: number = 0,
            index = 0,
            result: boolean = false;

        if (this._gettingRowIntoView) {
            // If a scroll operation has been triggered and has not yet completed, ignore any other scroll request during that time.
            return;
        }

        visibleIndices = this._getVisibleRowIndices();
        firstIndex = visibleIndices.first;
        lastIndex = visibleIndices.last;

        if (rowIndex <= firstIndex || rowIndex >= lastIndex) {
            if (rowIndex <= firstIndex && firstIndex >= 0) {
                result = this._scrollCanvasUp(rowIndex, firstIndex);
            }
            else if (rowIndex >= lastIndex && lastIndex >= 0) {
                result = this._scrollCanvasDown(lastIndex, rowIndex);
            }
        }

        this._gettingRowIntoView = result;
        return result;
    }

    private _getRowHeightBetweenRows(startIndex: number, endIndex: number): number {
        var index = 0,
            totalRowHeight = 0;

        for (index = startIndex; index <= endIndex; index++) {
            totalRowHeight += this._getOuterRowHeight(index);
        }

        return totalRowHeight;
    }

    private _scrollCanvasUp(startIndex: number, endIndex: number): boolean {
        var totalRowHeight = this._getRowHeightBetweenRows(startIndex, endIndex),
            prevScrollValue = this._canvas[0].scrollTop;

        this._canvas[0].scrollTop -= totalRowHeight;
        return (this._canvas[0].scrollTop !== prevScrollValue);
    }

    private _scrollCanvasDown(startIndex: number, endIndex: number): boolean {
        var totalRowHeight = this._getRowHeightBetweenRows(startIndex, endIndex),
            prevScrollValue = this._canvas[0].scrollTop;

        this._canvas[0].scrollTop += totalRowHeight;
        return (this._canvas[0].scrollTop !== prevScrollValue);
    }

    public updateRows(indices?: number[]) {
        var i: number,
            len: number;
        if (!indices) {
            indices = this.getSelectedDataIndices();
        }
        len = indices.length;
        for (i = 0; i < len; i++) {
            if (this._rows[indices[i]]) {
                this._updateRow(this._rows[indices[i]], indices[i], indices[i], null, null);
            }
        }
    }

    public _updateRow(rowInfo: any, rowIndex: number, dataIndex: number, expandedState: any, level: number, columnsToUpdate?: { [id: number]: boolean }, forceUpdateHeight?: boolean) {
        var row,
            rowElem,
            indentIndex: number,
            i: number,
            l: number,
            columns,
            column,
            isNotEmpty: boolean = false,
            cellValue$;

        indentIndex = this._indentIndex;
        row = rowInfo.row;
        row.empty();
        rowElem = row.get(0);

        // 2px is added at the end to accomodate margin that we add for test steps.
        rowElem.style.width = isNaN(this._contentSize.width) ? "" : (this._contentSize.width + 1) + "px";
        columns = this._columns;
        for (i = 0, l = columns.length; i < l; i++) {
            column = columns[i];
            if (column.hidden) {
                continue;
            }
            cellValue$ = column.getCellContents.apply(this, [rowInfo, dataIndex, expandedState, level, column, indentIndex, i]);
            if (cellValue$) {
                rowElem.appendChild(cellValue$[0]);
                if (!this._isCellEmpty(cellValue$)) {
                    isNotEmpty = true;
                }
            }
        }

        //This will be used to calculate height when bulk edit comes in. Specifically for the scenario
        //when we dont have heights for cells. Also we do it only for non empty rows
        if (isNotEmpty) {
            this._updateRowAndCellHeights(dataIndex, row, forceUpdateHeight);
        }
        else if (!this._emptyRowOuterHeight) {//we want to know the outerheight of an empty row for calculations
            this._getEmptyRowOuterHeight(dataIndex, row);
        }

        this._resizeCellsInRowToHeight(row, dataIndex);
        this._updateRowSelectionStyle(rowInfo, this._selectedRows, this._selectedIndex);
        this._updateRowStyle(rowInfo)
    }

    public _updateRowStyle(rowInfo: any) {
    
    }

    private _isCellEmpty($cell: JQuery): boolean {
        if ($.trim($cell.text()) || ($cell.html() != "&nbsp;")) {
            return false;
        }
        return true;
    }

    private _getEmptyRowOuterHeight(dataIndex: number, $row: JQuery) {

        var $rowCopy = $row.clone(), rowOuterHeight;
        $rowCopy[0].style.visibility = "hidden";
        this._canvas.append($rowCopy);
        rowOuterHeight = $rowCopy.outerHeight();
        this._emptyRowOuterHeight = rowOuterHeight;
        if (!this._borderHeight) {
            //cache border height
            this._borderHeight = Math.ceil(rowOuterHeight - $rowCopy.height());
        }
        $rowCopy.remove();
    }

    public _updateRowAndCellHeights(dataIndex: number, $row: JQuery, forceUpdate?: boolean) {
        //for perf reasons, if we already have the height dont do this
        var $rowCopy = $row.clone(), rowHeight: number;
        if (!this._getRowHeightInfo(dataIndex).height || this._getRowHeightInfo(dataIndex).isInvalid || this._columnResizeInProgress || forceUpdate) {
            $rowCopy[0].style.visibility = "hidden";
            this._canvas.append($rowCopy);
            rowHeight = $rowCopy.height();
            this._setRowHeight(dataIndex, rowHeight);

            if (!this._borderHeight) {
                //cache border height
                this._borderHeight = Math.ceil($rowCopy.outerHeight() - rowHeight);
            }
            $rowCopy.remove();
        }
    }

    public _clearSelections(): void {
        super._clearSelection();
        this._selectedIndex = 0;
        this._$selectedCell = null;
        this._selectedCellInfo = null;
    }

    public _fireEndEdit(): void {
        if (this._currentCellEditor) {
            this._currentCellEditor.fireEndEdit();
        }
    }

    public _rowHeightsDifferencePostDelete: number;
    public _emptyRowOuterHeight: number;
    public _gettingRowIntoView: boolean = false;
    public _inEditMode: boolean;
    public _lastVisibleRange: any;

    private _currentCellEditor: CellEditor;
    private _editRowIndex: number;
    private _heightForUpperContentSpacer: number;
    private _heightForLowerContentSpacer: number;
    private _rowMaxHeight: number;
    private _$selectedCell: JQuery;
    private _selectedCellInfo: CellInfo;
    private _columnIndexToEditorMap: { [key: string]: CellEditor; };
    private _columnResizeInProgress: boolean = false;
    private _gridRowHolder: any;
    private _belowContentSpacer: any;
    private _isLayoutInProgress: boolean;
    private _borderHeight: number;
    private _selectCellOnLayoutComplete: boolean = false;
    private _editableHeaderColumnClassName = ".grid-header-column.editable";
}

VSS.initClassPrototype(EditableGrid, {
    _columnIndexToEditorMap: {}
});

Controls.Enhancement.registerJQueryWidget(EditableGrid, "editableGrid")

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI.Controls.EditableGrid", exports);
