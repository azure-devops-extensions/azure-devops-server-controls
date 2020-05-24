import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import { FeatureFlag_ResourceAuthForVGEndpoint } from "DistributedTaskControls/Common/Common";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ProcessVariablesV2Store } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";
import { VariableGroupPolicyStore } from "DistributedTask/Scripts/Stores/VariableGroupPolicyStore";
import { ProcessVariablesViewStore } from "DistributedTaskControls/Variables/ProcessVariables/ViewStore";
import { IKeyVaultVariableGroupDetails, KeyVaultVariableGroupStore } from "DistributedTask/Scripts/Stores/KeyVaultVariableGroupStore";
import { LibraryStoreKeys } from "DistributedTask/Scripts/Constants";
import { VariablesConverter } from "DistributedTask/Scripts/DT.Converters";
import { VariableGroup, Variable, VariableGroupType } from "DistributedTask/Scripts/DT.VariableGroup.Model";
import { PerfTelemetryManager, TelemetryScenarios } from "DistributedTask/Scripts/Utils/TelemetryUtils";

import Library_Actions = require("DistributedTask/Scripts/Actions/LibraryActions");
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export interface IVariableGroupDetails {
    id: number;
    name: string;
    description: string;
    isKeyVaultVariableGroup: boolean;
}

export class VariableGroupStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return LibraryStoreKeys.StoreKey_VariableGroupStore;
    }

    public initialize(): void {
        this._variableListStore = StoreManager.GetStore<ProcessVariablesV2Store>(ProcessVariablesV2Store);
        this._keyVaultVariableGroupStore = StoreManager.GetStore<KeyVaultVariableGroupStore>(KeyVaultVariableGroupStore);
        if (this._isResourceAuthorizationEnabled) {
            this._variableGroupPolicyStore = StoreManager.GetStore<VariableGroupPolicyStore>(VariableGroupPolicyStore);
        }

        Library_Actions.loadVariableGroup.addListener(this.loadVariableGroupDetails, this);
        Library_Actions.getVariableGroup.addListener(this.loadVariableGroupDetails, this);
        Library_Actions.cloneVariableGroup.addListener(this.cloneVariableGroupDetails, this);
    }

    protected disposeInternal(): void {
        Library_Actions.loadVariableGroup.removeListener(this.loadVariableGroupDetails);
        Library_Actions.getVariableGroup.removeListener(this.loadVariableGroupDetails);
        Library_Actions.cloneVariableGroup.removeListener(this.cloneVariableGroupDetails);

        StoreManager.DeleteStore<ProcessVariablesV2Store>(ProcessVariablesV2Store);
        StoreManager.DeleteStore<ProcessVariablesViewStore>(ProcessVariablesViewStore);
        StoreManager.DeleteStore<KeyVaultVariableGroupStore>(KeyVaultVariableGroupStore);
        
        if (this._isResourceAuthorizationEnabled) {
            StoreManager.DeleteStore<VariableGroupPolicyStore>(VariableGroupPolicyStore);
        }

        this._variableGroupDetails = null;
        this._variableGroupDetailsForCloning = null;
    }

    public getVariableListStore(): ProcessVariablesV2Store {
        return this._variableListStore;
    }

    public getVariableGroupPolicyStore(): VariableGroupPolicyStore {
        return this._variableGroupPolicyStore;
    }

    public getKeyVaultVariableGroupStore(): KeyVaultVariableGroupStore {
        return this._keyVaultVariableGroupStore;
    }

    public getVariableGroupDetails(): IVariableGroupDetails {
        if (!this._variableGroupDetails) {
            // Check if new variable group which is getting created is a clone or fresh variable group
            if (this._variableGroupDetailsForCloning) {
                return this._variableGroupDetailsForCloning;
            }

            var date = new Date();
            var currentDate = Utils_Date.localeFormat(date, "dd-MMM");
            let newVariableGroupName = Utils_String.format("{0} {1}", Resources.NewVariableGroupText, currentDate);
            return { id: 0, name: newVariableGroupName, description: Utils_String.empty, isKeyVaultVariableGroup: false };
        }

        return this._variableGroupDetails;
    }

    public isVariableListDirty(): Boolean {
        return this._variableListStore.isDirty();
    }

    public isVariableListValid(): Boolean {
        return this._variableListStore.isValid();
    }

    public isKeyVaultVariableGroupDirty(): Boolean {
        return this._keyVaultVariableGroupStore.isDirty();
    }

    public isVariableGroupPolicyStoreDirty(): boolean {
        return this._variableGroupPolicyStore.isDirty();
    }

    public isKeyVaultVariableGroupValid(): Boolean {
        return this._keyVaultVariableGroupStore.isValid();
    }

    public getVariableList(): Variable[] {
        return VariablesConverter.toModelVariable(this._variableListStore.getVariableList());
    }

    public getKeyVaultVariableGroupDetails(): IKeyVaultVariableGroupDetails {
        return this._keyVaultVariableGroupStore.getKeyVaultVariableGroupDetails();
    }

    public cloneVariableGroupDetails(variableGroup: VariableGroup): void {
        this.loadVariableGroupDetails(variableGroup, true);
    }

    public loadVariableGroupDetails(variableGroup: VariableGroup, isClone: boolean = false): void {
        let isKeyVaultVariableGroup = VariableGroupType.isKeyVaultVariableGroupType(variableGroup.type);

        let variableGroupDetails = {
            id: variableGroup.id,
            name: variableGroup.name,
            description: variableGroup.description,
            isKeyVaultVariableGroup: isKeyVaultVariableGroup
        }

        if (isClone) {
            this._variableGroupDetailsForCloning = variableGroupDetails;
            this._variableGroupDetails = null;
        } else {
            this._variableGroupDetails = variableGroupDetails;
            this._variableGroupDetailsForCloning = null;
        }

        PerfTelemetryManager.instance.endScenario(TelemetryScenarios.saveVariableGroup);
        PerfTelemetryManager.instance.endScenario(TelemetryScenarios.getVariableGroup);
        this.emitChanged();
    }

    private _variableGroupDetails: IVariableGroupDetails;
    private _variableGroupDetailsForCloning: IVariableGroupDetails;
    private _variableListStore: ProcessVariablesV2Store;
    private _keyVaultVariableGroupStore: KeyVaultVariableGroupStore;
    private _variableGroupPolicyStore: VariableGroupPolicyStore;
    private _isResourceAuthorizationEnabled: boolean = FeatureAvailabilityService.isFeatureEnabled(FeatureFlag_ResourceAuthForVGEndpoint);
}