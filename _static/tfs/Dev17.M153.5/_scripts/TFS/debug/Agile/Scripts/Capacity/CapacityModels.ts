/// <reference types="jquery" />
/// <reference types="knockout" />
import Agile = require("Agile/Scripts/Common/Agile");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import SprintPlanningResources = require("Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning");
import ko = require("knockout");
import TFS_FormatUtils = require("Presentation/Scripts/TFS/FeatureRef/FormatUtils");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import Q = require("q");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Work_Contracts = require("TFS/Work/Contracts");
import Work_WebApi = require("TFS/Work/RestClient");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Dialogs = require("VSS/Controls/Dialogs");
import Notifications = require("VSS/Controls/Notifications");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Validation = require("VSS/Controls/Validation");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");


TFS_Knockout.overrideDefaultBindings()

var FormatUtils = TFS_FormatUtils.FormatUtils;
var delegate = Utils_Core.delegate;

/**
 * Aggregated capacity by Activity Name
 **/
export interface IAggregateActivityCapacity {
    activity: string;
    capacity: number;
}

/**
 * Data for the capacity pane
 */
export interface ICapacityOptions {
    accountCurrentDate: string;
    activityFieldName: string;
    allowedActivities: string[];
    assignedToFieldDisplayName: string;
    activityFieldDisplayName: string;
    suffixFormat: string;
    childWorkItemTypes: string[];
    inline: boolean;
    iterationId: string;
    isEmpty: boolean;
    isFirstIteration: boolean;
    fixedTopText?: string;
}

export interface IFieldValueCapacityMap<T> {
    [key: string]: T;
}

/**
 * Wire representation of TeamCapacity data coming from  Microsoft.TeamFoundation.Server.WebAccess.Agile.Models.CapacityModel
 * */
export interface ITeamCapacityData {
    TeamDaysOffDates: Work_Contracts.DateRange[];
    TeamMemberCapacityCollection: Work_Contracts.TeamMemberCapacity[];
}

export interface IAggregatedCapacity {
    remainingWorkField: string;
    aggregatedCapacity: IDictionaryStringTo<IFieldValueCapacityMap<number>>;
    previousValueData: IDictionaryStringTo<IFieldValueCapacityMap<any>>; //TODO: investigate what is it and does this need to be updated for multi activity??
}

export class AggregatedCapacity {
    public static EMPTY_VALUE: string = "__empty";
    public static UNASSIGNED_USERID: string = "__unassigned";
    public static TEAM_USERID: string = "__team";

    public static REMAINING_HOUR_DECIMAL_PRECISION: number = 3;

    private _processedAggregatedCapacity: IDictionaryStringTo<IDictionaryStringTo<any>>;

    constructor(aggregatedCapacityData: IDictionaryStringTo<IDictionaryStringTo<any>>) {
        this._processedAggregatedCapacity = this._getProcessedAggregatedCapacity(aggregatedCapacityData);
    }

    public getAggregatedCapacity(): IDictionaryStringTo<IDictionaryStringTo<any>> {
        return this._processedAggregatedCapacity;
    }

    /**
     * Gets current aggregated value for the provided field value.
     *
     * @param fieldName Name of the field to get the aggregated value for.
     * @param fieldValue
     * OPTIONAL: Value to get the aggregated aggregated value for.  When not provided, the value returned
     * will be the sum of the aggregated values for the field.
     *
     * @return
     */
    public getAggregatedValue(fieldName: string, fieldValue?: string): number {

        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var fieldData = this._processedAggregatedCapacity[fieldName],
            value,
            propertyName;

        // If there is data for the field, lookup the value.
        if (fieldData) {
            // Convert empty field values for lookup purposes (can't store values against empty property names).
            fieldValue = this._convertFieldValue(fieldName, fieldValue);

            if (fieldValue) {
                value = fieldData[fieldValue];
            }
            else {
                value = 0;

                // Sum up all of the values for the field.
                for (propertyName in fieldData) {
                    if (fieldData.hasOwnProperty(propertyName)) {
                        value += fieldData[propertyName];
                    }
                }
            }
        }

        return value || 0;
    }

    /**
     * Gets current aggregated values for the provided field.  The format of returned data is:
     *   {
     *     "Some Onecharenko": 5
     *     "Another Person": 7
     *   }
     *
     * @param fieldName Name of the field to get the aggregated values for.
     * @return
     */
    public getAggregatedValues(fieldName: string): IDictionaryStringTo<any> {

        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var fieldData = this._processedAggregatedCapacity[fieldName];

        // Return a copy of the fields data.
        return $.extend({}, fieldData);
    }

    /**
     * Sets the aggregated value for the field value.
     *
     * @param fieldName Name of the field to set the aggregated value for.
     * @param fieldValue Value to set the aggregated aggregated value for.
     * @param aggregatedValue Aggregated value to set.
     */
    public setAggregatedValue(fieldName: string, fieldValue: string, aggregatedValue: number) {

        Diag.Debug.assertParamIsString(fieldName, "fieldName");
        Diag.Debug.assertParamIsNotUndefined(fieldValue, "fieldValue");
        Diag.Debug.assertParamIsNumber(aggregatedValue, "aggregatedValue");

        fieldValue = this._convertFieldValue(fieldName, fieldValue);

        var fieldData = this._processedAggregatedCapacity[fieldName];

        // If there is no data for the field, add data.
        if (!fieldData) {
            fieldData = {};
            this._processedAggregatedCapacity[fieldName] = fieldData;
        }

        fieldData[fieldValue] = aggregatedValue;
    }

    /**
     * Converts the field value into something that can be used as a property value.
     *
     * @param fieldValue Field value to convert.
     */
    private _convertFieldValue(fieldName: string, fieldValue: string) {

        if (fieldValue === undefined) {
            return "";
        }

        if (fieldName === WITConstants.CoreFieldRefNames.AssignedTo) {
            if (fieldValue === AggregatedCapacity.TEAM_USERID) {
                return "";
            }

            if (fieldValue === AggregatedCapacity.UNASSIGNED_USERID) {
                return AggregatedCapacity.EMPTY_VALUE;
            }

            fieldValue = getIdentityUniqueName(fieldValue);
        }

        // Convert empty field values for lookup purposes (can't store values against empty property names).
        return fieldValue !== "" && fieldValue !== null ? fieldValue : AggregatedCapacity.EMPTY_VALUE;
    }

    /**
     * Deep copies aggregated capacity data and converts displayName of users to unique names
     * @param aggregatedCapacityData
     */
    private _getProcessedAggregatedCapacity(aggregatedCapacityData: IDictionaryStringTo<IDictionaryStringTo<any>>): IDictionaryStringTo<IDictionaryStringTo<any>> {
        let processData = {};

        for (let fieldName in aggregatedCapacityData) {
            if (aggregatedCapacityData.hasOwnProperty(fieldName)) {
                processData[fieldName] = this._getProcessFieldData(fieldName, aggregatedCapacityData[fieldName]);
            }
        }

        return processData;
    }

    private _getProcessFieldData(fieldName: string, fieldData: IDictionaryStringTo<any>): IDictionaryStringTo<any> {
        if (fieldName === WITConstants.CoreFieldRefNames.AssignedTo) {
            return this._getProcessedAssignedToValue(fieldData);
        }
        else {
            return $.extend(true, {}, fieldData);
        }
    }

    /**
     * Converts displayName of users to unique names, and create a map of unique name to remaining hours.
     * If there are entries with the same unique name, we will merge the data instead of replacing.
     * Senario that could happen: When user deprecated an old identity and create a new one with same email address but different display name, and still have some work item assigned to the old identity.
     * @param assignedToData The assignedTo display name to remaining hour dictionary.
     */
    protected _getProcessedAssignedToValue(assignedToData: IDictionaryStringTo<number>): IDictionaryStringTo<number> {
        let retValue = {};
        for (let uniqifiedDisplayName in assignedToData) {
            if (assignedToData.hasOwnProperty(uniqifiedDisplayName)) {
                let uniqueUser = this._convertFieldValue(WITConstants.CoreFieldRefNames.AssignedTo, uniqifiedDisplayName);
                if (!retValue[uniqueUser]) {
                    // If it is the first time encounter this user, we directly assign the value.
                    retValue[uniqueUser] = assignedToData[uniqifiedDisplayName];
                }
                else {
                    // Otherwise, merge the hour to the existing one in the dictonary.
                    const sum = (retValue[uniqueUser] + assignedToData[uniqifiedDisplayName]).toFixed(AggregatedCapacity.REMAINING_HOUR_DECIMAL_PRECISION);
                    retValue[uniqueUser] = parseFloat(sum);
                }
            }
        }
        return retValue;
    }
}

VSS.initClassPrototype(AggregatedCapacity, {
    _rawAggregatedCapacity: null,
    _processedAggregatedCapacity: null
});

/**
 * Wire representation of data coming from Microsoft.TeamFoundation.Server.WebAccess.Agile.Models.CapacityModel
 */
export interface IRawTeamCapacityData {

    aggregatedCapacity?: IAggregatedCapacity;
    capacityOptions?: ICapacityOptions;

    // Capacity Control Data
    TeamCapacity: ITeamCapacityData;
    ActivityValues: string[];
    IterationId: string;
    IterationStartDate: Date;
    IterationEndDate: Date;
    Weekends: number[];
    CurrentDate: Date;

    // Sprint Progress Data
    storiesPlural?: string;
    storiesNotStarted?: number;
    storiesInProgress?: number;

    isNormalized?: boolean;
}

/**
 * Base class for TeamCapacity KO models
 */
export class DisposableBase implements KnockoutDisposable {
    protected _disposables: KnockoutDisposable[] = [];
    /**
     * Disposes the current object
     */
    public dispose(): void {
        this._disposables.forEach((value: KnockoutDisposable) => {
            value.dispose();
        });
        this._disposables = [];
    }
}

/**
 * Contains Iteration specific data coming from Microsoft.TeamFoundation.Server.WebAccess.Agile.Models.CapacityModel
 */
export class IterationInfo extends DisposableBase {

    public iterationId: string;

    private _teamDaysOff: KnockoutObservableArray<Work_Contracts.DateRange>;
    private _weekends: number[];
    private _iterationStartDate: KnockoutObservable<Date>;
    private _iterationEndDate: KnockoutObservable<Date>;
    private _currentDate: Date;

    private _teamDaysOffCurrentDatesBreakdown: KnockoutComputed<Agile.IWorkingDaysInfo>;
    private _teamDaysOffTotalDatesBreakdown: KnockoutComputed<Agile.IWorkingDaysInfo>;

    constructor(data: IRawTeamCapacityData, teamDaysOff: KnockoutObservableArray<Work_Contracts.DateRange>) {
        super();
        this._teamDaysOff = teamDaysOff;
        this._weekends = data.Weekends || [];
        this.iterationId = data.IterationId;
        this._iterationStartDate = ko.observable(data.IterationStartDate);
        this._iterationEndDate = ko.observable(data.IterationEndDate);
        this._currentDate = data.CurrentDate;
        this._disposables.push(this._teamDaysOffCurrentDatesBreakdown = ko.computed(() => {
            return this._getDateBreakdown(
                this.getCurrentDateInIteration(),
                this._teamDaysOff() || [],
                []);
        }));

        this._disposables.push(this._teamDaysOffTotalDatesBreakdown = ko.computed(() => {
            return this._getDateBreakdown(
                this.getIterationStartDate(),
                this._teamDaysOff() || [],
                []);
        }));
    }

    /**
     * Updates iteration dates.
     * @param newStart New start date.
     * @param newEnd New end date.
     */
    public updateIterationDates(newStart: Date, newEnd: Date): void {
        Diag.Debug.assertIsNotNull(newStart, "newStart");
        Diag.Debug.assertIsNotNull(newEnd, "newEnd");
        Diag.Debug.assert(newStart <= newEnd, "new start date is after new end date");

        this._iterationStartDate(newStart);
        this._iterationEndDate(newEnd);
    }

    /**
     * True if the iteration this capacity data is for has a start date and an end date.
     */
    public hasIterationDates(): boolean {

        return !!this._iterationStartDate() && !!this._iterationEndDate();
    }

    /**
     * Array of days that are weekends.
     *
     * @return
     */
    public getWeekends(): number[] {

        return this._weekends;
    }

    /**
     * Array of days that the team has off this sprint.
     *
     * @return
     */
    public getTeamDaysOffDates(): Work_Contracts.DateRange[] {

        return $.extend(true, [], this._teamDaysOff());
    }

    public isCurrentIteration(): boolean {
        /// <summary>Checks if it is the current iteration or not<summary>
        /// <returns type="Boolean">Returns true if it is the current iteration, false otherwise</returns>

        // using account/server time instead of local time
        return this.getIterationStartDate() <= this._currentDate && this._currentDate <= this.getIterationEndDate();
    }

    //used by daysOffDialog validators
    //Can the daysOffDialog validators be made to allow undefined for the iteration date?
    /**
     * Gets the start date for the iteration.
     */
    public getIterationStartDate(): Date {

        if (this._iterationStartDate()) {
            return this._iterationStartDate();
        }
        else {
            // Default to an early date if no date is set.
            var date = new Date(0);
            date.setHours(0, 0, 0, 0);

            return date;
        }
    }

    /**
     * Gets the end date for the iteration.
     */
    public getIterationEndDate(): Date {

        if (this._iterationEndDate()) {
            return this._iterationEndDate();
        }
        else {
            // Default to a date 10 years in the future if a date is not set.
            var date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setFullYear(date.getFullYear() + 10);

            return date;
        }
    }

    /**
     * Gets the current date.
     */
    public getCurrentDateInIteration(): Date {

        // If the current date is greater than the iteration start date, then use it.  When it is
        // not greater than the iteration start date the iteration has not started and we should
        // use the start date of the iteration for the date calculations since it is a future iteration.
        return this._currentDate > this.getIterationStartDate() ? this._currentDate : this.getIterationStartDate();
    }

    /**
     * Gets the days off dates breakdown for the team from the current date to the end of the iteration.
     *
     * @return
     */
    public getTeamDaysOffCurrentDatesBreakdown(): Agile.IWorkingDaysInfo {

        return this._teamDaysOffCurrentDatesBreakdown();
    }

    /**
     * Gets the days off dates breakdown for the team for the entire iteration.
     *
     * @return
     */
    public getTeamDaysOffTotalDatesBreakdown(): Agile.IWorkingDaysInfo {

        return this._teamDaysOffTotalDatesBreakdown();
    }

    /**
     * Gets the days off dates breakdown by using the start date and merging the given date ranges with the team days off.
     *
     * @param startDate Date to start the breakdown on. If not provide a empty breakdown will be returned
     * @param daysOffDateRanges Array of date ranges to count as days off.
     */
    public getWorkingDaysInfoIncludingTeamDaysOff(startDate: Date, daysOffDateRanges: Work_Contracts.DateRange[]): Agile.IWorkingDaysInfo {
        return this._getDateBreakdown(startDate, daysOffDateRanges, this._teamDaysOff());
    }

    /**
     * Gets the days off dates breakdown given the start date and days off date ranges.
     *
     * @param startDate Date to start the breakdown on. If not provide a empty breakdown will be returned
     * @param daysOffDateRanges1 Array of date ranges to count as days off.
     * @param daysOffDateRanges2 Array of date ranges to count as days off.
     */
    private _getDateBreakdown(startDate: Date, daysOffDateRanges1: Work_Contracts.DateRange[], daysOffDateRanges2: Work_Contracts.DateRange[]): Agile.IWorkingDaysInfo {

        Diag.Debug.assertParamIsDate(startDate, "startDate");
        Diag.Debug.assertParamIsArray(daysOffDateRanges1, "daysOffDateRanges1", false);
        Diag.Debug.assertParamIsArray(daysOffDateRanges2, "daysOffDateRanges2", false);

        var iterationEndDate = this.getIterationEndDate();

        // This will filter the days off dates to a list of dates from the start date forward as
        // well as merge the two lists into a set of non-overlapping date ranges.
        var filteredDaysOffDates = Agile.CapacityDateUtils.getMergedDateRangeList(
            daysOffDateRanges1,
            daysOffDateRanges2,
            startDate,
            iterationEndDate);

        var dateBreakdown = Agile.CapacityDateUtils.getDateBreakdown(
            startDate,
            iterationEndDate,
            filteredDaysOffDates,
            this._weekends);

        return dateBreakdown;
    }
}


/**
 * Represents the Activity data KO model.
 */
export class ActivityModel extends DisposableBase {

    //constants
    public static MIN_INPUT: number = 0;
    public static MAX_INPUT: number = 1000000;
    public static DECIMAL_PRECISION: number = 2;

    public isValid: KnockoutComputed<boolean>;
    public isNameValid: KnockoutObservable<boolean> = ko.observable(true);
    public isCpdValid: KnockoutObservable<boolean> = ko.observable(true);
    public name: KnockoutObservable<string> = ko.observable(TeamCapacityModel.DEFAULT_ACTIVITY_NAME);
    public capacityPerDayString: KnockoutObservable<string> = ko.observable("");

    private _isDirtyTrigger: KnockoutObservable<boolean> = ko.observable(true); //This is used when we update the original data to trigger isDirty calculations
    public isDirty: KnockoutComputed<boolean>;
    public capacityPerDay: KnockoutComputed<number>;
    public originalActivity: Work_Contracts.Activity;

    private _pauseIsDirty: KnockoutObservable<boolean>;
    private _pauseCalculations: KnockoutObservable<boolean>;

    constructor(activity: Work_Contracts.Activity, pauseCalculations: KnockoutObservable<boolean>, pauseIsDirty: KnockoutObservable<boolean>) {
        super();
        this._pauseIsDirty = pauseIsDirty;
        this._pauseCalculations = pauseCalculations;
        this._initialize(activity);

        this._disposables.push(this.capacityPerDay = ko.computed(() => {
            var cpd: number = 0;
            this._isDirtyTrigger();
            cpd = Utils_Number.parseLocale(this.capacityPerDayString());

            if (isNaN(cpd) || !isFinite(cpd) || cpd > ActivityModel.MAX_INPUT || cpd < ActivityModel.MIN_INPUT) {
                cpd = 0;
                this.isCpdValid(false);
            }
            else {
                this.isCpdValid(true);
            }
            return cpd;
        }));

        this._disposables.push(this.isValid = ko.computed(() => {
            if (!this._pauseCalculations()) {
                return this.isNameValid() && this.isCpdValid();
            }
            return true;
        }));

        this._disposables.push(this.isDirty = ko.computed(() => {
            if (!this._pauseIsDirty()) {
                this._isDirtyTrigger();

                if (!this.isValid() ||
                    this.originalActivity.capacityPerDay !== this.capacityPerDay() ||
                    this.originalActivity.name !== this.name()) {
                    return true;
                }
            }
            return false;

        }));
    }

    /** Resets dirty state. */
    public dataSaved() {
        this.originalActivity.name = this.name();
        this.originalActivity.capacityPerDay = this.capacityPerDay();
        this._isDirtyTrigger(!this._isDirtyTrigger());
    }

    private _initialize(activity: Work_Contracts.Activity) {
        Diag.Debug.assertIsString(activity.name, "Activity name should not be null or undefined.");

        //If we get undefined or null activity name convert to default activity name
        if (activity.name === undefined || activity.name === null) {
            activity.name = TeamCapacityModel.DEFAULT_ACTIVITY_NAME;
        }

        this.originalActivity = activity;

        this.name(activity.name);
        this.capacityPerDayString(FormatUtils.formatNumberForDisplay(activity.capacityPerDay, ActivityModel.DECIMAL_PRECISION));
    }

    /**
     * Gets the current data in KO model in the JSON format.
     *
     * @return
     */
    public toDataContract(): Work_Contracts.Activity {

        return <Work_Contracts.Activity>{
            capacityPerDay: this.capacityPerDay(),
            name: this.name()
        }
    }

    public dispose() {
        super.dispose();
    }
}

/**
 * Represents the KO model for TeamMemberCapacity data.
 */
export class TeamMemberCapacityModel extends DisposableBase {

    public isValid: KnockoutComputed<boolean>;
    public isDirty: KnockoutComputed<boolean>;
    public isOnServer: KnockoutObservable<boolean> = ko.observable(false);
    public totalDaysOff: KnockoutComputed<string>;
    public totalCapacityPerDay: KnockoutComputed<number>;
    public totalRemainingActivityCapacityMap: KnockoutComputed<IDictionaryStringTo<number>>;
    public activities: KnockoutObservableArray<ActivityModel> = ko.observableArray([]);
    public daysOff: KnockoutObservableArray<Work_Contracts.DateRange> = ko.observableArray([]);
    public getDefaultActivity: KnockoutComputed<string>;
    public customProperties: IDictionaryStringTo<string> = {};

    public displayName: string;
    public id: string;
    public uniqueName: string;

    private _originalCapacity: Work_Contracts.TeamMemberCapacity;
    private _iterationInfo: IterationInfo;
    private _isDirtyTrigger: KnockoutObservable<boolean> = ko.observable(true);

    private _currentWorkingDaysInfo: KnockoutComputed<Agile.IWorkingDaysInfo>;
    private _totalDateBreakdown: KnockoutComputed<Agile.IWorkingDaysInfo>;
    private _pauseCalculations: KnockoutObservable<boolean>;
    private _pauseIsDirty: KnockoutObservable<boolean>;

    constructor(iterationInfo: IterationInfo, capacity: Work_Contracts.TeamMemberCapacity,
        pauseCalculations: KnockoutObservable<boolean>,
        pauseIsDirty: KnockoutObservable<boolean>, isOnServer: boolean) {
        super();
        this.isOnServer(isOnServer);
        this._pauseCalculations = pauseCalculations;
        this._pauseIsDirty = pauseIsDirty;
        this._initialize(capacity);
        this._iterationInfo = iterationInfo;
        this.id = capacity.teamMember.id;
        this.displayName = capacity.teamMember.displayName;
        this.uniqueName = capacity.teamMember.uniqueName;

        this._setupComputedValues();
    }

    public updateIterationDates(newStartDateUTC: Date, newEndDateUTC: Date): void {
        this._iterationInfo.updateIterationDates(newStartDateUTC, newEndDateUTC);
    }

    private _setupComputedValues() {

        this._disposables.push(this.totalCapacityPerDay = ko.computed(() => {

            var capacityPerDay = 0;
            this.activities().forEach((activity: ActivityModel, index: number) => {
                capacityPerDay += activity.capacityPerDay();
            });
            Diag.Debug.assertParamIsNumber(capacityPerDay, " capacity per day should be number");
            return capacityPerDay;
        }));

        this._setupDaysOffComputedValues();

        this._disposables.push(this.isDirty = ko.computed(() => {
            //If the capacity data lives on client only then it is dirty, until saved or removed using undo, or merged during copy from previous
            var isDirty = !this.isOnServer();
            if (!this._pauseIsDirty()) {
                if (!Agile.CapacityDateUtils.areDateRangesEqual(this.daysOff(), this._originalCapacity.daysOff)) {
                    isDirty = true;
                }

                $.each(this.activities(), (index: number, activity: ActivityModel) => {
                    if (activity.isDirty()) {
                        isDirty = true;
                    }
                });

                //When none of the activities are dirty, we need to detect if user added any empty activities
                if (!isDirty) {
                    //When we do not receive any activities from server we add one from our side
                    //If that activity isDirty then the above each loop will mark isDirty to true
                    //otherwise we mark isDirty to true if user has created more than one activity
                    if (this._originalCapacity.activities.length === 0) {
                        if (this.activities().length > 1) {
                            isDirty = true;
                        }
                    }
                    else {
                        //If we got atleast one activity from server, then we need to check if user has added or removed any activities
                        if (this.activities().length !== this._originalCapacity.activities.length) {
                            isDirty = true;
                        }
                    }
                }
            }
            return isDirty;
        }));

        this._disposables.push(this.isValid = ko.computed(() => {
            var isValid = true;
            if (!this._pauseCalculations()) {
                $.each(this.activities(), (index: number, activity: ActivityModel) => {
                    if (!activity.isValid()) {
                        isValid = false;
                    }
                });
            }
            return isValid;
        }));

        /**
         * Gets the name of the default Activity for the team member.
         *
         * @return
         */
        this._disposables.push(this.getDefaultActivity = ko.computed(() => {
            if (!this._pauseCalculations()) {
                var a = this.activities();

                //IF the team member has more than one activity, there is no default activity
                if (a) {
                    if (a.length === 1) {
                        return a[0].name();
                    }
                    return TeamCapacityModel.DEFAULT_ACTIVITY_NAME;
                }
            }
            return undefined;
        }));
    }

    private _initialize(capacity: Work_Contracts.TeamMemberCapacity) {
        this._originalCapacity = capacity;

        this.daysOff(capacity.daysOff);

        //Setup the array and replace it all at once so that subscribers are only notified once
        //Also, the template expects there to be at least one activity
        var activities = capacity.activities.map((activity) => new ActivityModel(activity, this._pauseCalculations, this._pauseIsDirty));
        if (activities.length === 0) {
            activities.push(this.newEmptyActivity());
        }

        //This is neccessary to manage the subscriptions
        this.activities(activities);
    }

    private _setupDaysOffComputedValues() {
        Diag.Debug.assertIsNotNull(this.daysOff, "daysOff must be defined before calling _setupDaysOffComputedValues()");
        Diag.Debug.assertIsNotNull(this._iterationInfo, "_iterationInfo must be defined before calling _setupDaysOffComputedValues()");

        this._disposables.push(this._currentWorkingDaysInfo = ko.computed(() => {
            return this._getWorkingDaysInfo(this._iterationInfo.getCurrentDateInIteration());
        }));

        this._disposables.push(this._totalDateBreakdown = ko.computed(() => {
            if (!this._pauseCalculations()) {
                return this._getWorkingDaysInfo(this._iterationInfo.getIterationStartDate());
            }
            return <Agile.IWorkingDaysInfo>{};
        }));

        this._disposables.push(this.totalDaysOff = ko.computed(() => {
            if (!this._pauseCalculations()) {
                var numDaysOff = this._totalDateBreakdown().totalExcludedDays - this._iterationInfo.getTeamDaysOffTotalDatesBreakdown().totalExcludedDays;
                var formatString = numDaysOff === 1 ? SprintPlanningResources.Capacity_DayOff : SprintPlanningResources.Capacity_DaysOff;
                return Utils_String.format(formatString, numDaysOff);
            }
            return "0";
        }));

        this._disposables.push(this.totalRemainingActivityCapacityMap = ko.computed(() => {
            var map: IDictionaryStringTo<number> = {};
            if (!this._pauseCalculations()) {
                //If there's no iteration dates, then there's no remaining capacity
                if (this._iterationInfo.hasIterationDates()) {
                    this.activities().forEach((activity: ActivityModel) => {
                        if (activity.name() in map) {
                            map[activity.name()] += this.getWorkingDaysInfo().workingDays * activity.capacityPerDay();
                        }
                        else {
                            map[activity.name()] = this.getWorkingDaysInfo().workingDays * activity.capacityPerDay();
                        }
                    });
                }
            }
            return map;
        }));
    }

    /**Resets dirty state. */
    public dataSaved() {
        if (this.isDirty()) {
            this._originalCapacity.daysOff = this.daysOff();

            this._originalCapacity.activities.splice(0, this._originalCapacity.activities.length);
            this.activities().forEach((model: ActivityModel) => {
                this._originalCapacity.activities.push(model.originalActivity);
            });
            this.activities().forEach((value: ActivityModel) => {
                value.dataSaved();
            });

            this._isDirtyTrigger(!this._isDirtyTrigger());
        }
    }

    /**
     * Sets the activity values for TeamMemberCapacity.
     *
     * @param activities The activity values
     */
    public setActivities(activities: Work_Contracts.Activity[]) {

        //Setup the array and replace it all at once so that subscribers are only notified once
        var activityModels = activities.map((activity) => {
            //Create a new activity and then assign its values afterwards so that dirty state is correct
            var newActivity = this.newEmptyActivity();
            newActivity.capacityPerDayString(FormatUtils.formatNumberForDisplay(activity.capacityPerDay, ActivityModel.DECIMAL_PRECISION));
            newActivity.name(activity.name);
            return newActivity;
        });
        //The template expects there to be at least one activity
        if (activityModels.length === 0) {
            activityModels.push(this.newEmptyActivity());
        }

        this.activities().forEach((value: ActivityModel, index: number, array: ActivityModel[]) => {
            value.dispose();
        })
        this.activities.removeAll();
        //This is neccessary to manage the subscriptions
        this.activities(activityModels);
    }

    /**
     * Gets the display name of the team member.
     *
     * @return
     */
    public getTeamMemberDisplayName(): string {

        return this.displayName;
    }

    /**
     * Returns the ActivityModel in a given index.
     * @param index The index of the activity.
     */
    public getActivityByIndex(index: number): ActivityModel {
        const allActivities = this.activities();

        if (index < 0 || index >= allActivities.length) {
            return null;
        }

        return this.activities()[index];
    }

    /**
     * Gets the current data from KO in JSON format that can be used for sending to REST API.
     * @param dateRangesConvertor Convertor for daysoff
     * @return
     */
    public toDataContract(dateRangesConvertor: (dateRanges: Work_Contracts.DateRange[]) => Work_Contracts.DateRange[]): Work_Contracts.TeamMemberCapacity {

        var capacity: Work_Contracts.TeamMemberCapacity = $.extend({}, this._originalCapacity);

        var dataContractActivities: Work_Contracts.Activity[] = [];
        this.activities().forEach((activity: ActivityModel) => {
            var activityName = activity.name();
            var firstMatchingActivity = Utils_Array.first(dataContractActivities, (activity2) => activity2.name === activityName);
            if (firstMatchingActivity) {
                firstMatchingActivity.capacityPerDay += activity.capacityPerDay();
            }
            else {
                dataContractActivities.push(activity.toDataContract());
            }
        });

        capacity.activities = dataContractActivities;

        capacity.daysOff = dateRangesConvertor(this.daysOff());

        return capacity;
    }

    /**
     *     Calculates the remaining capacity that this team member has for the current sprint. This
     *     takes into account the number of remaining days in the sprint and omits weekends.
     *
     * @return Remaining capacity
     */
    public getTotalRemainingCapacity(): number {

        Diag.Debug.assertIsNotNull(this.daysOff, "daysOff should not be null");

        // If the iteration has dates, return the capacity.
        if (this._iterationInfo.hasIterationDates()) {
            var workingDays: number = this.getWorkingDaysInfo().workingDays;
            var totalCapacityPerDay: number = this.totalCapacityPerDay();
            return workingDays * totalCapacityPerDay;
        }
        else {
            return 0;
        }
    }

    /**
     * Gets the date breakdown for this team member from the current date to the end of the sprint.
     *
     * @return
     */
    public getWorkingDaysInfo(): Agile.IWorkingDaysInfo {

        Diag.Debug.assertIsNotNull(this._currentWorkingDaysInfo, "Accessing Current Date Breakdown before it was initialized");

        return this._currentWorkingDaysInfo();
    }

    public dispose() {
        super.dispose();

        this.activities().forEach((value: KnockoutDisposable, index: number, array: KnockoutDisposable[]) => {
            value.dispose();
        });

        this.activities.removeAll();
    }

    /**
     * Gets the date breakdown for this team member for from the start date to the end of the sprint.
     *
     * @param startDate Start date to begin the breakdown on.  If not provided a default breakdown will be returned.
     * @return
     */
    private _getWorkingDaysInfo(startDate: Date): Agile.IWorkingDaysInfo {

        Diag.Debug.assertParamIsDate(startDate, "startDate");

        return this._iterationInfo.getWorkingDaysInfoIncludingTeamDaysOff(
            startDate,
            this.daysOff() || []);
    }

    public newEmptyActivity(): ActivityModel {
        var emptyActivity = new ActivityModel({
            capacityPerDay: 0,
            name: TeamCapacityModel.DEFAULT_ACTIVITY_NAME
        }, this._pauseCalculations, this._pauseIsDirty);
        return emptyActivity;
    }
}

/**
 * The KO Model representing the data from ITeamCapacityData
 */

// * HOW ARE MODELS DISPOSED?
//     * * At a high level following is the object graph and how the objects are disposed
//     * 1) The TeamCapacityModel is constructed by CapacityDataService and holds an object
//     * 2) It references list of TeamMemberCapacityModels
//     * 3) TeamMemberCapacityModels references a list of ActivityModels
//     * 4) Currently we allow adding/removing activities from TeamMemberCapacityModel
//     *    - On remove we dispose the ActivityModel
//     * 5) When we save the data to server and refreshe from returned values
//     *    - We dispose the existing TeamModelCapacity objects
//     * 6) The ViewModels do not own the Models because the same Model can be shared across multiple ViewModels, thus ViewModels do not dispose the Models, unless they are destroying the Model object
//     * 7) Once we move to SPA the service can dispose the models as needed, the current TfsService do not implement Disposable
export class TeamCapacityModel extends DisposableBase {
    public static DEFAULT_ACTIVITY_NAME = "";

    public activityValues: string[];
    public activityEnabled: boolean;
    public iterationInfo: IterationInfo;

    public isEmpty: KnockoutComputed<boolean>;
    public isValid: KnockoutComputed<boolean>;
    public isDirty: KnockoutComputed<boolean>;
    public totalTeamDaysOff: KnockoutComputed<string>;
    public capacities: KnockoutObservableArray<TeamMemberCapacityModel> = ko.observableArray([]);
    public teamDaysOff: KnockoutObservableArray<Work_Contracts.DateRange> = ko.observableArray([]);
    //Used for "pausing" recalculation of isDirty ko.computed for improving the perf during bulk operations
    public pauseIsDirty: KnockoutObservable<boolean> = ko.observable(false);
    //Used for "pausing" recalculation of varioius ko.computed for improving the perf during bulk operations
    public pauseCalculations: KnockoutObservable<boolean> = ko.observable(false);
    public teamMemberCapacityMap: IDictionaryStringTo<TeamMemberCapacityModel> = {};

    //State to indicate that we are under bulk operation mode
    private _underbulkOperation = false;

    private _aggregateCapacityByActivityMap: KnockoutComputed<IDictionaryStringTo<number>>;
    public _rawTeamCapacityData: IRawTeamCapacityData;
    private _activityCapacityChangedHandlers: { (x: IAggregateActivityCapacity): void; }[] = [];
    private _teamCapacityChangedHandlers: { (x: TeamCapacityModel): void; }[] = [];
    private _teamMemberCapacityChangedHandlers: { (x: TeamMemberCapacityModel): void; }[] = [];
    private _teamMemberDefaultActivityChanged: { (x: TeamMemberCapacityModel): void; }[] = [];
    private _originalTeamCapacity: ITeamCapacityData;

    constructor(data: IRawTeamCapacityData) {
        super();

        //Duplicate the data so any updates to it are local
        data = $.extend(true, {}, data);

        //Process and Initialize the data
        this._rawTeamCapacityData = data;
        this._originalTeamCapacity = data.TeamCapacity;

        this.iterationInfo = new IterationInfo(data, this.teamDaysOff);
        this.overwriteTeamDaysOff(data.TeamCapacity.TeamDaysOffDates);
        this._initializeCapacities(data.TeamCapacity.TeamMemberCapacityCollection);

        this.activityValues = data.ActivityValues || [];
        this.activityEnabled = Boolean(data.ActivityValues && data.ActivityValues.length !== 0);

        this._disposables.push(this.totalTeamDaysOff = ko.computed(() => {
            var numDaysOff = 0;
            if (!this.pauseCalculations()) {
                numDaysOff = this.iterationInfo.getTeamDaysOffTotalDatesBreakdown().totalExcludedDays;
            }
            var formatString = numDaysOff === 1 ? SprintPlanningResources.Capacity_DayOff : SprintPlanningResources.Capacity_DaysOff;
            return Utils_String.format(formatString, numDaysOff);

        }));

        //Calculates aggregated capacity by activity
        this._disposables.push(this._aggregateCapacityByActivityMap = ko.computed(() => {
            var map: IDictionaryStringTo<number> = {};
            if (!this.pauseCalculations()) {

                this.capacities().forEach((capacity: TeamMemberCapacityModel) => {
                    for (var activityName in capacity.totalRemainingActivityCapacityMap()) {
                        if (!(activityName in map)) {
                            map[activityName] = 0;
                        }
                        map[activityName] += capacity.totalRemainingActivityCapacityMap()[activityName];
                    }
                });
            }

            //Fill in 0 capacity for any remaining valid activities
            this.activityValues.forEach((activityName: string) => {
                if (!(activityName in map)) {
                    map[activityName] = 0;
                }
            });

            //Don't forget to fill in the unassigned activity
            if (!(TeamCapacityModel.DEFAULT_ACTIVITY_NAME in map)) {
                map[TeamCapacityModel.DEFAULT_ACTIVITY_NAME] = 0;
            }

            return map;
        }));

        this._setupSubscriptions();

        this._disposables.push(this.isEmpty = ko.computed(() => {
            var isEmpty = true;
            if (!this.pauseCalculations()) {
                //Must touch every observable that matters so that the dependency chain is setup correctly by Knockout (in other words, DO NOT exit early)
                this.capacities().forEach((capacity: TeamMemberCapacityModel) => {
                    var totalCapacityPerDay = capacity.totalCapacityPerDay();
                    var activities = capacity.activities();
                    var numOfActivities = activities.length;

                    if (numOfActivities === 1) {
                        var firstActivityName = activities[0].name();
                        var firstActivityCapacityPerDay = activities[0].capacityPerDay();

                        if (firstActivityName !== TeamCapacityModel.DEFAULT_ACTIVITY_NAME || firstActivityCapacityPerDay > 0) {
                            isEmpty = false;
                        }
                    }
                    else if (totalCapacityPerDay > 0 || numOfActivities > 1) {
                        isEmpty = false;
                    }
                });
            }
            return isEmpty;
        }));

        this._disposables.push(this.isDirty = ko.computed(() => {
            //We should be touching all observables here for tracking the dependency right.
            var isDirty = false;
            if (!this.pauseCalculations()) {
                var numOfTeamMemberCapacities = this.capacities().length;
                var currentTeamDaysOff = this.teamDaysOff();

                this.capacities().forEach((capacity: TeamMemberCapacityModel) => {
                    if (capacity.isDirty()) {
                        isDirty = true;
                    }
                });

                if (numOfTeamMemberCapacities !== this._originalTeamCapacity.TeamMemberCapacityCollection.length ||
                    !Agile.CapacityDateUtils.areDateRangesEqual(currentTeamDaysOff, this._originalTeamCapacity.TeamDaysOffDates)) {
                    isDirty = true;
                }
            }

            return isDirty;
        }));

        this._disposables.push(this.isValid = ko.computed(() => {
            var isValid = true;
            if (!this.pauseCalculations()) {
                //Must touch every observable that matters so that the dependency chain is setup correctly by Knockout (in other words, DO NOT exit early)
                this.capacities().forEach((capacity: TeamMemberCapacityModel) => {
                    if (!capacity.isValid()) {
                        isValid = false;
                    }
                });
            }
            return isValid;
        }));
    }

    /**
    * Sets up bulk operation mode for copy from previous iteration
    */
    public setupMerge(): void {
        this.pauseCalculations(true);
        this.pauseIsDirty(true);
    }

    /**
     * Resets from bulk operation mode to usual calculations after copy from previous iteration
     * The order of these is important
     * 1) Set underBulkOperations to true, so the consumers can start caching etc when a flood of notifications arrive after result computed and isdirty
     * 2) Result the calculations
     * 3) Result isDirty calculations
     * 4) Raise the TeamCapacityChange events
     * 5) Set underBulkOperations to false, so the consumers can retire their caches
     */
    public endMerge(): void {
        this._underbulkOperation = true;
        this.pauseCalculations(false);
        this.pauseIsDirty(false);
        this._notify();
        this._underbulkOperation = false;
    }

    /**
     * Sets up bulk operation mode for Undo
     * Note we do not pause isDirty calculation as it is necessary for finding out which rows are dirty and needs undo
     */
    public setupUndo(): void {
        this.pauseCalculations(true);
    }

    /**
     * Resets from bulk operation mode to usual calculations after undo
     * The order of these is important
     * 1) Set underBulkOperations to true, so the consumers can start caching etc when a flood of notifications arrive after result computed and isdirty
     * 2) Result the calculations
     * 3) Raise the TeamCapacityChange events
     * 4) Set underBulkOperations to false, so the consumers can retire their caches
     */
    public endUndo(): void {
        this._underbulkOperation = true;
        this.pauseCalculations(false);
        this._notify();
        this._underbulkOperation = false;
    }

    public updateIterationDates(newStartDateUTC: Date, newEndDateUTC: Date): void {
        this.iterationInfo.updateIterationDates(newStartDateUTC, newEndDateUTC);
    }

    /**
     * Returns if the Model is under bulk operation mode.
     */
    public isUnderBulkOperation(): boolean {
        return this._underbulkOperation;
    }

    private _notify() {
        this._notifyAggregateCapacityChanged();
    }

    private _notifyAggregateCapacityChanged() {
        if (!this.pauseCalculations()) {
            var aggregateCapacityByActivityMap = this._aggregateCapacityByActivityMap();
            for (var entry in aggregateCapacityByActivityMap) {
                if (aggregateCapacityByActivityMap.hasOwnProperty(entry)) {
                    for (var index = 0; index < this._activityCapacityChangedHandlers.length; index++) {
                        var handler = this._activityCapacityChangedHandlers[index];
                        handler(<IAggregateActivityCapacity>{
                            activity: entry,
                            capacity: aggregateCapacityByActivityMap[entry]
                        });
                    }
                }
            }
            for (var index = 0; index < this._teamCapacityChangedHandlers.length; index++) {
                var teamCapacityChangedHandler = this._teamCapacityChangedHandlers[index];
                teamCapacityChangedHandler(this);
            }
        }
    }

    private _setupSubscriptions() {

        //These subscriptions will call the callback/handler for any changes to the activity
        //with current version of Knockout we do not have a way to identify granular changes in ObservableArrays,
        //without doing major heavy lifting, our current observers for capacity data should be fine with few additional
        //callbacks.
        //Once/if we move to Knockout 3.0 we can switch to using subscribeArrayChange on observables which gives us right granularity
        this._disposables.push(this._aggregateCapacityByActivityMap.subscribe((newValue: IDictionaryStringTo<number>) => {
            this._notifyAggregateCapacityChanged();
        }));

        this.capacities().forEach((teamMemberCapacityModel: TeamMemberCapacityModel) => {
            this._subscribeToTeamMemberCapacityModelChanges(teamMemberCapacityModel);
        });

        this._disposables.push(this.capacities.subscribe((newValue: TeamMemberCapacityModel[]) => {
            for (var index = 0; index < newValue.length; index++) {
                var teamMemberCapacityModel: TeamMemberCapacityModel = newValue[index];
                this._subscribeToTeamMemberCapacityModelChanges(teamMemberCapacityModel);
            }
        }));

        //Keep the map upto date
        this.capacities.subscribeArrayChanged((addedItem: TeamMemberCapacityModel) => {
            this.teamMemberCapacityMap[addedItem.id] = addedItem;
        }, (removedItem: TeamMemberCapacityModel) => {
            //We remove all the activities to update the work pane
            removedItem.activities.removeAll();
            delete this.teamMemberCapacityMap[removedItem.id];
        });
    }

    private _subscribeToTeamMemberCapacityModelChanges(teamMemberCapacityModel: TeamMemberCapacityModel) {
        if (!teamMemberCapacityModel.customProperties["capacityModelSubscription"]) {
            this._disposables.push(teamMemberCapacityModel.totalRemainingActivityCapacityMap.subscribe((activityCapacity: IDictionaryStringTo<number>) => {
                if (!this.pauseCalculations()) {
                    for (var index = 0; index < this._teamMemberCapacityChangedHandlers.length; index++) {
                        var teamMemberCapacityChangedHandler = this._teamMemberCapacityChangedHandlers[index];
                        teamMemberCapacityChangedHandler(teamMemberCapacityModel);
                    }
                }
            }));

            this._disposables.push(teamMemberCapacityModel.getDefaultActivity.subscribe((name: string) => {
                if (!this.pauseCalculations()) {
                    for (var index = 0; index < this._teamMemberDefaultActivityChanged.length; index++) {
                        var handler = this._teamMemberDefaultActivityChanged[index];
                        handler(teamMemberCapacityModel);
                    }

                    this._notifyAggregateCapacityChanged();
                }
            }));

            this._disposables.push(teamMemberCapacityModel.getDefaultActivity.subscribe((newValue: string) => {
                if (!this.pauseCalculations()) {
                    for (var index = 0; index < this._teamMemberCapacityChangedHandlers.length; index++) {
                        var teamMemberCapacityChangedHandler = this._teamMemberCapacityChangedHandlers[index];
                        teamMemberCapacityChangedHandler(teamMemberCapacityModel);
                    }
                }
            }));
            teamMemberCapacityModel.customProperties["capacityModelSubscription"] = "subscribed";
        }
    }

    /**
     * Disposes the current object
     */
    public dispose(): void {

        super.dispose();
        this.capacities().forEach((value: TeamMemberCapacityModel) => {
            value.dispose();
        });
    }

    /**
     * Overwrites teamDaysOff values.
     *
     * @param {Work_Contracts.DateRange[]} teamDaysOff - The JSON Model for teamDaysOff.
     */
    public overwriteTeamDaysOff(teamDaysOff: Work_Contracts.DateRange[]) {
        Diag.Debug.assertIsNotNull(this.teamDaysOff);
        Diag.Debug.assertIsNotNull(this._originalTeamCapacity);

        this._originalTeamCapacity.TeamDaysOffDates = teamDaysOff;
        this.teamDaysOff(teamDaysOff);
    }

    /**
     * Indicates if this represents LegacyTeamCapacityModel data format.
     *
     * @return Always returns false.
     */
    public isLegacy(): boolean {

        return false;
    }

    /**
     * Gets the days off dates breakdown for the team for the entire iteration.
     *
     * @return
     */
    public getTeamDaysOffCurrentDatesBreakdown(): Agile.IWorkingDaysInfo {
        return this.iterationInfo.getTeamDaysOffCurrentDatesBreakdown();
    }

    /**
     * Gets the days off dates breakdown for the team for the TeamDaysOff.
     *
     * @return
     */
    public getTeamDaysOffTotalDatesBreakdown(): Agile.IWorkingDaysInfo {

        return this.iterationInfo.getTeamDaysOffTotalDatesBreakdown();
    }

    /**
     * Gets the number of working days based on iteration dates, current iteration,
     * and team days off
     *
     * @return
     */
    public getWorkingDaysForDisplay(): number {
        // Cannot calculate working days without iteration dates
        if (!this.hasIterationDates()) {
            return null;
        }

        if (this.isCurrentIteration()) {
            return this.getTeamDaysOffCurrentDatesBreakdown().workingDays;
        }
        else {
            return this.getTeamDaysOffTotalDatesBreakdown().workingDays;
        }
    }

    /**
     * Gets if the iteration dates are specified or not.
     *
     * @return
     */
    public hasIterationDates(): boolean {

        return this.iterationInfo.hasIterationDates();
    }

    /**
     * Gets if the model represents data for current iteration.
     *
     * @return
     */
    public isCurrentIteration(): boolean {

        return this.iterationInfo.isCurrentIteration();
    }

    /**
     * Gets the start date for the iteration.
     *
     * @return
     */
    public getIterationStartDate(): Date {

        return this.iterationInfo.getIterationStartDate();
    }

    /**
     * Gets the end date for the iteration.
     *
     * @return
     */
    public getIterationEndDate(): Date {

        return this.iterationInfo.getIterationEndDate();
    }

    /**
     * Gets weekend day numbers.
     *
     * @return
     */
    public getWeekends(): number[] {

        return this.iterationInfo.getWeekends();
    }

    /**
     * Gets the iterationfo object containing all the information for the iteration.
     *
     * @return
     */
    public getIterationInfo(): IterationInfo {

        return this.iterationInfo;
    }

    /**
     * Gets the capacity for the activity provided.
     *
     * @param activity Activity to get the capacity for.
     * @return
     */
    public getActivityCapacity(activity: string): number {

        Diag.Debug.assertIsString(activity);

        return this._aggregateCapacityByActivityMap()[activity];
    }

    //The Following methods are here for back compat reasons.
    //The behavior for all of these methods will be the same as the one's on the legacy TeamCapacity class
    //Although the implementation may be slightly different
    //Need to look into refactoring them when we have time
    /**
     * Attach a handler for the activity changed event
     *
     * @param handler
     * The handler to attach.  The handler will be invoked with a single argument of the following structure:
     *   {
     *       activity: Name of the activity that has changed
     *       capacity: Capacity for the activity
     *   }
     *
     */
    public attachActivityCapacityChanged(handler: (x: IAggregateActivityCapacity) => void) {

        //if an activity name changes
        //  then the handler is called with the old value, then called again with the new value
        //if a team member's daysOff changes
        //  then the handler is called once for each valid activity
        //if the team member's capacity per day changes for any activity
        //  then the handler is called once for that activity
        //if the team days off changes
        //  then the handler is called once for each valid activity

        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._activityCapacityChangedHandlers.push(handler);
    }

    public _removeActivityCapacityChanged(handler: (x: IAggregateActivityCapacity) => void) {
        const index = this._activityCapacityChangedHandlers.indexOf(handler);
        if (index > -1) {
            this._activityCapacityChangedHandlers.splice(index, 1);
        }
    }

    /**
     * Attach a handler for the team capacity changed event
     *
     * @param handler The handler to attach
     */
    public attachTeamCapacityChanged(handler: (x: TeamCapacityModel) => void) {

        //handler is called if any team member's capacity changes
        //handler is called if team days off changes

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._teamCapacityChangedHandlers.push(handler);
    }

    public _removeTeamCapacityChanged(handler: (x: TeamCapacityModel) => void) {
        const index = this._teamCapacityChangedHandlers.indexOf(handler);
        if (index > -1) {
            this._teamCapacityChangedHandlers.splice(index, 1);
        }
    }

    /**
     * Attach a handler for the EVENT_TEAM_MEMBER_CAPACITY_CHANGED event
     *
     * @param handler The handler to attach
     */
    public attachTeamMemberCapacityChanged(handler: (x: TeamMemberCapacityModel) => void) {

        //handler is called once when a team member's capacity changes
        //handler is called once per team member, if team days off changes

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._teamMemberCapacityChangedHandlers.push(handler);
    }

    public _removeTeamMemberCapacityChanged(handler: (x: TeamMemberCapacityModel) => void) {
        const index = this._teamMemberCapacityChangedHandlers.indexOf(handler);
        if (index > -1) {
            this._teamMemberCapacityChangedHandlers.splice(index, 1);
        }
    }

    /**
     * Attach a handler for the EVENT_TEAM_MEMBER_DEFAULT_ACTIVITY_CHANGED event
     *
     * @param handler The handler to attach
     */
    public attachTeamMemberDefaultActivityChanged(handler: (x: TeamMemberCapacityModel) => void) {

        //handler is called once when a team member's capacity changes
        //handler is called once per team member, if team days off changes

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._teamMemberDefaultActivityChanged.push(handler);
    }

    public removeTeamMemberDefaultActivityChanged(handler: (x: TeamMemberCapacityModel) => void) {
        const index = this._teamMemberDefaultActivityChanged.indexOf(handler);
        if (index > -1) {
            this._teamMemberDefaultActivityChanged.splice(index, 1);
        }
    }

    /**
     * Attach a handler for the team days off changed event
     *
     * @param handler
     * The handler to attach.  The handler will be invoked with a single argument, the team capacity instance.
     *
     */
    public attachTeamDaysOffChanged(handler: (x: TeamCapacityModel) => void) {

        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._disposables.push(this.teamDaysOff.subscribe((tdo: Work_Contracts.DateRange[]) => {
            handler(this);
        }));
    }

    /**
     * Determines if activity is being tracked.
     *
     * @return
     */
    public isActivityEnabled(): boolean {

        return Boolean(this._rawTeamCapacityData.ActivityValues && this._rawTeamCapacityData.ActivityValues.length !== 0);
    }

    /**
     * Gets the allowed values for activities.
     */
    public getActivityValues(): string[] {

        return this._rawTeamCapacityData.ActivityValues || [];
    }

    /**
     * Retrieve the team member capacity information for the member with a specific display name
     *
     * @param displayName The Team Member's display name
     * @return Returns the TeamMemberCapacity instance if it exists in this collection, otherwise null
     */
    public getTeamMemberCapacity(displayName: string): TeamMemberCapacityModel {

        Diag.Debug.assertParamIsString(displayName, "displayName");

        let uniqueName = getIdentityUniqueName(displayName);
        return Utils_Array.first(this.capacities(), (capacity: TeamMemberCapacityModel) => {
            return Utils_String.equals(capacity.uniqueName, uniqueName, /* ignoreCase */true);
        });
    }
    /**
     * Determines whether a user with the provided display name is a member of this team
     *
     * @param displayName The display name to lookup
     * @return
     */
    public isTeamMember(displayName: string): boolean {

        Diag.Debug.assertParamIsString(displayName, "displayName");

        return !!this.getTeamMemberCapacity(displayName);
    }

    /**
     * Retrieves the collection of team member capacity information
     *
     * @return A collection of team member capacity information.
     */
    public getTeamMemberCapacityCollection(): TeamMemberCapacityModel[] {

        // Sort the collection for display purposes
        var sorted = this.capacities().sort(function (first, second) {
            var firstName = first.displayName,
                secondName = second.displayName;

            return Utils_String.localeIgnoreCaseComparer(firstName, secondName);
        });

        return sorted;
    }

    /**
     *     Calculate the remaining capacity in the sprint for the entire team. We will sum
     *     the individual team members remaining capacity and return that. Team members with
     *     negative do not contribute to the total remaining capacity
     *
     * @return Remaining capacity in sprint
     */
    public getTotalRemainingCapacity(): number {

        var i, l,
            remainingCapacityInSprint = 0,
            actualCapacity = 0,
            teamMemberCapacityCollection = this.capacities();

        for (i = 0, l = teamMemberCapacityCollection.length; i < l; i += 1) {
            actualCapacity = teamMemberCapacityCollection[i].getTotalRemainingCapacity();
            remainingCapacityInSprint += (actualCapacity > 0 ? actualCapacity : 0);
        }

        return remainingCapacityInSprint;
    }

    /**
     * Converts the current TeamMemberCapacity data in KO model to the raw JSON data contract understood by the REST API
     * @param dateRangesConvertor Convertor for teamdays off
     * @returns {Work_Contracts.TeamMemberCapacity[]} A collection of TeamMemberCapacities
     */
    public getTeamMemberCapacitiesDataContract(dateRangesConvertor: (dateRanges: Work_Contracts.DateRange[]) => Work_Contracts.DateRange[]): Work_Contracts.TeamMemberCapacity[] {
        return this.capacities().map((capacity: TeamMemberCapacityModel) => capacity.toDataContract(dateRangesConvertor));
    }

    /**
     * Converts current team days off data to raw JSON data contract understood by the REST API
     * @param dateRangesConvertor Convertor for teamdays off
     * @return TeamDaysOff
     */
    public getTeamDaysOffDataContract(dateRangesConvertor: (dateRanges: Work_Contracts.DateRange[]) => Work_Contracts.DateRange[]): Work_Contracts.DateRange[] {
        return dateRangesConvertor(this.teamDaysOff());
    }

    public undo() {

        this.setupUndo();
        this.mergeCapacities(this._originalTeamCapacity.TeamMemberCapacityCollection, true);
        this.endUndo();

        if (!Agile.CapacityDateUtils.areDateRangesEqual(this.teamDaysOff(), this._originalTeamCapacity.TeamDaysOffDates)) {
            this.overwriteTeamDaysOff(this._originalTeamCapacity.TeamDaysOffDates);
        }
    }

    /**
        * Merges the given list of members to the existing members
        *
        * @param {Work_Contracts.Member[]} member - The list of membmers
        * @returns number of users added
        */
    public mergeMembers(members: Work_Contracts.Member[]): number {
        members.sort(function (c1: Work_Contracts.Member, c2: Work_Contracts.Member): number {
            return Utils_String.localeIgnoreCaseComparer(c1.displayName, c2.displayName);
        });

        var index: number = 0;
        var membersAdded: number = 0;
        members.forEach((m: Work_Contracts.Member) => {
            if (!this.teamMemberCapacityMap[m.id]) {
                var tmc = <Work_Contracts.TeamMemberCapacity>{
                    activities: [{ name: TeamCapacityModel.DEFAULT_ACTIVITY_NAME, capacityPerDay: 0 }],
                    daysOff: [],
                    teamMember: $.extend(true, {}, m),
                    url: "",
                    _links: ""
                };
                var tmcm = new TeamMemberCapacityModel(this.iterationInfo, tmc, this.pauseCalculations, this.pauseIsDirty, false);
                this.capacities.splice(index++, 0, tmcm);
                membersAdded++;
            }
        });
        return membersAdded;
    }

    /**
       * Merges the capacity data
       *
       * @param {Work_Contracts.TeamMemberCapacity[]} sourceCapacities - The capacities collection.
       * @param {boolean} fullMerge - Indicates whether to do full merge, incase of full merge it updates days Off ranges, removes additional users etc.
       * Full merge is desired during scenarios like undo and save, and not desired during copy from previous
       */
    public mergeCapacities(sourceCapacities: Work_Contracts.TeamMemberCapacity[], fullMerge: boolean) {
        sourceCapacities = $.extend(true, [], sourceCapacities);
        if (fullMerge) {
            this._originalTeamCapacity.TeamMemberCapacityCollection = sourceCapacities;
        }

        var sourceCapacityMap: IDictionaryStringTo<Work_Contracts.TeamMemberCapacity> = {};

        //Create a map for capacities using teamMemberId for O(1) search
        sourceCapacities.forEach((capacity: Work_Contracts.TeamMemberCapacity) => {
            sourceCapacityMap[capacity.teamMember.id] = capacity;
        });

        var teamMemberCapacitiesToRemove: TeamMemberCapacityModel[] = [];
        //Create a map for capacities using teamMemberId for O(1) search
        this.capacities().forEach((capacity: TeamMemberCapacityModel) => {
            //The user capacity is removed
            if (!sourceCapacityMap[capacity.id]) {
                teamMemberCapacitiesToRemove.push(capacity);
            }
        });

        //Unless we are doing a full merge we do not remove additional users capacities
        //For example in case of copy from previous we do not want to remove users
        if (fullMerge) {
            this.capacities.removeAll(teamMemberCapacitiesToRemove);
        }

        //Iterate through the capacities to find the existing model for corresponding user
        sourceCapacities.forEach((sourceMemberCapacity: Work_Contracts.TeamMemberCapacity, index: number) => {
            if (sourceMemberCapacity.activities.length === 0) {
                var emptyActivity = <Work_Contracts.Activity>{ name: TeamCapacityModel.DEFAULT_ACTIVITY_NAME, capacityPerDay: 0 };
                sourceMemberCapacity.activities.push(emptyActivity);
            }
            var teamMemberId = sourceMemberCapacity.teamMember.id;
            var targetCapacityModel: TeamMemberCapacityModel = this.teamMemberCapacityMap[teamMemberId];
            //If view model for user found
            if (targetCapacityModel) {
                //iterate through individual activities
                var amToRemove: ActivityModel[] = [];
                var activitiesProcessed: Work_Contracts.Activity[] = [];
                targetCapacityModel.activities().forEach((targetActivityModel: ActivityModel) => {
                    var found: boolean = false;
                    if (targetActivityModel.isNameValid()) {
                        var targetActivityName = targetActivityModel.name();
                        sourceMemberCapacity.activities.forEach((sourceActivity: Work_Contracts.Activity, index: number) => {
                            //If we find the activity with matching name then update the name and capacity per day
                            if (sourceActivity.name === targetActivityName) {
                                //If we have already processed that source activity do not process it again.
                                if (activitiesProcessed.indexOf(sourceActivity) < 0) {
                                    found = true;
                                    if (!targetActivityModel.isCpdValid() || sourceActivity.capacityPerDay !== targetActivityModel.capacityPerDay()) {
                                        targetActivityModel.capacityPerDayString(FormatUtils.formatNumberForDisplay(sourceActivity.capacityPerDay, ActivityModel.DECIMAL_PRECISION));
                                    }

                                    //targetActivityModel.name(sourceActivity.name);
                                    activitiesProcessed.push(sourceActivity);
                                    return false;
                                }
                            }
                        });
                    }

                    //remove the ActivityModel as it is not present in the input
                    if (!found) {
                        amToRemove.push(targetActivityModel);
                    }
                });

                targetCapacityModel.activities.removeAll(amToRemove);

                //For any remaining activities in input create new model
                sourceMemberCapacity.activities.forEach((activity: Work_Contracts.Activity, index: number) => {
                    if (activitiesProcessed.indexOf(activity) < 0) {
                        var activityModel: ActivityModel;
                        //If this is the original model then reuse the activity, otherwise dependending on the ordering the same activity can be used in other activityModel
                        //This protects us from user actions where they add/remove activities
                        if (fullMerge) {
                            activityModel = new ActivityModel(activity, this.pauseCalculations, this.pauseIsDirty);
                        } else {
                            var emptyActivity = <Work_Contracts.Activity>{ name: TeamCapacityModel.DEFAULT_ACTIVITY_NAME, capacityPerDay: 0 };
                            activityModel = new ActivityModel(emptyActivity, this.pauseCalculations, this.pauseIsDirty);
                            activityModel.name(activity.name);
                            activityModel.capacityPerDayString(FormatUtils.formatNumberForDisplay(activity.capacityPerDay, ActivityModel.DECIMAL_PRECISION));
                        }
                        targetCapacityModel.activities.splice(index, 0, activityModel);
                    }
                });
                if (fullMerge) {
                    targetCapacityModel.daysOff(sourceMemberCapacity.daysOff);
                    //Incase of full merge only those survive which have corresponding record on server
                    targetCapacityModel.isOnServer(true);
                    targetCapacityModel.dataSaved();
                }
            }
            else {
                this.capacities.splice(index, 0, new TeamMemberCapacityModel(this.iterationInfo, sourceMemberCapacity, this.pauseCalculations, this.pauseIsDirty, fullMerge));
            }
        });
    }

    /**
     * Initializes team member capacities
     *
     * @param {Work_Contracts.TeamMemberCapacity[]} capacities - The capacities collection.
     */
    private _initializeCapacities(capacities: Work_Contracts.TeamMemberCapacity[]) {

        Diag.Debug.assertIsNotNull(this.capacities, "Capacities should not be undefined/null.");
        Diag.Debug.assertIsNotNull(this.iterationInfo, "IterationInfo should not be undefined/null.");
        Diag.Debug.assertIsNotNull(this._originalTeamCapacity, "originalTeamCapacity should not be undefined/null.");

        this._originalTeamCapacity.TeamMemberCapacityCollection = capacities;

        this.capacities().forEach((value: TeamMemberCapacityModel) => {
            value.dispose();
        });

        this.capacities.removeAll();

        var capacityModels: TeamMemberCapacityModel[] = []
        capacities.forEach((teamMemberCapacity: Work_Contracts.TeamMemberCapacity) => {
            var capacityModel = new TeamMemberCapacityModel(this.iterationInfo, teamMemberCapacity, this.pauseCalculations, this.pauseIsDirty, true);
            capacityModels.push(capacityModel);
            this.teamMemberCapacityMap[capacityModel.id] = capacityModel;
        });
        this.capacities(capacityModels);
    }

}

/**
 * Gets the CapacityDataService instance
 */
export function getService(): CapacityDataService {
    return TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<CapacityDataService>(CapacityDataService);
}

/** Convertor used before sending dates back to server during save. */
let convertToLocalDateRanges = (dateRanges: Work_Contracts.DateRange[]): Work_Contracts.DateRange[] => {
    let localDateRanges = $.extend(true, [], dateRanges);
    Agile.CapacityDateUtils.shiftDateRangesToLocal(localDateRanges);
    return localDateRanges;
}

/** Convertor used for converting server dates for local consumption */
let convertToUTCDateRanges = (dateRanges: Work_Contracts.DateRange[]): Work_Contracts.DateRange[] => {
    let utcDateRanges = $.extend(true, [], dateRanges);
    Agile.CapacityDateUtils.shiftDateRangesToUTC(utcDateRanges);
    return utcDateRanges;
}

/**
 * Gets unique name by parsing the uniquified display name
 * @param displayName
 */
export function getIdentityUniqueName(displayName: string): string {
    let retValue = "";
    if (displayName) {
        let entity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(displayName);
        if (!!entity && entity.uniqueName) {
            retValue = entity.uniqueName.toLocaleLowerCase();
        }
        else {
            retValue = displayName;
        }
    }
    return retValue;
}

/**
 * CapacityDataService is used for creating TeamCapacityModel and saving.
 * It also handles date conversions after fetching data from server and before sending data during save.
 */
export class CapacityDataService extends TFS_Service.TfsService {
    private _teamCapacities: IDictionaryStringTo<TeamCapacityModel>;
    private _capacityOptions: ICapacityOptions;

    /**
     * Provides access to team settings.
     */
    constructor() {
        super();
        this._teamCapacities = {};
    }

    /**
     * Gets capacity model for the current page is available
     * returns null if the json island with payload not found.
     */
    public getCapacityPageModel(): TeamCapacityModel {
        var capacityOptions = this.getCapacityOptions();
        if (!capacityOptions || !capacityOptions.iterationId) {
            return null;
        }

        return this.getCapacityModel(capacityOptions.iterationId);
    }

    /**
     * Gets the TeamCapacityModel
     * @param iterationId Iteration id for the capacity
     * @return Team Capacity for the iteration, returns null if not already in cache or on data island
     */
    public getCapacityModel(iterationId: string): TeamCapacityModel {
        Diag.Debug.assert(!!iterationId, "Iteration id is invalid.");
        if (!iterationId) {
            return null;
        }

        if (this._teamCapacities[iterationId]) {
            return this._teamCapacities[iterationId];
        }
        var payload = this.getCapacityDataFromJsonIsland();

        if (!payload) {
            return null;
        }
        return this.getCapacityModelFromPayload(payload);
    }

    /**
     * Gets the latest model from cache for the iteration id in the payload, or creates new model from the payload and returns it
     * @param payload Payload
     * @param ignoreCache Creates a new model even if one already exists in the cache. The new model is added to the cache.
     */
    public getCapacityModelFromPayload(payload: IRawTeamCapacityData, ignoreCache: boolean = false): TeamCapacityModel {
        Diag.Debug.assert(payload && !!payload.IterationId, "Payload or iteration id are null");
        if (!payload || !payload.IterationId) {
            return null;
        }
        let iterationId = payload.IterationId;

        //We allow only one model at a time for given iteration
        if (!ignoreCache && this._teamCapacities[payload.IterationId]) {
            return this._teamCapacities[payload.IterationId];
        }

        payload.TeamCapacity.TeamMemberCapacityCollection.sort(function (c1: Work_Contracts.TeamMemberCapacity, c2: Work_Contracts.TeamMemberCapacity): number {
            return Utils_String.localeIgnoreCaseComparer(c1.teamMember.displayName, c2.teamMember.displayName);
        });

        this._normalizePayloadInPlace(payload);
        this._teamCapacities[iterationId] = new TeamCapacityModel(payload);

        return this._teamCapacities[iterationId];
    }

    /**
     * Saves team member capacity at server
     * @param iterationId Iteration Id for member capacity
     * @param teamMemberCapacity Member capacity data
     */
    public beginSaveCapacityModel(iterationId: string): IPromise<void> {

        let cachedModel = this.getCapacityModel(iterationId);
        if (!cachedModel || !cachedModel.isDirty()) {
            return Q<void>(null);
        }

        //Get the capacities and teamdays off data contracts
        let capacities = cachedModel.getTeamMemberCapacitiesDataContract(convertToLocalDateRanges);
        let teamDaysOff = cachedModel.getTeamDaysOffDataContract(convertToLocalDateRanges);

        let teamContext = this.getTeamContext();
        let workHttpClient = this.getWorkHttpClient();


        return workHttpClient.replaceCapacities(capacities, teamContext, iterationId).then((serverCapacities: Work_Contracts.TeamMemberCapacity[]) => {
            let teamDaysOffPatch: Work_Contracts.TeamSettingsDaysOffPatch = {
                daysOff: teamDaysOff
            };

            //Notify the model that the data is saved so it can change the dirty state.
            cachedModel.capacities().forEach((capacityModel: TeamMemberCapacityModel) => {
                capacityModel.dataSaved();
            });

            //Sort the capacities so we can maintain the insertion order
            serverCapacities.sort(function (c1: Work_Contracts.TeamMemberCapacity, c2: Work_Contracts.TeamMemberCapacity): number {
                return Utils_String.localeIgnoreCaseComparer(c1.teamMember.displayName, c2.teamMember.displayName);
            });

            //Convert the days off back to UTC
            serverCapacities.forEach((serverCapacity: Work_Contracts.TeamMemberCapacity) => {
                serverCapacity.daysOff = convertToUTCDateRanges(serverCapacity.daysOff);
            });

            //To insert any new capacities we got from server
            cachedModel.mergeCapacities(serverCapacities, true);

            return workHttpClient.updateTeamDaysOff(teamDaysOffPatch, teamContext, iterationId).then((serverTeamDaysOff) => {
                let daysOff = convertToUTCDateRanges(serverTeamDaysOff.daysOff);

                cachedModel.overwriteTeamDaysOff(daysOff);
                return null;
            });
        });
    }

    /**
     * Gets team capacity from server and converts the dateRanges
     * @param iterationId Iteration Id
     */
    public beginGetCapacities(iterationId: string): IPromise<Work_Contracts.TeamMemberCapacity[]> {
        var teamContext = this.getTeamContext();
        var workHttpClient = this.getWorkHttpClient();

        return workHttpClient.getCapacities(teamContext, iterationId).then((serverCapacities) => {
            serverCapacities.forEach((serverCapacity: Work_Contracts.TeamMemberCapacity) => {
                serverCapacity.daysOff = convertToUTCDateRanges(serverCapacity.daysOff);
            });

            return serverCapacities;
        });
    }


    /**
     * Gets team capacity from server and converts the dateRanges
     * @param iterationId Iteration Id
     */
    private _beginGetTeamDaysOff(iterationId: string): IPromise<Work_Contracts.TeamSettingsDaysOff> {
        var teamContext = this.getTeamContext();
        var workHttpClient = this.getWorkHttpClient();

        return workHttpClient.getTeamDaysOff(teamContext, iterationId).then((serverTeamDaysOff) => {
            serverTeamDaysOff.daysOff = convertToUTCDateRanges(serverTeamDaysOff.daysOff);
            return serverTeamDaysOff;
        });
    }


    /**
     * Async call to get the TeamCapacityModel object. It fetches team member capacity and days off from service and fills the rest with passed values
     * @param iterationId  Iteration Id for the Team Capacity
     * @param allowedActivities Allowed activities value
     * @param accountCurrentDate  Account current date
     */
    public beginGetTeamCapacityModel(
        iterationId: string,
        allowedActivities: string[],
        accountCurrentDate: string): IPromise<TeamCapacityModel> {

        // Return team capacity if we already have it
        if (this._teamCapacities[iterationId]) {
            return Q(this._teamCapacities[iterationId]);
        }

        var promises: IPromise<any>[] = [];

        // Prepare promises for parallel calls
        promises.push(this.beginGetCapacities(iterationId));
        promises.push(this._beginGetTeamDaysOff(iterationId));

        return Q.all(promises).spread((teamMemberCapacities: Work_Contracts.TeamMemberCapacity[], teamDaysOff: Work_Contracts.TeamSettingsDaysOff) => {
            // Check to see if this was populated by another call
            if (this._teamCapacities[iterationId]) {
                return this._teamCapacities[iterationId];
            }

            const tfsContext = this.getTfsContext();
            const weekends = AgileUtils.TeamSettingsUtils.getTeamWeekends(tfsContext);
            const iterations = AgileUtils.TeamSettingsUtils.getTeamIterations(tfsContext);
            const iterationDetails = Utils_Array.first(iterations, (i: Work_Contracts.TeamSettingsIteration) => i.id == iterationId);
            const startDate = (iterationDetails && iterationDetails.attributes) ? iterationDetails.attributes.startDate : null;
            const endDate = (iterationDetails && iterationDetails.attributes) ? iterationDetails.attributes.finishDate : null;
            const iterationStartDateUTC = (startDate && !isNaN(startDate.getTime())) ? Utils_Date.shiftToUTC(startDate) : null;
            const iterationEndDateUTC = (endDate && !isNaN(endDate.getTime())) ? Utils_Date.shiftToUTC(endDate) : null;
            const rawTeamCapacity: IRawTeamCapacityData = {
                TeamCapacity: {
                    TeamDaysOffDates: teamDaysOff.daysOff,
                    TeamMemberCapacityCollection: teamMemberCapacities
                },
                ActivityValues: allowedActivities,
                IterationId: iterationId,
                IterationStartDate: iterationStartDateUTC,
                IterationEndDate: iterationEndDateUTC,
                Weekends: weekends,
                CurrentDate: Utils_Date.shiftToUTC(new Date(accountCurrentDate))
            };

            this._teamCapacities[iterationId] = new TeamCapacityModel(rawTeamCapacity);

            return this._teamCapacities[iterationId];
        });
    }


    /**
    * Gets the ICapacityOptions object from json island on the page
    * @return ICapacityOptions
    */
    public getCapacityOptions(): ICapacityOptions {
        if (!this._capacityOptions) {
            // populate capacity options from data island
            var serverOptions = <ICapacityOptions>Utils_Core.parseJsonIsland($(document), ".capacity-options", true);

            this._capacityOptions = $.extend(serverOptions, {
                fixedTopText: SprintPlanningResources.Capacity_Unassigned // Ensure that Unassigned label is always inserted at the top of the GroupedProgressControls
            });
        }
        return this._capacityOptions;
    }


    /**
    * Updates the payload by performing date conversions.  This is necessary because dates coming from the server are in
    * GMT.  When the date objects are instantiated on the client, they are updated to take into account the timezone offset
    * of the client.  Since we are working with dates, this shift causes the date to move to a different day than intended.
    * To ensure our calculations are consistent we undo this shift for data coming from the server.  This shift will be
    * inverted when the data is sent back to the server.
    * @param {IRawTeamCapacityData} payload - Payload data to normalize.
    */
    private _normalizePayloadInPlace(payload: IRawTeamCapacityData): IRawTeamCapacityData {
        if (payload.isNormalized) {
            return payload;
        }

        payload.isNormalized = true;

        // Shift the dates in the payload to represent the date as it would be in UTC.
        if (payload.IterationStartDate) {
            payload.IterationStartDate = Utils_Date.shiftToUTC(payload.IterationStartDate);
        }
        if (payload.IterationEndDate) {
            payload.IterationEndDate = Utils_Date.shiftToUTC(payload.IterationEndDate);
        }

        payload.CurrentDate = Utils_Date.shiftToUTC(payload.CurrentDate);

        payload.TeamCapacity.TeamDaysOffDates = convertToUTCDateRanges(payload.TeamCapacity.TeamDaysOffDates);

        payload.TeamCapacity.TeamMemberCapacityCollection.forEach((capacity: Work_Contracts.TeamMemberCapacity) => {
            capacity.daysOff = convertToUTCDateRanges(capacity.daysOff);
        });

        return payload;
    }

    private getCapacityDataFromJsonIsland(): IRawTeamCapacityData {
        var payload: IRawTeamCapacityData = null;
        var teamCapacityDataHtml = $(".team-capacity-data").html();
        if (teamCapacityDataHtml) {
            payload = Utils_Core.parseMSJSON(teamCapacityDataHtml, false);
        }
        return payload;
    }

    private getWorkHttpClient(): Work_WebApi.WorkHttpClient {
        var tfsConnection = new Service.VssConnection(TFS_Host_TfsContext.TfsContext.getDefault().contextData);
        return tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
    }

    private getTeamContext(): TFS_Core_Contracts.TeamContext {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        return <TFS_Core_Contracts.TeamContext>{ projectId: tfsContext.contextData.project.id, teamId: tfsContext.currentTeam.identity.id };
    }
}

/**
* Days Off validator functions
**/
export interface GroupValidatorOptions extends Validation.BaseValidatorOptions {
    validators: Validation.BaseValidator<Validation.BaseValidatorOptions>[];
}

export class GroupValidator extends Validation.BaseValidator<GroupValidatorOptions> {

    public static enhancementTypeName: string = "tfs.agile.groupvalidator";

    public static optionsPrefix: string = "groupValidator";

    private _invalidValidator: any;

    /**
     * Used to attach multiple validators to a field.
     * The options have the following structure:
     *     {
     *         validators: [array of validators]
     *     }
     */
    constructor(options?) {

        super(options);

        Diag.Debug.assertParamIsObject(options, "options");
        Diag.Debug.assertParamIsArray(options.validators, "options.validators", false);
    }

    /**
     * Called to determine if the value valid.
     *
     * @return
     */
    public isValid(): boolean {

        var i, l,
            validator,
            validators = this._options.validators,
            result = true;

        // Clear out previous invalid validator instance
        this._invalidValidator = null;

        // Check each of the validators to see if there are any that are invalid.
        for (i = 0, l = validators.length; i < l; i += 1) {
            validator = validators[i];

            // If the validator is not valid, save it off and stop validating.
            if (!validator.isValid()) {
                result = false;

                // If the validator does not have an error message, keep going to see if there
                // are any that do have one.
                if (validator.getMessage()) {
                    this._invalidValidator = validator;
                    break;
                }
            }
        }

        return result;
    }

    /**
     * Get the message associated with the invalid validator.
     */
    public getMessage() {

        return this._invalidValidator ? this._invalidValidator.getMessage() : "";
    }
}

export interface IDateRelativeToValidatorOptions extends Validation.BaseValidatorOptions {
    relativeToField: any;
    comparison: DateComparisonOptions;
    message: string;
    parseFormat?: string;
}

export const enum DateComparisonOptions {
    GREATER_OR_EQUAL,
    LESS_OR_EQUAL
}

export class DateRelativeToValidator extends Validation.BaseValidator<IDateRelativeToValidatorOptions> {

    public static enhancementTypeName: string = "tfs.agile.daterelativetovalidator";

    public static optionsPrefix: string = "dateRelativeToValidator";

    /**
     * Used to validate that a field is relative to a field provided in the optins.
     * The options have the following structure:
     *     {
     *         relativeToField: [Input control that contains the date this date is relative to.]
     *         comparison:  [Options are DateComparisonOptions]
     *         message: [Message to be reported when validation fails.]
     *         parseFormat: [OPTIONAL: date format to use for parsing.]
     *     }
     */
    constructor(options?: IDateRelativeToValidatorOptions) {

        super(options);

        Diag.Debug.assertParamIsObject(options, "options");
        Diag.Debug.assertParamIsNumber(options.comparison, "options.comparison");
        Diag.Debug.assertParamIsObject(options.relativeToField, "options.relativeToField");
        Diag.Debug.assertParamIsString(options.message, "options.message");
    }

    /**
     * @param options
     */
    public initializeOptions(options?: IDateRelativeToValidatorOptions) {

        super.initializeOptions(<IDateRelativeToValidatorOptions>$.extend({
            // Set a unique CSS class for this validator so that other validators do not overwrite it.
            invalidCssClass: "date-relative-to-invalid",
            // Set a specific group so results for this validator are not included  when validating the rows group.
            group: "default"
        }, options));
    }

    /**
     * Called to determine if the value is between the range.
     *
     * @return
     */
    public isValid(): boolean {

        var fieldText = $.trim(this.getValue()),
            relativeToFieldText = $.trim(this._options.relativeToField.val()),
            fieldDate,
            relativeToFieldDate,
            result = false;

        // Only perform the validation if the fields have text in them.
        if (fieldText && relativeToFieldText) {
            fieldDate = Utils_Date.parseDateString(fieldText, this._options.parseFormat, true);
            relativeToFieldDate = Utils_Date.parseDateString(relativeToFieldText, this._options.parseFormat, true);
        }
        else {
            // Empty text is considered valid.
            return true;
        }

        // If both fields have valid dates, perform the appropriate comparison.
        if ((fieldDate instanceof Date) && !isNaN(fieldDate.getTime()) && relativeToFieldDate instanceof Date && !isNaN(relativeToFieldDate.getTime())) {
            if (this._options.comparison === DateComparisonOptions.GREATER_OR_EQUAL) {
                // Greater than or equal.
                result = fieldDate >= relativeToFieldDate;
            }
            else {
                // Less than or equal.
                result = fieldDate <= relativeToFieldDate;
            }
        }
        else {
            // Date relative to ca not be validated if the dates are not valid.  Let other validators report the error for a more meaningful message.
            result = true;
        }

        return result;
    }

    /**
     * Get the message associated with this validator.
     */
    public getMessage() {

        return this._options.message;
    }
}

export interface IDateBetweenRangeValidatorOptions extends Validation.BaseValidatorOptions {
    startDate: Date;
    endDate: Date;
    message: string;
    parseFormat?: string;
}

export class DateBetweenRangeValidator extends Validation.BaseValidator<IDateBetweenRangeValidatorOptions> {

    public static enhancementTypeName: string = "tfs.agile.datebetweenrangevalidator";

    public static optionsPrefix: string = "dateBetweenRangeValidator";

    /**
     * Used to validate that a field containing a date is between the ranges provided in the options.
     * The options have the following structure:
     *     {
     *         startDate: [Date that the field should start on or after.]
     *         endDate: [Date that the field should end on or before.]
     *         message: [Message to be reported when validation fails.]
     *         parseFormat: [OPTIONAL: date format to use for parsing.]
     *     }
     */
    constructor(options?: IDateBetweenRangeValidatorOptions) {

        super(options);

        Diag.Debug.assertParamIsObject(options, "options");
        Diag.Debug.assertParamIsDate(options.startDate, "options.startDate");
        Diag.Debug.assertParamIsDate(options.endDate, "options.endDate");
        Diag.Debug.assertParamIsString(options.message, "options.message");
    }

    /**
     * @param options
     */
    public initializeOptions(options?: IDateBetweenRangeValidatorOptions) {

        super.initializeOptions(<IDateBetweenRangeValidatorOptions>$.extend({
            // Set a unique CSS class for this validator so that other validators do not overwrite it.
            invalidCssClass: "date-range-invalid",
            // Set a specific group so results for this validator are not included  when validating the rows group.
            group: "default"
        }, options));
    }

    /**
     * Called to determine if the value is between the range.
     *
     * @return
     */
    public isValid(): boolean {

        var text = $.trim(this.getValue()),
            date,
            result;

        // Only perform the validation if the field has text in it.
        if (text) {
            // Attempt to parse with the parse format.
            date = Utils_Date.parseDateString(text, this._options.parseFormat, true);
        }
        else {
            // Empty text is considered a valid date.
            return true;
        }

        // If the date is valid, check the range.
        if ((date instanceof Date) && !isNaN(date.getTime())) {
            result = date >= this._options.startDate && date <= this._options.endDate;
        }
        else {
            // Range can not be validated if the dates are not valid.  Let other validators report the error for a more meaningful message.
            result = true;
        }

        return result;
    }

    /**
     * Get the message associated with this validator.
     */
    public getMessage() {

        return this._options.message;
    }
}

export interface DaysOffDialogOptions extends Dialogs.IModalDialogOptions {
    dateRanges?: any[];
    excludeTeamDaysOff?: boolean;
}

export class DaysOffDialog extends Dialogs.ModalDialogO<DaysOffDialogOptions> {

    public static enhancementTypeName: string = "tfs.agile.daysoffdialog";

    public static CSSCLASS_DIALOG_CONTAINER: string = "days-off-dialog-container";
    public static CSSCLASS_DATES_TABLE_CONTAINER: string = "days-off-dialog-dates-table-container";
    public static CSSCLASS_ICON_HEADER: string = "days-off-dialog-icon-header-cell";
    public static CSSCLASS_DATE_HEADER: string = "days-off-dialog-date-header-cell";
    public static CSSCLASS_DATE_HEADER_START_ID: string = "days-off-dialog-date-header-cell-start";
    public static CSSCLASS_DATE_HEADER_END_ID: string = "days-off-dialog-date-header-cell-end";
    public static CSSCLASS_DAYS_OFF_HEADER: string = "days-off-dialog-days-off-header-cell";
    public static CSSCLASS_DAYS_OFF_COUNT: string = "days-off-dialog-days-off-count";
    public static CSSCLASS_LINK_CONTAINER: string = "days-off-dialog-link-container";
    public static CSSCLASS_BUTTON: string = "agile-url-link-button";
    public static CSSCLASS_BUTTON_SPAN: string = "days-off-dialog-button-span";
    public static CSSCLASS_LINK: string = "days-off-dialog-link";
    public static CSSCLASS_TOTAL_CONTAINER: string = "days-off-dialog-total-days-off-container";
    public static CSSCLASS_TOTAL_TEXT: string = "days-off-dialog-total-days-off-text";
    public static CSSCLASS_TOTAL_COUNT: string = "days-off-dialog-total-days-off-count";
    public static VALIDATION_GROUP: string = "validation-group";

    private _$datesTable: any;
    private _$addLink: any;
    private _$addIcon: any;
    private _errorPane: any;
    private _teamCapacity: TeamCapacityModel;
    private _totalDaysOff: number = 0;
    private _$totalDaysOffCell: any;
    private _nextValidationGroupNumber: number = 0;
    private _dateRangeCache: Work_Contracts.DateRange[];
    private _overlappingValidationGroups: any;
    private _emptyRows: any;

    /**
     * Dialog for displaying and updating days off.
     *
     * @param options
     * The options have the following structure:
     *   {
     *     title: [Title of the dialog]
     *     dateRanges: [The date ranges to be displayed in the dialog.]
     *     excludeTeamDaysOff: [Indicates if team days off should be excluded when calcuating days off.]
     *     okCallback: Method that is invoked when the ok button is clicked.
     *         closeHandler(updatedDateRanges)
     *             updatedDateRanges: [array of updated date ranges.]
     *   }
     *
     */
    constructor(options?: any) {

        // Default the width and height of the dialog if overrides were not
        // provided in the options.
        super($.extend({
            resizable: false,
            width: 500,
            height: "auto",
            minWidth: 400,
            minHeight: 220
        },
            options));

        Diag.Debug.assertParamIsObject(options, "options");
        Diag.Debug.assertParamIsArray(options.dateRanges, "options.dateRanges", false);
        Diag.Debug.assertParamIsBool(options.excludeTeamDaysOff, "options.excludeTeamDaysOff");
        Diag.Debug.assertParamIsFunction(options.okCallback, "options.okCallback");
        var capacityDataService = getService();
        var capacityOptions = capacityDataService.getCapacityOptions();

        // Initialize the members.
        this._teamCapacity = capacityDataService.getCapacityModel(capacityOptions.iterationId);
        this._dateRangeCache = [];
        this._emptyRows = {};
    }

    /**
     * OVERRIDE: Intialize the control.
     */
    public initialize() {

        super.initialize();

        // Layout the page.
        this._createLayout();

        // Validate the page as date ranges of the sprint could have changed
        // invalidating the persisted data.
        // NOTE: This initial validation of each of the rows populates the _dateRangeCache
        //       with the valid rows data.
        this._validateAllRows();

        // Enable the OK button.
        this.updateOkButton(true);

        this._setFocusOnFirstInput();
    }

    /**
     * OVERRIDE: Called when the ok button is clicked.
     *
     * @param e Arguments for the event.
     */
    public onOkClick(e?: any) {

        var $lastRow = $("tr:gt(0):last", this._$datesTable), // Skip the header row.
            isValid = false;

        // If the last row is empty, allow the dialog to close.
        if (this._isRowEmpty($lastRow)) {
            isValid = true;
        }
        // If everything is valid, allow the dialog to close
        else if (this._validateAllRows()) {
            isValid = true;
        }

        if (isValid) {
            super.onOkClick(e);
        }
    }

    /**
     * OVERRIDE: Gets the date ranges currently set in the dialog.  The value returned from
     * this method will be passed to the okCallback.
     *
     * @return An array of date ranges
     */
    public getDialogResult(): any[] {

        return this._getValidDateRanges(false);
    }

    /**
     * Create the initial layout of the page.
     */
    private _createLayout() {
        var $dialogContainer,
            $controlElement = this.getElement();

        // Setup the container for the dialogs content.
        $dialogContainer = $("<div/>")
            .addClass(DaysOffDialog.CSSCLASS_DIALOG_CONTAINER);

        // Setup the error pane.
        this._errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $controlElement);

        // Create the main table
        this._createDaysOffTable($dialogContainer);

        // Create the add link.
        this._createAddRowLink($dialogContainer);

        // Create the total days off info.
        this._createTotalDaysOffRow($dialogContainer);

        // Add add the dialog container to the dialog.
        $controlElement.append($dialogContainer);

        this._fixupLayout();
    }

    /**
     * Workaround for vstspioneer bug 856929. If the dialog is too small for the add-dates row
     * any mouseenter or mouseleave over the icons in the table cause the surrounding div to expand
     * vertially if the overflow-x is set to 'auto'.
     *
     * The workaround here is to detect if the table will be wider than the container and if so,
     * change the overflow-x to 'scroll'.
     *
     * This avoids us seeing the scroll bar when we don't need it and avoids the IE9 behavior.
     */
    private _fixupLayout() {

        var tableWidth = this._$datesTable.outerWidth(),
            containerWidth = this._$datesTable.parent().innerWidth();

        if (containerWidth < tableWidth) {
            this._$datesTable.parent().css("overflow-x", "scroll");
        }
    }

    /**
     * Creates the days off table in the provided container.
     *
     * @param $container Container to add to.
     */
    private _createDaysOffTable($container: JQuery) {

        Diag.Debug.assertParamIsObject($container, "$container");

        var i, l,
            $tableContainer,
            dateRanges = this._options.dateRanges;

        // Create the main table
        $tableContainer = $("<div/>")
            .addClass(DaysOffDialog.CSSCLASS_DATES_TABLE_CONTAINER);


        var $netDaysOffHeaderCell = $("<td/>")
            .addClass(DaysOffDialog.CSSCLASS_DAYS_OFF_HEADER)
            .text(SprintPlanningResources.DaysOffDialog_DaysOffHeader);

        this._$datesTable = $("<table/>")
            .append($("<tr/>")
                .append($("<td/>")  // Header for icon column is empty.
                    .addClass(DaysOffDialog.CSSCLASS_ICON_HEADER))
                .append($("<td/>")
                    .prop("id", DaysOffDialog.CSSCLASS_DATE_HEADER_START_ID)
                    .addClass(DaysOffDialog.CSSCLASS_DATE_HEADER)
                    .text(SprintPlanningResources.DaysOffDialog_StartDateHeader))
                .append($("<td/>")
                    .prop("id", DaysOffDialog.CSSCLASS_DATE_HEADER_END_ID)
                    .addClass(DaysOffDialog.CSSCLASS_DATE_HEADER)
                    .text(SprintPlanningResources.DaysOffDialog_EndDateHeader))
                .append($netDaysOffHeaderCell));

        RichContentTooltip.add(SprintPlanningResources.DaysOffDialog_DaysOffTooltip, $netDaysOffHeaderCell);

        $tableContainer.append(this._$datesTable);

        if (dateRanges.length > 0) {
            // Create the rows for each of the provided date ranges.
            for (i = 0, l = dateRanges.length; i < l; i += 1) {
                this._createDaysOffRow(dateRanges[i]);
            }
        }
        else {
            // Create an empty row since there are no ranges set yet.
            this._createDaysOffRow();
        }

        // Add the table to the container
        $container.append($tableContainer);
    }

    /**
     * Creates the add row icon and link.
     *
     * @param $container Container to add to.
     */
    private _createAddRowLink($container: JQuery) {

        Diag.Debug.assertParamIsObject($container, "$container");

        var that = this,
            $linkContainer, $linkButton;

        // Create the add link.
        $linkContainer = $("<div/>")
            .addClass(DaysOffDialog.CSSCLASS_LINK_CONTAINER);

        $linkButton = $("<button/>")
            .addClass(DaysOffDialog.CSSCLASS_BUTTON)
            .bind("click.tfs.agile", delegate(this, this._addRowHandler))
            .bind("keydown.tfs.agile",
                function (event) {
                    if (event.keyCode === Utils_UI.KeyCode.ENTER) {
                        that._$addLink.click(); // Fire click event
                        return false; // Block event propagation
                    }
                });

        this._$addLink = $("<span/>")
            .append(SprintPlanningResources.DaysOffDialog_AddLink)
            .addClass(DaysOffDialog.CSSCLASS_BUTTON_SPAN);

        this._$addIcon = $("<span/>")
            .addClass("icon clickable bowtie-icon bowtie-math-plus-heavy");

        $linkButton.append(this._$addIcon);
        $linkButton.append(this._$addLink);
        $linkContainer.append($linkButton);

        // Add the link to the container.
        $container.append($linkContainer);
    }

    /**
     * Sets focus on the first input in the days off dialog
     */
    private _setFocusOnFirstInput() {

        Diag.Debug.assertIsObject(this._element);

        $("input:visible:first", this._element).focus();
    }

    /**
     * Creates the total days off row at the bottom of the dialog.
     *
     * @param $container Container to add to.
     */
    private _createTotalDaysOffRow($container: JQuery) {

        Diag.Debug.assertParamIsObject($container, "$container");

        var $totalContainer;

        // Create the total days off info.
        this._$totalDaysOffCell = $("<div/>")
            .addClass(DaysOffDialog.CSSCLASS_TOTAL_COUNT);

        $totalContainer = $("<div/>")
            .addClass(DaysOffDialog.CSSCLASS_TOTAL_CONTAINER)
            .append($("<div/>")
                .addClass(DaysOffDialog.CSSCLASS_TOTAL_TEXT)
                .text(SprintPlanningResources.DaysOffDialog_Total))
            .append(this._$totalDaysOffCell);

        RichContentTooltip.add(SprintPlanningResources.DaysOffDialog_DaysOffTooltip, $totalContainer);

        // Add the total row to the container.
        $container.append($totalContainer);
    }

    /**
     * Creates the days off row for the provided date range.
     *
     * @param dateRange OPTIONAL: Date range to be displayed.  When this is not provided, the fields are left blank.
     */
    private _createDaysOffRow(dateRange?: any) {

        var $row = $("<tr/>"),
            $startDate = $("<input/>"),
            $endDate = $("<input/>"),
            $deleteIcon,
            validationGroupName;

        // Setup the name of the validation group which will be used to
        // validate the contents of this row.
        validationGroupName = DaysOffDialog.VALIDATION_GROUP + this._nextValidationGroupNumber;
        this._nextValidationGroupNumber += 1;
        $row.data(DaysOffDialog.VALIDATION_GROUP, validationGroupName);

        // Setup delete this row cell.
        $deleteIcon = $("<button/>")
            .attr("aria-label", SprintPlanningResources.DaysOffDialog_DeleteTooltip)
            .bind("click.tfs.agile", delegate(this, this._deleteRowHandler, $row))
            .addClass("delete-row")
            .bind("keydown.tfs.agile",
                function (event) {
                    if (event.keyCode === Utils_UI.KeyCode.ENTER) {
                        $deleteIcon.click(); // Fire click event
                        return false; // Block event propagation
                    }
                }
            )
            .append($("<div/>")
                .addClass("bowtie-icon bowtie-edit-delete")
                .addClass("icon"));

        RichContentTooltip.add(SprintPlanningResources.DaysOffDialog_DeleteTooltip, $deleteIcon);

        $row.append($("<td/>")
            .append($deleteIcon));

        // Add the start date cell.
        $startDate
            .attr("type", "text")
            .attr("aria-labelledby", DaysOffDialog.CSSCLASS_DATE_HEADER_START_ID)
            .addClass("validate")
            .val(dateRange ? Utils_Date.localeFormat(dateRange.start, "d", true) : "")
            .bind("blur.tfs.agile", delegate(this, this._dateChanged, $row));

        $row.append($("<td/>")
            .append($startDate));

        // Enhance with the date picker control.
        Controls.Enhancement.enhance(Combos.DatePicker, $startDate,
            {
                type: "date-time",
                dropOptions: {
                    host: $(document.body)
                }
            });

        // Add the validation to the start date control.
        this._addValidatorsToDateField(
            $startDate,
            validationGroupName,
            SprintPlanningResources.DaysOffDialog_StartDateBetweenRangeError,
            SprintPlanningResources.DaysOffDialog_EndBeforeStartError,
            $endDate,
            DateComparisonOptions.LESS_OR_EQUAL);

        // Add the end date cell.
        $endDate
            .attr("type", "text")
            .attr("aria-labelledby", DaysOffDialog.CSSCLASS_DATE_HEADER_END_ID)
            .addClass("validate")
            .val(dateRange ? Utils_Date.localeFormat(dateRange.end, "d", true) : "")
            .bind("blur.tfs.agile", delegate(this, this._dateChanged, $row));

        $row.append($("<td/>")
            .append($endDate));

        // Enhance with the date picker control.
        Controls.Enhancement.enhance(Combos.DatePicker, $endDate,
            {
                type: "date-time",
                dropOptions: {
                    host: $(document.body)
                },
                getInitialDate: function (combo) {
                    return Utils_Date.parseLocale($startDate.val(), null, true) || undefined;
                }
            });

        // Add the validation to the end date control.
        this._addValidatorsToDateField(
            $endDate,
            validationGroupName,
            SprintPlanningResources.DaysOffDialog_EndDateBetweenRangeError,
            SprintPlanningResources.DaysOffDialog_EndBeforeStartError,
            $startDate,
            DateComparisonOptions.GREATER_OR_EQUAL);

        // Add the days off count cell.
        $row.append($("<td/>")
            .append($("<div/>")
                .addClass(DaysOffDialog.CSSCLASS_DAYS_OFF_COUNT)));

        // Add the row to the table.
        this._$datesTable.append($row);

        // If the row being created is a blank row, trigger validation on it
        // so the new fields will show up as required.
        if (!dateRange) {
            this._validateRow($row, []);
        }

        // Set the focus on the start date of this newly added row
        $startDate.focus();
    }

    /**
     * Sets up validation for the field provided.
     *
     * @param $field Field to add validation to.
     * @param validationGroupName Name of the validation group to put the validators in.
     * @param dateRangeErrorMessage Message to be displayed by the date range validator.
     * @param relativeToErrorMessage Message to be displayed by the relative to validator.
     * @param $relativeToField The field that the one validation is being added to is relative to.
     * @param relativeToComparison Comparison to use for the relative to validator.
     */
    private _addValidatorsToDateField($field: JQuery, validationGroupName: string, dateRangeErrorMessage: string, relativeToErrorMessage: string, $relativeToField: JQuery, relativeToComparison: DateComparisonOptions) {

        Diag.Debug.assertParamIsObject($field, "$field");
        Diag.Debug.assertParamIsString(validationGroupName, "validationGroupName");
        Diag.Debug.assertParamIsString(dateRangeErrorMessage, "dateRangeErrorMessage");
        Diag.Debug.assertParamIsString(relativeToErrorMessage, "relativeToErrorMessage");
        Diag.Debug.assertParamIsObject($relativeToField, "$relativeToField");
        Diag.Debug.assertParamIsNumber(relativeToComparison, "relativeToComparison");

        var validators = [];

        // Add the validation to the end date control.
        validators.push(<Validation.RequiredValidator<Validation.BaseValidatorOptions>>Controls.Enhancement.enhance(Validation.RequiredValidator, $field, {
            invalidCssClass: "required-invalid",    // Set a unique CSS class for this validator so that other validators do not overwrite it.
            group: "default",                       // Set a specific group so results for this validator are not included  when validating the rows group.
            message: ""                             // No message for required as we do not want the error popup to show for this validator.
        }));

        validators.push(<Validation.DateValidator<Validation.DateValidatorOptions>>Controls.Enhancement.enhance(Validation.DateValidator, $field, {
            invalidCssClass: "date-invalid",    // Set a unique CSS class for this validator so that other validators do not overwrite it.
            group: "default",                   // Set a specific group so results for this validator are not included  when validating the rows group.
            message: SprintPlanningResources.DaysOffDialog_DateMustBeValidDateError
        }));

        validators.push(<DateBetweenRangeValidator>Controls.Enhancement.enhance(DateBetweenRangeValidator, $field, {
            startDate: this._teamCapacity.getIterationStartDate(),
            endDate: this._teamCapacity.getIterationEndDate(),
            message: dateRangeErrorMessage
        }));

        validators.push(<DateRelativeToValidator>Controls.Enhancement.enhance(DateRelativeToValidator, $field, {
            comparison: relativeToComparison,
            relativeToField: $relativeToField,
            message: relativeToErrorMessage
        }));

        <GroupValidator>Controls.Enhancement.enhance(GroupValidator, $field, {
            validators: validators,
            group: validationGroupName
        });
    }

    /**
     * Called when the user clicks on the delete row icon.
     *
     * @param e Arguments for the event.
     * @param $row Row which is being deleted.
     */
    private _deleteRowHandler(e: any, $row: JQuery) {

        Diag.Debug.assertParamIsObject(e, "e");
        Diag.Debug.assertParamIsObject($row, "$row");

        e.preventDefault();

        var validationGroupName = $row.data(DaysOffDialog.VALIDATION_GROUP);

        // Ensure the totals are updated to not include this row.
        this._updateDaysOffCounts($row, false);

        // Delete any data associated with the row.
        delete this._dateRangeCache[validationGroupName];
        delete this._emptyRows[validationGroupName];

        // Validate for overlap in dates since removing this row may have resolved an overlap error.
        this._validateNoOverlapInDateRanges();

        // Remove the row.
        $row.remove();

        // If the header row is the only row left in the table, draw an empty row.
        if ($("tr:gt(0)", this._$datesTable).length === 0) {
            this._createDaysOffRow();
        }

        this._setFocusOnFirstInput();
    }

    /**
     * Called when the user clicks on the add row icon or link.
     *
     * @param e Arguments for the event.
     */
    private _addRowHandler(e?: any) {

        if (e) {
            e.preventDefault();
        }

        // Add a new row to the table.
        if (!this._validateAllRows()) {
            this._errorPane.setError(SprintPlanningResources.DaysOffDialog_AddRowError);
        }
        else {
            this._createDaysOffRow();
        }
    }

    /**
     * Invoked when the value of one of the dates changes.
     *
     * @param e arguments for the event.
     * @param $row Row which contains the date that has changed.
     */
    private _dateChanged(e?: any, $row?: JQuery) {

        Diag.Debug.assertParamIsObject(e, "e");
        Diag.Debug.assertParamIsObject($row, "$row");

        var validationGroupName = $row.data(DaysOffDialog.VALIDATION_GROUP),
            result = [],
            isValid;

        isValid = this._validateRow($row, result);

        if (isValid) {
            // Validate that the there is no overlap in any of the valid date ranges
            // with this group.
            isValid = this._validateNoOverlapInDateRanges(validationGroupName);
        }

        // Update the count of days off.
        this._updateDaysOffCounts($row, isValid);
    }

    /**
     * Validates that each row is valid.
     *
     * @return
     */
    private _validateAllRows(): boolean {

        var that = this,
            $rows = $("tr:gt(0)", this._$datesTable), // Skip the header row.
            overallResult = [],
            noOverlappingDateRanges;

        // Validate each of the rows.
        $rows.each(function () {
            var $row = $(this),
                result = [];

            // Validate the row.
            that._validateRow($row, result);

            // Ensure that the days off count is up to date based on the valid state of the row.
            that._updateDaysOffCounts($row, result.length === 0);

            // Merge this rows result with the overall result.
            overallResult = overallResult.concat(result);
        });

        // If there were validation errors, display the first one.
        if (overallResult.length !== 0) {
            this._showValidationError(overallResult);
        }

        // Ensure there are no overlapping dates.
        noOverlappingDateRanges = this._validateNoOverlapInDateRanges();

        return overallResult.length === 0 && noOverlappingDateRanges;
    }

    /**
     * Performs validation of the dates in the provided row.
     *
     * @param $row Row to be validated.
     * @param result Empty array which validation errors will be added to.
     * @return
     */
    private _validateRow($row: JQuery, result: any[]): boolean {

        Diag.Debug.assertParamIsObject($row, "$row");
        Diag.Debug.assertParamIsArray(result, "result", false);

        var validationGroupName = $row.data(DaysOffDialog.VALIDATION_GROUP),
            isValid,
            dateRange;

        // Trigger validation for the row.
        Validation.validateGroup(validationGroupName, result);
        isValid = result.length === 0;

        // If the row is not valid, clear the cached information for the row.
        if (!isValid) {
            delete this._dateRangeCache[validationGroupName];
        }
        else {
            // Save off the date range for the row.
            dateRange = this._getDateRangeFromRow($row);
            if (dateRange) {
                this._dateRangeCache[validationGroupName] = dateRange;
            }
        }

        // If the row is empty, add it to the empty rows.
        if (this._isRowEmpty($row)) {
            this._emptyRows[validationGroupName] = true;
        }
        else {
            // Since the row is valid, it is not empty so remove it form the
            // empty rows if it was in there.
            delete this._emptyRows[validationGroupName];
        }

        return isValid;
    }

    /**
     * Validates that there is no overlap in date ranges with the provided validation group
     * name.  When no group name is provided everything is validated.
     *
     * @param validationGroupName OPTIONAL: Name of the validaton group to validate.
     */
    private _validateNoOverlapInDateRanges(validationGroupName?: string) {

        var i, l,
            isValid = true,
            dateRanges = [],
            propertyName,
            previousDateRange,
            currentDateRange,
            previousOverlappingGroups = this._overlappingValidationGroups || {},
            currentOverlappingGroups = {};

        // Get the valid date ranges and include the validation group name
        // associated with the date range in the date range.
        dateRanges = this._getValidDateRanges(true);

        // Sort the date ranges by start date.
        dateRanges.sort(DateRangeStartDateCompare);

        // See if any of the date ranges overlap.
        previousDateRange = dateRanges[0];
        for (i = 1, l = dateRanges.length; i < l; i += 1) {
            currentDateRange = dateRanges[i];

            // If the start date of the current item is on or before the end date of the previous item,
            // then there is an overlap.
            if (currentDateRange.start <= previousDateRange.end) {
                // Flip the invalid bit if this matches the group name being validated.
                if (validationGroupName === undefined ||
                    validationGroupName === currentDateRange.validationGroupName ||
                    validationGroupName === previousDateRange.validationGroupName) {
                    isValid = false;
                }

                // Add the groups to the overlapping groups collection.
                currentOverlappingGroups[currentDateRange.validationGroupName] = true;
                currentOverlappingGroups[previousDateRange.validationGroupName] = true;

                // Invalidate the fields for both date ranges rows.
                this._toggleInvalidForGroupRow(currentDateRange.validationGroupName, true);
                this._toggleInvalidForGroupRow(previousDateRange.validationGroupName, true);

                // Merge the date range and store it as the previous date range.
                previousDateRange = {
                    start: previousDateRange.start,
                    end: currentDateRange.end > previousDateRange.end ? currentDateRange.end : previousDateRange.end,
                    validationGroupName: currentDateRange.validationGroupName
                };
            }
            else {
                previousDateRange = currentDateRange;
            }
        }

        // If there was overlap in date ranges, display the error.
        if (!isValid) {
            this._errorPane.setError(SprintPlanningResources.DaysOffDialog_DateRangeOverlapError);
        }

        // Trigger validation on the rows which are no longer overlapping.
        for (propertyName in previousOverlappingGroups) {
            if (previousOverlappingGroups.hasOwnProperty(propertyName)) {
                // If the group is no longer overlapping, revalidate it.
                if (!(propertyName in currentOverlappingGroups)) {
                    this._toggleInvalidForGroupRow(propertyName, false);
                }
            }
        }

        // Save off the new set of overlapping groups.
        this._overlappingValidationGroups = currentOverlappingGroups;

        return isValid;
    }

    /**
     * Display the first validation error from the result.
     *
     * @param result Validators which have errors.
     */
    private _showValidationError(result: any[]) {

        Diag.Debug.assertParamIsArray(result, "result", true);  // Ensure not empty.

        var i, l,
            validator,
            message;

        // Get the message from the first validator that has one.
        for (i = 0, l = result.length; i < l; i += 1) {
            validator = result[i];

            // If the validator has a message, then use it.
            message = validator.getMessage();
            if (message) {
                break;
            }
        }

        if (message) {
            this._errorPane.setError(message);
        }
    }

    /**
     * Toggles the invalid class on each of the input fields in the row associated with the validation group.
     *
     * @param validationGroupName Name of the validation group to invalidate.
     * @param isInvalid Indicates if the row is invalid.
     */
    private _toggleInvalidForGroupRow(validationGroupName: string, isInvalid: boolean) {

        Diag.Debug.assertParamIsString(validationGroupName, "validationGroupName");
        Diag.Debug.assertParamIsBool(isInvalid, "isInvalid");

        var $row = this._getRowForValidationGroup(validationGroupName);

        // Toggle the invalid class for each of input fields in the row.
        $("input", $row).toggleClass("invalid", isInvalid);
        this._updateDaysOffCounts($row, !isInvalid);
    }

    /**
     * Updates the days off count for the row provided.
     *
     * @param $row Row to update counts for.
     * @param isValid OPTIONAL: Indicates if the row is currently valid.  Default is true.
     */
    private _updateDaysOffCounts($row: JQuery, isValid?: boolean) {

        Diag.Debug.assertParamIsObject($row, "$row");

        var $countCell = $("." + DaysOffDialog.CSSCLASS_DAYS_OFF_COUNT, $row),
            previousCount = Number($countCell.text()),
            newCount = 0,
            filteredTeamDaysOffDates,
            iterationStartDate = this._teamCapacity.getIterationStartDate(),
            iterationEndDate = this._teamCapacity.getIterationEndDate(),
            dateRange = this._getCachedDateRangeForRow($row);

        // Default the value of isValid if it is not set.
        isValid = isValid !== undefined ? isValid : true;

        if (isValid && dateRange) {
            // Normalize the date range based on the iteration dates.
            dateRange = Agile.CapacityDateUtils.normalizeForDateRange(dateRange, iterationStartDate, iterationEndDate);

            // If the date is between the start and the end of the sprint, include it.
            if (dateRange.start >= iterationStartDate && dateRange.start <= iterationEndDate &&
                dateRange.end >= iterationStartDate && dateRange.end <= iterationEndDate) {

                // If team days off are to be excluded, get the filterd list of team days off.
                if (this._options.excludeTeamDaysOff) {
                    filteredTeamDaysOffDates = Agile.CapacityDateUtils.getMergedDateRangeList(
                        this._teamCapacity.getIterationInfo().getTeamDaysOffDates(),
                        [],
                        dateRange.start,
                        dateRange.end);
                }
                else {
                    filteredTeamDaysOffDates = [];
                }

                newCount = Agile.CapacityDateUtils.getDateBreakdown(
                    dateRange.start,
                    dateRange.end,
                    filteredTeamDaysOffDates,
                    this._teamCapacity.getWeekends()).workingDays;
            }
        }

        $countCell.text((isValid && dateRange) ? ("" + newCount) : "");

        // Update the total count
        this._totalDaysOff = this._totalDaysOff - previousCount + newCount;
        this._$totalDaysOffCell.text(this._totalDaysOff);
    }

    /**
     * Finds the row associated with the validation group name.
     *
     * @param validationGroupName Name of the validation group to find.
     */
    private _getRowForValidationGroup(validationGroupName: string) {

        Diag.Debug.assertParamIsString(validationGroupName, "validationGroupName");

        var $rows = $("tr:gt(0)", this._$datesTable),
            $row;

        $rows.each(function () {
            var $currentRow = $(this),
                value = $currentRow.data(DaysOffDialog.VALIDATION_GROUP);

            // If this is the row matching the group.
            if (value === validationGroupName) {
                $row = $currentRow;

                // Stop looping because we found our row.
                return false;
            }
        });

        return $row;
    }

    /**
     * Gets an array of valid date ranges.
     *
     * @param includeGroupName Indicates if the group name that the date range is associated with should be included in the date range.
     */
    private _getValidDateRanges(includeGroupName: boolean) {

        Diag.Debug.assertParamIsBool(includeGroupName, "includeGroupName");

        var dateRanges: Work_Contracts.DateRange[] = [],
            dateRangeCache: Work_Contracts.DateRange[] = this._dateRangeCache,
            propertyName,
            currentDateRange;

        // Build the list of date ranges.
        for (propertyName in dateRangeCache) {
            if (dateRangeCache.hasOwnProperty(propertyName)) {
                currentDateRange = dateRangeCache[propertyName];

                // Add the group name to the date range so we can use it to map back to the row
                // if it was requested.
                if (includeGroupName) {
                    currentDateRange.validationGroupName = propertyName;
                }

                // Add the date range to the list.
                dateRanges.push(currentDateRange);
            }
        }

        return dateRanges;
    }

    /**
     * Get the date range associated with the row.  Will be undefined if the rows date data is invalid.
     *
     * @return
     */
    private _getCachedDateRangeForRow($row): Work_Contracts.DateRange {

        Diag.Debug.assertParamIsObject($row, "$row");

        var validationGroupName = $row.data(DaysOffDialog.VALIDATION_GROUP);

        return this._dateRangeCache[validationGroupName];
    }

    /**
     * Gets a date range from the provided row.
     *
     * @param $row The row to get the date range for.
     * @return The date range or undefined if the row does not have dates.
     */
    private _getDateRangeFromRow($row: JQuery): any {

        Diag.Debug.assertParamIsObject($row, "$row");

        var $dateInputs = $("input", $row),
            startDateText,
            endDateText,
            dateRange;

        // The first row will not have any inputs.
        if ($dateInputs.length > 0) {
            startDateText = $dateInputs.eq(0).val();
            endDateText = $dateInputs.eq(1).val();

            // If the fields had text, create the dateRange.
            if (startDateText && endDateText) {

                dateRange = {
                    start: Utils_Date.parseLocale(startDateText, null, true),
                    end: Utils_Date.parseLocale(endDateText, null, true)
                };
            }
        }

        return dateRange;
    }

    /**
     * Determines if the provided rows input fields are empty.
     *
     * @param $row Row to check for empty inputs.
     * @return
     */
    private _isRowEmpty($row: JQuery): boolean {

        Diag.Debug.assertParamIsObject($row, "$row");

        var $inputs = $("input", $row);

        return !$inputs.eq(0).val() && !$inputs.eq(1).val();
    }
}


/**
 * Compares two date ranges by their startDate
 *
 * @param a First date range.
 * @param b Second date range
 * @return
 */
export function DateRangeStartDateCompare(a: Work_Contracts.DateRange, b: Work_Contracts.DateRange): number {

    Diag.Debug.assertParamIsObject(a, "a");
    Diag.Debug.assertParamIsDate(a.start, "a.start");
    Diag.Debug.assertParamIsDate(a.end, "a.end");
    Diag.Debug.assertParamIsObject(b, "b");
    Diag.Debug.assertParamIsDate(b.start, "b.start");
    Diag.Debug.assertParamIsDate(b.end, "b.end");

    var aStartDate = a.start,
        bStartDate = b.start;

    return (aStartDate > bStartDate) ? 1 : ((aStartDate < bStartDate) ? -1 : 0);
}

