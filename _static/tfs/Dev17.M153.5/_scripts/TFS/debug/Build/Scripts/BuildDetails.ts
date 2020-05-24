/// <reference types="jquery" />



import ko = require("knockout");

import BuildDetailsViewModel = require("Build/Scripts/Models.BuildDetailsViewModel");
import Context = require("Build/Scripts/Context");
import TimelineRecordViewModel = require("Build/Scripts/Models.TimelineRecordViewModel");
import TimelineViewModel = require("Build/Scripts/Models.TimelineViewModel");

import VSS = require("VSS/VSS");

export class BuildDetailsTab extends Context.BuildTab<any> {
    public static CopyButtonClicked: string = "COPY_BUTTON_CLICKED";

    public currentBuild: KnockoutComputed<BuildDetailsViewModel.BuildDetailsViewModel>;
    public currentTimelineRecord: KnockoutComputed<TimelineRecordViewModel.TimelineRecordViewModel>;
    public currentTimeline: KnockoutComputed<TimelineViewModel.TimelineViewModel>;

    public showCopyButton: KnockoutObservable<boolean> = ko.observable(false);

    constructor(id: string, text: string, templateName: string) {
        super(id, text, templateName);

        this.currentBuild = ko.computed({
            read: () => {
                return Context.buildDetailsContext.currentBuild();
            }
        });
        this._addDisposable(this.currentBuild);

        // selected node
        this.currentTimelineRecord = ko.computed({
            read: () => {
                return Context.buildDetailsContext.currentTimelineRecord();
            }
        });
        this._addDisposable(this.currentTimelineRecord);

        // selected timeline
        this.currentTimeline = ko.computed({
            read: () => {
                return Context.buildDetailsContext.currentTimeline();
            }
        });
        this._addDisposable(this.currentTimeline);
    }

    public dispose(): void {
        super.dispose();
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("BuildDetails", exports);
