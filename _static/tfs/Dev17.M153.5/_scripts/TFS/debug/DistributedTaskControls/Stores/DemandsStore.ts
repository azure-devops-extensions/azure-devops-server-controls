import { DemandsActions, IDemandConditionPayload, IDemandKeyPayload, IDemandsPayload, IDemandValuePayload } from "DistributedTaskControls/Actions/DemandsActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { AppCapability, AppContext } from "DistributedTaskControls/Common/AppContext";
import { DemandCondition, StoreKeys } from "DistributedTaskControls/Common/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Utils_String from "VSS/Utils/String";

export interface IDemandData {
    name: string;
    condition: string;
    value: string;
}

export interface IDemandsState {
    demands: IDemandData[];
}

export interface IDemandsStoreArgs extends IDemandsState {
}

export class DemandsStore extends StoreCommonBase.ChangeTrackerStoreBase {

    /**
     * @brief Constructor
     */
    constructor(args: IDemandsStoreArgs) {
        super();
        let demandsData = args.demands || [];
        this._currentDemandsState = <IDemandsState>{
            demands: JQueryWrapper.extendDeep([], demandsData)
        };
        this._originalDemandsState = <IDemandsState>{
            demands: JQueryWrapper.extendDeep([], demandsData)
        };
    }

    public static getKey(): string {
        return StoreKeys.DemandsStore;
    }

    public initialize(instanceId: string): void {

        this._actionsHub = ActionsHubManager.GetActionsHub<DemandsActions>(DemandsActions, instanceId);

        this._actionsHub.createDemands.addListener(this._createDemandsListener);
        this._actionsHub.updateDemands.addListener(this._updateDemandsListener);
        this._actionsHub.updateDemandCondition.addListener(this._updateDemandCondition);
        this._actionsHub.updateDemandKey.addListener(this._updateDemandKey);
        this._actionsHub.updateDemandValue.addListener(this._updateDemandValue);
        this._actionsHub.addDemand.addListener(this._addDemand);
        this._actionsHub.deleteDemand.addListener(this._deleteDemand);
    }

    protected disposeInternal(): void {
        this._actionsHub.createDemands.removeListener(this._createDemandsListener);
        this._actionsHub.updateDemands.removeListener(this._updateDemandsListener);
        this._actionsHub.updateDemandCondition.removeListener(this._updateDemandCondition);
        this._actionsHub.updateDemandKey.removeListener(this._updateDemandKey);
        this._actionsHub.updateDemandValue.removeListener(this._updateDemandValue);
        this._actionsHub.addDemand.removeListener(this._addDemand);
        this._actionsHub.deleteDemand.removeListener(this._deleteDemand);

        this._originalDemandsState.demands = null;
        this._currentDemandsState.demands = null;
    }

    public isDirty(): boolean {
        return !(DemandsUtils.areEqual(this._currentDemandsState.demands, this._originalDemandsState.demands));
    }

    /**
     * @brief Returns back the validity of the store
     */
    public isValid(): boolean {
        let returnValue = true;
        if (this._currentDemandsState.demands) {
            this._currentDemandsState.demands.forEach((demand: IDemandData) => {
                if (this.isDemandNameInvalid(demand)
                    || (demand.condition === DemandCondition.Equals
                        && this.isDemandValueInvalid(demand.value))) {
                    returnValue = false;
                }
            });
        }

        return returnValue;
    }

    public isDemandNameInvalid(demand: IDemandData): boolean {
        return !!this.getDemandNameInvalidErrorMessage(demand);
    }

    public getDemandNameInvalidErrorMessage(demand: IDemandData): string {
        if (demand.condition !== DemandCondition.Equals
            && AppContext.instance().isCapabilitySupported(AppCapability.GreaterThanConditionInDemand)) {
            // Handle -equals and -gtVersion seperately
            let tokens = [];
            let demandName = demand.name;
            if (RegexConstants.DemandGtVersionRegEx.test(demandName)) {
                tokens = demandName.split(RegexConstants.DemandGtVersionRegEx);
            }
            else if (RegexConstants.DemandEqualsRegEx.test(demandName)) {
                tokens = demandName.split(RegexConstants.DemandEqualsRegEx);
            }

            if (!!tokens && tokens.length > 0) {
                // this case is similar to tokens[0] condition tokens[1]
                if (!!this._getDemandNameInvalidErrorMessage(tokens[0])) {
                    return this._getDemandNameInvalidErrorMessage(tokens[0]);
                }
                else if (!!this._getDemandValueInvalidErrorMessage(tokens[1])) {
                    return this._getDemandValueInvalidErrorMessage(tokens[1]);
                }
                return Utils_String.empty;
            }
            else {
                return this._getDemandNameInvalidErrorMessage(demandName);
            }
        }
        else {
            return this._getDemandNameInvalidErrorMessage(demand.name);
        }
    }

    public isDemandValueInvalid(demandValue: string): boolean {
        return !!this._getDemandValueInvalidErrorMessage(demandValue);
    }

    public getState(): IDemandsState {
        return this._currentDemandsState;
    }

    public getCurrentDemands(): IDemandData[] {
        if (this._currentDemandsState && this._currentDemandsState.demands) {
            return this._currentDemandsState.demands;
        }
        return null;
    }

    private _createDemandsListener = (demandsPayload: IDemandsPayload) => {
        this._createOrUpdateDemandsListener(demandsPayload.demands);
        this.emitChanged();
    }

    private _updateDemandsListener = (demandsPayload: IDemandsPayload) => {
        this._createOrUpdateDemandsListener(demandsPayload.demands);
        if (demandsPayload.forceUpdate) {
            this.emitChanged();
        }
    }

    private _createOrUpdateDemandsListener(demands: IDemandData[]): void {
        this._originalDemandsState.demands = DemandsUtils.createDemandsCopy(demands);
        this._currentDemandsState.demands = DemandsUtils.createDemandsCopy(demands);
    }

    private _updateDemandCondition = (payload: IDemandConditionPayload) => {
        if (payload.condition) {
            this._currentDemandsState.demands[payload.index].condition = payload.condition;
            if (payload.condition === DemandCondition.Exists) {
                this._currentDemandsState.demands[payload.index].value = Utils_String.empty;
            }
        }
        this.emitChanged();
    }

    private _updateDemandKey = (payload: IDemandKeyPayload) => {
        this._currentDemandsState.demands[payload.index].name = payload.key;
        this.emitChanged();
    }

    private _updateDemandValue = (payload: IDemandValuePayload) => {
        if (payload.value !== null && payload.value !== undefined) {
            this._currentDemandsState.demands[payload.index].value = payload.value;
        }
        this.emitChanged();
    }

    private _addDemand = (payload: IEmptyActionPayload) => {
        this._currentDemandsState.demands.push(
            {
                name: Utils_String.empty,
                condition: DemandCondition.Exists,
                value: Utils_String.empty
            } as IDemandData
        );
        this.emitChanged();
    }

    private _deleteDemand = (payload: IDemandKeyPayload) => {
        this._currentDemandsState.demands.splice(payload.index, 1);
        this.emitChanged();
    }

    private _getDemandNameInvalidErrorMessage(demandName: string): string {
        if (!!demandName) {
            if (demandName.trim() === Utils_String.empty) {
                return Resources.DemandNameEmptyErrorTooltip;
            }
            else if (/\s/g.test(demandName.trim())) {
                return Resources.DemandNameSpaceErrorTooltip;
            }
            return Utils_String.empty;
        }
        return Resources.DemandNameEmptyErrorTooltip;
    }

    private _getDemandValueInvalidErrorMessage(demandValue: string): string {
        if (!!demandValue) {
            if (demandValue.trim() === Utils_String.empty) {
                return Resources.DemandValueEmptyErrorTooltip;
            }
            return Utils_String.empty;
        }
        return Resources.DemandValueEmptyErrorTooltip;
    }

    private _currentDemandsState: IDemandsState;
    private _originalDemandsState: IDemandsState;
    private _actionsHub: DemandsActions;

}

export class DemandsUtils {

    /**
     * @brief Creates a copy of demands instance object
     * @param demandsInstance
     */
    public static createDemandsCopy(demandsInstance: IDemandData[]): IDemandData[] {
        let demands: IDemandData[] = [];

        demandsInstance.forEach((demand: IDemandData) => {
            demands.push({
                name: demand.name,
                condition: demand.condition,
                value: demand.value
            });
        });
        return demands;
    }

    /**
     * @brief Compares two demands instances and return true/false if they are equal or otherwise
     * @param instance1
     * @param instance2
     */
    public static areEqual(instance1: IDemandData[], instance2: IDemandData[]): boolean {

        if (instance1.length !== instance2.length) {
            return false;
        }

        let returnValue: boolean = true;

        for (let index = 0, length = instance1.length; index < length; index++) {
            if (!this._compareStringWithTrim(instance1[index].name, instance2[index].name) ||
                (instance1[index].condition !== instance2[index].condition) ||
                !this._compareStringWithTrim(instance1[index].value, instance2[index].value)) {
                returnValue = false;
                break;
            }
        }

        return returnValue;
    }

    private static _compareStringWithTrim(string1: string, string2: string): boolean {
        if (!string1 && !string2) {
            return true;
        }
        else if ((!string1 && string2) || (string1 && !string2)) {
            return false;
        }
        else {
            return (Utils_String.ignoreCaseComparer(string1.trim(), string2.trim()) === 0);
        }
    }
}