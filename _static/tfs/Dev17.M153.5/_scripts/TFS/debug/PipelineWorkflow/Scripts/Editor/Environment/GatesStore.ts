// Copyright (c) Microsoft Corporation.  All rights reserved.
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { INewable } from "DistributedTaskControls/Common/Factory";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DataStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ITaskContextOptions as IGateContextOptions } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TaskItem as GateItem } from "DistributedTaskControls/Components/Task/TaskItem";
import {
    IDuration,
    TimeUnits,
} from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";
import {
    ITaskListStoreArgs as IGateListStoreArgs,
    TaskListStore as GateListStore,
} from "DistributedTaskControls/Stores/TaskListStore";
import { ITask as IGate } from "DistributedTasksCommon/TFS.Tasks.Types";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { GatesActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/GatesActionsHub";
import { IGateListOptions, IPayloadUpdateGates as IGatesStoreArgs } from "PipelineWorkflow/Scripts/Editor/Environment/Types";
import { EnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/EnvironmentUtils";
import { GateConstants } from "ReleaseManagement/Core/Constants";
import { ApprovalExecutionOrder as PipelineApprovalExecutionOrder } from "ReleaseManagement/Core/Contracts";
import { TaskDefinition as GateDefinition } from "TFS/DistributedTask/Contracts";
import * as Utils_Array from "VSS/Utils/Array";
import { Release } from "ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline";
import { ReleaseEditorWebPageDataHelper } from "PipelineWorkflow/Scripts/Editor/Sources/ReleaseEditorWebPageData";


export interface IGatesState extends IStoreState, IGateListOptions {
    isEnabled: boolean;
    stabilizationTime?: IDuration;
    definitions?: GateDefinition[];
    gateItemList?: GateItem[];
}

export abstract class GatesStore extends DataStoreBase {

    protected actions: GatesActionsHub;
    public abstract updateVisitor(visitor: PipelineTypes.PipelineDefinitionEnvironment): void;

    constructor(args: IGatesStoreArgs) {
        super();
        this._pageDataHelperInstance = ReleaseEditorWebPageDataHelper.instance();
        this._setInitialGatesData(args);
    }

    public get gateListInstanceId(): string {
        return this._gateListInstanceId;
    }

    public get gateItemList(): GateItem[] {
        return this._gateListStore ? this._gateListStore.getTaskItemList() : [];
    }

    public isDirty(): boolean {
        if (this._currentState.isEnabled !== this._originalState.isEnabled) {
            return true;
        }

        if (!this._currentState.isEnabled) {
            return false;
        }

        if (this._areGatesOptionsDirty() || this._gateListStore.isDirty()) {
            return true;
        }

        return false;
    }

    public isValid(): boolean {
        if (!this._currentState.isEnabled) {
            return true;
        }

        return this.isValidStabilizationTime && this._gateListStore.isValid() && this.isValidSamplingInterval && this.isValidTimeout && this.isValidMinimumSuccessDurationTime;
    }


    public getState(): IGatesState {
        this._stateRef = this._currentState;
        this._stateRef.gateItemList = this.gateItemList;

        return this._stateRef;
    }

    public isAnyGateEnabled(): boolean {
        return !!Utils_Array.first(this._gateListStore.getTaskList() || [], (gate: IGate): boolean => { return gate && gate.enabled; });
    }

    public get isValidStabilizationTime(): boolean {
        return DtcUtils.isDurationInMinutesRange(this._currentState.stabilizationTime, GateConstants.MinimumStabilizationTimeInMinutes, GateConstants.MaximumStabilizationTimeInMinutes);
    }

    public get isValidSamplingInterval(): boolean {
        if (!this.isAnyGateEnabled()) {
            return true;
        }

        let isSamplingIntervalInRange: boolean = DtcUtils.isDurationInMinutesRange(
            this._currentState.samplingInterval,
            this._pageDataHelperInstance.getGatesMinimumSamplingIntervalInMinutes(),
            GateConstants.MaximumSamplingIntervalInMinutes);

        if (!this.isValidTimeout) {
            return isSamplingIntervalInRange;
        }

        return isSamplingIntervalInRange && DtcUtils.getDurationDiffInMinutes(this._currentState.samplingInterval, this._currentState.timeout) < 0;
    }

    public get isValidMinimumSuccessDurationTime(): boolean {
        if (!this.isAnyGateEnabled()) {
            return true;
        }
        
        return DtcUtils.getDurationDiffInMinutes(this._currentState.minimumSuccessDuration, this._currentState.timeout) < 0
            && DtcUtils.isDurationInMinutesRange(this._currentState.minimumSuccessDuration, GateConstants.MinimumSuccessDurationMinAllowedValueInMinutes, GateConstants.MinimumSuccessDurationMaxAllowedValueInMinutes);
    }

    public get isValidTimeout(): boolean {
        return !this.isAnyGateEnabled()
            || DtcUtils.isDurationInMinutesRange(this._currentState.timeout, GateConstants.MinimumTimeoutInMinutes, GateConstants.MaximumTimeoutInMinutes);
    }

    public static getGateListTasks(gatesStep: PipelineTypes.PipelineEnvironmentGatesStep): IGate[] {
        if (!gatesStep || !gatesStep.gates || gatesStep.gates.length <= 0) {
            return [];
        }

        // design: service and view have different way of representing gates.
        // on service it is, taskList is one gate, and we have list of gates
        //  gatesStep.gates-->(each gate)gate.tasks--> (we have only one task at time)
        // on view side, we consolidate all tasks in all gates, then make a taskList.
        //  gatesStep.gates--> (each gate)gate.tasks--> (each task) combine to gatesTasks
        let gatesTasks: IGate[] = [];
        for (let gate of gatesStep.gates) {
            if (gate && gate.tasks && gate.tasks.length > 0) {
                let gateTasks: IGate[] = EnvironmentUtils.getTasks(gate.tasks);
                gatesTasks = gatesTasks.concat(gateTasks);
            }
        }

        return gatesTasks;
    }

    protected initializeActionsAndActionListeners(
        actionsClass: INewable<GatesActionsHub, {}>,
        storeKey: string,
        instanceId: string): void {
        super.initialize(instanceId);
        this._gateListInstanceId = `gate-list-${storeKey}-${instanceId}`.toLowerCase();

        this.actions = ActionsHubManager.GetActionsHub(actionsClass, instanceId);
        this.actions.updateGatesState.addListener(this._handleGatesStateUpdate);
        this.actions.updateStabilizationTime.addListener(this._handleStabilizationTimeUpdate);
        this.actions.updateTimeout.addListener(this._handleTimeoutUpdate);
        this.actions.updateSamplingInterval.addListener(this._handleSamplingIntervalUpdate);
        this.actions.updateMinimumSuccessDuration.addListener(this._handleMinimumSuccessDurationUpdate);
        this.actions.updateApprovalExecutionOrder.addListener(this._handleApprovalExecutionOrderUpdate);
        this.actions.updateGateDefinitions.addListener(this._handleGateDefinitionsUpdate);
        this.actions.updateGatesData.addListener(this._onSaveUpdateGatesData);

        this._gateListStore = StoreManager.CreateStore<GateListStore, IGateListStoreArgs>(
            GateListStore,
            this._gateListInstanceId,
            this._getGateListStoreArgs());

        this._gateListStore.addChangedListener(this._onGateListStoreChange);

        this.emitChanged();
    }

    protected disposeInternal(): void {
        this._gateListStore.removeChangedListener(this._onGateListStoreChange);
        this.actions.updateGatesData.removeListener(this._onSaveUpdateGatesData);
        this.actions.updateGateDefinitions.removeListener(this._handleGateDefinitionsUpdate);
        this.actions.updateApprovalExecutionOrder.removeListener(this._handleApprovalExecutionOrderUpdate);
        this.actions.updateTimeout.removeListener(this._handleTimeoutUpdate);
        this.actions.updateSamplingInterval.removeListener(this._handleSamplingIntervalUpdate);
        this.actions.updateMinimumSuccessDuration.removeListener(this._handleMinimumSuccessDurationUpdate);
        this.actions.updateStabilizationTime.removeListener(this._handleStabilizationTimeUpdate);
        this.actions.updateGatesState.removeListener(this._handleGatesStateUpdate);
    }

    protected updateVisitorGatesData(
        gatesStep: PipelineTypes.PipelineEnvironmentGatesStep,
        approvals: PipelineTypes.PipelineEnvironmentApprovals): void {
        if (!approvals.approvalOptions) {
            approvals.approvalOptions = JQueryWrapper.extendDeep({}, null);
        }

        if (this.isDirty()) {
            JQueryWrapper.extendDeep(approvals.approvalOptions, { executionOrder: this._currentState.approvalExecutionOrder });
            gatesStep.gates = [];
            JQueryWrapper.extendDeep(gatesStep, this._getCurrentGatesStepData());
        }
        else {
            JQueryWrapper.extendDeep(approvals.approvalOptions, { executionOrder: this._args.approvalExecutionOrder });
            JQueryWrapper.extendDeep(gatesStep, this._args.gatesStep);
        }
    }

    private _onGateListStoreChange = () => {
        this.emitChanged();
    }

    private _handleGatesStateUpdate = (enableGates: boolean): void => {
        let newValue: boolean = !!enableGates;
        let oldValue: boolean = !!this._currentState.isEnabled;

        if (newValue === oldValue) {
            return;
        }

        this._currentState.isEnabled = newValue;
        this.emitChanged();
    }

    private _handleStabilizationTimeUpdate = (time: IDuration): void => {
        if (DtcUtils.getDurationDiffInMinutes(this._currentState.stabilizationTime, time) !== 0) {
            this._currentState.stabilizationTime = time;
            this.emitChanged();
        }
    }

    private _handleTimeoutUpdate = (time: IDuration): void => {
        if (DtcUtils.getDurationDiffInMinutes(this._currentState.timeout, time) !== 0) {
            this._currentState.timeout = time;
            this.emitChanged();
        }
    }

    private _handleSamplingIntervalUpdate = (time: IDuration): void => {
        if (DtcUtils.getDurationDiffInMinutes(this._currentState.samplingInterval, time) !== 0) {
            this._currentState.samplingInterval = time;
            this.emitChanged();
        }
    }

    private _handleMinimumSuccessDurationUpdate = (time: IDuration): void => {
        if (DtcUtils.getDurationDiffInMinutes(this._currentState.minimumSuccessDuration, time) !== 0) {
            this._currentState.minimumSuccessDuration = time;
            this.emitChanged();
        }
    }

    private _handleApprovalExecutionOrderUpdate = (approvalExecutionOrder: PipelineApprovalExecutionOrder): void => {
        if (this._currentState.approvalExecutionOrder === approvalExecutionOrder) {
            return;
        }

        this._currentState.approvalExecutionOrder = approvalExecutionOrder;
        this.emitChanged();
    }

    private _handleGateDefinitionsUpdate = (definition: GateDefinition[]): void => {
        if (definition && definition.length > 0) {
            if (this._currentState.definitions && this._currentState.definitions.length > 0) {
                this._currentState.definitions.length = 0; // clear the array
            }
            else {
                this._currentState.definitions = [];
            }

            JQueryWrapper.extendDeep(this._currentState.definitions, definition);
            this.emitChanged();
        }
    }

    private _onSaveUpdateGatesData = (newArgs: IGatesStoreArgs): void => {
        this._setInitialGatesData(newArgs, this._currentState.definitions);
    }

    private _setInitialGatesData(args: IGatesStoreArgs, definitions?: GateDefinition[]): void {
        this._args = args;
        if (!this._args) {
            this._args = {} as IGatesStoreArgs;
        }

        const { gatesStep, approvalExecutionOrder } = this._args;

        const gatesOptions: PipelineTypes.PipelineEnvironmentGatesOptions = this._hasOriginalGatesOptionsExist()
            ? gatesStep.gatesOptions
            : {} as PipelineTypes.PipelineEnvironmentGatesOptions;
        const { isEnabled, samplingInterval: samplingIntervalInMinutes, stabilizationTime: stabilizationTimeInMinutes, timeout: timeoutInMinutes, minimumSuccessDuration: minimumSuccessfulMinutesValue } = gatesOptions;

        let computedStabilizationTime: IDuration = DtcUtils.convertMinutesToValidDuration(
            stabilizationTimeInMinutes,
            GateConstants.MinimumStabilizationTimeInMinutes,
            GateConstants.MaximumStabilizationTimeInMinutes,
            GateConstants.DefaultStabilizationTimeInMinutes,
            TimeUnits.Minutes,
            TimeUnits.Hours);

        let computedTimeout: IDuration = DtcUtils.convertMinutesToValidDuration(
            timeoutInMinutes,
            GateConstants.MinimumTimeoutInMinutes,
            GateConstants.MaximumTimeoutInMinutes,
            GateConstants.DefaultJobTimeoutInMinutes / 60,
            TimeUnits.Hours);

        let computedSamplingInterval: IDuration = DtcUtils.convertMinutesToValidDuration(
            samplingIntervalInMinutes,
            this._pageDataHelperInstance.getGatesMinimumSamplingIntervalInMinutes(),
            GateConstants.MaximumSamplingIntervalInMinutes,
            GateConstants.DefaultSamplingIntervalInMinutes,
            TimeUnits.Minutes,
            TimeUnits.Hours);

        let computedMinimumSuccessDuration: IDuration = DtcUtils.convertMinutesToValidDuration(
            minimumSuccessfulMinutesValue,
            GateConstants.MinimumSuccessDurationMinAllowedValueInMinutes,
            GateConstants.MinimumSuccessDurationMaxAllowedValueInMinutes,
            GateConstants.DefaultMinimumSuccessDurationInMinutes,
            TimeUnits.Minutes,
            TimeUnits.Hours);

        this._currentState = {
            isEnabled: !!isEnabled,
            definitions: definitions ? definitions : [],
            stabilizationTime: computedStabilizationTime,
            timeout: computedTimeout,
            samplingInterval: computedSamplingInterval,
            minimumSuccessDuration: computedMinimumSuccessDuration,
            approvalExecutionOrder: !!approvalExecutionOrder ? approvalExecutionOrder : PipelineApprovalExecutionOrder.BeforeGates,
            gateItemList: []
        };

        JQueryWrapper.extendDeep(this._originalState, this._currentState);

        if (gatesStep && gatesStep.id !== undefined) {
            this._gateStepId = gatesStep.id;
        }
    }

    private _getGateListStoreArgs(): IGateListStoreArgs {
        return {
            itemSelectionInstanceId: this.getInstanceId(),
            taskList: GatesStore.getGateListTasks(this._args ? this._args.gatesStep : null),
            appContext: {
                processParametersNotSupported: true,
                processInstanceId: this.getInstanceId()
            },
            taskContextOptions: {
                donotShowControlOptions: true,
                donotShowVersions: true,
                donotShowLinkOptions: true,
                donotShowOutputVariables: false,
                donotShowYAMLFeature: true
            } as IGateContextOptions
        } as IGateListStoreArgs;
    }

    private _getCurrentGatesStepData(): PipelineTypes.PipelineEnvironmentGatesStep {
        const state: IGatesState = this.getState();

        let gates: PipelineTypes.PipelineEnvironmentGate[] = [];
        let gatesOptions: PipelineTypes.PipelineEnvironmentGatesOptions = {
            isEnabled: !!state.isEnabled,
            stabilizationTime: DtcUtils.convertDurationToNumberInMinutes(state.stabilizationTime),
            timeout: DtcUtils.convertDurationToNumberInMinutes(state.timeout),
            samplingInterval: DtcUtils.convertDurationToNumberInMinutes(state.samplingInterval),
            minimumSuccessDuration: DtcUtils.convertDurationToNumberInMinutes(state.minimumSuccessDuration)
        };

        if (!this._hasOriginalGatesOptionsExist() && !gatesOptions.isEnabled) {
            gatesOptions = null;
        }

        for (let item of state.gateItemList) {
            gates.push({ tasks: EnvironmentUtils.getWorkflowTasks([item.getTask()]) });
        }

        return { gatesOptions: gatesOptions, id: this._gateStepId, gates: gates };
    }

    private _areGatesOptionsDirty(): boolean {
        return (this._isStabilizationTimeDirty()
            || this._isTimeoutDirty()
            || this._isSamplingIntervalDirty()
            || this._isMinimumSuccessfulMinutesDirty()
            || this._originalState.approvalExecutionOrder !== this._currentState.approvalExecutionOrder);
    }

    private _hasOriginalGatesOptionsExist(): boolean {
        return !!(this._args && this._args.gatesStep && this._args.gatesStep.gatesOptions);
    }

    private _isStabilizationTimeDirty(): boolean {
        return DtcUtils.getDurationDiffInMinutes(this._originalState.stabilizationTime, this._currentState.stabilizationTime) !== 0;
    }

    private _isTimeoutDirty(): boolean {
        return DtcUtils.getDurationDiffInMinutes(this._originalState.timeout, this._currentState.timeout) !== 0;
    }

    private _isSamplingIntervalDirty(): boolean {
        return DtcUtils.getDurationDiffInMinutes(this._originalState.samplingInterval, this._currentState.samplingInterval) !== 0;
    }

    private _isMinimumSuccessfulMinutesDirty(): boolean {
        return DtcUtils.getDurationDiffInMinutes(this._originalState.minimumSuccessDuration, this._currentState.minimumSuccessDuration) !== 0;
    }

    private _pageDataHelperInstance: ReleaseEditorWebPageDataHelper;
    private _currentState: IGatesState = {} as IGatesState;
    private _originalState: IGatesState = {} as IGatesState;
    private _stateRef: IGatesState = {} as IGatesState;
    private _gateListStore: GateListStore;
    private _args: IGatesStoreArgs;
    private _gateListInstanceId: string;
    private _gateStepId: number = 0;
}