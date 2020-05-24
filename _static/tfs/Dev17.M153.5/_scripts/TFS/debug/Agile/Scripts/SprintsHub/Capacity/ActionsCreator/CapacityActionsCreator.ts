import { IHubMessagesActionsCreator } from "Agile/Scripts/Common/Messages/HubMessagesActionsCreator";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { SprintsHubConstants, SprintsHubRoutingConstants } from "Agile/Scripts/Generated/HubConstants";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import { CapacityActions } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActions";
import { ICapacityApi } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityApi";
import { TelemetryConstants } from "Agile/Scripts/SprintsHub/Capacity/CapacityConstants";
import { IActivity, ICapacity, IDaysOff, IInitialPayload, IUser, IUserCapacity } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { IAggregatedCapacity, SprintCapacityDataProvider } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { ISprintViewPivotContext } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { IMessage } from "Presentation/Scripts/TFS/Components/Messages";
import * as VSSError from "VSS/Error";
import * as Telemetry from "VSS/Telemetry/Services";
import { getErrorMessage } from "VSS/VSS";

export class CapacityActionsCreator {
    private _actions: CapacityActions;
    private _capacityApi: ICapacityApi;
    private _messagesActionsCreator: IHubMessagesActionsCreator;

    constructor(
        actions: CapacityActions,
        capacityApi: ICapacityApi,
        messagesActionsCreator: IHubMessagesActionsCreator,
        sprintViewPivotContext: ISprintViewPivotContext) {

        this._actions = actions;
        this._capacityApi = capacityApi;
        this._messagesActionsCreator = messagesActionsCreator;
    }

    /** 
     * Reloads initial data from the data provider
     */
    public async refreshData(iteration: Iteration, loadWorkDetails: boolean): Promise<void> {
        this._startLoadData();
        try {
            const payload: IInitialPayload = await this._capacityApi.reloadCapacityPivotData();
            this._loadData(iteration, payload);
            if (loadWorkDetails) {
                this.initializeWorkDetailsData();
            }
        } catch (error) {
            this._loadDataError(error);
        }
    }

    /**
     * Loads initial data from the data provider
     */
    public loadInitialData(iteration: Iteration, loadWorkDetails: boolean): void {
        this._startLoadData();
        try {
            const payload: IInitialPayload = this._capacityApi.getCapacityPivotData();
            this._loadData(iteration, payload);
            if (loadWorkDetails) {
                this.initializeWorkDetailsData();
            }
        } catch (error) {
            this._loadDataError(error);
        }
    }

    /**
     * Adds missing team members
     */
    public addMissingTeamMembers(teamId: string): IPromise<void> {
        const operation = () => this._capacityApi.addMissingTeamMembers(teamId).then((teamMembers: IUser[]) => {
            this._actions.addMissingTeamMembers.invoke(teamMembers);
        });

        return this._asyncOperation(TelemetryConstants.ADD_MISSING_TEAM_MEMBERS, operation);
    }

    /**
     * Replaces capacity from given sprint
     */
    public replaceCapacity(iteration: Iteration, teamId: string): IPromise<void> {
        const operation = () => this._capacityApi.getCapacity(iteration, teamId).then((userCapacities: IUserCapacity[]) => {
            this._actions.replaceUserCapacities.invoke(userCapacities);
        });

        return this._asyncOperation(TelemetryConstants.REPLACE_CAPACITY, operation);
    }

    /**
     * Adds given user
     */
    public addUser(user: IUser): void {
        this._publishUsageTelemetry("addUser");

        this._actions.addUser.invoke(user);
    }

    /**
     * Hides Add User Callout
     */
    public hideAddUserCallout(): void {
        this._actions.updateAddUserCalloutVisibility.invoke(/*isVisible*/ false);
    }

    /**
     * Shows Add User Callout
     */
    public showAddUserCallout(): void {
        this._actions.updateAddUserCalloutVisibility.invoke(/*isVisible*/ true);
    }

    /**
     * Displays work details pane
     */
    public setRightPanelId(rightPanelId: string): void {
        this._actions.setRightPanelId.invoke(rightPanelId);
    }

    /**
     * Remove user
     */
    public removeUser(user: IUser): void {
        this._publishUsageTelemetry("removeUser");

        this._actions.removeUser.invoke(user);
    }

    /**
     * Inserts empty activity at given index
     */
    public insertEmptyActivity(user: IUser, index: number): void {
        this._publishUsageTelemetry("addActivity");

        this._actions.insertEmptyActivity.invoke({
            user: user,
            index: index
        });
    }

    /**
     * Removes activity at given index
     */
    public removeActivity(user: IUser, index: number): void {
        this._publishUsageTelemetry("removeActivity");

        this._actions.removeActivity.invoke({
            user: user,
            index: index
        });
    }

    /**
     * Updates activity at given index
     */
    public updateActivity(
        user: IUser,
        index: number,
        activity: IActivity): void {
        this._actions.updateActivity.invoke({
            user: user,
            index: index,
            activity: activity
        });
    }

    /**
     * Updates users days off
     */
    public updateUserDaysOff(user: IUser, daysOff: IDaysOff[]): void {
        this._publishUsageTelemetry("updateUserDaysOff");

        this._actions.updateUserDaysOff.invoke({
            user: user,
            daysOff: daysOff
        });
    }

    /**
     * Updtes team days off
     */
    public updateTeamDaysOff(daysOff: IDaysOff[]): void {
        this._publishUsageTelemetry("updateTeamDaysOff");

        this._actions.updateTeamDaysOff.invoke(daysOff);
    }

    /**
     * Undo changes
     */
    public undo() {
        this._publishUsageTelemetry("undo");

        this._actions.undo.invoke(null);
    }

    /**
     * Saves capacity for given iteration
     */
    public save(teamIteration: Iteration, teamId: string, capacity: ICapacity): IPromise<void> {
        const operation = () => this._capacityApi.save(teamIteration, teamId, capacity).then((capacity: ICapacity) => {
            this._actions.save.invoke(capacity);
        });

        return this._asyncOperation(TelemetryConstants.SAVE, operation);
    }

    public updateIterationDates(iteration: Iteration): void {
        // User can update iteration dates via sprint date control in uppper right.
        // Need to update store if this has changed.
        this._actions.updateIteration.invoke(iteration);
    }

    /**
     * Initializes the data required to show the work details pane on the right panel component
     * by updating the pivot context's right panel data observable property.
     * This action should only be called after the initial payload (capacity options and team capacity) has been loaded.
     * @param pivotContext The pivot context containing the right panel data observable.
     * @param capacityOptions The capacity options to use for the work details pane.
     */
    public initializeWorkDetailsData(): void {
        this._actions.initializeWorkDetailsDataBegin.invoke(null);
        SprintCapacityDataProvider.ensureAggregatedCapacityData().then(
            (aggregatedCapacity: IAggregatedCapacity) => {

                if (aggregatedCapacity.exceptionInfo) {

                    this._actions.initializeWorkDetailsError.invoke([aggregatedCapacity.exceptionInfo]);

                    this._messagesActionsCreator.addExceptionsInfo(
                        "CapacityActionsCreator.initializeWorkDetailsData",
                        true,
                        aggregatedCapacity.exceptionInfo);
                    return;
                }

                this._actions.initializeWorkDetailsData.invoke(aggregatedCapacity);
            }, (error: Error) => {
                this._addTelemetrySplit(TelemetryConstants.ERROR_LOAD_WORK_DETAILS_DATA);
                VSSError.publishErrorToTelemetry(error);
                const exceptionInfo = { exceptionMessage: getErrorMessage(error) } as ExceptionInfo;
                this._actions.initializeWorkDetailsError.invoke([exceptionInfo]);
                this._messagesActionsCreator.addErrorMessage(error);
            }
        );
    }

    public resetWorkDetailsData(): void {
        this._actions.resetWorkDetailsData.invoke(null);
    }

    private _startLoadData() {
        this._addTelemetrySplit(TelemetryConstants.BEGIN_LOAD_INITIAL_DATA);
        this._actions.initializeCapacityBegin.invoke(null);
        // Clear all messages as we are loading the data
        this._messagesActionsCreator.clearAllMessages();
    }

    private _loadData(iteration: Iteration, payload: IInitialPayload) {
        const exceptionsInfo: ExceptionInfo[] = [];
        if (payload.teamCapacity && payload.teamCapacity.exceptionInfo) {
            exceptionsInfo.push(payload.teamCapacity.exceptionInfo);
        }

        if (payload.capacityOptions && payload.capacityOptions.exceptionInfo) {
            exceptionsInfo.push(payload.capacityOptions.exceptionInfo);
        }

        if (exceptionsInfo.length > 0) {
            this._addTelemetrySplit(TelemetryConstants.ERROR_LOAD_INITIAL_DATA);
            this._actions.initializeCapacityError.invoke(exceptionsInfo);
            this._messagesActionsCreator.addExceptionsInfo(
                "CapacityActionsCreator.loadInitialData",
                /*closable*/ true,
                ...exceptionsInfo);
            return;
        }

        if (payload.capacityOptions && !payload.capacityOptions.isEditable) {
            this._messagesActionsCreator.addMessage({
                messageType: MessageBarType.warning,
                message: CapacityPivotResources.NoPermission,
                id: "capacity-permissions-warning"
            });
        }

        if (payload.capacityOptions && payload.capacityOptions.isEditable && payload.teamCapacity && payload.teamCapacity.teamDaysOff.length === 0 && payload.teamCapacity.userCapacities.length === 0) {
            this._messagesActionsCreator.addMessage({ messageType: MessageBarType.info, message: CapacityPivotResources.Capacity_CopyPrevious_Info, closeable: true } as IMessage);
        }

        this._addTelemetrySplit(TelemetryConstants.END_LOAD_INITIAL_DATA);
        this._actions.initializeCapacity.invoke({
            iteration,
            capacityOptions: payload.capacityOptions,
            teamCapacity: payload.teamCapacity
        });
    }

    private _loadDataError(error: Error) {
        this._addTelemetrySplit(TelemetryConstants.ERROR_LOAD_INITIAL_DATA);
        const exceptionInfo = { exceptionMessage: getErrorMessage(error) } as ExceptionInfo;
        this._actions.initializeCapacityError.invoke([exceptionInfo]);
        this._actions.initializeWorkDetailsError.invoke([exceptionInfo]);
        this._messagesActionsCreator.addErrorMessage(error);
    }

    /**
     * Executes the given async operation
     * calls begin, end or error actions
     */
    private _asyncOperation(telemetryScenarioName: string, operation: () => IPromise<void>): IPromise<void> {
        const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);
        telemetryHelper.startScenario(telemetryScenarioName);
        this._publishUsageTelemetry(telemetryScenarioName);

        this._actions.asyncOperationBegin.invoke(null);

        const errorHandler = (error) => {
            VSSError.publishErrorToTelemetry(error, /*immediate*/ true);
            this._actions.asyncOperationEnd.invoke(null);
            this._messagesActionsCreator.addErrorMessage(error);
            telemetryHelper.end();
            //  No need to re-throw the error as we have already handled it.
        };

        try {
            return operation()
                .then(() => {
                    this._actions.asyncOperationEnd.invoke(null);
                    telemetryHelper.end();
                },
                    errorHandler);
        } catch (error) {
            errorHandler(error);
        }
    }

    private _addTelemetrySplit(splitName: string) {
        const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);
        if (telemetryHelper.isActive()) {
            telemetryHelper.split(splitName);
        }
    }

    private _publishUsageTelemetry(name: string) {
        const properties = {};
        properties["user-action"] = name;
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            SprintsHubConstants.HUB_NAME,
            SprintsHubRoutingConstants.CapacityPivot, properties));
    }
}