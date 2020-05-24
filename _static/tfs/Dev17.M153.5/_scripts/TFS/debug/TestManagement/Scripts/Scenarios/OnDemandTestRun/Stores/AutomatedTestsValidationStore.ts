/// <reference types="jquery" />

import { Store } from "VSS/Flux/Store";


import {
    AutomatedTestRunActionsHub, IReleaseCreationInfo, ICapabilitiesCheckCompletedPayload
} from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/AutomatedTestRunActionsHub";
import * as TestValidationBlock from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Components/TestValidationBlock";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

import * as Utils_String  from "VSS/Utils/String";

export interface IAutomatedTestsValidationState extends IReleaseCreationInfo {
    viewProgressEnabled: boolean;
    automatedTestsDiscoveredText?: string;
    automatedTestsDiscoverStatus?: TestValidationBlock.ProgressType;
    environmentValidationCompletedText?: string;
    releaseEnvironmentTestRunCapabilitiesCheckStatus?: TestValidationBlock.ProgressType;
    triggeringReleaseStatus?: TestValidationBlock.ProgressType;
    releaseErrorMessage?: string;
}

export class AutomatedTestsValidationStore extends Store {

    constructor(private _actionsHub: AutomatedTestRunActionsHub) {
        super();
        this._initialize();
    }

    private _initialize(): void {
        this._state = this._getDefaultState();
        this._actionsHub.automatedTestsDiscovering.addListener(this._automatedTestsDiscoveringListener);
        this._actionsHub.automatedTestsDiscovered.addListener(this._automatedTestsDiscoveredListener);
        this._actionsHub.triggeringRelease.addListener(this._triggeringReleaseListener);
        this._actionsHub.triggeredRelease.addListener(this._triggeredReleaseListener);
        this._actionsHub.triggeringReleaseError.addListener(this._triggeringReleaseErrorListener);
        this._actionsHub.closeDialog.addListener(this._closeDialogListener);
        this._actionsHub.releaseEnvironmentTestRunCapabilitiesCheckStarted.addListener(this._releaseEnvironmentTestRunCapabilitiesCheckStartedListener);
        this._actionsHub.releaseEnvironmentTestRunCapabilitiesCheckCompleted.addListener(this._releaseEnvironmentTestRunCapabilitiesCheckCompletedListener);
    }

    public getState(): IAutomatedTestsValidationState {
        return this._state;
    }

    private _automatedTestsDiscoveringListener = (): void => {
        this._state.automatedTestsDiscoverStatus = TestValidationBlock.ProgressType.InProgress;
        this.emitChanged();
    }

    private _automatedTestsDiscoveredListener = (automatedTestPointsCount: number): void => {
        if (automatedTestPointsCount) {
            this._state.automatedTestsDiscoverStatus = TestValidationBlock.ProgressType.Passed;
        } else {
            this._state.automatedTestsDiscoverStatus = TestValidationBlock.ProgressType.Failed;
        }
        this._state.automatedTestsDiscoveredText = Utils_String.format(Resources.IdentifyAutomatedTestsStatus, automatedTestPointsCount);
        this.emitChanged();
    }

    private _triggeringReleaseListener = (): void => {
        this._state.triggeringReleaseStatus = TestValidationBlock.ProgressType.InProgress;
        this.emitChanged();
    }

    private _triggeredReleaseListener = (releaseCreationInfo: IReleaseCreationInfo): void => {
        $.extend(this._state, releaseCreationInfo);
        this._state.triggeringReleaseStatus = TestValidationBlock.ProgressType.Passed;
        this._state.viewProgressEnabled = true;
        this.emitChanged();
    }

    private _triggeringReleaseErrorListener = (errorMessage: string): void => {
        this._state.triggeringReleaseStatus = TestValidationBlock.ProgressType.Failed;
        this._state.viewProgressEnabled = false;
        this._state.releaseErrorMessage = errorMessage;
        this.emitChanged();
    }

    private _closeDialogListener = (): void => {
        this._state = this._getDefaultState();
        this.emitChanged();
    }

    private _releaseEnvironmentTestRunCapabilitiesCheckStartedListener = (): void => {
        this._state.releaseEnvironmentTestRunCapabilitiesCheckStatus = TestValidationBlock.ProgressType.InProgress;
        this.emitChanged();
    }

    private _releaseEnvironmentTestRunCapabilitiesCheckCompletedListener = (payload: ICapabilitiesCheckCompletedPayload) => {
        this._state.releaseEnvironmentTestRunCapabilitiesCheckStatus = payload.success ? TestValidationBlock.ProgressType.Passed : TestValidationBlock.ProgressType.Failed;
        if (!payload.success) {
            this._state.environmentValidationCompletedText = payload.reason;
        }
        this.emitChanged();
    }

    private _getDefaultState(): IAutomatedTestsValidationState {
        return {
            viewProgressEnabled: false,
            automatedTestsDiscoverStatus: TestValidationBlock.ProgressType.NotStarted,
            releaseEnvironmentTestRunCapabilitiesCheckStatus: TestValidationBlock.ProgressType.NotStarted,
            triggeringReleaseStatus: TestValidationBlock.ProgressType.NotStarted
        } as IAutomatedTestsValidationState;
    }

    private _state: IAutomatedTestsValidationState;
}
