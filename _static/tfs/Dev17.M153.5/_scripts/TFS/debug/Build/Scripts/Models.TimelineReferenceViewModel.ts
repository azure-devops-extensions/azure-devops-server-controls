

import ko = require("knockout");

import BuildContracts = require("TFS/Build/Contracts");

/**
 * Viewmodel for a timeline reference
 */
export class TimelineReferenceViewModel {
    private _timelineReference: BuildContracts.TimelineReference;
    private _previousChangeId: number = 0;

    /**
     * The build id
     */
    public buildId: KnockoutObservable<number> = ko.observable(0);

    /**
     * The plan id
     */
    public planId: KnockoutObservable<string> = ko.observable("");

    /**
     * The timeline id
     */
    public id: KnockoutObservable<string> = ko.observable("");

    /**
     * The current change id
     */
    public changeId: KnockoutObservable<number> = ko.observable(0);

    /**
     * The previous change id
     */
    public previousChangeId: KnockoutObservable<number> = ko.observable(0);

    constructor(buildId: number, planId: string, timelineReference: BuildContracts.TimelineReference) {
        this.buildId(buildId);
        this.planId(planId);

        this.changeId.subscribe((newValue: number) => {
            this.previousChangeId(this._previousChangeId);
            this._previousChangeId = newValue;
        });

        this.update(timelineReference);
    }

    /**
     * Updates the model from a data contract
     * @param timelineReference The data contract
     */
    public update(timelineReference: BuildContracts.TimelineReference) {
        this._timelineReference = timelineReference;

        if (!!timelineReference) {
            this.id(timelineReference.id);
            this.changeId(timelineReference.changeId);
        }
    }
}
