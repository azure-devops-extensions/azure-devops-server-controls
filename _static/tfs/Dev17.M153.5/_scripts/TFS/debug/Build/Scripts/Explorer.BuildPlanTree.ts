/// <reference types="jquery" />



import ko = require("knockout");

import BuildDetailsViewModel = require("Build/Scripts/Models.BuildDetailsViewModel");
import Context = require("Build/Scripts/Context");
import TimelineRecordViewModel = require("Build/Scripts/Models.TimelineRecordViewModel");
import TimelineViewModel = require("Build/Scripts/Models.TimelineViewModel");

import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");
import KoTree = require("DistributedTasksCommon/TFS.Knockout.Tree");

import BuildCommon = require("TFS/Build/Contracts");

import VSS = require("VSS/VSS");

interface ITimelineRecordMap {
    [id: number]: BuildCommon.TimelineRecord;
}

interface ITimelineRecordViewModelMap {
    [id: string]: TimelineRecordViewModel.TimelineRecordViewModel;
}

export class BuildPlanNodesTreeTab extends KnockoutPivot.BasicPivotTab {
    private _recordMap: ITimelineRecordMap = {};
    private _timelineRecordModelMap: ITimelineRecordViewModelMap = {};
    private _recordsChangedSubscription: KnockoutSubscription<TimelineRecordViewModel.TimelineRecordViewModel[]>;

    public buildTitleClicked: KnockoutObservable<any> = ko.observable(null);

    /**
     * The tree containing the nodes in the plan
     */
    public nodesTree: KnockoutObservable<KoTree.TreeViewModel> = ko.observable(null);

    /**
     * The selected timeline record
     */
    public selectedTimelineRecord: KnockoutObservable<TimelineRecordViewModel.TimelineRecordViewModel>;

    /**
     * The selected timeline
     */
    public currentTimeline: KnockoutObservable<TimelineViewModel.TimelineViewModel>;

    /**
     * The current build number
     */
    public buildNumber: KnockoutComputed<string>;

    /**
     * Status for the whole icon
     */
    public statusIconClass: KnockoutComputed<string>;

    constructor() {
        super("nodes", "Timeline", "buildvnext_plan_nodes_tab");

        this.currentTimeline = Context.buildDetailsContext.currentTimeline;
        this.selectedTimelineRecord = Context.buildDetailsContext.currentTimelineRecord;

        this.statusIconClass = ko.computed(() => {
            // use the current build
            var build: BuildDetailsViewModel.BuildDetailsViewModel = Context.buildDetailsContext.currentBuild();
            if (!!build) {
                return build.statusIconClass();
            }
        });

        this.isVisible = ko.computed({
            read: () => {
                return true;
            }
        });

        this.disposableManager.addDisposable(Context.buildDetailsContext.currentBuild.subscribe((build: BuildDetailsViewModel.BuildDetailsViewModel) => {
            if (!!build) {
                this.text(build.buildNumber());
            }
        }));

        this.disposableManager.addDisposable(this.currentTimeline.subscribe((oldValue: TimelineViewModel.TimelineViewModel) => {
            if (this._recordsChangedSubscription) {
                // Make sure we unsubscribe from our previous subscription so we don't leak resources
                this._recordsChangedSubscription.dispose();
                this._recordsChangedSubscription = null;
            }
        }, this, "beforeChange"));

        this.disposableManager.addDisposable(ko.computed(() => {
            let timeLine = this.currentTimeline();
            if (timeLine) {
                // react to any kind of record updates
                timeLine.updateRecordNodes();

                let records = timeLine.records.peek();
                let nodesTree = this.nodesTree();
                if (!nodesTree) {
                    // create new vm, which will handle sorting as well
                    this.updateNodesTree(records);
                }
                else {
                    // update existing records/nodes after sorting
                    nodesTree.nodes(records.sort(TimelineRecordViewModel.orderTimelineRecords));
                }
            }
        }));

        this.buildNumber = ko.computed(() => {
            var build: BuildDetailsViewModel.BuildDetailsViewModel = Context.buildDetailsContext.currentBuild();
            if (!!build) {
                return build.buildNumber();
            }
        });
    }

    /**
     * Refresh the tree with a new list of timeline records
     * @param timelineRecords The timeline records
     */
    public updateNodesTree(timelineRecords: TimelineRecordViewModel.TimelineRecordViewModel[]) {
        var nodesTreeViewModel: KoTree.TreeViewModel = new KoTree.TreeViewModel(timelineRecords, TimelineRecordViewModel.orderTimelineRecords);

        nodesTreeViewModel.onClick.subscribe((args: KoTree.TreeNodeEventArgs) => {
            var node: TimelineRecordViewModel.TimelineRecordViewModel = <TimelineRecordViewModel.TimelineRecordViewModel>args.node;

            this.selectedTimelineRecord(node);
        });

        this.nodesTree(nodesTreeViewModel);
    }

    /**
     * Unselects all nodes
     */
    public clearSelection() {
        this.selectNode(null);
    }

    /**
     * Selects a node in the tree
     * @param node The node to select
     */
    public selectNode(node: KoTree.ITreeNode) {
        var nodesTree = this.nodesTree();
        if (nodesTree) {
            this.nodesTree().selectedNode(node);
        }
    }

    /**
     * Called when the build title is clicked
     */
    public onBuildTitleClicked() {
        this.buildTitleClicked({});
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Explorer.BuildPlanTree", exports);
