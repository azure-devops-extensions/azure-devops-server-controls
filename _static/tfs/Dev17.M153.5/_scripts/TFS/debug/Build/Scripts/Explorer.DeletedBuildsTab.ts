/// <reference types="jquery" />

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildsTab = require("Build/Scripts/Explorer.BuildsTab");
import Context = require("Build/Scripts/Context");
import PivotFilter = require("Build/Scripts/Controls.PivotFilter");

import {BuildReason} from "Build.Common/Scripts/BuildReason";
import {BuildResult} from "Build.Common/Scripts/BuildResult";
import {BuildStatus} from "Build.Common/Scripts/BuildStatus";
import {IBuildFilter} from "Build.Common/Scripts/ClientContracts";

import BuildContracts = require("TFS/Build/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

export class DeletedBuildsTab extends BuildsTab.BuildsTab<PivotFilter.PivotFilter> {
    constructor() {
        super(Context.BuildExplorerActionIds.Deleted, BuildResources.DeletedBuildsTitle, "buildvnext_explorer_deleted_tab");
    }

    _getDefaultFilter(): IBuildFilter {
        var filter = super._getDefaultFilter();

        // continuation tokens are supported for deleted builds, so there's no need to request a large number
        filter.$top = 25;
        filter.statusFilter = BuildContracts.BuildStatus.Completed;
        filter.deletedFilter = BuildContracts.QueryDeletedOption.OnlyDeleted;

        return filter;
    }

    public hide() {
        this.visible(false);
    }

    public show() {
        this.visible(true);
    }
}

export interface DeletedBuildGridRow extends BuildContracts.Build {
    reasonName: string;
    reasonText: string;
    statusName: string;
    statusText: string;
    definitionText: string;
    requestedForText: string;
    isMoreLink: boolean;
    sourceVersionText: string;
    sourceBranchText: string;
    getSourceVersionGridCell(): JQuery;
    deletedByText: string;
}

export class DeletedBuildsGrid extends BuildsTab.BuildsGrid {
    _getInitialColumns(): Grids.IGridColumn[] {
        return [
            {
                index: "reasonText",
                width: BuildsTab.ICON_CELL_WIDTH,
                canSortBy: true,
                fixed: true,
                getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                    return this._createGridIconCell(column, "header", "reason", BuildResources.BuildReasonText);
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <DeletedBuildGridRow>this._dataSource[dataIndex];
                    return this._createGridIconCell(column, buildRow.reasonName, "reason", buildRow.reasonText);
                }
            }, {
                index: "statusText",
                width: BuildsTab.ICON_CELL_WIDTH,
                canSortBy: true,
                getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                    var cell = $("<span class='icon icon-tfs-build-status-header' />");
                    cell.append($("<div/>").text(BuildResources.BuildStatusText).addClass("title hidden"));
                    return cell;
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <DeletedBuildGridRow>this._dataSource[dataIndex];
                    if (!buildRow.isMoreLink) {
                        return this._createGridIconCell(column, buildRow.statusName, "status", buildRow.statusText);
                    }
                }
            }, {
                index: "buildNumber",
                text: BuildResources.CompletedBuildNameColumn,
                width: 360,
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <DeletedBuildGridRow>this._dataSource[dataIndex];
                    if (!buildRow.isMoreLink) {
                        return <JQuery>(<any>this)._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                    }
                    else {
                        return this._createGridCell(column)
                            .append($(domElem("a"))
                                .text(BuildResources.MoreBuildsLinkText)
                                .on("click", () => {
                                    this._options.getMoreBuilds();
                                }));
                    }
                }
            }, {
                index: "definitionText",
                text: BuildResources.CompletedBuildDefinitionColumn,
                width: 180
            }, {
                index: "sourceBranchText",
                text: BuildResources.CompletedBuildSourceBranchColumn,
                width: 180
            }, {
                index: "sourceVersionText",
                text: BuildResources.CompletedBuildSourceVersionColumn,
                width: 120,
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var gridCell = this._createGridCell(column);
                    var buildRow = <DeletedBuildGridRow>this._dataSource[dataIndex];
                    if (buildRow) {
                        gridCell.append(buildRow.getSourceVersionGridCell());
                    }
                    return gridCell;
                }
            }, {
                index: "finishTime",
                text: BuildResources.CompletedBuildDateColumn,
                width: 120,
                comparer: (column, order, buildRow1: DeletedBuildGridRow, buildRow2: DeletedBuildGridRow): number => {
                    if (buildRow1.finishTime instanceof Date && buildRow2.finishTime instanceof Date) {
                        return buildRow1.finishTime.getTime() - buildRow2.finishTime.getTime();
                    }

                    return 0;
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var finishTime = this._dataSource[dataIndex][column.index];
                    if (finishTime instanceof Date) {
                        return this._createGridDateCell(column, finishTime);
                    }
                    else {
                        // There might be cases where the finish time of a completed build might be empty.
                        // Displaying empty cell in this case.
                        return this._createGridCell(column);
                    }
                }
            }, {
                index: "deletedDate",
                text: BuildResources.DeletedBuildDateColumn,
                width: 120,
                comparer: (column, order, buildRow1: DeletedBuildGridRow, buildRow2: DeletedBuildGridRow): number => {
                    if (buildRow1.deletedDate instanceof Date && buildRow2.deletedDate instanceof Date) {
                        return buildRow1.deletedDate.getTime() - buildRow2.deletedDate.getTime();
                    }

                    return 0;
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var deletedTime = this._dataSource[dataIndex][column.index];
                    if (deletedTime instanceof Date) {
                        return this._createGridDateCell(column, deletedTime);
                    }
                    else {
                        // There might be cases where the finish time of a completed build might be empty.
                        // Displaying empty cell in this case.
                        return this._createGridCell(column);
                    }
                }
            }, {
                index: "requestedForText",
                text: BuildResources.CompletedBuildRequestedForColumn,
                width: 120
            }, {
                index: "deletedByText",
                text: BuildResources.DeletedBuildDeletedByColumn,
                width: 120
            }];
    }

    _getContextMenuItems(args?: any): Menus.IMenuItemSpec[] {
        var result: Menus.IMenuItemSpec[] = [];
        var tfsContext = Context.viewContext.buildDefinitionManager.tfsContext;
        var build = <DeletedBuildGridRow>args.item;
        var rows: number[] = this.getSelectedDataIndices();
        var that = this;

        if (build.isMoreLink) {
            return;
        }

        // single selection context menu
        if (rows.length == 1) {
            // open build
            result.push({
                rank: 5, id: "open-build", text: BuildResources.Open, icon: "icon-open",
                action: () => {
                    Context.viewContext.viewBuild(build);
                }
            });

            // open build in new tab
            result.push({
                rank: 15, id: "open-build", text: BuildResources.OpenInNewTab, icon: "icon-open",
                action: () => {
                    Context.viewContext.viewBuildInNewTab(build);
                }
            });
        }
        // multiple-selection context menu
        else {
            // open builds in new tabs
            result.push({
                rank: 15, id: "open-build", text: BuildResources.OpenInNewTab, icon: "icon-open",
                action: () => {
                    rows.forEach((row) => {
                        var rowBuild = <DeletedBuildGridRow>that.getRowData(row);
                        Context.viewContext.viewBuildInNewTab(rowBuild);
                    });
                }
            });
        }

        return result;
    }
}

export class DeletedBuildsControl extends BuildsTab.BuildsControl {
    constructor(viewModel: BuildsTab.BuildsViewModel, options?: any) {
        super(viewModel, options);
    }

    _enhanceGrid(): DeletedBuildsGrid {
        var options = {
            getMoreBuilds: () => {
                this.getViewModel().getMoreBuilds();
            }
        };

        return <DeletedBuildsGrid>Controls.Enhancement.enhance(DeletedBuildsGrid, this.getElement().find(".buildvnext-explorer-deleted-build-grid"), options);
    }

    _updateGridSource(builds: BuildContracts.Build[]): void {
        // builds will either be all xaml or all new builds, so we only need to look at one to determine type
        var xamlGrid: boolean = false;
        if (builds.length > 0 && builds[0].definition) {
            xamlGrid = builds[0].definition.type === BuildContracts.DefinitionType.Xaml;
        }

        // hide the build quality column for empty grids and new build grids
        this._grid.setColumnOptions("buildQuality", { hidden: !xamlGrid });
        this._grid.layout();

        super._updateGridSource($.map(builds, (build: BuildContracts.Build) => {
            var statusName = "",
                statusText = "";

            // Extract status name and text
            switch (build.status) {
                case BuildContracts.BuildStatus.Completed:
                    statusName = BuildResult.getName(build.result);
                    statusText = BuildResult.getName(build.result, true);
                    break;
                case BuildContracts.BuildStatus.InProgress:
                    statusName = "inprogress";
                    statusText = BuildStatus.getName(build.status, true);
                    break;
                default:
                    statusName = "queued";
                    statusText = BuildStatus.getName(build.status, true);
                    break;
            }

            // TODO (scdallam): this is a temporary hack to display "<external user>" for builds that are requested for "[DefaultCollection]\Project Service Accounts"
            // this is for CI builds generated against definitions with github repositories where the pusher's email is not known to TFS
            // when we figure out how to store the pusher's email along with the build, display that instead
            var frameworkIdentityPrefix = "vstfs:///framework/generic/";
            var requestedForText: string = build.requestedFor ? build.requestedFor.displayName : (build.requestedBy ? build.requestedBy.displayName : "");
            if (build.requestedFor && build.requestedFor.displayName && build.requestedFor.displayName[0] === '['
                && build.requestedFor.uniqueName && Utils_String.localeIgnoreCaseComparer(frameworkIdentityPrefix, build.requestedFor.uniqueName.substring(0, frameworkIdentityPrefix.length)) === 0) {
                requestedForText = BuildResources.RequestedForExternalUser;
            }

            // xaml builds should include quality
            if (build.definition && build.definition.type === BuildContracts.DefinitionType.Xaml) {
                return <DeletedBuildGridRow>$.extend(build, {
                    retain: build.keepForever,
                    reasonName: BuildReason.getName(build.reason),
                    reasonText: BuildReason.getName(build.reason, true),
                    statusName: statusName,
                    statusText: statusText,
                    buildQuality: build.quality,
                    definitionText: build.definition ? build.definition.name : "",
                    requestedForText: requestedForText,
                    isMoreLink: !build.id,
                    sourceVersionText: Context.viewContext.sourceProviderManager.getSourceVersionText(build),
                    sourceBranchText: Context.viewContext.sourceProviderManager.getSourceBranch(build),
                    getSourceVersionGridCell: () => { return Context.viewContext.sourceProviderManager.getSourceVersionGridCell(build); },
                    deletedByText: build.lastChangedBy.displayName
                });
            }

            // Add extra display properties
            return <DeletedBuildGridRow>$.extend(build, {
                reasonName: BuildReason.getName(build.reason),
                reasonText: BuildReason.getName(build.reason, true),
                statusName: statusName,
                statusText: statusText,
                definitionText: build.definition ? build.definition.name : "",
                requestedForText: requestedForText,
                isMoreLink: !build.id,
                sourceVersionText: Context.viewContext.sourceProviderManager.getSourceVersionText(build),
                sourceBranchText: Context.viewContext.sourceProviderManager.getSourceBranch(build),
                getSourceVersionGridCell: () => { return Context.viewContext.sourceProviderManager.getSourceVersionGridCell(build); },
                deletedByText: build.deletedBy ? build.deletedBy.displayName : ""
            });
        }));
    }
}

Adapters_Knockout.TemplateControl.registerBinding("buildvnext_explorer_deleted_tab", DeletedBuildsControl, (context?: any): BuildsTab.BuildsViewModel => {
    return new BuildsTab.BuildsViewModel(context);
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Explorer.DeletedBuildsTab", exports);
