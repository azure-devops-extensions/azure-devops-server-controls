import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import Agile_LAZY_LOAD = require("Agile/Scripts/Common/Agile");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import VSS = require("VSS/VSS");

export class IterationHelper {

    private static _instance;
    private _iterationDates: TestsOM.IterationDates;

    constructor() {
        if (!IterationHelper._instance) {
            IterationHelper._instance = this;
        }
        return IterationHelper._instance;
    }

    public static getInstance() {
        IterationHelper._instance;
    }
    /**
     * Clears the iteration dates span.
     */
    public clearIterationDatesSpan() {
        let $div: JQuery;

        if (this._$iterationDatesSpan) {
            this._$iterationDatesSpan.removeClass("hub-title-right");

            $div = this._$iterationDatesSpan.find(".test-plan-iteration-dates");
            $div.text("");

            $div = this._$iterationDatesSpan.find(".test-plan-iteration-remaining-days");
            $div.text("");
        }
    }

    /**
     * if iterationsData is not available then fetch iterations data
     * and cache it for future use. This will generally not be the case 
     * since we fetch this data while fetching plans too.
    */
    public fetchAndShowIterationDates(iteration: string) {

        let testPlanCreationHelper = new TMUtils.PlanCreationHelper();
        if (this._iterationDates) {
            this._showIterationDates(testPlanCreationHelper, this._iterationDates, iteration);
            return;
        }

        new TMUtils.DelayedExecutionHelper().executeAfterLoadComplete(this, () => {

            testPlanCreationHelper.beginGetIterationsData((data) => {
                this._iterationDates = testPlanCreationHelper.getIterationDates(iteration);
                this._showIterationDates(testPlanCreationHelper, this._iterationDates, iteration);
            });
        });
    }

    public clearAndShowIterationDates(iteration: string) {
        this._iterationDates = null;

        this.clearIterationDatesSpan();
        this.fetchAndShowIterationDates(iteration);
    }

    private _showIterationDates(testPlanCreationHelper: TMUtils.PlanCreationHelper, iterationDates: TestsOM.IterationDates, iteration: string) {
        let iterationDatesText: string = Resources.NoIterationDatesSet,
            iterationId: string,
            teamHelper: TeamHelper;
        this._createIterationDatesDOMElements();

        if (iterationDates.getStartDate() && iterationDates.getEndDate()) {
            teamHelper = new TeamHelper();
            iterationDatesText = Utils_String.format(Resources.IterationDurationFormat,
                Utils_Date.localeFormat(iterationDates.getStartDate(), "M", true),
                Utils_Date.localeFormat(iterationDates.getEndDate(), "M", true));

            // fetch (if needed) iteration work days remaining if needed 
            // and show the data
            iterationId = testPlanCreationHelper.getIterationId(iteration);
            teamHelper.beginGetTeamCapacity(iterationId,
                (data) => {
                    teamHelper.getAndshowRemainingWorkDaysInIteration(iterationId,
                        iterationDates.getStartDate(),
                        iterationDates.getEndDate(),
                        this._$iterationDatesSpan,
                        teamHelper.todayIsInCurrentIteration(iterationId, iterationDates.getStartDate(), iterationDates.getEndDate()));
                });
        }

        this._populateIterationDatesSpan(iterationDatesText);
    }

    private _createIterationDatesDOMElements() {
        if (!this._$iterationDatesSpan) {
            this._$iterationDatesSpan = $("<span class='test-plan-iteration-dates-info' />")
                .append("<div class='test-plan-iteration-dates' />")
                .append("<div class='test-plan-iteration-remaining-days' />")
                .insertBefore(".hub-title");
        }
    }

    private _$iterationDatesSpan: JQuery;

    private _populateIterationDatesSpan(iterationDatesText: string) {
        let $iterationDatesDiv: JQuery;

        if (this._$iterationDatesSpan) {
            this._$iterationDatesSpan.addClass("hub-title-right");

            // set the dates div
            $iterationDatesDiv = this._$iterationDatesSpan.find(".test-plan-iteration-dates");
            $iterationDatesDiv.text(iterationDatesText);
        }
    }
}

export class TeamHelper {
    private _iterationTeamDaysOffData: any;

    constructor() {
        this._iterationTeamDaysOffData = [];
    }

    /**
     *  For a given iteration id returns the team capacity details
     */
    public beginGetTeamCapacity(iterationId: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let actionUrl;

        if (this._iterationTeamDaysOffData[iterationId]) {
            if ($.isFunction(callback)) {
                callback(this._iterationTeamDaysOffData[iterationId]);
            }
        }

        actionUrl = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(
            "getteamdaysoffforiteration",
            "testManagement",
            {
                area: "api"
            });

        Ajax.getMSJSON(actionUrl,
            { iterationId: iterationId },
            (data) => {
                this._iterationTeamDaysOffData[iterationId] = data;

                if ($.isFunction(callback)) {
                    callback(data);
                }
            }, errorCallback);
    }

    public getAndshowRemainingWorkDaysInIteration(iterationId: string, iterationStartDate: Date, iterationEndDate: Date, iterationDatesSpan: any, isInCurrentIteration: boolean) {

        VSS.using(["Agile/Scripts/Common/Agile"], (Module: typeof Agile_LAZY_LOAD) => {
            let startDate = this._getCurrentDateInIteration(iterationId, iterationStartDate, iterationEndDate);
            let remainingDays: number;

            if (this._iterationTeamDaysOffData[iterationId]) {
                if (startDate) {
                    let filteredDaysOffDates,
                        dateBreakdown;

                    filteredDaysOffDates = Module.CapacityDateUtils.getMergedDateRangeList(
                        this._iterationTeamDaysOffData[iterationId].TeamDaysOffDates || [],
                        [],
                        startDate,
                        iterationEndDate);

                    dateBreakdown = Module.CapacityDateUtils.getDateBreakdown(
                        startDate,
                        iterationEndDate,
                        filteredDaysOffDates,
                        this._iterationTeamDaysOffData[iterationId].Weekends || []);

                    remainingDays = dateBreakdown.workingDays;
                }
            }

            this._showRemainingWorkDaysInIteration(remainingDays, iterationDatesSpan, isInCurrentIteration);
        });
    }

    private _showRemainingWorkDaysInIteration(remainingDays: number, iterationDatesSpan: any, isInCurrentIteration: boolean) {
        let iterationRemainingDaysText: string = Utils_String.empty,
            $iterationDaysRemainingDiv: JQuery,
            messageFormat: string = Utils_String.empty;

        if (remainingDays === 1) {
            messageFormat = isInCurrentIteration ? Resources.IterationDayRemainingFormat : Resources.IterationWorkDayFormat;
        } else if (remainingDays > 1) {
            messageFormat = isInCurrentIteration ? Resources.IterationDaysRemainingFormat : Resources.IterationWorkDaysFormat;
        }

        iterationRemainingDaysText = Utils_String.format(messageFormat, remainingDays);

        if (iterationDatesSpan) {
            // set the remaining days div
            $iterationDaysRemainingDiv = iterationDatesSpan.find(".test-plan-iteration-remaining-days");
            $iterationDaysRemainingDiv
                .addClass("hub-title-right-secondary")
                .text(iterationRemainingDaysText);
        }
    }


    public todayIsInCurrentIteration(iterationId: string, iterationStartDate: Date, iterationEndDate: Date) {
        let today = Utils_Date.stripTimeFromDate(new Date());
        return (today >= iterationStartDate && today <= iterationEndDate);
    }

    private _getCurrentDateInIteration(iterationId: string, iterationStartDate: Date, iterationEndDate: Date) {
        return this.todayIsInCurrentIteration(iterationId, iterationStartDate, iterationEndDate) ?
            Utils_Date.stripTimeFromDate(new Date()) : iterationStartDate;
    }
}