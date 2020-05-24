import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Diag = require("VSS/Diag");
import Linking = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { commonDialogOptions } from "WorkItemTracking/Scripts/Dialogs/CommonOptions";
import { IGridColumn } from "VSS/Controls/Grids";
import { IQuerySortColumn, IDisplayColumnResult, IColumnOptionsResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";

const delegate = Utils_Core.delegate;

enum FilterLevel {
    Store = 0,
    Project = 1,
    Wit = 2,
}

function createColumnRow(c: IDisplayColumnResult, selected: boolean) {
    /// <summary>Creates list item content for display columns</summary>
    /// <param name="selected" type="boolean" optional="true" />

    return Utils_String.format("<option value='{0}'{1}>{2}</option>", c.id, selected ? " selected" : "", c.text);
}

function createDisplayColumnRow(c: IDisplayColumnResult, selected: boolean) {
    /// <summary>Creates list item content for sort columns</summary>
    /// <param name="selected" type="boolean" optional="true" />

    return Utils_String.format("<option value='{0}'{1}>{2} [{3}]</option>", c.id, selected ? " selected" : "", c.text, c.width);
}

function createSortColumnRow(c: IDisplayColumnResult, selected: boolean) {
    /// <summary>Creates list item content for generic columns</summary>
    return Utils_String.format("<option value='{0}'{1}>{2} [{3}]</option>", c.id, selected ? " selected" : "", c.text, c.asc ? "Asc" : "Desc");
}

interface IColumnOptionsDialogFilterContextOptions {
    store: WITOM.WorkItemStore;
    getAvailableColumns: (callback: (fields: WITOM.FieldDefinition[]) => void) => void;
}

class ColumnOptionsDialogFilterContext {

    private _getAvailableColumns: (callback: (fields: WITOM.FieldDefinition[]) => void) => void;

    public store: WITOM.WorkItemStore;
    public project: WITOM.Project;
    public wit?: string;
    public columns: WITOM.FieldDefinition[];
    public $project: Combos.Combo;
    public $wit: Combos.Combo;

    constructor(options?: IColumnOptionsDialogFilterContextOptions) {
        this.store = options.store;
        this._getAvailableColumns = options.getAvailableColumns;
    }

    public beginGetColumns(fn: (columns: WITOM.FieldDefinition[]) => void) {
        const that = this;
        const store = this.store;
        const project = this.project;
        const wit = this.wit;

        function finalize(columns: WITOM.FieldDefinition[]) {
            // Sorting fields by name
            columns.sort((fd1, fd2) => {
                return Utils_String.localeIgnoreCaseComparer(fd1.name, fd2.name);
            });

            that.columns = columns;

            fn(columns);
        }

        if (!this.columns) {
            if ($.isFunction(this._getAvailableColumns)) {
                this._getAvailableColumns((fields) => {
                    finalize(fields);
                });
            }
            else {
                // Checking to see whether the filter level is work item type
                if (wit) {
                    // Fields of this work item type are populated.
                    this.project.beginGetWorkItemType(wit, (type) => {
                        finalize(type.fields);
                    });
                }
                // Checking to see whether the filter level is project
                else if (project) {
                    let populateFields = () => {
                        const flds: WITOM.FieldDefinition[] = [];
                        for (const fdId of project.fieldIds) {
                            // Project only has the ids of the fields. Thus, we need to get
                            // the details of the fields from the store
                            const fd = store.getFieldDefinition(fdId);
                            if (fd) {
                                flds.push(fd);
                            }
                        }
                        finalize(flds);
                    };
                    // All fields belonging to this project are populated.
                    populateFields();
                }
                // Checking to see whether the filter level is work item store
                else {
                    // All fields belonging to this work item store are populated.
                    let populateFields = () => {
                        const fieldIdMap: {[fieldId: string]: boolean} = {};
                        const fields: WITOM.FieldDefinition[] = [];
                        store.beginGetProjects((projects) => {
                            for (const proj of projects) {
                                for (const fieldId of proj.fieldIds) {
                                    if (!(fieldId in fieldIdMap)) {
                                        fieldIdMap[fieldId] = true;
                                        fields.push(store.getFieldDefinition(fieldId));
                                    }
                                }
                            }

                            finalize(fields);
                        });
                    };
                    populateFields();
                }
            }
        }
        else {
            finalize(this.columns);
        }
    }

    public reset(filter: IColumnFilter) {
        /// <summary>Called whenever a change in the filters occurs</summary>
        this.columns = null;

        if (filter.level === FilterLevel.Store) {
            this.project = null;
            this.wit = null;
        }
        else if (filter.level === FilterLevel.Project) {
            if (filter.project) {
                this.project = this.store.getProject(filter.project);
            }
            this.wit = null;
        }
        else if (filter.level === FilterLevel.Wit) {
            this.wit = filter.wit;
        }
    }
}

export interface ColumnOptionsDialogOptions extends Dialogs.IModalDialogOptions {
    displayColumns?: IGridColumn[];
    sortColumns?: IQuerySortColumn[];
    getAvailableColumns?: (callback: (fields: WITOM.FieldDefinition[]) => void) => void;
    allowSort?: boolean;
    simpleMode?: boolean;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

type ColumnType = "display" | "sort";

interface IColumnOption {
    columns: {[fieldId: string]: IDisplayColumnResult};
    $button?: JQuery;
    $container?: JQuery;
    $available?: JQuery;
    $selected?: JQuery;
    populated: boolean;
    optionType: ColumnType;
}

interface IDisplayColumnOption extends IColumnOption {
    optionType: "display";
}

interface ISortColumnOption extends IColumnOption {
    optionType: "sort";
}

interface IColumnContext {
    display: IDisplayColumnOption;
    sort: ISortColumnOption;
    reset: Function;
}

type IColumnFilter = {
    level: FilterLevel.Store;
} | {
    level: FilterLevel.Project;
    project?: string;
} | {
    level: FilterLevel.Wit;
    wit?: string;
};

export class ColumnOptionsDialog extends Dialogs.ModalDialogO<ColumnOptionsDialogOptions> {

    public static enhancementTypeName: string = "ColumnOptionsDialog";
    private static INVALID_WIDTH: number = -1;

    private _current: ColumnType;
    private _$columnOptionsElement: JQuery;
    private _$columnWidthElement: JQuery;
    private _$errorMessageContainer: JQuery;
    private _columnContext: IColumnContext;
    private _filterContext: ColumnOptionsDialogFilterContext;
    private _simpleMode: boolean;
    private _addedColumnNames: string[] = [];
    private _removedColumnNames: string[] = [];
    private _isWidthValid: boolean = true;

    public projects: string[];
    public wits: string[];

    constructor(options?: ColumnOptionsDialogOptions) {
        super(options);
    }

    public initialize() {
        super.initialize();

        // Initially, display columns are visible. User can switch between display and sort
        // columns using the buttons at the top of the dialog
        this._current = "display";

        this._simpleMode = this._options.simpleMode;

        // Keeps context both for display and sort columns. Later on, it is easy to access to the
        // corresponding context according to the current view (display or sort)
        this._columnContext = {
            "display": { optionType: "display", columns: {}, $button: null, $container: null, $available: null, $selected: null, populated: false },
            "sort": { optionType: "sort" , columns: {}, $button: null, $container: null, $available: null, $selected: null, populated: false },
            reset: function () {
                this.display.populated = false;
                this.sort.populated = false;
            }
        };

        // Keeps the context for the filtering like store, project, work item types and fields.
        this._filterContext = new ColumnOptionsDialogFilterContext({
            store: TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore),
            getAvailableColumns: this._options.getAvailableColumns
        });
    }

    public onLoadCompleted(content: string | JQuery | (() => string | JQuery)) {
        super.onLoadCompleted(content);

        this._$columnOptionsElement = $(".column-options", this._element);
        this._$columnWidthElement = $("input.width", this._element);
        this._$errorMessageContainer = $(".error-message", this._element);

        // Setting the title of the dialog
        this.setTitle(WorkItemTrackingResources.ColumnOptionsTitle);

        // Decorating the downloaded content
        this._decorate();

        // Attaching necessary events of UI elements
        this._attachEvents();

        // Populating the initial display and sort columns
        this._populateSelectedColumns();

        // Populating the projects combo (Because this needs an async call to WIT OM, it will
        // populate the work item types as soon as async operation completes
        if (!this._simpleMode) {
            this._populateProjects();
        }
        else {
            // In simple mode we dont need to populate the projects but we need to populate the available columns immediately
            this._populateAvailableColumns();
        }

        // Updating the status of the buttons on the dialog
        this._updateButtons();

        Diag.logTracePoint("ColumnOptionsDialog.onLoadCompleted.complete");
    }

    public getDialogResult(): IColumnOptionsResult {
        const display: IDisplayColumnResult[] = [];
        const displayContext = this._columnContext.display;
        const sort: IDisplayColumnResult[] = [];

        // Preparing the result display columns for the caller
        displayContext.$selected.children().each(function () {
            display.push(displayContext.columns[this.value]);
        });

        const sortContext = this._columnContext.sort;
        // Preparing the result sort columns for the caller
        sortContext.$selected.children().each(function () {
            sort.push(sortContext.columns[this.value]);
        });

        return { display: display, sort: sort, async: true, added: this._addedColumnNames, removed: this._removedColumnNames };
    }

    private _getCurrentContext(opposite?: boolean): IColumnOption {
        if (opposite === true) {
            return this._current === "display" ?
                this._columnContext.sort :
                this._columnContext.display;
        }
        return this._columnContext[this._current];
    }

    private _decorate() {
        const element = this._element;
        const filterContext = this._filterContext;
        const columnContext = this._columnContext;

        if (this._options.allowSort === false) {
            this._$columnOptionsElement.addClass("no-sort");
        }

        filterContext.$project = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, element.find("input[name='project']"), { indexChanged: delegate(this, this._onProjectChange), allowEdit: false });
        filterContext.$wit = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, element.find("input[name='wit']"), { indexChanged: delegate(this, this._onWitChange), allowEdit: false });

        for (const current of [columnContext.display, columnContext.sort]) {
            current.$button = element.find("a." + current.optionType);
            current.$container = element.find("div." + current.optionType);
            current.$available = current.$container.find(".available select");
            current.$selected = current.$container.find(".selected select");
        }
    }

    private _attachEvents() {
        const element = this._element;
        const display = this._columnContext.display;
        const sort = this._columnContext.sort;

        display.$button.bind("click", delegate(this, this._onDisplayClick));
        display.$available.bind("change", delegate(this, this._onAvailableListChange)).bind("dblclick", delegate(this, this._onAvailableListDblClick));
        display.$selected.bind("change", delegate(this, this._onSelectedListChange)).bind("dblclick", delegate(this, this._onSelectedListDblClick));
        sort.$button.bind("click", delegate(this, this._onSortClick));
        sort.$available.bind("change", delegate(this, this._onAvailableListChange)).bind("dblclick", delegate(this, this._onAvailableListDblClick));
        sort.$selected.bind("change", delegate(this, this._onSelectedListChange)).bind("dblclick", delegate(this, this._onSelectedListDblClick));

        element.find("button.add").bind("click", delegate(this, this._onAddColumnClick)).button();
        element.find("button.remove").bind("click", delegate(this, this._onRemoveColumnClick)).button();
        element.find("button.move-up").bind("click", delegate(this, this._onMoveColumnUpClick)).button();
        element.find("button.move-down").bind("click", delegate(this, this._onMoveColumnDownClick)).button();
        element.find("button.asc").bind("click", delegate(this, this._onSetColumnAscClick)).button();
        element.find("button.desc").bind("click", delegate(this, this._onSetColumnDescClick)).button();
        element.find("input.width").bind("keyup", delegate(this, this._onWidthKeyUp));
    }

    private _populateProjects() {
        const filterContext = this._filterContext;
        const tfsContext = this._options.tfsContext;

        // Loading projects first
        filterContext.store.beginGetProjects((projects) => {
            const projectSource = [WorkItemTrackingResources.ColumnOptionsAllProjects];

            this.projects = [];

            // Sorting projects according to the name aplhabetically
            projects.sort((p1, p2) => {
                return Utils_String.localeIgnoreCaseComparer(p1.name, p2.name);
            });

            // Iterating through projects to populate source of combo
            for (const project of projects) {
                const projectName = project.name;
                projectSource[projectSource.length] = projectName;
                this.projects.push(projectName);

                // Trying to identify the selected project for the combo
                if (projectName === tfsContext.navigation.project) {
                    filterContext.project = project;
                }
            }

            // Ensuring first project to be selected if nothing found
            filterContext.project = filterContext.project || projects[0];

            // Setting source of project combo
            filterContext.$project.setSource(projectSource);

            // Setting selected project
            filterContext.$project.setText(filterContext.project.name);

            this._filterChanged({ level: FilterLevel.Project });
        });
    }

    private _populateWits() {
        const filterContext = this._filterContext;
        const project = filterContext.project;
        const witSource = [WorkItemTrackingResources.ColumnOptionsAllWorkItemTypes];

        this.wits = [];
        if (project) {
            // Loading work item type names of the selected project
            for (const witName of project.workItemTypeNames) {
                witSource[witSource.length] = witName;
                this.wits.push(witName);
            }
            filterContext.$wit.setEnabled(true);
        }
        else {
            filterContext.$wit.setEnabled(false);
        }

        // Setting source of work item type combo
        filterContext.$wit.setSource(witSource);

        // Setting initial value for work item type combo
        filterContext.$wit.setText(WorkItemTrackingResources.ColumnOptionsAllWorkItemTypes);
    }

    private _populateSelectedColumns() {
        const filterContext = this._filterContext;
        const options = this._options;
        const display = this._columnContext.display;
        const sort = this._columnContext.sort;

        // Populating selected display columns
        for (const dc of options.displayColumns) {
            const col: IDisplayColumnResult = { id: dc.fieldId, text: dc.text, name: dc.name, width: dc.width };
            display.columns[dc.fieldId] = col;
            display.$selected.append(createDisplayColumnRow(col, false));
        }

        if (options.allowSort) {
            // Populating selected sort columns
            filterContext.store.beginGetFields(function () {
                for (const sc of options.sortColumns) {
                    const fd = filterContext.store.getFieldDefinition(sc.name);
                    if (fd) {
                        const col: IDisplayColumnResult = { id: fd.id, text: fd.name, name: sc.name, asc: !sc.descending };
                        sort.columns[fd.id] = col;
                        sort.$selected.append(createSortColumnRow(col, false));
                    }
                }
                Diag.logTracePoint("ColumnOptionsDialog._populateSelectedColumns.complete");
            });
        }
    }

    private _populateAvailableColumns() {
        const current = this._getCurrentContext();

        this._filterContext.beginGetColumns((columns) => {
            if (!current.populated) {
                current.$available.empty();
                for (const fd of columns) {
                    if (!current.columns[fd.id] && (current.optionType === "sort" ? fd.canSortBy() : fd.isQueryable())) {
                        current.$available.append(createColumnRow({ id: fd.id, text: fd.name }, false));
                    }
                }
                current.populated = true;
                this._updateButtons();
            }
            Diag.logTracePoint("ColumnOptionsDialog._populateAvailableColumns.complete");
        });
    }

    public createColumnInfoForField(id: number): IDisplayColumnResult | null {
        let fd = this._filterContext.store.getFieldDefinition(id);
        if (fd) {
            // Creating column info for the field
            const col = { id: fd.id, text: fd.name, name: fd.referenceName };
            return col;
        }
        return null;
    }

    private _addColumns() {
        let ids: number[] = [];
        const optionsText = [];
        const current = this._getCurrentContext();
        const filterContext = this._filterContext;

        // Getting the selected columns first
        current.$available.find("option:selected").each(function () {
            // Population id array to be accessed later
            ids[ids.length] = this.value;
            // Removing column element from available list
            $(this).remove();
        });

        for (const id of ids) {
            // Accessing the field definition of the item to be added
            const col = this.createColumnInfoForField(id);
            if (col) {

                if (current.optionType === "display") {
                    col.width = Linking.LinkColumnHelper.getFieldColumnWidth(id, filterContext.store);
                }
                else {
                    col.asc = true;
                }

                this._addColumnResult(col.name);

                // Creating html representation of the column for the selected listbox
                optionsText[optionsText.length] = current.optionType === "display" ? createDisplayColumnRow(col, true) : createSortColumnRow(col, true);
                // Caching column info by its id
                current.columns[col.id] = col;
            }
        }

        this._removeSelection();

        if (optionsText.length) {
            // Appending options html to the selected list
            current.$selected.append(optionsText.join(""));

            // Manually trigger change event
            current.$selected.change();
        }

        current.$selected.focus();
    }

    private _removeColumns() {
        const ids = [];
        const current = this._getCurrentContext();

        // Getting the selected columns first
        let $selectedOptions: JQuery = current.$selected.find("option:selected");

        if ($selectedOptions.length) {
            $selectedOptions.each(function () {
                // Getting the id of the column
                ids[ids.length] = this.value;
                // Removing column from available list
                $(this).remove();
            });

            // Manually trigger change event
            current.$selected.change();
        }

        // This function creates a list item for available list and
        // places is in a correct location in an aplhabetical manner
        function insertRow($list: JQuery, col: IDisplayColumnResult) {
            let inserted = false;
            $list.children().each(function () {
                if (col.text < this.text) {
                    $(this).before(createColumnRow(col, true));
                    inserted = true;
                    return false;
                }
            });

            // If there is no items in the list or the inserted item
            // is going to be last item, it is not handled in the previous
            // loop. Thus, it should be handled separately.
            if (!inserted) {
                $list.append(createColumnRow(col, true));
            }
        }

        for (const id of ids) {
            const c = current.columns[id];
            if (c) {
                insertRow(current.$available, c);
                this._removeColumnResult(c.name);
            }
        }

        this._updateButtons();

        current.$available.focus();
    }

    private _addColumnResult(name: string) {
        if (this._removedColumnNames.indexOf(name) > -1) {
            Utils_Array.remove(this._removedColumnNames, name);
        }
        else {
            this._addedColumnNames.push(name);
        }
    }

    private _removeColumnResult(name: string) {
        if (this._addedColumnNames.indexOf(name) > -1) {
            Utils_Array.remove(this._addedColumnNames, name);
        }
        else {
            this._removedColumnNames.push(name);
        }
    }

    private _moveColumnUp() {
        this._getCurrentContext().$selected.find("option:selected").each(function () {
            let $prev = $(this).prev();
            if (!$prev.prop("selected")) {
                $(this).insertBefore($prev);
            }
        });
    }

    private _moveColumnDown() {
        $.each(this._getCurrentContext().$selected.find("option:selected").toArray().reverse(), function () {
            let $next = $(this).next();
            if (!$next.prop("selected")) {
                $(this).insertAfter($next);
            }
        });
    }

    private _setColumnSort(asc: boolean) {
        let current = this._getCurrentContext();
        current.$selected.find("option:selected").each(function () {
            let c: IDisplayColumnResult = current.columns[this.value];
            if (c) {
                c.asc = asc;
                $(this).replaceWith(createSortColumnRow(c, true));
            }
        });
    }

    private _setColumnWidth(width: number) {
        let current = this._getCurrentContext();
        current.$selected.find("option:selected").each(function () {
            let c: IDisplayColumnResult = current.columns[this.value];
            if (c) {
                c.width = width;
                $(this).replaceWith(createDisplayColumnRow(c, true));
            }
        });
    }

    private _updateButtons() {
        const current = this._getCurrentContext();
        const isPopulated = current.populated === true;
        const availableDisabled = current.$available.children(":selected").length === 0 || !isPopulated;
        const selectedDisabled = current.$selected.children(":selected").length === 0 || !isPopulated;

        current.$available.closest("div.available").find("button.add").button("option", "disabled", availableDisabled);
        current.$available.closest("div.available").find("button.remove").button("option", "disabled", selectedDisabled);
        current.$selected.closest("div.selected").find("button").button("option", "disabled", selectedDisabled);

        this.updateOkButton(this._isValid());
    }

    private _isValid(): boolean {
        return this._columnContext.display.$selected.children().length > 0 && this._isWidthValid;
    }

    private _filterChanged(filter: IColumnFilter) {
        this._columnContext.reset();
        this._filterContext.reset(filter);

        if (filter.level < FilterLevel.Wit) {
            this._populateWits();
        }

        this._populateAvailableColumns();
    }

    private _tabChanged(tab: ColumnType) {
        tab = tab || "display";
        if (this._current !== tab) {

            this._current = tab;

            const display = this._getCurrentContext();
            const sort = this._getCurrentContext(true);

            display.$button.addClass("selected");
            display.$button.parent().addClass("selected");
            display.$container.show();

            sort.$button.removeClass("selected");
            sort.$button.parent().removeClass("selected");
            sort.$container.hide();

            this._populateAvailableColumns();
            this._updateButtons();
        }
    }

    private _onDisplayClick(e?: JQueryEventObject) {
        this._tabChanged("display");
        return false;
    }

    private _onSortClick(e?: JQueryEventObject) {
        this._tabChanged("sort");
        return false;
    }

    private _onProjectChange(index: number) {
        if (index > 0) {
            this._filterChanged({ level: FilterLevel.Project, project: this.projects[index - 1] });
        }
        else {
            this._filterChanged({ level: FilterLevel.Store });
        }
    }

    private _onWitChange(index: number) {
        if (index > 0) {
            this._filterChanged({ level: FilterLevel.Wit, wit: this.wits[index - 1] });
        }
        else {
            this._filterChanged({ level: FilterLevel.Project });
        }
    }

    private _onAvailableListChange(e?: JQueryEventObject) {
        this._updateButtons();
    }

    private _onAvailableListDblClick(e?: JQueryEventObject) {
        this._addColumns();
        return false;
    }

    private _onSelectedListChange(e?: JQueryEventObject) {
        let current = this._getCurrentContext();

        const $selected = current.$selected.children(":selected");

        if (current.optionType === "display") {
            if ($selected.length > 0) {
                const col = current.columns[$selected.first().val()];
                if (col) {
                    this._element.find("input.width")
                        .val(col.width)
                        .removeAttr("disabled")
                        .removeClass("disabled")
                        .removeClass("invalid");
                    this._isWidthValid = true;
                }
            }
            else {
                this._element.find("input.width")
                    .val("")
                    .prop("disabled", true)
                    .addClass("disabled");
            }
            // Bad input is lost on column change
            this._hideError();
        }

        this._removeSelection();
        $selected.prop("selected", true);
        this._updateButtons();
    }

    private _removeSelection() {
        let current = this._getCurrentContext();
        // Remove previously selected options
        current.$selected.find("option").removeAttr("selected");
    }

    private _onSelectedListDblClick(e?: JQueryEventObject) {
        this._removeColumns();
        return false;
    }

    private _onAddColumnClick(e?: JQueryEventObject) {
        this._addColumns();
        return false;
    }

    private _onRemoveColumnClick(e?: JQueryEventObject) {
        this._removeColumns();
        return false;
    }

    private _onMoveColumnUpClick(e?: JQueryEventObject) {
        this._moveColumnUp();
        return false;
    }

    private _onMoveColumnDownClick(e?: JQueryEventObject) {
        this._moveColumnDown();
        return false;
    }

    private _onSetColumnAscClick(e?: JQueryEventObject) {
        this._setColumnSort(true);
        return false;
    }

    private _onSetColumnDescClick(e?: JQueryEventObject) {
        this._setColumnSort(false);
        return false;
    }

    private _validateAndGetFieldWidth(): number {
        // if the actual field cannot be found return a valid 0 width
        if (this._$columnWidthElement.length === 0) {
            return 0;
        }
        const widthText = $.trim(this._$columnWidthElement.val());
        let width: number = 0;
        if (this._getCurrentContext().$selected.children(":selected").length > 0) {
            // Performing width validity checks if an item is selected
            // in the selected columns listbox
            if (widthText.length && !isNaN(Number(widthText))) {
                width = parseInt(widthText, 10);
                if (width >= 0 && width <= 65536) {
                    return width;
                }
            }
        }
        return ColumnOptionsDialog.INVALID_WIDTH;
    }

    private _applyWidthChange() {
        let result = this._validateAndGetFieldWidth();

        if (result === ColumnOptionsDialog.INVALID_WIDTH) {
            // Width is invalid
            this._isWidthValid = false;
            this._showError(WorkItemTrackingResources.ColumnOptionsInvalidWidth);
            if (this._$columnWidthElement) {
                this._$columnWidthElement.addClass("invalid");
            }
        }
        else {
            // Width is valid
            this._isWidthValid = true;
            this._hideError();
            if (this._$columnWidthElement) {
                this._$columnWidthElement.removeClass("invalid");
            }
            this._setColumnWidth(result);
        }
        this._updateButtons();
    }

    private _showError(error: string) {
        // Just show latest message
        this._hideError()
        // Create message
        let $errorMessage = $("<div>");
        $errorMessage.append($("<div>").addClass("icon bowtie-icon bowtie-status-error"));
        $errorMessage.append($("<div>").addClass("error-text").text(error));
        this._$errorMessageContainer.append($errorMessage);
    }

    private _hideError() {
        this._$errorMessageContainer.empty();
    }

    private _onWidthKeyUp(e?: JQueryEventObject) {
        return this._applyWidthChange();
    }
}

export function columnOptions(options?: ColumnOptionsDialogOptions) {
    let simpleMode = options.simpleMode;

    return Dialogs.show(ColumnOptionsDialog, commonDialogOptions($.extend(options, {
        width: 560,
        simpleMode: simpleMode,
        getAvailableColumns: options.getAvailableColumns,
        height: simpleMode ? 350 : 420,
        cssClass: "column-options-host" + (simpleMode ? " simple" : ""),
        initialFocusSelector: "select",
        okCallback: options.okCallback,
        url: options.tfsContext.getActionUrl("columnOptions", "wit", { area: "api", simpleMode: simpleMode || false, includeLanguage: true } as TFS_Host_TfsContext.IRouteData)
    })));
}
