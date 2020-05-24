

import ko = require("knockout");

import TimelineRecordViewModel = require("Build/Scripts/Models.TimelineRecordViewModel");
import TimelineReferenceViewModel = require("Build/Scripts/Models.TimelineReferenceViewModel");

import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import BuildContracts = require("TFS/Build/Contracts");

/**
 * Viewmodel for a timeline
 */
export class TimelineViewModel extends TimelineReferenceViewModel.TimelineReferenceViewModel {
    private _timeline: BuildContracts.Timeline;
    private _recordModelMap: { [id: number]: TimelineRecordViewModel.TimelineRecordViewModel } = {};

    /**
     * Identity that last changed the timeline
     */
    public lastChangedBy: KnockoutObservable<string> = ko.observable("");

    /**
     * Date of the last change
     */
    public lastChangedOn: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The timeline records
     */
    public records: KnockoutObservableArray<TimelineRecordViewModel.TimelineRecordViewModel> = ko.observableArray(<TimelineRecordViewModel.TimelineRecordViewModel[]>[]);

    /**
     * An observable that gets triggered every there's an update/initialization so that consumer can redraw tree nodes
     */
    public updateRecordNodes: KnockoutObservable<boolean> = ko.observable(false);

    constructor(buildId: number, planId: string, timeline: BuildContracts.Timeline) {
        super(buildId, planId, timeline);

        this.records.subscribe((newValue: TimelineRecordViewModel.TimelineRecordViewModel[]) => {
            this._recordModelMap = {};

            newValue.forEach((recordModel: TimelineRecordViewModel.TimelineRecordViewModel, index: number) => {
                this._indexRecords(recordModel);
            });
        });

        this.records.subscribeArrayChanged(
            (addedItem: TimelineRecordViewModel.TimelineRecordViewModel) => {
                this._indexRecords(addedItem);
            },
            (removedItem: TimelineRecordViewModel.TimelineRecordViewModel) => {
                this._unindexRecords(removedItem);
            });

        this.update(timeline);
    }

    private _indexRecords(recordModel: TimelineRecordViewModel.TimelineRecordViewModel) {
        this._recordModelMap[recordModel.id()] = recordModel;
        $.each(recordModel.nodes(), (index: number, child: TimelineRecordViewModel.TimelineRecordViewModel) => {
            this._indexRecords(child);
        });
    }

    private _unindexRecords(recordModel: TimelineRecordViewModel.TimelineRecordViewModel) {
        delete this._recordModelMap[recordModel.id()];
        $.each(recordModel.nodes(), (index: number, child: TimelineRecordViewModel.TimelineRecordViewModel) => {
            this._unindexRecords(child);
        });
    }

    /**
     * Returns the viewmodel for the specified timeline record
     * @param timelineRecordId The timeline record id
     */
    public findTimelineRecord(timelineRecordId: string): TimelineRecordViewModel.TimelineRecordViewModel {
        return this._recordModelMap[timelineRecordId];
    }

    /**
     * Updates the model from a data contract
     * @param timeline The data contract
     */
    public update(timeline: BuildContracts.Timeline) {
        super.update(timeline);
        this._timeline = timeline;

        if (!!timeline) {
            if (!!this.lastChangedBy) {
                this.lastChangedBy(timeline.lastChangedBy);
            }

            if (!!this.lastChangedOn) {
                this.lastChangedOn(timeline.lastChangedOn);
            }

            this.updateRecords(timeline.records);
        }
    }

    /**
     * Updates the timeline records
     * @param records The new list of records
     */
    public updateRecords(records: BuildContracts.TimelineRecord[]) {
        if (!!this.records && this.records() && $.isArray(records)) {

            if (this.records().length === 0) {
                // new
                this._initializeRecords(records);
            }
            else {
                // update
                this._updateRecords(records);
            }

            this.updateRecordNodes.valueHasMutated();
        }
    }

    public getTimeline(): BuildContracts.Timeline {
        return this._timeline;
    }

    private _updateRecords(records: BuildContracts.TimelineRecord[]) {
        const newRecords: TimelineRecordViewModel.TimelineRecordViewModel[] = [];
        const parentsToSort: { [id: string]: boolean; } = {};

        const buildId = this.buildId.peek();
        const planId = this.planId.peek();

        records.forEach((record: BuildContracts.TimelineRecord, index: number) => {
            // create or update viewmodel
            let viewModel: TimelineRecordViewModel.TimelineRecordViewModel = this._recordModelMap[record.id];
            if (!!viewModel) {
                const startTime = viewModel.startTime.peek();
                const state = viewModel.state.peek();
                const parentId = viewModel.parentId.peek();

                // if state or start time changes, re-sort the nodes
                if (startTime !== record.startTime || state !== record.state) {
                    if (!!parentId) {
                        parentsToSort[parentId] = true;
                    }

                }
                viewModel.update(record);
            }
            else {
                viewModel = new TimelineRecordViewModel.TimelineRecordViewModel(buildId, planId, record);
                this._recordModelMap[record.id] = viewModel;
                newRecords.push(viewModel);

                const parentId = viewModel.parentId.peek();

                if (!!parentId) {
                    parentsToSort[parentId] = true;
                }
            }
        });

        // place new records under the appropriate parent
        let unparented: TimelineRecordViewModel.TimelineRecordViewModel[] = [];
        newRecords.forEach((viewModel: TimelineRecordViewModel.TimelineRecordViewModel, index: number) => {
            var parent: TimelineRecordViewModel.TimelineRecordViewModel = null;
            var parentId = viewModel.parentId.peek();

            if (!!parentId) {
                parent = this._recordModelMap[parentId];
            }

            if (!!parent) {
                viewModel.cssClass(viewModel.cssClass.peek() + " child-node");
                parent.nodes.push(viewModel);
            }
            else {
                unparented.push(viewModel);
            }
        });

        unparented.forEach((record) => {
            this.records.push(record);
        });

        // sort parent nodes
        $.each(parentsToSort, (parentId: string, value: boolean) => {
            if (parentsToSort.hasOwnProperty(parentId) && value) {
                var parent: TimelineRecordViewModel.TimelineRecordViewModel = this._recordModelMap[parentId];

                if (!!parent) {
                    var nodes: TimelineRecordViewModel.TimelineRecordViewModel[] = <TimelineRecordViewModel.TimelineRecordViewModel[]>parent.nodes.peek();
                    nodes.sort(TimelineRecordViewModel.orderTimelineRecords);
                    parent.nodes(nodes);
                }
            }
        });

        if (this._timeline) {
            this._timeline.records = records;
        }
    }

    private _initializeRecords(records: BuildContracts.TimelineRecord[]) {
        // the new/updated viewmodels
        var newArray: TimelineRecordViewModel.TimelineRecordViewModel[] = [];

        // map records to parents
        var parentIdMap: { [parentId: string]: TimelineRecordViewModel.TimelineRecordViewModel[] } = {};
        var roots: TimelineRecordViewModel.TimelineRecordViewModel[] = [];

        var buildId = this.buildId.peek();
        var planId = this.planId.peek();

        // create a viewmodel for each record, and group the models by parent id
        $.each(records, (index: number, record: BuildContracts.TimelineRecord) => {
            var model: TimelineRecordViewModel.TimelineRecordViewModel = new TimelineRecordViewModel.TimelineRecordViewModel(buildId, planId, record);
            newArray.push(model);

            var parentId: string = model.parentId.peek();
            if (!!parentId) {
                // not a root
                var children: TimelineRecordViewModel.TimelineRecordViewModel[] = parentIdMap[parentId];
                if (!children) {
                    children = [];
                    parentIdMap[parentId] = children;
                }

                model.cssClass(model.cssClass.peek() + " child-node");
                children.push(model);
            }
            else {
                // root
                roots.push(model);
            }
        });

        // set children for each viewmodel
        $.each(newArray, (index: number, timelineRecord: TimelineRecordViewModel.TimelineRecordViewModel) => {
            var childNodes: TimelineRecordViewModel.TimelineRecordViewModel[] = parentIdMap[timelineRecord.id.peek()] || [];

            timelineRecord.nodes(childNodes.sort(TimelineRecordViewModel.orderTimelineRecords));
        });

        // update records
        this.records(roots.sort(TimelineRecordViewModel.orderTimelineRecords));

        if (this._timeline) {
            this._timeline.records = records;
        }
    }
}
