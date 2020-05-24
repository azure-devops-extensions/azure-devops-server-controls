/// <reference types="jquery" />

import Q = require("q");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildsTab = require("Build/Scripts/Explorer.BuildsTab");
import Context = require("Build/Scripts/Context");
import PivotFilter = require("Build/Scripts/Controls.PivotFilter");

import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");
import {BuildReason} from "Build.Common/Scripts/BuildReason";
import {BuildResult} from "Build.Common/Scripts/BuildResult";
import {BuildStatus} from "Build.Common/Scripts/BuildStatus";
import {IBuildFilter} from "Build.Common/Scripts/ClientContracts";
import Xaml = require("Build.Common/Scripts/Xaml/Xaml.Legacy");

import BuildContracts = require("TFS/Build/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

export class CompletedBuildsTab extends BuildsTab.BuildsTab<PivotFilter.PivotFilter> {
    constructor() {
        super(Context.BuildExplorerActionIds.Completed, BuildResources.CompletedBuildsTitle, "buildvnext_explorer_completed_tab");
    }

    _getDefaultFilter(): IBuildFilter {
        var filter = super._getDefaultFilter();

        // continuation tokens are supported for completed builds, so there's no need to request a large number
        filter.$top = 25;
        filter.statusFilter = BuildContracts.BuildStatus.Completed;

        return filter;
    }
}

export interface CompletedBuildGridRow extends BuildContracts.Build {
    reasonStyles: string[];
    reasonText: string;
    statusName: string;
    statusText: string;
    definitionText: string;
    requestedForText: string;
    isMoreLink: boolean;
    retain: boolean;
    sourceVersionText: string;
    sourceBranchText: string;
    getSourceVersionGridCell(): JQuery;
}

export class CompletedBuildsGrid extends BuildsTab.BuildsGrid {

    constructor(options?: Grids.IGridOptions) {
        super(options);
    }

    _getInitialColumns(): Grids.IGridColumn[] {
        return [
            {
                index: "retain",
                width: BuildsTab.ICON_CELL_WIDTH,
                canSortBy: false,
                fixed: true,
                getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                    return this._createGridIconCell(column, "header", "retain", BuildResources.BuildRetainText);
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var retain = this._dataSource[dataIndex][column.index] === true;
                    return this._createGridIconCell(column, retain ? "restricted-2" : "empty", "", retain ? BuildResources.BuildRetainText : "");
                }
            }, {
                index: "reasonText",
                width: BuildsTab.ICON_CELL_WIDTH,
                canSortBy: true,
                fixed: true,
                getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                    return this._createGridIconCell(column, "header", "reason", BuildResources.BuildReasonText);
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <CompletedBuildGridRow>this._dataSource[dataIndex];
                    return this._createGridIconCell2(column, buildRow.reasonStyles, buildRow.reasonText);
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
                    var buildRow = <CompletedBuildGridRow>this._dataSource[dataIndex];
                    if (!buildRow.isMoreLink) {
                        return this._createGridIconCell(column, buildRow.statusName, "status", buildRow.statusText);
                    }
                }
            }, {
                index: "buildNumber",
                text: BuildResources.CompletedBuildNameColumn,
                width: 360,
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <CompletedBuildGridRow>this._dataSource[dataIndex];
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
                index: "buildQuality",
                text: BuildResources.CompletedBuildQualityColumn,
                width: 150,
                name: "buildQuality",
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <CompletedBuildGridRow>this._dataSource[dataIndex];
                    if (!buildRow.isMoreLink) {
                        return <JQuery>(<any>this)._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                    }
                }
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
                    var buildRow = <CompletedBuildGridRow>this._dataSource[dataIndex];
                    if (buildRow) {
                        gridCell.append(buildRow.getSourceVersionGridCell());
                    }
                    return gridCell;
                }
            }, {
                index: "finishTime",
                text: BuildResources.CompletedBuildDateColumn,
                width: 120,
                comparer: (column, order, buildRow1: CompletedBuildGridRow, buildRow2: CompletedBuildGridRow): number => {
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
                index: "requestedForText",
                text: BuildResources.CompletedBuildRequestedForColumn,
                width: 120
            }];
    }

    _getInitialSortOrder(): Grids.IGridSortOrder[] {
        return [{ index: "finishTime", order: "desc" }];
    }

    _getContextMenuItems(args?: any): Menus.IMenuItemSpec[] {
        var result: Menus.IMenuItemSpec[] = [];
        var tfsContext = Context.viewContext.buildDefinitionManager.tfsContext;
        var build = <CompletedBuildGridRow>args.item;
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

            // retain
            var retainMenuItemText = build.retain ? BuildResources.StopRetainingIndefinitely : BuildResources.RetainIndefinitely;
            result.push({
                rank: 25, id: "retain-selected-build", text: retainMenuItemText, icon: "icon-tfs-build-retain-header",
                action: () => {
                    if (!build.retain || confirm(BuildResources.ConfirmStopRetainingIndefinitely)) {
                        Context.viewContext.buildClient.updateBuildRetainFlag(build.id, !build.retain).then(
                            () => {
                                // update the row
                                build.retain = !build.retain;
                                that.updateRow(rows[0]);
                            }, VSS.handleError);
                    }
                }
            });

            // delete
            result.push({
                rank: 35, id: "delete-selected-build", text: BuildResources.BuildDetailViewDelete, icon: "icon-delete",
                action: () => {
                    if (!build.retain) {
                        if (confirm(Utils_String.format(BuildResources.ConfirmDeleteBuild, build.buildNumber))) {
                            Context.viewContext.buildClient.deleteBuild(build.id).then(
                                () => {
                                    // Refresh the grid
                                    this._fire("refresh");
                                }, VSS.handleError);
                        }
                    }
                    else if (confirm(Utils_String.format(BuildResources.BuildDetailViewConfirmDeleteRetainedBuild, build.buildNumber))) {
                        Context.viewContext.buildClient.updateBuildRetainFlag(build.id, false)
                            .then(() => {
                                Context.viewContext.buildClient.deleteBuild(build.id)
                                    .then(() => {
                                        // Refresh the grid
                                        this._fire("refresh");
                                    });
                            });
                    }
                }
            });
        }
        // multiple-selection context menu
        else {
            var atLeastOneRetainedBuild = false;
            var atLeastOneUnretainedBuild = false;

            rows.some((row) => {
                var rowBuild = <CompletedBuildGridRow>that.getRowData(row);
                if (rowBuild.retain) {
                    atLeastOneRetainedBuild = true;
                }
                else {
                    atLeastOneUnretainedBuild = true;
                }

                // if one of each exists, break out of loop
                if (atLeastOneUnretainedBuild && atLeastOneRetainedBuild) {
                    return false;
                }
            });

            // open builds in new tabs
            result.push({
                rank: 15, id: "open-build", text: BuildResources.OpenInNewTab, icon: "icon-open",
                action: () => {
                    rows.forEach((row) => {
                        var rowBuild = <CompletedBuildGridRow>that.getRowData(row);
                        Context.viewContext.viewBuildInNewTab(rowBuild);
                    });
                }
            });

            // retain
            if (atLeastOneUnretainedBuild) {
                result.push({
                    rank: 25, id: "retain-selected-build", text: BuildResources.RetainIndefinitely, icon: "icon-tfs-build-retain-header",
                    action: () => {
                        var promises: IPromise<any>[] = [];

                        rows.forEach((row) => {
                            var rowBuild = <CompletedBuildGridRow>that.getRowData(row);
                            Context.viewContext.buildClient.updateBuildRetainFlag(rowBuild.id, true).then(() => {
                                // update the row
                                rowBuild.retain = true;
                                that.updateRow(row);
                            }, VSS.handleError);
                        });
                    }
                });
            }

            // stop retaining
            if (atLeastOneRetainedBuild) {
                result.push({
                    rank: 25, id: "retain-selected-build", text: BuildResources.StopRetainingIndefinitely, icon: "icon-tfs-build-retain-header",
                    action: () => {
                        if (confirm(BuildResources.StopRetainingMultipleBuildsConfirmation)) {
                            var promises: IPromise<any>[] = [];

                            rows.forEach((row) => {
                                var rowBuild = <CompletedBuildGridRow>that.getRowData(row);
                                Context.viewContext.buildClient.updateBuildRetainFlag(rowBuild.id, false).then(() => {
                                    // update the row
                                    rowBuild.retain = false;
                                    that.updateRow(row);
                                }, VSS.handleError);
                            });
                        }
                    }
                });
            }

            // delete
            result.push({
                rank: 35, id: "delete-selected-build", text: BuildResources.BuildDetailViewDelete, icon: "icon-delete",
                action: () => {
                    if (confirm(BuildResources.DeleteMultipleBuildsConfirmation)) {
                        var promises: IPromise<any>[] = [];

                        rows.forEach((row) => {
                            var rowBuild = <CompletedBuildGridRow>that.getRowData(row);
                            var promise;

                            if (rowBuild.retain) {
                                promise = Context.viewContext.buildClient.updateBuildRetainFlag(rowBuild.id, false)
                                    .then(() => {
                                        Context.viewContext.buildClient.deleteBuild(rowBuild.id);
                                        this._fire("refresh");
                                    });
                            }
                            else {
                                promise = Context.viewContext.buildClient.deleteBuild(rowBuild.id);
                            }

                            promises.push(promise);
                        });

                        // Wait for all promises to complete
                        return Q.all(promises).then(() => {
                            // Refresh the grid
                            this._fire("refresh");
                        }, VSS.handleError);
                    }
                }
            });
        }

        if (build && build.definition && build.definition.type === BuildContracts.DefinitionType.Xaml) {
            var qualities = Context.viewContext.xamlQualities.peek();
            result.push({
                rank: 30, id: "set-build-quality", text: BuildResources.BuildDetailViewSetBuildQualityTo,
                childItems: Xaml.convertQualitiesToMenuItems(qualities, { build: build })
            });
        }
        return result;
    }

    _updateCommandStates(menu: Menus.PopupMenu, build?: BuildContracts.Build) {
        if (build) {
            // item.isRequest is true for requests displayed in child rows. those are not displayed yet, so...
            var disabled = false; // !item || item.isRequest
            menu.updateCommandStates([
                {
                    id: "open-build",
                    disabled: disabled
                },
                {
                    id: "open-selected-drop-folder",
                    disabled: disabled
                },
                {
                    id: "selected-build-quality",
                    disabled: disabled
                },
                {
                    id: "retain-selected-build",
                    disabled: disabled
                },
                {
                    id: "delete-selected-build",
                    disabled: disabled
                }
            ]);
        }
    }

    _onContextMenuClick(e?: any): any {
        super._onContextMenuClick(e);
        var command = e.get_commandName(),
            commandArgument = e.get_commandArgument();
        switch (command) {
            case "build-quality":
                var build = <CompletedBuildGridRow>commandArgument.build;
                var quality = commandArgument.selectedQuality || "";
                if (build) {
                    if (quality !== (build.quality || "")) {
                        Context.viewContext.buildClient.updateXamlBuildQuality(build.id, quality).then(() => {
                            this._fire("refresh");
                            var message = Utils_String.format(BuildResources.XamlBuildQualityUpdated, build.buildNumber, quality || BuildCommonResources.BuildDetailViewNoQualityAssignedText);
                            Context.viewContext.flashMessage(message);
                        }, VSS.handleError);
                    }
                    else {
                        var message = Utils_String.format(BuildResources.XamlBuildExistingQuality, build.buildNumber, quality || BuildCommonResources.BuildDetailViewNoQualityAssignedText);
                        Context.viewContext.flashMessage(message);
                    }
                }
                break;
        }
    }

    // customized sort to always put the "more builds..." link at the bottom
    public _trySorting(sortOrder: any, sortColumns?: any): any {
        /// <param name="sortOrder" type="any" />
        /// <param name="sortColumns" type="any" optional="true" />
        /// <returns type="any" />

        var that = this;

        function defaultComparer(column, order, rowA, rowB) {
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

        if (!sortColumns) {
            sortColumns = this._getSortColumns(sortOrder);
        }

        this._dataSource.sort(function (rowA, rowB) {
            if (rowA.isMoreLink) {
                return 1;
            }
            else if (rowB.isMoreLink) {
                return -1;
            }

            var i, c, result, column, comparer;
            for (i = 0; i < sortOrder.length; i++) {
                c = sortOrder[i];
                column = sortColumns[i];
                comparer = column.comparer || defaultComparer;
                result = comparer.call(that, column, c.order, rowA, rowB);

                if (result === 0) {
                    continue;
                }
                else if (c.order === "desc") {
                    return -result;
                }
                else {
                    return result;
                }
            }

            return 0;
        });
    }
}

export class CompletedBuildsControl extends BuildsTab.BuildsControl {
    constructor(viewModel: BuildsTab.BuildsViewModel, options?: any) {
        super(viewModel, options);
    }

    _enhanceGrid(): CompletedBuildsGrid {
        var options = {
            getMoreBuilds: () => {
                this.getViewModel().getMoreBuilds();
            }
        };

        return <CompletedBuildsGrid>Controls.Enhancement.enhance(CompletedBuildsGrid, this.getElement().find(".buildvnext-explorer-completed-build-grid"), options);
    }

    _updateGridSource(builds: BuildContracts.Build[]): void {
        // builds will either be all xaml or all new builds, so we only need to look at one to determine type
        let xamlGrid: boolean = false;
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
            let frameworkIdentityPrefix = "vstfs:///framework/generic/";
            let requestedForText: string = build.requestedFor ? build.requestedFor.displayName : (build.requestedBy ? build.requestedBy.displayName : "");
            if (build.requestedFor && build.requestedFor.displayName && build.requestedFor.displayName[0] === '['
                && build.requestedFor.uniqueName && Utils_String.localeIgnoreCaseComparer(frameworkIdentityPrefix, build.requestedFor.uniqueName.substring(0, frameworkIdentityPrefix.length)) === 0) {
                requestedForText = BuildResources.RequestedForExternalUser;
            }

            // xaml builds should include quality
            if (build.definition && build.definition.type === BuildContracts.DefinitionType.Xaml) {
                return <CompletedBuildGridRow>$.extend(build, {
                    retain: build.keepForever,
                    reasonStyles: BuildReason.getStyles(build.reason),
                    reasonText: BuildReason.getName(build.reason, true),
                    statusName: statusName,
                    statusText: statusText,
                    buildQuality: build.quality,
                    definitionText: build.definition ? build.definition.name : "",
                    requestedForText: requestedForText,
                    isMoreLink: !build.id,
                    sourceVersionText: Context.viewContext.sourceProviderManager.getSourceVersionText(build),
                    sourceBranchText: Context.viewContext.sourceProviderManager.getSourceBranch(build),
                    getSourceVersionGridCell: () => { return Context.viewContext.sourceProviderManager.getSourceVersionGridCell(build); }
                });
            }

            // Add extra display properties
            return <CompletedBuildGridRow>$.extend(build, {
                retain: build.keepForever,
                reasonStyles: BuildReason.getStyles(build.reason),
                reasonText: BuildReason.getName(build.reason, true),
                statusName: statusName,
                statusText: statusText,
                definitionText: build.definition ? build.definition.name : "",
                requestedForText: requestedForText,
                isMoreLink: !build.id,
                sourceVersionText: Context.viewContext.sourceProviderManager.getSourceVersionText(build),
                sourceBranchText: Context.viewContext.sourceProviderManager.getSourceBranch(build),
                getSourceVersionGridCell: () => { return Context.viewContext.sourceProviderManager.getSourceVersionGridCell(build); }
            });
        }));
    }
}

Adapters_Knockout.TemplateControl.registerBinding("buildvnext_explorer_completed_tab", CompletedBuildsControl, (context?: any): BuildsTab.BuildsViewModel => {
    return new BuildsTab.BuildsViewModel(context);
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Explorer.CompletedBuildsTab", exports);
