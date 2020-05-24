// Copyright (c) Microsoft Corporation.  All rights reserved.
import { INewable } from "DistributedTaskControls/Common/Factory";
import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as DtcResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import {
    IDuration,
    TimeConstants,
    TimeUnits,
} from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";
import { GatesStore, IGatesState } from "PipelineWorkflow/Scripts/Editor/Environment/GatesStore";
import { IGateListOptionsErrorMessages } from "PipelineWorkflow/Scripts/Editor/Environment/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { GateConstants } from "ReleaseManagement/Core/Constants";
import { ReleaseProgressDataHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseProgressData";
import * as Utils_String from "VSS/Utils/String";
import { ReleaseEditorWebPageDataHelper } from "PipelineWorkflow/Scripts/Editor/Sources/ReleaseEditorWebPageData";


export interface IEnvironmentGatesViewState extends IGatesState, IGateListOptionsErrorMessages {
    stabilizationTimeErrorMessage: string;
}

export abstract class EnvironmentGatesViewStore extends ViewStoreBase {

    protected dataStore: GatesStore;

    constructor() {
        super();
    }

    public getState(): IEnvironmentGatesViewState {
        return this._state;
    }

    public isValid(): boolean {
        return this.dataStore.isValid();
    }

    public isAnyGateEnabled(): boolean {
        return this.dataStore.isAnyGateEnabled();
    }

    public get isValidStabilizationTime(): boolean {
        return this.dataStore.isValidStabilizationTime;
    }

    public get isValidSamplingInterval(): boolean {
        return this.dataStore.isValidSamplingInterval;
    }

    public get gateListInstanceId(): string {
        return this.dataStore.gateListInstanceId;
    }

    public disposeInternal(): void {
        this.dataStore.removeChangedListener(this._onDataStoreChange);
    }

    public static getTimeoutErrorMessage(timeout: IDuration, isValidTimeout: boolean): string {
        let timeoutMessage: string = Utils_String.empty;

        if (timeout && !isValidTimeout) {
            let minValue: number = GateConstants.MinimumTimeoutInMinutes;
            let maxValue: number = GateConstants.MaximumTimeoutInMinutes;
            let units: string = DtcResources.Minutes;

            switch (timeout.unit) {
                case TimeUnits.Hours:
                    minValue = GateConstants.MinimumTimeoutInMinutes / TimeConstants.MinutesInHour;
                    maxValue = GateConstants.MaximumTimeoutInMinutes / TimeConstants.MinutesInHour;
                    units = DtcResources.Hours;
                    break;
                case TimeUnits.Days:
                    minValue = GateConstants.MinimumTimeoutInMinutes / TimeConstants.MinutesInDay;
                    maxValue = GateConstants.MaximumTimeoutInMinutes / TimeConstants.MinutesInDay;
                    units = DtcResources.Days;
                    break;
            }

            timeoutMessage = Utils_String.localeFormat(Resources.GatesTimeErrorMessage, minValue.toString(), maxValue.toString(), units.toLocaleLowerCase());
        }

        return timeoutMessage;
    }

    public static getMinimumSuccessDurationErrorMessage(minimumSuccessDurationDuration: IDuration, isValidMinimumSuccessDurationTime: boolean, timeout: IDuration): string {
        let minimumSuccessDurationMessage: string = Utils_String.empty;

        if (minimumSuccessDurationDuration && !isValidMinimumSuccessDurationTime) {
            let minValue: number = GateConstants.MinimumSuccessDurationMinAllowedValueInMinutes;
            let maxValue: number = GateConstants.MinimumSuccessDurationMaxAllowedValueInMinutes;
            let units: string = DtcResources.Minutes;

            switch (minimumSuccessDurationDuration.unit) {
                case TimeUnits.Hours:
                    minValue = GateConstants.MinimumSuccessDurationMinAllowedValueInMinutes / TimeConstants.MinutesInHour;
                    maxValue = GateConstants.MinimumSuccessDurationMaxAllowedValueInMinutes / TimeConstants.MinutesInHour;
                    units = DtcResources.Hours;
                    break;
                case TimeUnits.Days:
                    minValue = GateConstants.MinimumSuccessDurationMinAllowedValueInMinutes / TimeConstants.MinutesInDay;
                    maxValue = GateConstants.MinimumSuccessDurationMaxAllowedValueInMinutes / TimeConstants.MinutesInDay;
                    units = DtcResources.Days;
                    break;
            }

            minimumSuccessDurationMessage = Utils_String.localeFormat(Resources.GatesTimeErrorMessage, minValue.toString(), maxValue.toString(), units.toLocaleLowerCase());

            if (DtcUtils.getDurationDiffInMinutes(minimumSuccessDurationDuration, timeout) >= 0) {
                minimumSuccessDurationMessage = Resources.GatesMinimumSuccessDurationErrorMessage;
            }
        }

        return minimumSuccessDurationMessage;
    }

    public static getSamplingIntervalErrorMessage(
        samplingInterval: IDuration,
        isValidSamplingInterval: boolean,
        timeout: IDuration): string {
        let samplingIntervalMessage: string = Utils_String.empty;
        let pageDataHelperInstance: ReleaseEditorWebPageDataHelper = ReleaseEditorWebPageDataHelper.instance();

        if (samplingInterval && !isValidSamplingInterval) {
            let minValue: number = pageDataHelperInstance.getGatesMinimumSamplingIntervalInMinutes();
            let maxValue: number = GateConstants.MaximumSamplingIntervalInMinutes;
            let units: string = DtcResources.Minutes;

            if (samplingInterval.unit === TimeUnits.Hours) {
                minValue = pageDataHelperInstance.getGatesMinimumSamplingIntervalInMinutes() / TimeConstants.MinutesInHour;
                maxValue = GateConstants.MaximumSamplingIntervalInMinutes / TimeConstants.MinutesInHour;
                units = DtcResources.Hours;
            }

            samplingIntervalMessage = Utils_String.localeFormat(Resources.GatesTimeErrorMessage, minValue.toString(), maxValue.toString(), units.toLocaleLowerCase());

            if (timeout && DtcUtils.getDurationDiffInMinutes(samplingInterval, timeout) >= 0) {
                samplingIntervalMessage = Resources.GatesSamplingIntervalTimeErrorMessage;
            }
        }

        return samplingIntervalMessage;
    }

    public static getStabilizationTimeErrorMessage(stabilizationTime: IDuration, isValidStabilizationTime: boolean): string {
        let stabilizationTimeMessage: string = Utils_String.empty;

        if (stabilizationTime && !isValidStabilizationTime) {
            let minValue: number = GateConstants.MinimumStabilizationTimeInMinutes;
            let maxValue: number = GateConstants.MaximumStabilizationTimeInMinutes;
            let units: string = DtcResources.Minutes;

            if (stabilizationTime.unit === TimeUnits.Hours) {
                minValue = GateConstants.MinimumStabilizationTimeInMinutes / TimeConstants.MinutesInHour;
                maxValue = GateConstants.MaximumStabilizationTimeInMinutes / TimeConstants.MinutesInHour;
                units = DtcResources.Hours;
            }

            stabilizationTimeMessage = Utils_String.localeFormat(Resources.GatesTimeErrorMessage, minValue.toString(), maxValue.toString(), units.toLocaleLowerCase());
        }

        return stabilizationTimeMessage;
    }

    protected initializeDataStoreAndState(storeClass: INewable<GatesStore, {}>, instanceId: string): void {
        super.initialize(instanceId);
        this.dataStore = StoreManager.GetStore(storeClass, instanceId);

        this._initializeState();
        this.dataStore.addChangedListener(this._onDataStoreChange);
    }

    private _onDataStoreChange = (): void => {
        this._state = { ...this.dataStore.getState() } as IEnvironmentGatesViewState;
        this._setStabilizationTimeErrorMessage();
        this._setSamplingIntervalErrorMessage();
        this._setTimeoutErrorMessage();
        this._setMinimumSuccessDurationErrorMessage();
        this.emitChanged();
    }

    private _initializeState(): void {
        this._onDataStoreChange();
    }

    private _setStabilizationTimeErrorMessage(): void {
        this._state.stabilizationTimeErrorMessage = EnvironmentGatesViewStore.getStabilizationTimeErrorMessage(this._state.stabilizationTime, this.dataStore.isValidStabilizationTime);
    }

    private _setSamplingIntervalErrorMessage(): void {
        this._state.samplingIntervalErrorMessage = EnvironmentGatesViewStore.getSamplingIntervalErrorMessage(
                                                        this._state.samplingInterval,
                                                        this.dataStore.isValidSamplingInterval,
                                                        this._state.timeout);
    }

    private _setTimeoutErrorMessage(): void {
        this._state.timeoutErrorMessage = EnvironmentGatesViewStore.getTimeoutErrorMessage(this._state.timeout, this.dataStore.isValidTimeout);
    }

    private _setMinimumSuccessDurationErrorMessage(): void {
        this._state.minimumSuccessDurationErrorMessage = EnvironmentGatesViewStore.getMinimumSuccessDurationErrorMessage(this._state.minimumSuccessDuration, this.dataStore.isValidMinimumSuccessDurationTime, this._state.timeout);
    }

    private _state: IEnvironmentGatesViewState = {} as IEnvironmentGatesViewState;
}