/// <reference types="jquery" />

import Q = require("q");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildsTab = require("Build/Scripts/Explorer.BuildsTab");
import Context = require("Build/Scripts/Context");
import PivotFilter = require("Build/Scripts/Controls.PivotFilter");

import {BuildReason} from "Build.Common/Scripts/BuildReason";
import {BuildStatus} from "Build.Common/Scripts/BuildStatus";
import {IBuildFilter} from "Build.Common/Scripts/ClientContracts";
import {QueuePriority} from "Build.Common/Scripts/QueuePriority";

import BuildContracts = require("TFS/Build/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export class QueuedBuildsTab extends BuildsTab.BuildsTab<PivotFilter.PivotFilter> {
    constructor() {
        super(Context.BuildExplorerActionIds.Queued, BuildResources.QueuedBuildsTitle, "buildvnext_explorer_queued_tab");
    }

    _getDefaultFilter(): IBuildFilter {
        var filter = super._getDefaultFilter();

        // continuation tokens aren't supported for queued builds, so get a lot of them
        filter.$top = 1000;
        filter.statusFilter = BuildContracts.BuildStatus.InProgress | BuildContracts.BuildStatus.NotStarted | BuildContracts.BuildStatus.Postponed;

        return filter;
    }
}

export interface QueuedBuildGridRow extends BuildContracts.Build {
    /**
     * Build number (for vnext and xaml builds) or request id (for xaml build requests)
     */
    buildName: string;
    reasonStyles: string[];
    reasonText: string;
    statusName: string;
    statusText: string;
    definitionText: string;
    requestedForText: string;
    priorityText: string;
    queueText: string;
    sourceVersionText: string;
    getSourceVersionGridCell(): JQuery;
}

export class QueuedBuildsGrid extends BuildsTab.BuildsGrid {

    constructor(options?: Grids.IGridOptions) {
        super(options);
    }

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
                    var buildRow = <QueuedBuildGridRow>this._dataSource[dataIndex];
                    return this._createGridIconCell2(column, buildRow.reasonStyles, buildRow.reasonText);
                }
            }, {
                index: "status",
                width: BuildsTab.ICON_CELL_WIDTH,
                canSortBy: true,
                getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                    var cell = $("<span class='icon icon-tfs-build-status-header' />");
                    cell.append($("<div/>").text(BuildResources.BuildStatusText).addClass("title hidden"));
                    return cell;
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <QueuedBuildGridRow>this._dataSource[dataIndex];
                    return this._createGridIconCell(column, buildRow.statusName, "status", buildRow.statusText);
                }
            }, {
                index: "buildName",
                text: BuildResources.QueuedBuildNameColumn,
                width: 180
            }, {
                index: "definitionText",
                text: BuildResources.QueuedBuildDefinitionColumn,
                width: 120
            }, {
                index: "sourceVersionText",
                text: BuildResources.QueuedBuildSourceVersionColumn,
                width: 160,
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var gridCell = this._createGridCell(column);
                    var buildRow = <QueuedBuildGridRow>this._dataSource[dataIndex];
                    if (buildRow) {
                        gridCell.append(buildRow.getSourceVersionGridCell());
                    }
                    return gridCell;
                }
            }, {
                index: "priorityText",
                text: BuildResources.QueuedBuildPriorityColumn,
                width: 120,
                comparer: function (column, order, buildRow1: QueuedBuildGridRow, buildRow2: QueuedBuildGridRow) {
                    return buildRow1.priority - buildRow2.priority;
                }
            }, {
                index: "queueTime",
                text: BuildResources.QueuedBuildQueuedColumn,
                width: 120,
                comparer: (column, order, buildRow1: QueuedBuildGridRow, buildRow2: QueuedBuildGridRow): number => {
                    if (buildRow1.queueTime instanceof Date && buildRow2.queueTime instanceof Date) {
                        return buildRow1.queueTime.getTime() - buildRow2.queueTime.getTime();
                    }

                    return 0;
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var queueTime = this._dataSource[dataIndex][column.index];
                    if (queueTime instanceof Date) {
                        return this._createGridDateCell(column, queueTime);
                    }
                    else {
                        // There might be cases where the finish time of a completed build might be empty.
                        // Displaying empty cell in this case.
                        return this._createGridCell(column);
                    }
                }
            }, {
                index: "requestedForText",
                text: BuildResources.QueuedBuildForColumn,
                width: 120
            }, {
                index: "queueText",
                text: BuildResources.QueuedBuildQueueColumn,
                width: 240
            }];
    }

    _getInitialSortOrder(): Grids.IGridSortOrder[] {
        return [
            { index: "status", order: "asc" },
            { index: "priorityText", order: "asc" },
            { index: "queueTime", order: "asc" }
        ];
    }

    _getContextMenuItems(args?: any): Menus.IMenuItemSpec[] {
        var result: Menus.IMenuItemSpec[] = [];
        var tfsContext = Context.viewContext.buildDefinitionManager.tfsContext;
        var build = <QueuedBuildGridRow>args.item;
        var rows: number[] = this.getSelectedDataIndices();
        var that = this;

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
            // cancel
            result.push({
                rank: 35, id: "cancel-selected-build", text: BuildResources.CancelBuild, icon: "icon-tfs-build-status-stopped",
                action: () => {
                    // "Cancel {buildNumber}?" or "Cancel the selected build?"
                    var message = build.buildNumber ? Utils_String.format(BuildResources.ConfirmCancelBuild, build.buildNumber) : BuildResources.ConfirmCancelSelectedBuild;
                    if (confirm(message)) {
                        Context.viewContext.buildClient.cancelBuild(build.id)
                            .then(() => {
                                // Refresh the grid
                                this._fire("refresh");
                            }, VSS.handleError);
                    }
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
                        var rowBuild = <QueuedBuildGridRow>that.getRowData(row);
                        Context.viewContext.viewBuildInNewTab(rowBuild);
                    });
                }
            });

            // cancel
            result.push({
                rank: 35, id: "cancel-selected-build", text: BuildResources.CancelBuild, icon: "icon-tfs-build-status-stopped",
                action: () => {
                    if (confirm(BuildResources.CancelMultipleBuildsConfirmation)) {
                        var promises: IPromise<any>[] = [];

                        rows.forEach((row) => {
                            var rowBuild = <QueuedBuildGridRow>that.getRowData(row);
                            var promise = Context.viewContext.buildClient.cancelBuild(rowBuild.id);
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

        return result;
    }

    _updateCommandStates(menu: Menus.PopupMenu, build?: BuildContracts.Build) {
        if (build) {
            menu.updateCommandStates(<Menus.ICommand[]>[
                {
                    id: "cancel-selected-build",
                    disabled: !build || (<any>build).cancelling || !(build.status === BuildContracts.BuildStatus.NotStarted || build.status === BuildContracts.BuildStatus.Postponed)
                },
                {
                    id: "stop-selected-build",
                    disabled: !build || (<any>build).stopping || build.status !== BuildContracts.BuildStatus.InProgress
                },
                {
                    id: "postpone-selected-build",
                    disabled: !build || (<any>build).postponing || build.status !== BuildContracts.BuildStatus.NotStarted
                },
                {
                    id: "resume-selected-build",
                    disabled: !build || (<any>build).resuming || build.status !== BuildContracts.BuildStatus.Postponed
                }
            ]);
        }
    }
}

export class QueuedBuildsControl extends BuildsTab.BuildsControl {
    constructor(viewModel: BuildsTab.BuildsViewModel, options?: any) {
        super(viewModel, options);
    }

    _enhanceGrid(): QueuedBuildsGrid {
        return <QueuedBuildsGrid>Controls.Enhancement.enhance(QueuedBuildsGrid, this.getElement().find(".buildvnext-explorer-queued-build-grid"));
    }

    _updateGridSource(builds: BuildContracts.Build[]): void {
        super._updateGridSource($.map(builds, (build: BuildContracts.Build) => {

            // TODO (scdallam): this is a temporary hack to display "<external user>" for builds that are requested for "[DefaultCollection]\Project Service Accounts"
            // this is for CI builds generated against definitions with github repositories where the pusher's email is not known to TFS
            // when we figure out how to store the pusher's email along with the build, display that instead
            var frameworkIdentityPrefix = "vstfs:///framework/generic/";
            var requestedForText: string = build.requestedFor ? build.requestedFor.displayName : (build.requestedBy ? build.requestedBy.displayName : "");
            if (build.requestedFor && build.requestedFor.displayName && build.requestedFor.displayName[0] === '['
                && build.requestedFor.uniqueName && Utils_String.localeIgnoreCaseComparer(frameworkIdentityPrefix, build.requestedFor.uniqueName.substring(0, frameworkIdentityPrefix.length)) === 0) {
                requestedForText = BuildResources.RequestedForExternalUser;
            }

            // Add extra display properties
            return <QueuedBuildGridRow>$.extend(build, {
                buildName: build.buildNumber || build.id,
                reasonStyles: BuildReason.getStyles(build.reason),
                reasonText: BuildReason.getName(build.reason, true),
                statusName: BuildStatus.getName(build.status),
                statusText: BuildStatus.getName(build.status, true),
                definitionText: build.definition ? build.definition.name : "",
                requestedForText: requestedForText,
                priorityText: QueuePriority.getName(build.priority, true),
                queueText: build.queue ? build.queue.name : (build.controller ? build.controller.name : ""),
                sourceVersionText: Context.viewContext.sourceProviderManager.getSourceVersionText(build),
                getSourceVersionGridCell: () => { return Context.viewContext.sourceProviderManager.getSourceVersionGridCell(build); }
            });
        }));
    }
}

Adapters_Knockout.TemplateControl.registerBinding("buildvnext_explorer_queued_tab", QueuedBuildsControl, (context?: any): BuildsTab.BuildsViewModel => {
    return new BuildsTab.BuildsViewModel(context);
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Explorer.QueuedBuildsTab", exports);
