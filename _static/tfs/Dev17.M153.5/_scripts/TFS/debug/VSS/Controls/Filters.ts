/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Controls_Combos = require("VSS/Controls/Combos");
import { RichContentTooltip as Controls_RichContentTooltip } from "VSS/Controls/PopupContent";
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

/**
 * Options for the FlterControl
 */
export interface IFilterControlOptions extends Controls.EnhancementOptions {
    /**
     * Hide or show corresponding clause section
     */
    enableGrouping?: boolean;
    hideLogicalOperator?: boolean;
    hideOperatorHeader?: boolean;

    /**
    * All controls will be in read only mode
    */
    readOnly?: boolean;

    /**
    * All field and operators control should not allow edit
    */
    hasFixedFields?: boolean;

    /**
     * Enable add or remove clause behavior
     */
    enableRowAddRemove?: boolean;

    /**
     * Add clause behavior will prepend instead of append. Used with enableRowAddRemove
     */
    prependAddRow?: boolean;

    /**
     * Allows user to create the control with zero rows and remove the last remaining row.
     */
    allowZeroRows?: boolean;

    /**
     * Opt-in: Add-Remove buttons will append instead of prepend. Used with enableRowAddRemove
     */
    appendAddRemoveColumn?: boolean;

    /**
     * Add blur propogation to field, operator, and value controls
     */
    propogateControlBlur?: boolean;
}

/**
 * Model for FilterControl
 */
export interface IFilter {
    clauses?: IFilterClause[];
    maxGroupLevel?: number;
    groups?: Utils_UI.IFilterGroup[];
}

/**
 * Model for an individual clause
 */
export interface IFilterClause {
    index?: number;
    logicalOperator?: string;
    fieldName?: string;
    operator?: string;
    value?: string;
}

/**
 * Info of a clause role including member controls, element, and model information
 */
export interface IFilterClauseInfo {
    clause?: IFilterClause;
    $row?: JQuery;
    logicalOperatorControl?: any;
    fieldNameControl?: any;
    operatorControl?: any;
    valueControl?: any;
    group?: Utils_UI.IFilterGroup;
}

export class FilterControlO<TOptions extends IFilterControlOptions> extends Controls.Control<TOptions> {

    public static enhancementTypeName: string = "tfs.filterControl";

    protected static ADD_REMOVE_CLASS: string = "add-remove";
    protected static ADD_CLAUSE_ROW_CLASS: string = "add-clause";

    private _clauseTable: JQuery;
    private _groupHeaderCell: JQuery;
    private _filter: IFilter;

    constructor(options?) {

        super(options);
    }

    /**
     * Get the default clause for this filter.
     */
    public _getDefaultClause() {
        throw new Error("_getDefaultClause is abstract and must be overriden by derived classes.");
    }

    /**
     * Update the and/or dropdown based on the given clause
     *
     * @param andOrControl The control to be updated.
     * @param clause The clause associated with the control.
     */
    public _updateAndOrControl(andOrControl: any, clause: any) {
        throw new Error("_updateAndOrControl is abstract and must be overriden by derived classes.");
    }

    /**
     * Update the field dropdown based on the given clause
     *
     * @param fieldControl The control to be updated.
     * @param clause The clause associated with the control.
     */
    public _updateFieldControl(fieldControl: any, clause: any) {
        throw new Error("_updateFieldControl is abstract and must be overriden by derived classes.");
    }

    /**
     * Update the operator dropdown based on the given clause
     *
     * @param operatorControl The control to be updated.
     * @param clause The clause associated with the control.
     * @param updateClause True to update the clause with the new operator/value.
     */
    public _updateOperatorControl(operatorControl: any, clause: any, updateClause?: boolean) {
        throw new Error("_updateOperatorControl is abstract and must be overriden by derived classes.");
    }

    /**
     * Update the value dropdown based on the given clause
     *
     * @param valueControl The control to be updated.
     * @param clause The clause associated with the control.
     */
    public _updateValueControl(valueControl: any, clause: any) {
        throw new Error("_updateValueControl is abstract and must be overriden by derived classes.");
    }

    /**
     * Validate the given clause.
     *
     * @param clauseInfo The clause info.
     */
    public _validateClause(clauseInfo: any) {
        throw new Error("_validateClause is abstract and must be overriden by derived classes.");
    }

    /**
     * Handler called when the field name control's value is changed.
     *
     * @param clauseInfo The clause info.
     * @param oldValue The old field name.
     */
    public _handleFieldNameChanged(clauseInfo: any, oldValue: string) {
        throw new Error("_handleFieldNameChanged is abstract and must be overriden by derived classes.");
    }

    /**
     * Handler called when the operator control's value is changed.
     *
     * @param clauseInfo The clause info.
     * @param oldValue The old operator value.
     */
    public _handleOperatorChanged(clauseInfo: any, oldValue: string) {
        throw new Error("_handleOperatorChanged is abstract and must be overriden by derived classes.");
    }

    /**
     * Mark this filter as dirty.
     */
    public _setDirty() {
        throw new Error("_setDirty is abstract and must be overriden by derived classes.");
    }

    /**
     * @param options
     */
    public initializeOptions(options?: IFilterControlOptions) {

        super.initializeOptions($.extend(<IFilterControlOptions>{
            enableRowAddRemove: true,
            enableGrouping: true,
            enabled: true,
            coreCssClass: "filter-control",
            appendAddRemoveColumn: false
        }, options));
    }

    public setFilter(filter: IFilter): boolean {
        const prev = this._filter;
        this._filter = filter;
        if (equalFilters(prev, filter)) {
            // Controls keep references to clause instances
            this._filter.clauses = prev.clauses;
            return false;
        } else {
            this._createClauseTable();
            return true;
        }
        /** Server indexes are 1 indexed, client's are 0 indexed */
        function equalFilters(a: IFilter, b: IFilter) {
            if (!a || !b) {
                return a === b;
            }
            a = {
                ...a,
                clauses: (a.clauses || []).map((c) => ({...c, index: null})),
            };
            b = {
                ...b,
                clauses: (b.clauses || []).map((c) => ({...c, index: null})),
            };

            return Utils_Core.equals(a, b);
        }
    }

    protected _createClauseTable(): void {
        const that = this;
        if (this._clauseTable) {
            this._clauseTable.remove();
            this._clauseTable = null;
            this._groupHeaderCell = null;
        }

        if (this._filter) {
            this._clauseTable = $("<table />").addClass("clauses");

            if (!this._options.allowZeroRows) {

                if (!this._filter.clauses || this._filter.clauses.length === 0) {
                    this._filter.clauses = [<any>this._getDefaultClause()];
                }
            }

            if (this._filter.clauses && this._filter.clauses.length > 0) {
                this._clauseTable.append(this._createHeaderRow());
            } else {
                this._filter.clauses = [];
            }

            $.each(this._filter.clauses, function (i, clause) {
                clause.index = i;
                that._clauseTable.append(that._createClauseRow(clause));
            });

            if (this._options.enableRowAddRemove) {
                if (this._options.prependAddRow) {
                    this._clauseTable.prepend(this._createAddClauseRow());
                }
                else {
                    this._clauseTable.append(this._createAddClauseRow());
                }
            }

            this.getElement().append(this._clauseTable);
        }
    }

    private _createHeaderRow(): JQuery {
        const that = this;
        const $row = $("<tr/>").addClass("header");

        if (this._options.enableRowAddRemove && !this._options.appendAddRemoveColumn) {
            $row.append($("<th/>").addClass(FilterControl.ADD_REMOVE_CLASS));
        }

        if (this._options.enableGrouping) {
            const $span = $("<span/>")
                .attr({
                    "role": "button",
                    "disabled": "disabled",
                    "aria-disabled": "true",
                    "tabIndex": 0,
                    "aria-label": Resources_Platform.FilterGroupClauses
                })
                .addClass("bowtie-icon bowtie-group-rows")
                .click((e: JQueryEventObject) => {
                    if (!$(e.currentTarget).attr("disabled") && !this._options.readOnly) {
                        this._groupSelectedClauses();
                    }
                    return false;
                })
                .keydown(Utils_UI.buttonKeydownHandler);
            Controls_RichContentTooltip.add(Resources_Platform.FilterGroupClauses, $span);

            $("<th/>")
                .addClass("grouping disabled")
                .append($span)
                .appendTo($row);

            if (!this._options.readOnly) {
                this._groupHeaderCell = $("<th/>").addClass("groups");

                if (this._filter && this._filter.maxGroupLevel) {
                    this._groupHeaderCell.attr("colspan", this._filter.maxGroupLevel + 1);
                }
            }

            $row.append(this._groupHeaderCell);
        }

        if (!this._options.hideLogicalOperator) {
            $row.append($("<th/>").addClass("logical").text(Resources_Platform.FilterControlAndOr));
        }

        $row.append($("<th/>").addClass("field").text(Resources_Platform.FilterControlField));
        const $operatorHeaderCell = $("<th/>").addClass("operator");
        $row.append($operatorHeaderCell);

        if (!this._options.hideOperatorHeader) {
            $operatorHeaderCell.text(Resources_Platform.FilterControlOperator);
        }

        $row.append($("<th/>").addClass("value").text(Resources_Platform.FilterControlValue));

        if (this._options.enableRowAddRemove && this._options.appendAddRemoveColumn) {
            $row.append($("<th/>").addClass(FilterControl.ADD_REMOVE_CLASS));
        }

        return $row;
    }

    public _getInsertClauseTooltipText() {
        return Resources_Platform.FilterControlInsertClause;
    }

    public _getRemoveClauseTooltipText() {
        return Resources_Platform.FilterControlRemoveClause;
    }

    // Exposes current filter state
    public getFilters() : IFilter{
        return this._filter;
    }

    private _createClauseRow(clause: IFilterClause): JQuery {
        const that = this;
        let groups;
        let group;
        let i;
        let $cell;
        let colSpan;
        let andOrControl;
        let fieldControl;
        let operatorControl;
        let valueControl;

        const rowNumber = clause.index + 1;
        const $row = $("<tr/>").addClass("clause clause-row").data("clause", clause);

        function getClauseInfo(): any {
            return {
                clause: clause,
                $row: $row,
                logicalOperatorControl: andOrControl,
                fieldNameControl: fieldControl,
                operatorControl: operatorControl,
                valueControl: valueControl
            };
        }

        function clauseChanged(change: string) {
            that._onClauseChange(change, getClauseInfo());
        }

        function controlBlurred() {
            that._onControlBlurred();
        }

        function appendGroupCell(): void {
            if (group) {
                $cell.addClass("group g-cat-" + ((group.level || 0) % 5));

                if (group.start === rowNumber) { //row is a group start
                    $cell.addClass("group-start");
                    $cell.addClass(that._options.readOnly ? "disabled" : "");

                    const groupingSpan = $("<span/>")
                        .attr({
                            "role": "button",
                            "tabIndex": 0,
                            "aria-label": Resources_Platform.FilterControlUngroupClauses
                        })
                        .addClass("icon icon-tfs-clause-ungroup");
                    Controls_RichContentTooltip.add(Resources_Platform.FilterControlUngroupClauses, groupingSpan);

                    if (!that._options.readOnly) {
                        groupingSpan.click((function (g) {
                            return function (e) {
                                return that._ungroupClick(e, $.extend(getClauseInfo(), { group: g }));
                            };
                        }(group))).keydown(Utils_UI.buttonKeydownHandler);
                    }
                    else {
                        groupingSpan.attr({ disabled: "disabled", "aria-disabled": "true" });
                    }
                    groupingSpan.appendTo($cell);
                }
                else {
                    $("<div/>").addClass("group-placeholder").appendTo($cell);
                }

                if (group.end === rowNumber) {
                    $cell.addClass("group-end");
                }
            }

            if (colSpan > 1) {
                $cell.attr("colspan", colSpan);
            }

            $row.append($cell);
        }

        if (this._options.enableRowAddRemove && !this._options.appendAddRemoveColumn) {
            $row.append(this._createAddRemoveColumn(getClauseInfo));
        }

        if (this._options.enableGrouping) {
            if (!that._options.readOnly) {
                $row.append($("<td/>").addClass("grouping")
                    .append($("<input/>").attr("type", "checkbox").attr("aria-label", Resources_Platform.FilterGroupingLabel).data("clauseRow", rowNumber).click(function (e) {
                        that._updateGroupingSpan();
                    })));
            }
            if (this._filter.groups && this._filter.groups.length) {
                groups = [];

                $.each(this._filter.groups, function (i, g) {
                    if (g.start <= rowNumber && g.end >= rowNumber) {
                        g.level = g.level || 0;
                        groups.push(g);
                    }
                });

                groups.sort(function (g1, g2) { return g2.level - g1.level; });
            }

            if (groups && groups.length) {
                $cell = $("<td/>");
                colSpan = 0;
                for (i = this._filter.maxGroupLevel || 0; i >= 0; i--) {
                    if (groups.length > 0) {
                        if ((groups[0].level || 0) === i) {
                            if (colSpan > 0) {
                                appendGroupCell();
                                $cell = $("<td/>");
                                colSpan = 0;
                            }

                            group = groups.shift();
                        }
                    }

                    colSpan++;
                }

                if (colSpan > 0) {
                    appendGroupCell();
                }
            }
            else {
                $row.append($("<td />").addClass("no-group").attr("colspan", (this._filter.maxGroupLevel || 0) + 1));
            }
        }

        if (!this._options.hideLogicalOperator) {
            $cell = $("<td/>").addClass("logical");
            if (rowNumber > 1) {
                andOrControl = <Controls_Combos.Combo>Controls.BaseControl.createIn(Controls_Combos.Combo, $cell, {
                    mode: "drop",
                    allowEdit: false,
                    enabled: !this._options.readOnly,
                    ariaAttributes: { label: Resources_Platform.FilterLogicalOperator },
                    change: function () { clauseChanged("logicalOperator"); }
                });
                this._updateAndOrControl(andOrControl, clause);
            }

            $row.append($cell);
        }

        $cell = $("<td/>").addClass("field");
        const fieldControlOptions = {
            mode: "drop",
            allowEdit: !this._options.hasFixedFields,
            enabled: !this._options.readOnly,
            change: () => {
                clauseChanged("fieldName");
            },
            label: Resources_Platform.FilterControlField,
            errorMessage: Resources_Platform.FilterClauseErrorMessage
        } as Controls_Combos.IComboOptions;
        const operatorControlOptions = {
            mode: "drop",
            allowEdit: !this._options.hasFixedFields,
            sorted: false,
            source: [],
            enabled: !this._options.readOnly,
            change: () => {
                clauseChanged("operator");
            },
            label: Resources_Platform.FilterControlOperator,
            errorMessage: Resources_Platform.FilterClauseErrorMessage
        } as Controls_Combos.IComboOptions;
        const valueControlOptions = {
            mode: "text",
            enabled: !this._options.readOnly,
            change: () => {
                clauseChanged("value");
            },
            label: Resources_Platform.FilterControlValue,
            errorMessage: Resources_Platform.FilterClauseErrorMessage
        } as Controls_Combos.IComboOptions;
        if (this._options.propogateControlBlur) {
            fieldControlOptions.blur = () => { controlBlurred(); };
            operatorControlOptions.blur = () => { controlBlurred(); };
            valueControlOptions.blur = () => { controlBlurred(); };
        }


        fieldControl = Controls.Control.create(Controls_Combos.Combo, $cell, fieldControlOptions);
        this._updateFieldControl(fieldControl, clause);
        $row.append($cell);

        $cell = $("<td/>").addClass("operator");
        operatorControl = Controls.Control.create(Controls_Combos.Combo, $cell, operatorControlOptions);
        this._updateOperatorControl(operatorControl, clause);
        $row.append($cell);

        $cell = $("<td/>").addClass("value");
        valueControl = this.createClauseValueControl($cell, valueControlOptions);
        this._updateValueControl(valueControl, clause);

        $row.append($cell);

        if (this._options.enableRowAddRemove && this._options.appendAddRemoveColumn) {
            $row.append(this._createAddRemoveColumn(getClauseInfo));
        }

        this._validateClause(getClauseInfo());

        return $row;
    }

    public createClauseValueControl(container: JQuery, options?: any): any {
        return Controls.Control.create(Controls_Combos.Combo, container, options);
    }

    /**
     * Gets the string to be displayed in place of "add new clause" hyperlink.
     */
    public _getAddNewClauseText(): string {
        return Resources_Platform.FilterControlAddNewClause;
    }

    private _createAddRemoveColumn(getClauseInfo: ()=> IFilterClauseInfo): JQuery{
        const that = this;
        const $spanAddButton = $("<span/>")
            .attr({
                "role": "button",
                "tabIndex": 0,
                "aria-label": this._getInsertClauseTooltipText()
            })
            .addClass("bowtie-icon bowtie-math-plus filter-row-add")
            .click(function (e) {
                return that._addClauseClick(e, getClauseInfo());
            })
            .keydown(Utils_UI.buttonKeydownHandler);
        Controls_RichContentTooltip.add(that._getInsertClauseTooltipText() || "", $spanAddButton);

        const $spanRemoveButton = $("<span/>")
            .attr({
                "role": "button",
                "tabIndex": 0,
                "aria-label": this._getRemoveClauseTooltipText()
            })
            .addClass("bowtie-icon bowtie-edit-delete filter-row-delete")
            .click(function (e) {
                return that._removeClauseClick(e, getClauseInfo());
            })
            .keydown(Utils_UI.buttonKeydownHandler);
        Controls_RichContentTooltip.add(that._getRemoveClauseTooltipText() || "", $spanRemoveButton);

        return $("<td/>").addClass(FilterControl.ADD_REMOVE_CLASS)
            .append($spanAddButton)
            .append($spanRemoveButton);
    }

    private _createAddClauseRow(): JQuery {
        const $row = $("<tr/>").addClass(FilterControl.ADD_CLAUSE_ROW_CLASS + " clause-row");
        const that = this;
        const addNewClauseText = this._getAddNewClauseText();

        function addClauseClickHandler(e) {
            return that._addClauseClick(e, { $row: $row });
        }
        const id = String(Controls.getId());
        const $addRowLink = $("<span/>")
            .addClass("add-row-link")
            .text(addNewClauseText)
            .attr("id", id);

        const $container = $("<div/>")
            .addClass("add-new-clause-container")
            .attr({
                "aria-labelledby": id,
                "role": "button",
                "tabIndex": "0"
            })
            .append($("<span/>")
                .addClass("bowtie-icon bowtie-math-plus"))
            .append($addRowLink)

            .click(addClauseClickHandler)
            .keydown(Utils_UI.buttonKeydownHandler);

        const $cell = $("<td/>")
            .addClass(FilterControl.ADD_REMOVE_CLASS)
            .append($container);

        if (this._options.enableGrouping) {
            $cell.attr("colspan", 5 + (this._filter.maxGroupLevel || 0));
        }
        else {
            $cell.attr("colspan", 4);
        }

        $row.append($cell);
        return $row;
    }

    private _onClauseChange(change, clauseInfo: IFilterClauseInfo): void {
        let oldValue;
        let changed: boolean;
        const clause = clauseInfo.clause;

        switch (change) {
            case "logicalOperator":
                oldValue = clause.logicalOperator;
                clause.logicalOperator = clauseInfo.logicalOperatorControl.getText();
                if (Utils_String.localeIgnoreCaseComparer(oldValue, clause.logicalOperator) !== 0) {
                    changed = true;
                }
                break;
            case "fieldName":
                oldValue = clause.fieldName;
                clause.fieldName = $.trim(clauseInfo.fieldNameControl.getText());
                if (Utils_String.localeIgnoreCaseComparer(oldValue, clause.fieldName) !== 0) {
                    changed = true;
                    this._handleFieldNameChanged(clauseInfo, oldValue);
                }
                break;
            case "operator":
                oldValue = clause.operator;
                clause.operator = $.trim(clauseInfo.operatorControl.getText());
                if (Utils_String.localeIgnoreCaseComparer(oldValue, clause.operator) !== 0) {
                    changed = true;
                    this._handleOperatorChanged(clauseInfo, oldValue);
                }
                break;
            case "value":
                oldValue = clause.value;
                clause.value = this.getClauseValue(clauseInfo.valueControl, clause);
                if (Utils_String.localeIgnoreCaseComparer(oldValue, clause.value) !== 0) {
                    changed = true;
                }
                break;
            default:
        }

        if (changed) {
            // Delay execute for Combo control to auto fill (if applicable)
            this.delayExecute("validate", 150, true, () => {
                this._validateClause(clauseInfo);
                this._handleFilterModified();
            });
        }
    }

    public getClauseValue(valueControl: any, clause: any): string {
        return valueControl.getText();
    }

    /**
     * @param e
     * @return
     */
    private _addClauseClick(e?: JQueryEventObject, clauseInfo?: IFilterClauseInfo): any {

        let clause, i, l;
        this._filter.clauses = this._filter.clauses || [];
        clause = this._getDefaultClause();

        if (clauseInfo.clause) {
            clause.index = clauseInfo.clause.index;
            this._filter.clauses.splice(clauseInfo.clause.index, 0, clause); //insert our clause

            for (i = clause.index + 1, l = this._filter.clauses.length; i < l; i++) {
                this._filter.clauses[i].index = i;
            }

            this._filter.groups = Utils_UI.updateFilterGroups(this._filter.groups, clause.index + 1, true);
        }
        else {
            if (this._options.prependAddRow) {
                clause.index = 0;
                this._filter.clauses.forEach((otherClause) => {
                    otherClause.index++;
                });
                this._filter.clauses.unshift(clause);
            }
            else {
                clause.index = this._filter.clauses.length;
                this._filter.clauses.push(clause);
            }
        }

        this._createTableAndFocus(clause.index, "field");

        return false;
    }

    /**
     * @param e
     * @return
     */
    protected _removeClauseClick(e?: JQueryEventObject, clauseInfo?: IFilterClauseInfo): any {

        const index = clauseInfo.clause.index;
        this._filter.clauses.splice(index, 1); //remove our clause

        const l = this._filter.clauses.length;
        for (let i = index; i < l; i++) {
            this._filter.clauses[i].index = i;
        }

        this._filter.groups = Utils_UI.updateFilterGroups(this._filter.groups, index + 1, false);
        this._filter.maxGroupLevel = Utils_UI.updateFilterGroupLevels(this._filter.groups);

        this._createTableAndFocusDelete(index);

        return false;
    }

    private _updateGroupingSpan(): any {
        let length = 0;
        let count = 0;
        let prev = false;
        let $headerCell;

        $("td.grouping input", this.getElement()).each(function (i, cb) {
            if ($(cb).prop("checked")) {
                length++;
                if (prev || count === 0) {
                    count++;
                }

                prev = true;
            }
            else {
                prev = false;
            }
        });

        $headerCell = $(".header th.grouping", this.getElement());
        if (length > 1 && length === count) {
            $headerCell.removeClass("disabled");
            $headerCell.find("span").removeAttr("disabled");
            $headerCell.find("span").attr({ "aria-disabled": "false" });
        }
        else {
            $headerCell.addClass("disabled");
            $headerCell.find("span").attr({ "disabled": "disabled", "aria-disabled": "true" });
        }

        return false;
    }

    private _groupSelectedClauses(): void {
        let firstRow = Number.MAX_VALUE;
        let lastRow = 0;
        let hasError: boolean;
        const groups = this._filter.groups || [];
        $("td.grouping input:checked", this.getElement()).each(function (i, cb) {
            const rowNumber = $(cb).data("clauseRow");
            firstRow = Math.min(firstRow, rowNumber);
            lastRow = Math.max(lastRow, rowNumber);
        });

        if (firstRow >= lastRow) {
            alert(Resources_Platform.FilterGroupingCannotGroup);
            return;
        }

        $.each(groups, function (i, g) {
            if (g.start === firstRow && g.end === lastRow) {
                alert(Resources_Platform.FilterGroupingGroupAlreadyExist);
                hasError = true;
                return false;
            }

            if ((g.start < firstRow && g.end > firstRow && g.end < lastRow) ||
                (g.start < lastRow && g.end > lastRow && g.start > firstRow)) {
                alert(Resources_Platform.FilterGroupingCannotIntersect);
                hasError = true;
                return false;
            }

            if (g.end === firstRow || g.start === lastRow) {
                alert(Resources_Platform.FilterGroupingCannotIntersect);
                hasError = true;
                return false;
            }
        });

        if (!hasError) {
            groups.push({ start: firstRow, end: lastRow, level: null });
            this._filter.groups = groups;
            this._filter.maxGroupLevel = Utils_UI.updateFilterGroupLevels(groups);
            this._createTableAndFocus(1, "field");
        }
    }

    /**
     * @param e
     * @return
     */
    private _ungroupClick(e?: JQueryEventObject, clauseInfo?: IFilterClauseInfo): any {

        const newGroups = [];

        $.each(this._filter.groups, function (i, g) {
            if (clauseInfo.group.start !== g.start || clauseInfo.group.end !== g.end) {
                newGroups.push(g);
            }
        });

        this._filter.groups = newGroups;
        this._filter.maxGroupLevel = Utils_UI.updateFilterGroupLevels(newGroups);

        this._createTableAndFocus(clauseInfo.clause.index + 1, "field");
        return false;
    }

    private _createTableAndFocus(focusRow: number, focusColumn: string): void {
        this._createClauseTable();
        $(Utils_String.format("td.{1}:eq({0}) input", focusRow, focusColumn), this.getElement()).focus();
        this._handleFilterModified();
    }

    private _createTableAndFocusDelete(focusRow: number): void {
        this._createClauseTable();

        // If we click the delete on the last row we want to keep focus on the
        // delete button of the previous row otherwise focus will revert to the top of document
        // If you try to delete the last clause, focusRow = 0 and clasuses.length = 1, which
        // keeps the focus on the only remaining clause
        if (focusRow === this._filter.clauses.length) {
            focusRow -= 1;
        }

        $(Utils_String.format(".filter-row-delete:eq({0})", focusRow), this.getElement()).focus();
        this._handleFilterModified();
    }

    private _handleFilterModified(): void {
        this._setDirty();
        this._fire("filterModified", this._filter);
    }

    private _onControlBlurred(): void {
        this._fire("controlBlur", this._filter);
    }
}

export class FilterControl extends FilterControlO<IFilterControlOptions> { }