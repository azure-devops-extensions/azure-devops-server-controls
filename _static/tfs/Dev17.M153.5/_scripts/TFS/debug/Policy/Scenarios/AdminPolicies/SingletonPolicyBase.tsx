// libs
import * as React from "react";
import { findIndex } from "VSS/Utils/Array";
import { Debug } from "VSS/Diag";
import { autobind } from "OfficeFabric/Utilities";
// controls
import { IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
// contracts
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
// scenario
import { ActionCreationSignatures } from "Policy/Scenarios/AdminPolicies/Flux";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface SingletonPolicyBaseProps extends React.HTMLProps<HTMLDivElement> {
    readonlyMode: boolean;

    configs: PolicyConfiguration[];

    createLocalPolicyConfig: ActionCreationSignatures.CreateLocalPolicyConfig;
    updateLocalPolicyConfig: ActionCreationSignatures.UpdateLocalPolicyConfig;
}

export abstract class SingletonPolicyBase<
    TSettings,
    TProps extends SingletonPolicyBaseProps>
    extends React.Component<TProps, {}>
{
    constructor(props: TProps) {
        super(props);
    }

    protected abstract get policyTypeId(): string;

    protected _parseLocalConfig(): {
        config: PolicyConfiguration,
        isActive: boolean,
        isBlocking: boolean,
        settings: TSettings,
    } {
        const index = findIndex(this.props.configs, cfg => cfg.type.id === this.policyTypeId);

        if (index < 0) {
            return {
                config: null,
                isActive: false,
                isBlocking: false,
                settings: {} as TSettings,
            };
        }

        const config = this.props.configs[index];

        return {
            config: config,
            isActive: !config.isDeleted && !!config.isEnabled,
            isBlocking: !!config.isBlocking,
            settings: config.settings as TSettings,
        }
    }

    @autobind
    protected _isBlockingOnChange(ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption) {
        this._updateConfig((config) => { config.isBlocking = (option.key === "true"); });
    }

    @autobind
    protected _isActiveOnChanged(ev: React.FormEvent<HTMLElement | HTMLInputElement>, checked: boolean): void {

        let { config, isActive } = this._parseLocalConfig();

        if (!!checked) {
            // Policy being added / re-enabled

            if (!config) {
                // Add policy w/ default values

                config = this._createDefaultConfig();

                this.props.createLocalPolicyConfig(config);
            }
            else {
                // Re-enable a deleted policy

                this.props.updateLocalPolicyConfig(config.id, (cfg) => {
                    cfg.isDeleted = false;
                    cfg.isEnabled = true;
                });
            }
        }
        else {
            // Policy being removed

            if (config) {
                this.props.updateLocalPolicyConfig(config.id, (cfg) => {
                    cfg.isDeleted = true;
                });
            }
            else {
                Debug.fail(`Tried to remove policy with type ${this.policyTypeId}, but never existed`);
            }
        }
    };

    @autobind
    protected _updateSettings(performSettingsUpdate: (settings: TSettings) => void): void {
        const { config } = this._parseLocalConfig();

        this.props.updateLocalPolicyConfig(config.id, (cfg) => {
            performSettingsUpdate(cfg.settings);
        });
    }

    @autobind
    protected _updateConfig(performUpdate: (config: PolicyConfiguration) => void): void {
        const { config } = this._parseLocalConfig();

        this.props.updateLocalPolicyConfig(config.id, performUpdate);
    }

    protected abstract _createDefaultSettings(): TSettings;

    protected _createDefaultConfig(): PolicyConfiguration {
        return {
            'type': { id: this.policyTypeId },
            revision: 1,
            isDeleted: false,
            isBlocking: true,
            isEnabled: true,
            settings: this._createDefaultSettings(),
        } as PolicyConfiguration;
    }
}
