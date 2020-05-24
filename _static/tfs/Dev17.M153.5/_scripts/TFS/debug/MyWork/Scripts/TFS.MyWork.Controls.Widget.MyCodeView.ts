///<amd-dependency path='VSS/LoaderPlugins/Css!MyWork' />



//FW
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
//MyWork
import MyCode_Widget_Api = require("MyWork/Scripts/TFS.MyWork.Widget.MyCode");
import MyWorkTelemetry = require("MyWork/Scripts/TFS.MyWork.Telemetry");
import Resources = require("MyWork/Scripts/Resources/TFS.Resources.MyWork");
//Dashboards
import Dashboards_UIContracts = require("Dashboards/Scripts/Contracts");

var delegate = Utils_Core.delegate;
var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export module MyCodeWidgetViewConstants {
    //Css class
    export var CORE_CSS_CLASS = "myCode-widget-view";
    export var GRID_CONTAINER_CSS_CLASS = "myCode-widget-view-grid-container";
    export var TITLE_CSS_CLASS = "myCode-widget-view-title";
    export var GRID_CSS_CLASS = "myCode-widget-grid";
    export var NO_RESULTS_CONTAINER_CSS_CLASS = "myCode-widget-no-results-container";
    export var NO_RESULTS_MESSAGE_CSS_CLASS = "myCode-widget-no-results-message";
    export var NO_RESULTS_SYMBOL_CSS_CLASS = "myCode-widget-no-results-symbol";
    export var LAST_ACCESSED_CSS_CLASS = "myCode-widget-grid-content-lastaccessed";
    export var REPO_NAME_CSS_CLASS = "myCode-widget-grid-content-name";
    export var GRID_ROW_ICON_CSS_CLASS = "myCode-widget-grid-content-icon";
    export var GIT_ICON_CSS_CLASS = "myCode-widget-git-icon";
    export var TFVC_ICON_CSS_CLASS = "myCode-widget-tfvc-icon";
    export var ISGIT_CELL_CSS_CLASS = "myCode-widget-isgit-cell";
    export var TEXT_CELL_CSS_CLASS = "myCode-widget-text-cell";
    export var CLOSE_ICON_CELL_CSS_CLASS = "myCode-widget-close-icon-cell";
    export var WIDGET_CLOSE_ICON_CSS_CLASS = "widget-close-icon";
    export var ICON_CSS_CLASS = "icon";
    export var ICON_CLOSE_CSS_CLASS= "icon-close";
    export var GRID_CELL_CSS_CLASS = "grid-cell";
    
    //Constants
    export var REFRESH_INTERVAL = 5 * 60 * 1000;
    export var GRID_ROW_HEIGHT = 50;
    export var MAX_ROWS = 5;
    export var DESC_ORDER = 'desc';
    export var SUBTEXT_FORMAT = "{0}  &#903;  {1}";
    export var TEXT_FORMAT = "$/{0}";

    //Event
    export var CLICK_REPO_EVENT = "ClickRepoEvent";
    export var REMOVE_FROM_MRU_EVENT = "removeFromRepoMRUEvent";
    
    //Dashboard
    export var NEW_WIDGET_NON_DASHBOARD_MODE = "non-dashboard-mode";
}

export module RepoDataIndices {
    export var TextIndex = "Text";
    export var LastAccessedIndex = "LastAccessed";
    export var HashCodeIndex = "HashCode";
    export var IsGitIndex = "IsGit";
    export var Project = "Project";
    export var Url = "Url";
}

var HTML_TEMPLATE =
    `<span class='${MyCodeWidgetViewConstants.TITLE_CSS_CLASS}'/>
      <div class='${MyCodeWidgetViewConstants.GRID_CONTAINER_CSS_CLASS}'/>
      <div class='${MyCodeWidgetViewConstants.NO_RESULTS_CONTAINER_CSS_CLASS}'>
          <div class='${MyCodeWidgetViewConstants.NO_RESULTS_MESSAGE_CSS_CLASS}'/>
          <div class='${MyCodeWidgetViewConstants.NO_RESULTS_SYMBOL_CSS_CLASS}'/>
      </div>`;

export class MyCodeWidgetGrid extends Grids.Grid {
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: MyCodeWidgetViewConstants.GRID_CSS_CLASS,
            allowMultiSelect: false,
            header: false,
            sortOrder: [{
                index: RepoDataIndices.LastAccessedIndex,
                order: MyCodeWidgetViewConstants.DESC_ORDER
            }],
            gutter: {
                contextMenu: false,
            },
            columns: <any[]>[
                {
                    index: RepoDataIndices.IsGitIndex,
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var cell = $("<div>")
                            .addClass(MyCodeWidgetViewConstants.GRID_CELL_CSS_CLASS)
                            .addClass(MyCodeWidgetViewConstants.ISGIT_CELL_CSS_CLASS);
                        var $icon = $("<div>").addClass(MyCodeWidgetViewConstants.GRID_ROW_ICON_CSS_CLASS);

                        var isGit = this.getRowData(dataIndex)[RepoDataIndices.IsGitIndex];
                        if (isGit) {
                            $icon.addClass(MyCodeWidgetViewConstants.GIT_ICON_CSS_CLASS);
                        } else {
                            $icon.addClass(MyCodeWidgetViewConstants.TFVC_ICON_CSS_CLASS);
                        }
                        
                        cell.append($icon);
                        return cell;
                    }
                },
                {
                    index: RepoDataIndices.TextIndex,
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var rowData = this.getRowData(dataIndex);
                        var text = rowData[RepoDataIndices.TextIndex];
                        var lastAccessed = rowData[RepoDataIndices.LastAccessedIndex];
                        var lastAccessedFriendly = Utils_Date.ago(new Date(lastAccessed));

                        var subtext = lastAccessedFriendly;
                        if (rowData[RepoDataIndices.IsGitIndex]) {
                            subtext = Utils_String.format(MyCodeWidgetViewConstants.SUBTEXT_FORMAT, rowData[RepoDataIndices.Project], subtext);
                        } else {
                            text = Utils_String.format(MyCodeWidgetViewConstants.TEXT_FORMAT, text);
                        }

                        var cell = $("<div>")
                            .addClass(MyCodeWidgetViewConstants.GRID_CELL_CSS_CLASS)
                            .addClass(MyCodeWidgetViewConstants.TEXT_CELL_CSS_CLASS);
                        var $name = $("<div>").text(text).addClass(MyCodeWidgetViewConstants.REPO_NAME_CSS_CLASS);
                        var $subtext = $("<div>").html(subtext).addClass(MyCodeWidgetViewConstants.LAST_ACCESSED_CSS_CLASS);

                        cell.append($name);
                        cell.append($subtext);
                        return cell;
                    }
                },
                {
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var cell = $("<div>")
                            .addClass(MyCodeWidgetViewConstants.GRID_CELL_CSS_CLASS)
                            .addClass(MyCodeWidgetViewConstants.CLOSE_ICON_CELL_CSS_CLASS);
                        var rowData = this.getRowData(dataIndex);

                        var $closeIcon = $("<div>")
                            .addClass(MyCodeWidgetViewConstants.ICON_CSS_CLASS)
                            .addClass(MyCodeWidgetViewConstants.ICON_CLOSE_CSS_CLASS)
                            .addClass(MyCodeWidgetViewConstants.WIDGET_CLOSE_ICON_CSS_CLASS)
                            .mousedown((e) => {
                                if (e.which === 1) {
                                    this._fire(MyCodeWidgetViewConstants.REMOVE_FROM_MRU_EVENT,
                                        {
                                            hashCode: rowData[RepoDataIndices.HashCodeIndex],
                                            url: rowData[RepoDataIndices.Url]
                                        });
                                    e.stopImmediatePropagation();
                                }
                            });
                        cell.append($closeIcon);

                        return cell;
                    }
                }]
        }, options));
    }

    public _onRowMouseDown(e): any {
        
        if (e.which === 1) {


            var target: string;
            var features: string = null;

            if (!e.shiftKey) {
                target = e.ctrlKey ? "_blank" : "_self";
            } else {
                target = "_blank";
                features = Utils_String.format("height = {0}, width = {1}", screen.availHeight, screen.availWidth);
            }

            var rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
            if (rowInfo) {
                
                var rowData = this.getRowData(rowInfo.dataIndex);

                this._fire(MyCodeWidgetViewConstants.CLICK_REPO_EVENT, { rowData: rowData, target: target, features: features });
            }
        }

        if (e.which === 3) {
            super._onRowMouseDown(e);
        }
    }
    
    public _updateRowSelectionStyle(rowInfo, selectedRows, focusIndex) {
        //Leaving this function empty since we don't want any kind of highliting on the grid.
        return;
    }

    public initialize() {
        super.initialize();
    }
}

export class MyCodeWidgetView extends Controls.BaseControl {
    private _tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    private _$titleAnchor: JQuery;
    private _$gridContainer: JQuery;
    private _$noResultsContainer: JQuery;
    private _$noResultsMessage: JQuery;
    private _grid: MyCodeWidgetGrid;
    private _myCodeManager: MyCode_Widget_Api.MyCodeManager;
    private _startLoadTime: number;

    public __test() {
        return {
            tfsContext: this._tfsContext,
            $titleAnchor: this._$titleAnchor,
            $gridContainer: this._$gridContainer,
            $noResultsContainer: this._$noResultsContainer,
            $noResultsMessage: this._$noResultsMessage,
            grid: this._grid,
            myCodeManager: this._myCodeManager
        };
    }

    constructor(options?) {
        super(options);
    }

    public initialize() {
        this._startLoadTime = Date.now();
        super.initialize();
        this._element.addClass(MyCodeWidgetViewConstants.CORE_CSS_CLASS);
        this._myCodeManager = new MyCode_Widget_Api.MyCodeManager(tfsContext);

        this._bind(MyCodeWidgetViewConstants.CLICK_REPO_EVENT, delegate(this, this._onRepoClick));
        this._bind(MyCodeWidgetViewConstants.REMOVE_FROM_MRU_EVENT, delegate(this, this._onRemoveFromMRU));

        this.DisplayContent();
    }

    public DisplayContent() {
        this.getElement().addClass(MyCodeWidgetViewConstants.NEW_WIDGET_NON_DASHBOARD_MODE);
        var that = this;
        this._element.html(HTML_TEMPLATE);
        this._$titleAnchor = this._element.find('.' + MyCodeWidgetViewConstants.TITLE_CSS_CLASS).first();
        this._$titleAnchor.text(Utils_String.format(Resources.MyCodeWidgetTitleFormat));
        this._$gridContainer = this._element.find('.' + MyCodeWidgetViewConstants.GRID_CONTAINER_CSS_CLASS).first();
        this._$noResultsContainer = this._element.find('.' + MyCodeWidgetViewConstants.NO_RESULTS_CONTAINER_CSS_CLASS).first();
        this._$noResultsMessage = this._element.find('.' + MyCodeWidgetViewConstants.NO_RESULTS_MESSAGE_CSS_CLASS).first();
        
        this._grid = <MyCodeWidgetGrid>Controls.BaseControl.createIn(MyCodeWidgetGrid, this._$gridContainer);
        this._grid._rowHeight = MyCodeWidgetViewConstants.GRID_ROW_HEIGHT;

        this.refresh().done(() => {
            var loadTime = `${Date.now() - that._startLoadTime}`;
            MyWorkTelemetry.MyWorkTelemetry.publishTelemetryMyCodeNav(MyWorkTelemetry.TelemetryConstants.WIDGET_INITIALIZATION, { "loadTimeMsec": loadTime });
        }).fail((error: Error) => {
            this._logWidgetLoadFailure(error.message);
        });
        setInterval(() => {
            this.refresh().fail((error: Error) => {
                this._logWidgetLoadFailure(error.message);
            });
        }, MyCodeWidgetViewConstants.REFRESH_INTERVAL);
    }

    public refresh(): JQueryPromise<void> {
        var deferred = $.Deferred<void>();
        var that = this;

        this._myCodeManager.getRecentRepos()
            .then((result: MyCode_Widget_Api.ReposResult) => {
            if (result.repos && result.totalReposCount > 0) {
                var newSource = $.map(result.repos, (val) => {
                    return Utils_String.isGuid(val["Text"]) ? null : val;
                }).slice(0, MyCodeWidgetViewConstants.MAX_ROWS);
                    this._grid.setDataSource(newSource, null, null, null, -1, false);
                    that._updateLayout(true);
                } else {
                    that._updateLayout(false);
                    that._$noResultsMessage.html(Resources.MyCodeWidgetNoResultsEmptyMessage);
            }
            deferred.resolve();
            },
            (error: Error) => {
                deferred.reject(error);
            });
        return deferred.promise();
    }

    private _onRepoClick(e, args) {
        e.preventDefault();
        var reopUrl = `${this._tfsContext.getHostUrl()}${args.rowData.Url}`;
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryMyCodeNav(MyCodeWidgetViewConstants.CLICK_REPO_EVENT, { "repoUrl": reopUrl }, true);

        window.open(reopUrl, args.target, args.features);
    }
    
    private _onRemoveFromMRU(e, args) {
        e.preventDefault();
        var that = this;
        var repoUrl = `${this._tfsContext.getHostUrl() }${args.repoUrl}`;
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryMyCodeNav(MyCodeWidgetViewConstants.REMOVE_FROM_MRU_EVENT, { "repoUrl": repoUrl });

        this._myCodeManager.removeRepoFromMRU(args.hashCode)
            .then((result: boolean) => {
                that.refresh();  
        });
    }

    private _updateLayout(showGrid: boolean) {
        if (showGrid) {
            this._$noResultsContainer.hide();
            this._$gridContainer.show();
        } else {
            this._$noResultsContainer.show();
            this._$gridContainer.hide();
        }
    }

    private _logWidgetLoadFailure(error: string) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryMyCodeNav(MyWorkTelemetry.TelemetryConstants.WIDGET_LOAD_ERROR, { "error": error });
    }
}


Controls.Enhancement.registerEnhancement(MyCodeWidgetView, "." + MyCodeWidgetViewConstants.CORE_CSS_CLASS);

SDK.VSS.register("Microsoft.VisualStudioOnline.MyWork.MyCodeViewWidget", () => MyCodeWidgetView);
SDK.registerContent("Microsoft.VisualStudioOnline.MyWork.MyCodeViewWidget.Initialize", (context) => {
    return Controls.create(MyCodeWidgetView, context.$container, context.options);
});