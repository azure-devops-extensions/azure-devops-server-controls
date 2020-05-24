import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Menus = require("VSS/Controls/Menus");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import Events_Services = require("VSS/Events/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import QueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import { FilterBar } from "WorkItemTracking/Scripts/Controls/Filters/FilterBar";
import { WorkItemsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { autobind } from "OfficeFabric/Utilities";
import { IQueryCommandContributionContext } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { WorkItemPermissionActions } from "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";
import { QueryResultMenuBar } from "WorkItemTracking/SharedScripts/QueryResultMenuBar";

const TfsContext = TFS_Host_TfsContext.TfsContext;
const delegate = Utils_Core.delegate;

const toggleFilterId = "toggle-filter";

class QueryResultToolbar extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.wit.queryResultGridToolbar";

    private _contributedMenuItemsLoaded: boolean;
    private _grid: QueryResultGrid.QueryResultGrid;
    private _menuBar: QueryResultMenuBar;
    private _filterBar: FilterBar;
    private _getActionArgsDelegate: () => any;
    private _onGridDirtyStatusChangedDelegate: (provider?) => void;
    private _onCommandStatusChangedDelegate: (e?) => void;
    private _onSelectedWorkItemChangedDelegate: (e?, id?) => void;
    private _onPermissionDataAvailableDelegate: () => void;

    private _onQueryResultScenarioEnded = () => {
        // Will be fired after query result scenario is ended. This would be called everytime a new workitem is opened in triage view
        if (!this._contributedMenuItemsLoaded) {
            // only refresh the menubar if the contributions are not already loaded. This will prevent refreshing the menubar multiple times
            this._contributedMenuItemsLoaded = true;
            this._menuBar.refreshContributedItems();
        }
    }

    constructor(options?) {
        super(options);

        var that = this;

        this._contributedMenuItemsLoaded = false;
        this._getActionArgsDelegate = function () {
            return that._onGetMenuItemActionArguments(this);
        };

        this._onGridDirtyStatusChangedDelegate = delegate(this, this.onGridDirtyStatusChanged);
        this._onCommandStatusChangedDelegate = delegate(this, this.onCommandStatusChanged);
        this._onSelectedWorkItemChangedDelegate = delegate(this, this.onSelectedWorkItemChanged);
        this._onPermissionDataAvailableDelegate = delegate(this, this._onPermissionDataAvailable);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "toolbar query-result-grid-toolbar"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._menuBar = this._createMenuBar(this._element);
    }

    public dispose() {
        this.unbind();

        super.dispose();
    }

    public bind(grid: QueryResultGrid.QueryResultGrid) {
        var $grid;

        this.unbind();

        this._grid = grid;

        $grid = this._grid.getElement();

        this._bind($grid, "dirty-status-changed", this._onGridDirtyStatusChangedDelegate, true);
        this._bind($grid, "commandStatusChanged", this._onCommandStatusChangedDelegate, true);
        this._bind($grid, "selectedWorkItemChanged", this._onSelectedWorkItemChangedDelegate, true);

        Events_Services.getService().attachEvent(WorkItemsProvider.EVENT_QUERY_PROVIDER_DIRTY_CHANGED, this._onGridDirtyStatusChangedDelegate);

        // Make sure we refresh the menu items after permission data becomes available
        Events_Services.getService().attachEvent(WorkItemPermissionActions.PERMISSION_DATA_AVAILABLE, this._onPermissionDataAvailableDelegate);

        // Binding an event to load contributed menu items after TTI.
        Service.getLocalService(Events_Services.EventService).attachEvent("queryResultScenarioEnded", this._onQueryResultScenarioEnded);
        this._updateMenuItems();
    }

    /**
     * Binds the given filterManager to the toolbar.  This will be used when showing and hiding the filters.
     * @param filterBar The filter bar associated with the query results grid.
     */
    public bindFilterBar(filterBar: FilterBar) {
        this._filterBar = filterBar;

        if (this._filterBar) {
            this._tryBindFilterManagerEvent();
        }
    }

    private _tryBindFilterManagerEvent() {
        const filterManager = this._filterBar.getFilterManager();
        if (filterManager) {
            filterManager.attachEvent(FilterManager.EVENT_FILTER_CHANGED, this._filterChanged);
            filterManager.attachEvent(FilterManager.EVENT_FILTER_CLEARED, this._filterChanged);
        }
    }

    @autobind
    private _filterChanged() {
        if (this._filterBar) {
            const filterManager = this._filterBar.getFilterManager();
            if (filterManager) {
                const isFiltering = filterManager.isFiltering();

                const item = this._menuBar.getItem(toggleFilterId);
                if (item) {
                    item.update({
                        ...this._getFilterMenuItem(),
                        icon: isFiltering ? "bowtie-icon bowtie-search-filter-fill" : "bowtie-icon bowtie-search-filter"
                    });
                }
            }
        }
    }

    public unbind() {
        var $grid;
        if (this._grid) {
            $grid = this._grid.getElement();

            this._unbind($grid, "dirty-status-changed", this._onGridDirtyStatusChangedDelegate, true);
            this._unbind($grid, "commandStatusChanged", this._onCommandStatusChangedDelegate, true);
            this._unbind($grid, "selectedWorkItemChanged", this._onSelectedWorkItemChangedDelegate, true);

            this._grid = null;
        }

        if (this._filterBar) {
            const filterManager = this._filterBar.getFilterManager();
            if (filterManager) {
                filterManager.detachEvent(FilterManager.EVENT_FILTER_CHANGED, this._filterChanged);
                filterManager.detachEvent(FilterManager.EVENT_FILTER_CLEARED, this._filterChanged);
            }

            this._filterBar = null;
        }

        Events_Services.getService().detachEvent(WorkItemsProvider.EVENT_QUERY_PROVIDER_DIRTY_CHANGED, this._onGridDirtyStatusChangedDelegate);
        Events_Services.getService().detachEvent(WorkItemPermissionActions.PERMISSION_DATA_AVAILABLE, this._onPermissionDataAvailableDelegate);

        Service.getLocalService(Events_Services.EventService).detachEvent("queryResultScenarioEnded", this._onQueryResultScenarioEnded);
    }

    public onSelectedWorkItemChanged(e?, id?) {
        this._updateMenuItems();
    }

    public onCommandStatusChanged(e?) {
        this._updateMenuItems();
    }

    public onGridDirtyStatusChanged(provider?) {
        this._updateMenuItems();
    }

    // Using the convention of preprending "_" to a public function to denote a protected function.
    // These functions should be called only from derived classes.
    public _getGrid(): QueryResultGrid.QueryResultGrid {
        return this._grid;
    }

    public _createMenuBar($containerElement: JQuery): QueryResultMenuBar {
        const menuBarOptions: Menus.MenuBarOptions = {
            items: this._createMenubarItems(),
            executeAction: delegate(this, this._onMenubarItemClick),
            contributionIds: ["ms.vss-work-web.work-item-query-results-toolbar-menu"],
            contextInfo: {
                item: { getContributionContext: this._getContributionContext.bind(this) }
            },
            suppressInitContributions: true
        };

        return <QueryResultMenuBar>Controls.BaseControl.createIn(QueryResultMenuBar, $containerElement, menuBarOptions);
    }

    public _onGetMenuItemActionArguments(menuItem: Menus.MenuItem) {
        if (this._grid) {
            return this._grid.getActionArguments(menuItem.getAction(), QueryResultToolbar.enhancementTypeName);
        }
    }

    public _createMenubarItems(): Menus.IMenuItemSpec[] {
        var items: Menus.IMenuItemSpec[] = [];

        items.push({ id: "save-work-items", text: Resources.SaveResults, title: Resources.SaveResultsToolTip, showText: false, icon: "bowtie-icon bowtie-save-all", "arguments": this._getActionArgsDelegate });
        items.push({ id: "save-query", text: Resources.SaveQuery, title: "", showText: true, noIcon: true, setTitleOnlyOnOverflow: true });
        items.push({ id: "refresh-work-items", text: Resources.Refresh, title: Resources.RefreshTooltip, showText: false, icon: "bowtie-icon bowtie-navigate-refresh", "arguments": this._getActionArgsDelegate });
        items.push({ id: "open-work-item", text: Resources.Open, showText: false, icon: "bowtie-icon bowtie-arrow-open", "arguments": this._getActionArgsDelegate });

        if (this._options.tfsContext.standardAccessMode === true) {
            items.push({ id: "link-to-new", text: Resources.LinkSelectedItemsToNewWorkItem, title: Resources.LinkSelectedItemsToNewWorkItem, showText: false, icon: "bowtie-icon bowtie-work-item ", "arguments": this._getActionArgsDelegate });
            items.push({ id: "link-to-existing", text: Resources.LinkToExistingItem, title: Resources.LinkToExistingItemToolTip, showText: false, icon: "bowtie-icon bowtie-link", "arguments": this._getActionArgsDelegate });
        }

        items.push({ id: QueryResultGrid.QueryResultGrid.COMMAND_ID_EMAIL_QUERY_RESULT, text: Resources.EmailQueryResult, title: Resources.EmailQueryResult, showText: false, icon: "bowtie-icon bowtie-mail-message", "arguments": this._getActionArgsDelegate });

        items.push({ separator: true });

        items.push({ id: "expand-all-nodes", text: VSS_Resources_Common.ExpandAll, title: VSS_Resources_Common.ExpandAllToolTip, showText: false, icon: "bowtie-icon bowtie-toggle-expand-all", "arguments": this._getActionArgsDelegate });
        items.push({ id: "collapse-all-nodes", text: VSS_Resources_Common.CollapseAll, title: VSS_Resources_Common.CollapseAllToolTip, showText: false, icon: "bowtie-icon bowtie-toggle-collapse-all", "arguments": this._getActionArgsDelegate });

        items.push({ id: QueryResultGrid.QueryResultGrid.COMMAND_ID_DESTROY, text: Resources.DestroyWorkItemsTooltip, title: Resources.DestroyWorkItemsTooltip, showText: false, icon: "bowtie-icon bowtie-edit-delete", "arguments": this._getActionArgsDelegate });
        items.push({ id: QueryResultGrid.QueryResultGrid.COMMAND_ID_RESTORE, text: Resources.RestoreWorkItemsTooltip, title: Resources.RestoreWorkItemsTooltip, showText: false, icon: "bowtie-icon bowtie-recycle-bin-restore", "arguments": this._getActionArgsDelegate });

        items.push({ separator: true });
        items.push({ id: "column-options", text: Resources.ColumnOptions, title: "", noIcon: true, "arguments": this._getActionArgsDelegate, setTitleOnlyOnOverflow: true });
        items.push({ id: "share-link", text: Resources.CopyQueryURL, title: "", noIcon: true, setTitleOnlyOnOverflow: true });

        if (!this._options.hideFilter) {
            items.push(this._getFilterMenuItem());
        }
        return items;
    }

    public _onMenubarItemClick(command: any) {
        if (command.get_commandName() === toggleFilterId) {
            // Toggle the filter bar
            if (this._filterBar) {
                this._filterBar.toggle();

                // Filter is now visible for the first time, try to attach the filtering events
                this._tryBindFilterManagerEvent();
            }
        } else if (this._grid) {
            return this._grid.executeCommand(command, false);
        }
    }

    private _onPermissionDataAvailable(): void {
        this._updateMenuItems();
    }

    private _getContributionContext(): IQueryCommandContributionContext {
        if (this._grid) {
            return this._grid.getQueryContributionContext();
        } else {
            return null;
        }
    }

    private _updateMenuItems() {
        this.delayExecute("updateMenuItems", 250, true, delegate(this, this._updateMenuItemsNow));
    }

    private _updateMenuItemsNow() {
        let menuItemStates = [];

        if (this._grid) {
            menuItemStates = this._grid.getCommandStates();
        }

        menuItemStates.push({
            id: toggleFilterId,
            toggled: this._filterBar && this._filterBar.isVisible()
        });

        this._menuBar.updateCommandStates(menuItemStates);
    }

    private _getFilterMenuItem(): Menus.IMenuItemSpec {
        return {
            id: toggleFilterId,
            text: VSS_Resources_Common.Filter,
            title: VSS_Resources_Common.FilterToolTip,
            showText: false,
            icon: "bowtie-icon bowtie-search-filter",
            cssClass: "right-align toggle-filter-bar",
            "arguments": this._getActionArgsDelegate
        };
    }
}

VSS.initClassPrototype(QueryResultToolbar, {
    _grid: null,
    _menuBar: null,
    _getActionArgsDelegate: null,
    _onGridDirtyStatusChangedDelegate: null,
    _onCommandStatusChangedDelegate: null,
    _onSelectedWorkItemChangedDelegate: null,
    _onPermissionDataAvailableDelegate: null
});


VSS.classExtend(QueryResultToolbar, TfsContext.ControlExtensions);

// Deprecated, please don't rely on this enhancement, as it will be removed
Controls.Enhancement.registerEnhancement(QueryResultToolbar, ".query-result-grid-toolbar");

export = QueryResultToolbar;
