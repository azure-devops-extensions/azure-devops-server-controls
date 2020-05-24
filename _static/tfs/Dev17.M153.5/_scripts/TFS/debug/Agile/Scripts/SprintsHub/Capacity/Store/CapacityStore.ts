import { IRawTeamCapacityData, TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { CapacityActions } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActions";
import { CapacityContractsMapper } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityContractsMapper";
import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { CapacityHelper } from "Agile/Scripts/SprintsHub/Capacity/CapacityHelper";
import * as DaysOffUtils from "Agile/Scripts/SprintsHub/Capacity/DaysOffUtils";
import { IAggregatedCapacity, ISprintCapacityOptions } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import * as Diag from "VSS/Diag";
import * as Store_Base from "VSS/Flux/Store";
import * as Utils_Array from "VSS/Utils/Array";
import { shiftToUTC } from "VSS/Utils/Date";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

export class CapacityStore extends Store_Base.Store {
    private _savedCapacity: Contracts.ICapacity;

    private _currentCapacity: Contracts.ICapacity;
    private _capacityOptions: ISprintCapacityOptions;
    private _isDirty: boolean;
    private _isValid: boolean;
    private _loadingWorkDetailsData: boolean;
    private _iteration: Iteration;
    private _asyncOperationStatus: Contracts.IAsyncOperationStatus;
    private _showAddUserCallout: boolean;
    private _focusDetails: Contracts.ICapacityGridFocusDetails;
    private _showNoUserAddedMessage: boolean;
    private _aggregatedCapacity: IAggregatedCapacity;
    private _fieldAggregator: FieldAggregator;
    private _teamCapacityModel: TeamCapacityModel;
    private _exceptionsInfo: ExceptionInfo[];
    private _capacityDataStatus: Contracts.LoadingStatus;
    private _rightPanelId: string;
    private _workDetailsExceptionInfo: ExceptionInfo[];

    // Used for not showing loading indicator on very first time the pivot is loaded
    private _isVeryFirstLoad: boolean;

    public constructor(actions: CapacityActions) {
        super();
        this._showAddUserCallout = false;
        this._showNoUserAddedMessage = false;
        this._isVeryFirstLoad = true;

        this._resetCapacityInternal();

        actions.initializeCapacityBegin.addListener(this._initializeCapacityBegin);
        actions.initializeCapacity.addListener(this._initializeCapacity);
        actions.initializeCapacityError.addListener(this._initializeCapacityError);
        actions.initializeWorkDetailsData.addListener(this._initializeWorkDetailsData);

        actions.addMissingTeamMembers.addListener(this._addMissingTeamMembers);
        actions.replaceUserCapacities.addListener(this._replaceUserCapacities);

        actions.addUser.addListener(this._addUser);
        actions.removeUser.addListener(this._removeUser);
        actions.updateAddUserCalloutVisibility.addListener(this._updateAddUserCalloutVisibility);

        actions.insertEmptyActivity.addListener(this._insertEmptyActivity);
        actions.removeActivity.addListener(this._removeActivity);
        actions.updateActivity.addListener(this._updateActivity);
        actions.updateUserDaysOff.addListener(this._updateUserDaysOff);

        actions.updateTeamDaysOff.addListener(this._updateTeamDaysOff);
        actions.undo.addListener(this._undo);
        actions.save.addListener(this._save);

        actions.updateIteration.addListener(this._updateIteration);

        actions.asyncOperationBegin.addListener(this._asyncOperationBegin);
        actions.asyncOperationEnd.addListener(this._asyncOperationEnd);
        actions.resetWorkDetailsData.addListener(this._handleResetWorkDetailsData);

        actions.initializeWorkDetailsDataBegin.addListener(this._initializeWorkDetailsDataBegin);
        actions.setRightPanelId.addListener(this._handleRightPanelChanged);
        actions.initializeWorkDetailsError.addListener(this._handleWorkDetailsError);
    }

    public get state(): Contracts.ICapacityState {
        this._calculateNetDaysOffInternal();
        //Send focus details only once so we need not maintain focus details for every action
        const focusDetails = this._focusDetails;
        this._focusDetails = null;

        // Show no users added message only once
        const showNoUserAddedMessage = this._showNoUserAddedMessage;
        this._showNoUserAddedMessage = false;

        return {
            capacityDataStatus: this._capacityDataStatus,
            isDirty: this._isDirty,
            isValid: this._isValid,
            capacity: CapacityHelper.deepCopyCapacity(this._currentCapacity), // We need deepcopy to improve rendering perf for large number of users so we can call shouldComponentUpdate
            capacityOptions: this._capacityOptions,
            showAddUserCallout: this._showAddUserCallout,
            teamIteration: this._iteration,
            focusDetails: focusDetails,
            asyncOperationStatus: this._asyncOperationStatus,
            showNoUserAddedMessage: showNoUserAddedMessage,
            fieldAggregator: this._fieldAggregator,
            teamCapacityModel: this._teamCapacityModel,
            loadingWorkDetailsData: this._loadingWorkDetailsData,
            exceptionsInfo: this._exceptionsInfo,
            isVeryFirstLoad: this._isVeryFirstLoad,
            rightPanelId: this._rightPanelId,
            workDetailsExceptionInfo: this._workDetailsExceptionInfo
        };
    }

    // Public for unit testing
    public _hasDataChanged(initialDaysOff: Contracts.IDaysOff[], updatedDaysOff: Contracts.IDaysOff[]): boolean {

        if (initialDaysOff.length !== updatedDaysOff.length) {
            return true;
        } else {
            // Check if any of the start/end dates have changed
            for (let i = 0; i < initialDaysOff.length; i++) {
                if (initialDaysOff[i].start !== updatedDaysOff[i].start ||
                    initialDaysOff[i].end !== updatedDaysOff[i].end) {
                    return true;
                }
            }
        }

        return false;
    }

    private _handleRightPanelChanged = (rightPanelId: string): void => {
        this._rightPanelId = rightPanelId;
        this.emitChanged();
    }

    private _resetCapacityInternal() {
        this._focusDetails = null;
        this._capacityDataStatus = Contracts.LoadingStatus.Loading;
        this._asyncOperationStatus = null;
        this._currentCapacity = null;
        this._capacityOptions = null;
        this._exceptionsInfo = null;
        this._resetWorkDetailsData();
    }

    /**
     * Any invalid Capacity per day is stored as NaN. Model is invalid (and un-savable) until all capacities are positive numbers.
     */
    private _checkIfValid = (): boolean => {
        if (this._currentCapacity) {

            // Check each activity row in the model
            for (const userCapacity of this._currentCapacity.userCapacities) {
                for (const activity of userCapacity.activities) {

                    // Check if positive number. Invalid inputs are stored as NaN
                    if (!CapacityHelper.isCapacityNumberValid(activity.capacityPerDay)) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    private _updateAddUserCalloutVisibility = (isVisible: boolean): void => {
        this._showAddUserCallout = isVisible;
        this.emitChanged();
    }

    private _addMissingTeamMembers = (users: Contracts.IUser[]): void => {
        let memberAdded = false;
        for (const user of users) {
            const index = this._findUserIndex(user);
            if (index === -1) {
                this._addUserInternal(user);
                memberAdded = true;
                this._isDirty = true;
            }
        }

        // Sort only if a new member was added
        if (memberAdded) {
            this._sortUserCapacitiesInternal();
        } else {
            this._showNoUserAddedMessage = true;
        }
        this.emitChanged();
    }

    private _addUser = (user: Contracts.IUser): void => {
        const index = this._findUserIndex(user);

        if (index !== -1) {
            Diag.Debug.fail(`User already exist. ${user.displayName}`);
            return;
        }

        this._addUserInternal(user);
        this._isDirty = true;
        this.emitChanged();
    }

    private _removeUser = (user: Contracts.IUser): void => {
        const index = this._findUserIndex(user);

        if (index === -1) {
            Diag.Debug.fail(`User does not exist. ${user.displayName}`);
            return;
        }

        this._currentCapacity.userCapacities.splice(index, 1);
        this._isDirty = true;
        // May have removed an invalid capacity, check if validity has changed.
        this._isValid = this._checkIfValid();
        this.emitChanged();
    }

    private _insertEmptyActivity = (payload: Contracts.IAddRemoveActivityPayload): void => {
        const index = this._findUserIndex(payload.user);

        if (index === -1) {
            Diag.Debug.fail(`User does not exist. ${payload.user.displayName}`);
            return;
        }

        const userCapacity = this._currentCapacity.userCapacities[index];
        userCapacity.activities.splice(payload.index, 0, this._getEmptyActivity());

        this._focusDetails = {
            teamMember: userCapacity.teamMember,
            focusDaysOff: false,
            focusedActivityIndex: payload.index
        };

        this._isDirty = true;
        this.emitChanged();
    }

    private _removeActivity = (payload: Contracts.IAddRemoveActivityPayload): void => {
        const index = this._findUserIndex(payload.user);

        if (index === -1) {
            Diag.Debug.fail(`User does not exist. ${payload.user.displayName}`);
            return;
        }

        const userCapacities = this._currentCapacity.userCapacities[index];
        userCapacities.activities.splice(payload.index, 1);

        if (userCapacities.activities.length === 0) {
            userCapacities.activities.push(this._getEmptyActivity());
        }

        this._isDirty = true;
        // May have removed an invalid capacity, check if validity has changed.
        this._isValid = this._checkIfValid();
        this.emitChanged();
    }

    private _getEmptyActivity(): Contracts.IActivity {
        return {
            name: "",
            capacityPerDay: 0,
            displayValue: Utils_Number.toDecimalLocaleString(0)
        };
    }

    private _updateActivity = (payload: Contracts.IUpdateActivityPayload): void => {
        const index = this._findUserIndex(payload.user);

        if (index === -1) {
            Diag.Debug.fail(`User does not exist. ${payload.user.displayName}`);
            return;
        }

        const userCapacities = this._currentCapacity.userCapacities[index];
        if (userCapacities.activities.length < payload.index) {
            Diag.Debug.fail("Invalid activity index.");
            return;
        }

        const currentCapacity = userCapacities.activities[payload.index];

        // Only update model and set as dirty if a value has changed
        if (currentCapacity.capacityPerDay !== payload.activity.capacityPerDay
            || currentCapacity.name !== payload.activity.name
            || currentCapacity.displayValue !== payload.activity.displayValue) {

            userCapacities.activities.splice(payload.index, 1, payload.activity);
            this._isDirty = true;
            this._isValid = this._checkIfValid();
            this.emitChanged();
        }
    }

    private _updateUserDaysOff = (payload: Contracts.IUpdateUserDaysOffPayload): void => {
        const index = this._findUserIndex(payload.user);

        if (index === -1) {
            Diag.Debug.fail(`User does not exist. ${payload.user.displayName}`);
            return;
        }

        const userCapacities = this._currentCapacity.userCapacities[index];
        const dataHasChanged = this._hasDataChanged(userCapacities.daysOff, payload.daysOff);

        if (dataHasChanged) {
            userCapacities.daysOff = payload.daysOff;
            this._isDirty = true;
            this.emitChanged();
        }
    }

    private _updateTeamDaysOff = (daysOff: Contracts.IDaysOff[]): void => {
        const dataHasUpdated = this._hasDataChanged(this._currentCapacity.teamDaysOff, daysOff);
        if (dataHasUpdated) {
            this._currentCapacity.teamDaysOff = daysOff;

            this._isDirty = true;
            this.emitChanged();
        }
    }

    private _asyncOperationBegin = (): void => {
        this._asyncOperationStatus = {
            inprogress: true
        };
        this.emitChanged();
    }

    private _asyncOperationEnd = (): void => {
        this._asyncOperationStatus = null;
        this.emitChanged();
    }

    /**
     * Replaces capacity information, does not copy days off
     */
    private _replaceUserCapacities = (sourceCapacities: Contracts.IUserCapacity[]): void => {
        for (const sourceCapacity of sourceCapacities) {
            const index = this._findUserIndex(sourceCapacity.teamMember);
            let targetCapacity: Contracts.IUserCapacity = null;

            targetCapacity = (index === -1) ?
                this._addUserInternal(sourceCapacity.teamMember) :
                this._currentCapacity.userCapacities[index];

            // Do not copy days off
            targetCapacity.activities = sourceCapacity.activities;
        }
        this._isDirty = true;

        // Sort after copy
        this._sortUserCapacitiesInternal();
        this.emitChanged();
    }

    private _initializeCapacityBegin = (): void => {
        this._resetCapacityInternal();
        this._capacityDataStatus = Contracts.LoadingStatus.Loading;
        this.emitChanged();
    }

    private _initializeWorkDetailsDataBegin = (): void => {
        this._resetWorkDetailsData();
        this._loadingWorkDetailsData = true;
        this.emitChanged();
    }

    private _initializeCapacityError = (exceptionsInfo: ExceptionInfo[]): void => {
        this._capacityDataStatus = Contracts.LoadingStatus.ErrorLoadingData;
        this._exceptionsInfo = exceptionsInfo;
        this._isVeryFirstLoad = false;
        this.emitChanged();
    }

    private _initializeCapacity = (payload: Contracts.IInitializeCapacityPayload): void => {
        this._iteration = payload.iteration;
        this._isDirty = false;
        this._isValid = true; // Data from server is valid
        this._capacityDataStatus = Contracts.LoadingStatus.None;
        this._capacityOptions = payload.capacityOptions;
        this._savedCapacity = CapacityHelper.deepCopyCapacity(payload.teamCapacity);
        this._currentCapacity = payload.teamCapacity;
        this._isVeryFirstLoad = false;

        // Sort only the initial capacity, we do not sort after every update to give user a better experience
        if (this._currentCapacity) {
            this._sortUserCapacitiesInternal();
        }
        this.emitChanged();
    }

    private _initializeWorkDetailsData = (payload: IAggregatedCapacity): void => {
        this._aggregatedCapacity = payload;
        this._fieldAggregator = new FieldAggregator(
            this._aggregatedCapacity.remainingWorkField, // Aggregated Field this._workRollupField
            this._aggregatedCapacity.aggregatedCapacity, // Initial data
            this._aggregatedCapacity.previousValueData, // Previous value data
            this._aggregatedCapacity.aggregatedCapacityLimitExceeded, // AggregatedCapacity limit exceeded
            (w) => false);
        this._teamCapacityModel = this._getTeamCapacityModel();
        this._loadingWorkDetailsData = false;

        this.emitChanged();
    }

    private _handleResetWorkDetailsData = (): void => {
        this._resetWorkDetailsData();
        this.emitChanged();
    }

    private _save = (capacity: Contracts.ICapacity): void => {
        CapacityHelper.dedupeAllActivities(capacity);

        this._currentCapacity = CapacityHelper.deepCopyCapacity(capacity);
        this._savedCapacity = CapacityHelper.deepCopyCapacity(capacity);
        this._isDirty = false;
        this.emitChanged();
    }

    private _undo = (): void => {
        this._isDirty = false;
        this._currentCapacity = CapacityHelper.deepCopyCapacity(this._savedCapacity);
        this.emitChanged();
    }

    private _addUserInternal(user: Contracts.IUser): Contracts.IUserCapacity {
        // Check if user already exists
        let userCapacity: Contracts.IUserCapacity;
        const index = this._findUserIndex(user);
        if (index !== -1) {
            Diag.Debug.fail("User already exists.");
            userCapacity = this._currentCapacity.userCapacities[index];
        } else {
            userCapacity = {
                activities: [this._getEmptyActivity()],
                teamMember: { ...user },
                daysOff: []
            };
            this._currentCapacity.userCapacities.unshift(userCapacity);
        }
        return userCapacity;
    }

    private _updateIteration = (iteration: Iteration): void => {
        this._iteration = iteration;
        this.emitChanged();
    }

    private _findUserIndex(user: Contracts.IUser): number {
        return Utils_Array.findIndex(
            this._currentCapacity.userCapacities,
            (capacity: Contracts.IUserCapacity) => {
                return Utils_String.equals(capacity.teamMember.id, user.id, /* ignoreCase */ true);
            });
    }

    private _sortUserCapacitiesInternal(): void {
        const capacity = this._currentCapacity;
        // Sort team days off
        this._sortDaysOffInternal(capacity.teamDaysOff);
        // Sort users by name
        capacity.userCapacities.sort((u1, u2) => {
            return Utils_String.ignoreCaseComparer(u1.teamMember.displayName, u2.teamMember.displayName);
        });
        // Sort activities by name and user days off
        capacity.userCapacities.forEach((user) => {
            user.activities.sort((a1, a2) => {
                return Utils_String.ignoreCaseComparer(a1.name, a2.name);
            });
            this._sortDaysOffInternal(user.daysOff);
        });
    }

    private _sortDaysOffInternal(daysOff: Contracts.IDaysOff[]): void {
        daysOff.sort((d1, d2) => {
            if (d1.start.getTime() === d2.start.getTime()) {
                return d1.end.getTime() - d2.end.getTime();
            }
            return d1.start.getTime() - d2.start.getTime();
        });
    }

    private _calculateNetDaysOffInternal(): void {
        if (this._capacityOptions && this._iteration) {
            const iterationStartDate = this._iteration.startDateUTC;
            const iterationEndDate = this._iteration.finishDateUTC;
            for (const teamDaysOff of this._currentCapacity.teamDaysOff) {
                this._sanitizeDaysOffInternal(teamDaysOff, iterationStartDate, iterationEndDate);
                teamDaysOff.netDaysOff = DaysOffUtils.calculateNetTeamDaysOff(teamDaysOff, this._capacityOptions.weekends, iterationStartDate, iterationEndDate);
            }
            this._currentCapacity.userCapacities.forEach((userCapacity: Contracts.IUserCapacity) => {
                userCapacity.daysOff.forEach((daysOff) => {
                    this._sanitizeDaysOffInternal(daysOff, iterationStartDate, iterationEndDate);
                    daysOff.netDaysOff = DaysOffUtils.calculateNetDaysOff(daysOff, this._currentCapacity.teamDaysOff, this._capacityOptions.weekends, iterationStartDate, iterationEndDate);
                });
            });
        }
    }

    private _sanitizeDaysOffInternal(daysOff: Contracts.IDaysOff, iterationStartDate: Date, iterationEndDate: Date): void {
        const sanatizedDaysOff = DaysOffUtils.getSanatizedDaysOff(daysOff, iterationStartDate, iterationEndDate);
        daysOff.start = sanatizedDaysOff.start;
        daysOff.end = sanatizedDaysOff.end;
        daysOff.ratio = sanatizedDaysOff.ratio;
    }

    private _getTeamCapacityModel(): TeamCapacityModel {

        const { allowedActivities, accountCurrentDate, weekends } = this._capacityOptions;
        const daysOff = this._currentCapacity.teamDaysOff;
        const teamMemberCapacities = CapacityContractsMapper.mapCapacities(this._currentCapacity.userCapacities, /* shiftDates */ false);

        const rawTeamCapacity: IRawTeamCapacityData = {
            TeamCapacity: {
                TeamDaysOffDates: daysOff,
                TeamMemberCapacityCollection: teamMemberCapacities
            },
            ActivityValues: allowedActivities,
            IterationId: this._iteration.id,
            IterationStartDate: this._iteration.startDateUTC,
            IterationEndDate: this._iteration.finishDateUTC,
            Weekends: weekends,
            CurrentDate: shiftToUTC(new Date(accountCurrentDate))
        };

        return new TeamCapacityModel(rawTeamCapacity);
    }

    private _handleWorkDetailsError = (errors: ExceptionInfo[]): void => {
        this._workDetailsExceptionInfo = errors;
        this.emitChanged();
    }

    private _resetWorkDetailsData(): void {
        this._loadingWorkDetailsData = false;
        this._workDetailsExceptionInfo = null;
        this._aggregatedCapacity = null;

        if (this._fieldAggregator) {
            this._fieldAggregator.dispose();
            this._fieldAggregator = null;
        }

        if (this._teamCapacityModel) {
            this._teamCapacityModel.dispose();
            this._teamCapacityModel = null;
        }
    }
}
