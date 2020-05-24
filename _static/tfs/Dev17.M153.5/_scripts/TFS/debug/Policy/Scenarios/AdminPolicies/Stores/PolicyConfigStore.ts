// libs
import { Store } from "VSS/Flux/Store";
import { Debug } from "VSS/Diag";
import { autobind } from "OfficeFabric/Utilities";
import { UnsavedChanges } from "VSS/Resources/VSS.Resources.Platform";
import * as Utils_Array from "VSS/Utils/Array";

// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { normalizeSettings } from "Policy/Scripts/PolicyTypes";

// scenario
import { Actions } from "Policy/Scenarios/AdminPolicies/Actions/ActionsHub";

export class PolicyConfigStore extends Store {

    private _serverConfigs: PolicyConfiguration[];
    private _localConfigs: PolicyConfiguration[];

    private _presetPolicyConfig: PolicyConfiguration;

    private _saveInProgress: number = 0;

    constructor(pageData: any) {
        super();

        this._serverConfigs = pageData.policyConfigs || [];

        this._serverConfigs.forEach(normalizeSettings);

        this.copyServerToLocal();
    }

    private copyServerToLocal(): void {
        this._localConfigs = JSON.parse(JSON.stringify(this._serverConfigs));
    }

    public get serverPolicyConfigs(): PolicyConfiguration[] {
        return this._serverConfigs;
    }

    public get localPolicyConfigs(): PolicyConfiguration[] {
        return this._localConfigs;
    }

    public get saveInProgress(): boolean {
        return this._saveInProgress > 0;
    }

    public get presetPolicyConfig(): PolicyConfiguration {
        return this._presetPolicyConfig;
    }

    public beginSaveOperation() {
        ++this._saveInProgress;

        if (this._saveInProgress === 1) {
            this.emitChanged();
        }
    }

    public endSaveOperation() {
        Debug.assert(this._saveInProgress > 0, "endSaveOperation with no matching beginSaveOperation");

        --this._saveInProgress;

        if (this._saveInProgress === 0) {
            this.emitChanged();
        }
    }

    @autobind
    public windowBeforeUnload(payload: Actions.WindowBeforeUnloadPayload): void {
        if (this.hasLocalChanges()) {
            payload.userPrompt = UnsavedChanges;
        }
    }

    public hasLocalChanges(policyTypeIdFilter?: string[]): boolean {
        for (let index = 0; index < this._localConfigs.length; ++index) {
            let localConfig = this._localConfigs[index];

            if (policyTypeIdFilter && policyTypeIdFilter.indexOf(localConfig.type.id) === -1) {
                continue;
            }

            if (this._serverConfigs.length > index) {
                let serverConfig = this._serverConfigs[index];

                if (localConfig.id === serverConfig.id && localConfig.revision === serverConfig.revision) {
                    continue;
                }
            }
            else if (localConfig.isDeleted) {
                // No server config found and local policy isDeleted -- user created then deleted a policy without ever saving it
                continue;
            }

            return true;
        }

        return false;
    }

    @autobind
    public abandonLocalPolicyConfigChanges(payload: Actions.AbandonLocalPolicyConfigChangesPayload): void {
        const configId = payload.configId;

        if (configId == null) {
            return;
        }

        const serverConfig = this.getServerConfigById(configId);

        if (serverConfig == null) {
            Utils_Array.removeWhere(this._localConfigs, cfg => cfg.id === configId);

            this.emitChanged();
            return;
        }

        Debug.assert(configId >= 0, "Should not have a temporary (negative) id when a server config is present");

        const localCopy = JSON.parse(JSON.stringify(serverConfig));
        const localIndex = Utils_Array.findIndex(this._localConfigs, cfg => cfg.id === configId);

        Debug.assert(localIndex >= 0, "Expected to find a local config while abandoning changes");

        if (localIndex >= 0) {
            this._localConfigs.splice(localIndex, 1, localCopy);

            this.emitChanged();
        }
    };

    @autobind
    public abandonAllLocalPolicyConfigChanges(): void {
        this.copyServerToLocal();

        this.emitChanged();
    };

    private getTempLocalId(): number {
        const lowestLocalId: number = this._localConfigs.reduce<number>((min, val) => Math.min(min, val.id | 0), -1);

        return lowestLocalId - 1;
    }

    @autobind
    public createLocalPolicyConfig(payload: Actions.CreateLocalPolicyConfigPayload): void {
        let config = payload.config;

        Debug.assert(!config.isDeleted);

        config.id = this.getTempLocalId();

        // ID should be unique
        Debug.assert(this._serverConfigs.every(cfg => cfg.id !== config.id));
        Debug.assert(this._localConfigs.every(cfg => cfg.id !== config.id));

        this._localConfigs.push(config);

        this.emitChanged();
    }

    @autobind
    public updateLocalPolicyConfig(payload: Actions.UpdateLocalPolicyConfigPayload): void {
        const index = Utils_Array.findIndex(this._localConfigs, cfg => cfg.id === payload.configId);

        if (index < 0) {
            Debug.fail("Could not find policy config to update");
            return;
        }

        let configClone = JSON.parse(JSON.stringify(this._localConfigs[index]));

        const newRevision = (configClone.revision || 1) + 1;
        configClone.revision = newRevision;

        payload.performUpdate(configClone);

        if (configClone.id !== payload.configId) {
            Debug.fail("Policy config Id must not be changed in performUpdate");
            return;
        }

        if (configClone.revision !== newRevision) {
            Debug.fail("Policy revision Id must not be changed in performUpdate");
            configClone.revision = newRevision;
        }

        this._localConfigs[index] = configClone;

        this.emitChanged();
    };

    @autobind
    public deleteLocalPolicyConfig(configId: number): void {
        if (this.getServerConfigById(configId) != null) {
            Debug.fail("This method should only be used to delete local configs which were never saved to the server -- set IsDeleted instead");
            return;
        }

        Utils_Array.removeWhere(this._localConfigs, cfg => cfg.id === configId);
    }

    public getLocalConfigById(configId: number): PolicyConfiguration {
        const index = Utils_Array.findIndex(this._localConfigs, cfg => cfg.id === configId);

        if (index < 0) {
            return null;
        }
        else {
            return this._localConfigs[index];
        }
    }

    public getServerConfigById(configId: number): PolicyConfiguration {
        const index = Utils_Array.findIndex(this._serverConfigs, cfg => cfg.id === configId);

        if (index < 0) {
            return null;
        }
        else {
            return this._serverConfigs[index];
        }
    }

    public singleConfigOfType(typeId: string): PolicyConfiguration {
        const index = Utils_Array.findIndex(this._localConfigs, cfg => cfg.type.id === typeId);

        if (index < 0) {
            return null;
        }
        else {
            return this._localConfigs[index];
        }
    }

    public allConfigsOfType(typeId: string): PolicyConfiguration[] {
        return this._localConfigs.filter(cfg => cfg.type.id === typeId);
    }

    @autobind
    public onServerPolicyConfigCreated(payload: Actions.ServerPolicyConfigCreatedPayload): void {
        if (!payload.error) {
            let { localConfig, serverConfig } = payload;

            normalizeSettings(serverConfig);

            const tempConfigId = localConfig.id;

            // Remove local config, which had temporary Id and revision number, and add a clone of the current server config
            Utils_Array.removeWhere(this._localConfigs, cfg => cfg.id === tempConfigId);
            const localCopy = JSON.parse(JSON.stringify(serverConfig));
            this._localConfigs.push(localCopy);

            this._serverConfigs.push(serverConfig);

            this.emitChanged();
        }
    };

    @autobind
    public onServerPolicyConfigUpdated(payload: Actions.ServerPolicyConfigUpdatedPayload): void {
        if (!payload.error) {
            let updatedConfig = payload.config;

            normalizeSettings(updatedConfig);

            const localCopy = JSON.parse(JSON.stringify(updatedConfig));

            Utils_Array.removeWhere(this._localConfigs, cfg => cfg.id === updatedConfig.id);
            this._localConfigs.push(localCopy);

            Utils_Array.removeWhere(this._serverConfigs, cfg => cfg.id === updatedConfig.id);
            this._serverConfigs.push(updatedConfig);

            this.emitChanged();
        }
    };

    @autobind
    public onServerPolicyConfigDeleted(payload: Actions.ServerPolicyConfigDeletedPayload): void {
        if (!payload.error) {
            Utils_Array.removeWhere(this._localConfigs, cfg => cfg.id === payload.configId);

            Utils_Array.removeWhere(this._serverConfigs, cfg => cfg.id === payload.configId);

            this.emitChanged();
        }
    }

    @autobind
    public presetConfigurationUpdated(payload: Actions.PresetConfigurationPayload): void {
        this._presetPolicyConfig = payload.presetConfiguration;
        // do not emit change here since preset policy config is not used by component, only by action creator
    }
}
