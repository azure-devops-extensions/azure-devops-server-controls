import { PhaseStoreBase, IPhaseStoreArgs } from "DistributedTaskControls/Phase/Stores/PhaseStoreBase";
import { IDeployPhase, DeployPhaseSectionConstants, PhaseConditionTypeKeys, DeployPhaseTypes } from "DistributedTaskControls/Phase/Types";
import { DeployPhaseUtilities } from "DistributedTaskControls/Phase/DeployPhaseUtilities";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { ITaskContextOptions } from "DistributedTaskControls/Common/Types";
import { GatesPhaseActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/GatesPhaseActionsHub";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeploymentGatesPhaseTypeString } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { GateConstants } from "ReleaseManagement/Core/Constants";
import { ReleaseProgressDataHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseProgressData";
import { IDuration, TimeUnits } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";
import { GatesPhaseUtils } from "PipelineWorkflow/Scripts/Shared/Environment/GatesPhaseUtils";
import { ReleaseEditorWebPageDataHelper } from "PipelineWorkflow/Scripts/Editor/Sources/ReleaseEditorWebPageData";

export interface IGatesPhaseStoreArgs extends IPhaseStoreArgs {

}

export interface IGatesPhaseStoreDeploymentInput {
    timeout: IDuration;
    stabilizationTime: IDuration;
    samplingInterval: IDuration;
    minimumSuccessDuration: IDuration;
    condition: string;
}

export interface IGatesPhaseStorePhase extends IDeployPhase {
    deploymentInput: IGatesPhaseStoreDeploymentInput;
}

export class GatesPhaseStore extends PhaseStoreBase {
    
    constructor(args: IGatesPhaseStoreArgs){
        super(
            args.itemSelectionInstanceId,
            args.taskDelegates, 
            args.processInstanceId, 
            args.processParametersNotSupported, 
            args.isFileSystemBrowsable, 
            args.phaseDefinition,
            {
                donotShowOutputVariables: true,
                donotShowYAMLFeature: true,
                donotShowTimeout: true,
                donotShowContinueOnError: true,
                donotShowAlwaysRun: true,
                donotShowTaskGroupOptions: true
            } as ITaskContextOptions
        );
        
        this._initializeStates(args.phase as IGatesPhaseStorePhase);
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._actionsHub = ActionsHubManager.GetActionsHub<GatesPhaseActionsHub>(GatesPhaseActionsHub, instanceId);

        this._actionsHub.updateMinimumSuccessDuration.addListener(this._updateMinimumSuccessDuration);
        this._actionsHub.updateSamplingInterval.addListener(this._updateSamplingInterval);
        this._actionsHub.updateStabilizationTime.addListener(this._updateStabilizationTime);
        this._actionsHub.updateTimeout.addListener(this._updateTimeout);

        // listeners for base class
        this._deployPhaseActionsHub.updatePhaseCondition.addListener(this._updatePhaseCondition);
        this._deployPhaseActionsHub.updatePhase.addListener(this._updatePhase);
    }

    public disposeInternal(): void {
        this._actionsHub.updateMinimumSuccessDuration.removeListener(this._updateMinimumSuccessDuration);
        this._actionsHub.updateSamplingInterval.removeListener(this._updateSamplingInterval);
        this._actionsHub.updateStabilizationTime.removeListener(this._updateStabilizationTime);
        this._actionsHub.updateTimeout.removeListener(this._updateTimeout);

        // listeners for base class
        this._deployPhaseActionsHub.updatePhaseCondition.removeListener(this._updatePhaseCondition);
        this._deployPhaseActionsHub.updatePhase.removeListener(this._updatePhase);

        super.disposeInternal();
    }

    public static getKey(): string {
        return "GatesPhaseStore_KEY";
    }

    public getPhaseType(): DeployPhaseTypes {
        return DeploymentGatesPhaseTypeString;
    }

    public getState(): IGatesPhaseStorePhase {
        return super.getState() as IGatesPhaseStorePhase;
    }

    public getOriginalState(): IGatesPhaseStorePhase {
        return this._originalState as IGatesPhaseStorePhase;
    }

    public updateVisitor(visitor: IGatesPhaseStorePhase): void {
        super.updateVisitor(visitor);
        let curState: IGatesPhaseStorePhase = this.getState();
        visitor.phaseType = DeploymentGatesPhaseTypeString;
        visitor.deploymentInput = JQueryWrapper.extendDeep(curState.deploymentInput, visitor.deploymentInput);
    }

    public isDirty(): boolean {
        let curState: IGatesPhaseStorePhase = this.getState();
        let origState: IGatesPhaseStorePhase = this.getOriginalState();
        let isDirty = false;
    
        isDirty = (curState.deploymentInput.condition !== origState.deploymentInput.condition) 
            || DtcUtils.getDurationDiffInMinutes(curState.deploymentInput.stabilizationTime, origState.deploymentInput.stabilizationTime) !== 0
            || DtcUtils.getDurationDiffInMinutes(curState.deploymentInput.samplingInterval, origState.deploymentInput.samplingInterval) !== 0
            || DtcUtils.getDurationDiffInMinutes(curState.deploymentInput.minimumSuccessDuration, origState.deploymentInput.minimumSuccessDuration) !== 0
            || DtcUtils.getDurationDiffInMinutes(curState.deploymentInput.timeout, origState.deploymentInput.timeout) !== 0;
    
        return isDirty || super.isDirty();
    }

    public arePhaseDetailsValid(): boolean {
        return super.arePhaseDetailsValid() && this.isValid();
    }

    public isValid(): boolean {
        let deploymentInput = this.getState().deploymentInput;

        return super.isValid() 
            && GatesPhaseStore.isValidSamplingInterval(deploymentInput.samplingInterval)
            && GatesPhaseStore.isValidStabilizationTime(deploymentInput.stabilizationTime)
            && GatesPhaseStore.isValidTimeout(deploymentInput.timeout)
            && GatesPhaseStore.isValidMinimumSuccessDuration(deploymentInput.minimumSuccessDuration);
    }

    public static isValidMinimumSuccessDuration(minimumSuccessDuration: IDuration): boolean {
        return DtcUtils.isDurationInMinutesRange(minimumSuccessDuration, GateConstants.MinimumSuccessDurationMinAllowedValueInMinutes, GateConstants.MinimumSuccessDurationMaxAllowedValueInMinutes);
    }

    public static isValidTimeout(timeout: IDuration) {
        return DtcUtils.isDurationInMinutesRange(timeout, GateConstants.MinimumTimeoutInMinutes, GateConstants.MaximumTimeoutInMinutes);
    }

    public static isValidStabilizationTime(stabilizationTime: IDuration) {
        return DtcUtils.isDurationInMinutesRange(stabilizationTime, GateConstants.MinimumStabilizationTimeInMinutes, GateConstants.MaximumStabilizationTimeInMinutes);
    }

    public static isValidSamplingInterval(samplingInterval: IDuration): boolean {
        return DtcUtils.isDurationInMinutesRange(samplingInterval, GatesPhaseStore.getGatesMinimumSamplingIntervalTimeout(), GateConstants.MaximumSamplingIntervalInMinutes);
    }

    public static getGatesMinimumSamplingIntervalTimeout(): number {
        return ReleaseEditorWebPageDataHelper.instance().getGatesMinimumSamplingIntervalInMinutes();
    }
    
    private _updateStabilizationTime = (time: IDuration): void => {
        this.getState().deploymentInput.stabilizationTime = time;
        this.emitChanged();
        
    }

    private _updateTimeout = (time: IDuration): void => {
        this.getState().deploymentInput.timeout = time;
        this.emitChanged();
    }

    private _updateSamplingInterval = (time: IDuration): void => {
        this.getState().deploymentInput.samplingInterval = time;
        this.emitChanged();
    }

    private _updateMinimumSuccessDuration = (time: IDuration): void => {
        this.getState().deploymentInput.minimumSuccessDuration = time;
        this.emitChanged();
    }

    private _updatePhaseCondition = (newValue: string) => {
        if (!this.getState().deploymentInput) {
            this._initializePhaseDeploymentInput(this.getState());
            this.getState().deploymentInput.condition = newValue;
        }
        else {
            this.getState().deploymentInput.condition = newValue;
        }

        this.emitChanged();
    }

    private _updatePhase = (phase: IGatesPhaseStorePhase) => {
        this._initializeStates(phase);
    }

    private _initializeStates(phase: IGatesPhaseStorePhase): void {
        if (!phase.deploymentInput){
            this._initializePhaseDeploymentInput(phase);
        }

        this._originalState = DeployPhaseUtilities.createDeployPhaseCopy(phase);
        this._currentState = DeployPhaseUtilities.createDeployPhaseCopy(phase);
        super._initializeInputsState();
    }

    private _initializePhaseDeploymentInput(phase: IGatesPhaseStorePhase): void {
        phase.deploymentInput = GatesPhaseUtils.getDefaultGatesDeploymentInput();
    }

    private _actionsHub: GatesPhaseActionsHub;
}