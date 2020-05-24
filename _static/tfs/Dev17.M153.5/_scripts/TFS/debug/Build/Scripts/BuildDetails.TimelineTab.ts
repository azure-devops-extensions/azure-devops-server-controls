/// <reference types="jquery" />

import ko = require("knockout");

import BuildDetails = require("Build/Scripts/BuildDetails");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Context = require("Build/Scripts/Context");
import DateUtility = require("Build/Scripts/Utilities/DateUtility");
import TimelineReferenceViewModel = require("Build/Scripts/Models.TimelineReferenceViewModel");

import { BuildActions } from "Build.Common/Scripts/Linking";
import { getTimelineRecordStateIconClass } from "Build.Common/Scripts/TimelineRecord";

import BuildContracts = require("TFS/Build/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

interface GridRow {
    stateIconClass: string;
    name: string;
    duration: string;
    workerName: string;
    startTime: Date;
    finishTime: Date;
}

export class BuildTimelineTab extends BuildDetails.BuildDetailsTab {
    public timelineRecords: KnockoutObservableArray<BuildContracts.TimelineRecord> = ko.observableArray([]);

    private _buildDetailsContext: Context.BuildDetailsContext;
    private _viewContext: Context.ViewContext;
    private _previousBuildId: number = 0;
    private _previousTimelineId: string = "";

    constructor(viewContext: Context.ViewContext, buildDetailsContext: Context.BuildDetailsContext) {
        super(BuildActions.Timeline, BuildResources.BuildDetailTimelineTitle, TimelineControl.TemplateName);

        this._buildDetailsContext = buildDetailsContext;
        this._viewContext = viewContext;

        // display timeline records
        // if a timeline record is selected, this will show its details timeline's records
        // if a timeline is selected, this will show its records
        this.computed(() => {
            var build = this._buildDetailsContext.currentBuild();
            var timeline = this._buildDetailsContext.currentTimeline();
            var timelineRecord = this._buildDetailsContext.currentTimelineRecord();

            if (build && timelineRecord) {
                var detailsTimeline: TimelineReferenceViewModel.TimelineReferenceViewModel = timelineRecord.details();
                if (detailsTimeline) {
                    var buildId: number = build.id.peek();
                    var timelineId: string = detailsTimeline.id.peek();

                    if (buildId != this._previousBuildId || Utils_String.ignoreCaseComparer(timelineId, this._previousTimelineId) !== 0) {
                        this._previousBuildId = buildId;
                        this._previousTimelineId = timelineId;

                        // get the timeline from scratch (changeId = 0) and include all records
                        this._viewContext.buildClient.getTimeline(buildId, timelineId, 0, "")
                            .then((timeline: BuildContracts.Timeline) => {
                                var records = [];
                                if (timeline) {
                                    records = timeline.records || [];
                                }

                                this.timelineRecords(records);
                            });
                    }
                }
                else {
                    this._previousBuildId = 0;
                    this._previousTimelineId = "";

                    this.timelineRecords([]);
                }
            }
            else if (build && timeline) {
                var buildId: number = build.id.peek();
                var timelineId: string = timeline.id.peek();
                if (buildId === timeline.buildId.peek()) {
                    if (buildId != this._previousBuildId || Utils_String.ignoreCaseComparer(timelineId, this._previousTimelineId) !== 0) {
                        this._previousBuildId = buildId;
                        this._previousTimelineId = timelineId;

                        // get the timeline from scratch (changeId = 0) and include all records
                        this._viewContext.buildClient.getTimeline(buildId, timelineId, 0, "")
                            .then((t: BuildContracts.Timeline) => {
                                // display non-root records
                                if (t) {
                                    this.timelineRecords($.grep(t.records, (timelineRecord: BuildContracts.TimelineRecord, index: number) => {
                                        return !!timelineRecord.parentId;
                                    }));

                                    // update the view model to keep everything consistent
                                    timeline.updateRecords(t.records);
                                }
                            });
                    }
                }
            }
            else {
                this._previousBuildId = 0;
                this._previousTimelineId = "";
            }
        });

        this.computed(() => {
            var build = this._buildDetailsContext.currentBuild();
            if (!build || build.definitionType() !== BuildContracts.DefinitionType.Build) {
                this.visible(false);
            }
            else {
                var timelineRecords = this.timelineRecords();
                this.visible(timelineRecords.length > 0);
            }
        });
    }

    public dispose() {
        super.dispose();
    }
}

export class TimelineViewModel extends Adapters_Knockout.TemplateViewModel {
    public context: BuildTimelineTab;

    public timelineRecords: KnockoutObservableArray<BuildContracts.TimelineRecord>;

    constructor(context: BuildTimelineTab) {
        super();

        this.context = context;

        this.timelineRecords = context.timelineRecords;
    }

    public dispose(): void {
        super.dispose();
    }
}

export class TimelineControl extends Adapters_Knockout.TemplateControl<TimelineViewModel> {
    static TemplateName = "buildvnext_details_timeline_tab";

    private _grid: Grids.Grid;
    private _gridColumns: Grids.IGridColumn[];
    private _gridSource: any[];

    private _subscriptions: IDisposable[] = [];
    private _timelineRecords: BuildContracts.TimelineRecord[] = [];

    constructor(viewModel: TimelineViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();
        this._timelineRecords = this.getViewModel().timelineRecords.peek();
        this._grid = <Grids.Grid>Controls.Enhancement.enhance(Grids.Grid, this._element.find(".timeline-grid"), this._getTimelineGridOptions());
        this._updateGridSource(this._timelineRecords);
        this._subscriptions.push(
            this.subscribe(this.getViewModel().timelineRecords, (timelineRecords: BuildContracts.TimelineRecord[]) => {
                this._timelineRecords = timelineRecords;
                if (this.getViewModel().context.isSelected()) {
                    // update if it is already selected
                    this._updateGridSource(this._timelineRecords);
                }
            })
        );

        this._subscriptions.push(
            this.getViewModel().context.isSelected.subscribe((value: boolean) => {
                if (value) {
                    this._updateGridSource(this._timelineRecords);
                }
            })
        );
    }

    private _getTimelineGridOptions(): Grids.IGridOptions {
        // Initial options for the grid. It will be repopulated as different timeline records are selected
        return <Grids.IGridOptions>{
            allowMultiSelect: false,
            autoSort: true,
            source: [],
            columns: this._getTimelineGridColumns()
        };
    }

    private _getTimelineGridColumns(): Grids.IGridColumn[] {
        if (!this._gridColumns) {
            this._gridColumns = <Grids.IGridColumn[]>[
                {
                    index: "stateIconClass",
                    width: 26,
                    canSortBy: false,
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        // "this" is the grid
                        var grid: Grids.Grid = this;
                        var item: GridRow = grid._dataSource[dataIndex];
                        if (item) {
                            return $(domElem("div", "grid-cell"))
                                .attr("role", "gridcell")
                                .width(26)
                                .append($(domElem("span", "icon"))
                                    .addClass(item.stateIconClass));
                        }
                    }
                },
                {
                    index: "name",
                    text: BuildResources.NameLabel,
                    width: 600,
                    canSortBy: true
                },
                {
                    index: "duration",
                    text: BuildResources.DurationLabel,
                    width: 100,
                    canSortBy: true,
                    comparer: (column: Grids.IGridColumn, order: number, rowA: GridRow, rowB: GridRow) => {
                        return orderDurations(rowA.startTime, rowA.finishTime, rowB.startTime, rowB.finishTime);
                    },
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        // "this" is the grid
                        var grid: Grids.Grid = this;
                        var item: GridRow = grid._dataSource[dataIndex];
                        if (item) {
                            return $(domElem("div", "grid-cell"))
                                .attr("role", "gridcell")
                                .width(100)
                                .text(item.duration)
                                .attr("aria-label", Utils_String.format(BuildResources.TimelineGridDurationLabel, item.duration));
                        }
                    }
                },
                {
                    index: "workerName",
                    text: BuildResources.WorkerNameLabel,
                    width: 150,
                    canSortBy: true,
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        // "this" is the grid
                        var grid: Grids.Grid = this;
                        var item: GridRow = grid._dataSource[dataIndex];
                        if (item) {
                            return $(domElem("div", "grid-cell"))
                                .attr("role", "gridcell")
                                .width(150)
                                .text(item.workerName)
                                .attr("aria-label", Utils_String.format(BuildResources.TimelineGridWorkerNameLabel, item.workerName));
                        }
                    }
                }
            ]
        }

        return this._gridColumns;
    }

    private _disposeTimelineSubscription(): void {
        if (this._subscriptions.length > 0) {
            $.each(this._subscriptions, (index, value: IDisposable) => {
                value.dispose();
            });
        }
    }

    dispose(): void {
        this._disposeTimelineSubscription();

        // Dispose grid
        this._grid.dispose();
        this._grid = null;

        super.dispose();
    }

    private _updateGridSource(timelineRecords: BuildContracts.TimelineRecord[]): void {
        this._gridSource = $.map(timelineRecords, (tr: BuildContracts.TimelineRecord) => {
            return {
                stateIconClass: getTimelineRecordStateIconClass(tr.state, tr.result),
                name: tr.name,
                duration: DateUtility.calculateDuration(tr.startTime, tr.finishTime),
                workerName: tr.workerName,
                startTime: tr.startTime,
                finishTime: tr.finishTime
            };
        });

        // Update the grid with new source
        this._grid.setDataSource(
            this._gridSource,
            null,
            this._getTimelineGridColumns(),
            [{ index: "duration", order: "desc" }],
            -1);
    }
}

Adapters_Knockout.TemplateControl.registerBinding("buildvnext_details_timeline_tab", TimelineControl, (context?: any): TimelineViewModel => {
    return new TimelineViewModel(context);
});

/**
 * Compares two durations
 * @param aStart Start of the first range
 * @param aEnd End of the first range
 * @param bStart Start of the second range
 * @param bEnd End of the second range
 */
export function orderDurations(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    if (aStart && aEnd && bStart && bEnd) {
        // both started and finished
        return Utils_Number.defaultComparer(aEnd.valueOf() - aStart.valueOf(), bEnd.valueOf() - bStart.valueOf());
    }
    else if (aStart && aEnd) {
        // a finished, b did not
        // unfinished is considered "faster" than finished. this is so items that take a long time show up on top
        return 1;
    }
    else if (bStart && bEnd) {
        // b finished, a did not
        return -1;
    }
    else {
        // neither finished
        return 0;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("BuildDetails.TimelineTab", exports);
