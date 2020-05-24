/// <reference types="jquery" />

import ko = require("knockout");

import BaseDefinitionModel = require("Build/Scripts/BaseDefinitionModel");
import BuildContext = require("Build/Scripts/Context");
import ViewsCommon = require("Build/Scripts/Views.Common");

import {BuildCustomerIntelligenceInfo} from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import {GetBuildsResult, IBuildFilter} from "Build.Common/Scripts/ClientContracts";

import BuildContracts = require("TFS/Build/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Events = require("VSS/Events/Services");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Performance = require("VSS/Performance");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;
export var selectedGridRow: KnockoutObservable<BuildContracts.Build> = ko.observable(null);

export var ICON_CELL_WIDTH = 26;

export interface IFilter {
    key: KnockoutObservable<string>;
    selectedValue: KnockoutComputed<any>;
}

export function defaultComparer(column, order, rowA, rowB) {
    var v1 = rowA[column.index],
        v2 = rowB[column.index];

    if (typeof v1 === "undefined" || v1 === null) {
        if (typeof v2 === "undefined" || v2 === null) {
            return 0;
        }
        else {
            return -1;
        }
    }

    return Utils_String.localeIgnoreCaseComparer(v1, v2);
}

/**
 * Base grid for completed/queued build list.
 */
export class BuildsGrid extends Grids.GridO<any> {
    private _columnMap: { [index: string]: Grids.IGridColumn };

    constructor(options?: Grids.IGridOptions) {
        super(options);
    }

    initializeOptions(options?) {
        this._columnMap = {};

        // Keep a reference to columns
        var columns = this._getInitialColumns();
        $.each(columns, (i: number, c: Grids.IGridColumn) => {
            this._columnMap[c.index] = c;
        });

        super.initializeOptions($.extend({
            asyncInit: false,
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: true,
            openRowDetail: (index: number) => {
                // Open build
                BuildContext.viewContext.viewBuild(this.getRowData(index));
            },
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                executeAction: delegate(this, this._onContextMenuClick),
                updateCommandStates: delegate(this, this._updateCommandStates),
                contributionIds: ["ms.vss-build-web.completed-build-menu"]
            },
            columns: columns,
            sortOrder: this._getInitialSortOrder()
        }, options));
    }

    initialize(): void {
        super.initialize();
    }

    _getInitialColumns(): Grids.IGridColumn[] {
        return [];
    }

    _getInitialSortOrder(): Grids.IGridSortOrder[] {
        return [];
    }

    _getContextMenuItems(): Menus.IMenuItemSpec[] {
        return [];
    }

    _updateCommandStates(menu: Menus.Menu<any>, args?: any): void {
    }

    _updateSource(source: any[]): void {
        this.setDataSource(source, null, this.getColumns(), this.getSortOrder());
    }

    _createGridCell(column: Grids.IGridColumn, header?: boolean, title?: string): JQuery {
        var cell = $("<div />");
        // for header cells, the grid creates a div with class="grid-header-column" and inserts the object returned by this function
        // for non-header cells, the grid uses the object returned by this function directly, so add class="grid-cell" to it
        if (header !== true) {
            cell.addClass("grid-cell");
            cell.attr("role", "gridcell")
        }

        // Setting the width of the cell using column width
        cell.width(column.width || 20);

        // Setting tooltip if specified
        if (title) {
            cell.attr("title", title);
        }

        return cell;
    }

    _createGridIconCell2(column: Grids.IGridColumn, styles: string[], title: string): JQuery {
        let cell = this._createGridCell(column, false, title);

        cell.addClass("build-list-icon");
        styles.forEach((style: string) => {
            cell.addClass(style);
        });

        return cell;
    }

    _createGridIconCell(column: Grids.IGridColumn, icon: string, prefix: string, title: string): JQuery {
        var cell = this._createGridCell(column, icon === "header", typeof title === "string" ? title : icon);

        // Add class for the icon
        cell.addClass("build-list-icon");

        if (prefix) {
            cell.append($("<span class='icon icon-tfs-build-" + prefix + '-' + (icon || "").toLowerCase() + "' />"));
        }
        else {
            cell.append($("<span class='icon icon-" + icon.toLowerCase() + "' />"));
        }

        return cell;
    }

    _createGridDateCell(column: Grids.IGridColumn, date: any): JQuery {
        var cell = this._createGridCell(column, false, (date instanceof Date) ? Utils_Date.localeFormat(date, "F") : date);
        cell.text((date instanceof Date) ? Utils_Date.friendly(date) : date);

        return cell;
    }

    public getColumnByIndex(index: string): any {
        return this._columnMap[index];
    }

    _onContextMenuClick(e?: any): any {

    }
}

export class BuildsTab<TFilter extends IFilter> extends BuildContext.BuildTab<TFilter> {
    private _continuationToken: KnockoutObservable<string> = ko.observable("");
    private _currentFilter: IBuildFilter = null;

    /**
     * List of builds after filters applied.
     */
    public builds: KnockoutObservableArray<BuildContracts.Build>;

    /**
     * Indicates whether more builds are available
     */
    public moreBuildsAvailable: KnockoutComputed<boolean>;

    /**
     * Reactor for selected definition or filters.
     */
    public gridUpdateReactor: KnockoutComputed<any>;

    constructor(id: string, text: string, templateName: string) {
        super(id, text, templateName);

        // pivot filters
        this._populateFilters();

        // Initialize list of builds to be displayed
        this.builds = ko.observableArray([]);

        this.moreBuildsAvailable = ko.computed(() => {
            return !!this._continuationToken();
        });

        this.gridUpdateReactor = ko.computed(() => {
            // update the grid when the tab becomes selected
            var isSelected = this.isSelected();

            // update the grid when a new definition is selected
            var selectedDefinitionType: BuildContracts.DefinitionType;
            var selectedDefinition = BuildContext.definitionContext.selectedDefinition();
            if (!selectedDefinition) {
                selectedDefinitionType = BuildContext.definitionContext.selectedDefinitionType();
            }

            // update the grid when a pivot filter changes
            var filterValues: string[] = [];
            $.each(this.filters(), (index: number, filter: TFilter) => {
                filterValues[index] = filter.selectedValue();
            });

            // update the grid when tags are changed
            var tags: string[] = BuildContext.viewContext.tags();

            this._updateGrid(isSelected, selectedDefinitionType, selectedDefinition);
        });
    }

    /**
     * Lets the derivatives populate filters
     */
    _populateFilters(): void {
    }

    /**
     * Creates the base filter for querying builds.
     */
    _getDefaultFilter(): IBuildFilter {
        var filter: IBuildFilter = {};

        // tags
        var tags = BuildContext.viewContext.tags();
        if (tags.length > 0) {
            filter.tagFilters = tags.join(",");
        }

        return filter;
    }

    /**
     * Refresh the grid
     */
    public refresh(): Q.IPromise<void> {
        return this._updateGrid(this.isSelected(), BuildContext.definitionContext.selectedDefinitionType(), BuildContext.definitionContext.selectedDefinition());
    }

    /**
     * Get more builds
     */
    public getMoreBuilds() {
        this._updateGrid(this.isSelected(), BuildContext.definitionContext.selectedDefinitionType(), BuildContext.definitionContext.selectedDefinition(), true);
    }

    private _updateGrid(isTabSelected: boolean, selectedDefinitionType: BuildContracts.DefinitionType, selectedDefinition: BaseDefinitionModel.BaseDefinitionModel, append: boolean = false): Q.IPromise<any> {
        if (isTabSelected) {
            var filter: IBuildFilter = this._getDefaultFilter();

            // pivot filters
            $.each(this.filters(), (index: number, pivotFilter: TFilter) => {
                var value: string = pivotFilter.selectedValue();
                if (!!value) {
                    filter[pivotFilter.key()] = value;
                }
            });

            if (append) {
                // send continuation token
                filter.continuationToken = this._continuationToken();
            }

            if (selectedDefinition) {
                // get completed builds for the selected definition
                filter.definitions = selectedDefinition.id().toString();
            }
            else {
                filter.type = selectedDefinitionType;
            }

            // don't bother requesting without filters
            if (filter.type || filter.definitions) {
                this._currentFilter = filter;

                var performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "BuildTabUpdateGrid");

                return BuildContext.viewContext.buildClient.getBuilds(filter)
                    .then((result: GetBuildsResult) => {
                        performance.addSplitTiming("retrieved builds");
                        // if the selection changed, ignore the results
                        if (this._currentFilter === filter) {
                            this._continuationToken(result.continuationToken);

                            // This will trigger grid to pick up new source
                            if (append) {
                                this.builds(this.builds().concat(result.builds));
                            }
                            else {
                                this.builds(result.builds);
                            }
                            performance.addSplitTiming("updated builds observable");
                        }
                        performance.end();
                        Events.getService().fire(ViewsCommon.PerformanceEvents.UpdateGrid);
                    });
            }
        }
    }
}

export class BuildsViewModel extends Adapters_Knockout.TemplateViewModel {
    public tab: BuildsTab<any>;

    public moreBuildsAvailable: KnockoutComputed<boolean>;

    constructor(tab: any) {
        super();
        this.tab = tab;

        this.moreBuildsAvailable = this.computed(() => {
            return this.tab.moreBuildsAvailable();
        });
    }

    public getMoreBuilds() {
        this.tab.getMoreBuilds();
    }

    public dispose(): void {
        // Dispose grid update reactor
        if (this.tab && this.tab.gridUpdateReactor) {
            this.tab.gridUpdateReactor.dispose();
            this.tab.gridUpdateReactor = null;
        }

        // Free tab property.
        this.tab = null;

        super.dispose();
    }
}

export class BuildsControl extends Adapters_Knockout.TemplateControl<BuildsViewModel> {
    protected _grid: BuildsGrid;
    private _gridRefreshHandler: JQueryEventHandler;
    private _gridSelectionHandler: JQueryEventHandler;

    constructor(viewModel: BuildsViewModel, options?: any) {
        super(viewModel, options);
    }

    _enhanceGrid(): BuildsGrid {
        return null;
    }

    initialize(): void {
        super.initialize();

        // Active empty steps grid. It will be populated later
        this._grid = this._enhanceGrid();

        this.computed(() => {
            var viewModel = this.getViewModel();

            // Monitor build changes
            var builds = viewModel.tab.builds();

            // Sort builds according to the current sort order
            this._sort(builds);

            if (viewModel.moreBuildsAvailable()) {
                // append an empty build record
                builds = builds.concat([
                    <BuildContracts.Build>{
                    }
                ]);
            }

            // Update UI
            this._updateGridSource(builds);
        });

        this._grid.getElement().on("refresh", this._gridRefreshHandler = (evt: JQueryEventObject) => {
            this.getViewModel().tab.refresh();
        });

        this._grid.getElement().on("selectionchanged", this._gridSelectionHandler = (evt: JQueryEventObject, args: { selectedCount: number; selectedIndex: number; selectedRows: any }) => {
            if (args && args.selectedCount === 1) {
                var row: BuildContracts.Build = this._grid._dataSource[args.selectedIndex];
                if (row) {
                    selectedGridRow(row);
                }
                else {
                    // ideally this shouldn't happen, but just a fall back
                    selectedGridRow(null);
                }
            }
            else {
                selectedGridRow(null);
            }
        });
    }

    public dispose(): void {
        // Dispose grid refresh handler first
        if (this._gridRefreshHandler) {
            this._grid.getElement().off("refresh", this._gridRefreshHandler);
            this._gridRefreshHandler = null;
        }

        if (this._gridSelectionHandler) {
            this._grid.getElement().off("selectionchanged", this._gridSelectionHandler);
            this._gridSelectionHandler = null;
        }

        // Dispose grid
        this._grid.dispose();
        this._grid = null;

        super.dispose();
    }

    private _sort(builds: BuildContracts.Build[]): void {
        // Get current sort order from the grid, it will be applied to new data source
        var sortColumns = this._grid.getSortOrder() || [];

        // Perform actual sorting
        builds.sort((b1: BuildContracts.Build, b2: BuildContracts.Build): number => {
            var result = 0;
            for (var i = 0, len = sortColumns.length; i < len; i++) {
                var sortColumn = <Grids.IGridSortOrder>sortColumns[i];
                var column = this._grid.getColumnByIndex(sortColumn.index);
                var comparer = column && column.comparer ? column.comparer : defaultComparer;

                // Perform column compare
                result = comparer.call(this._grid, column, sortColumn.order, b1, b2);

                // If two items different, quit
                if (result !== 0) {
                    // Fix order
                    result *= (sortColumn.order === "desc" ? -1 : 1);
                    break;
                }
            }

            return result;
        });
    }

    _updateGridSource(builds: BuildContracts.Build[]): void {
        this._grid._updateSource(builds);
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Explorer.BuildsTab", exports);
