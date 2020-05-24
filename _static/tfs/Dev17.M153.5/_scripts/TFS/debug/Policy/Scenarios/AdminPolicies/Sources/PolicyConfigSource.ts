// libs
import { VssConnection } from "VSS/Service";
// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import * as PolicyWebApi from "Policy/Scripts/Generated/TFS.Policy.WebApi";

export interface IPolicyConfigSource {
    queryPolicyConfigsAsync(): IPromise<PolicyConfiguration[]>;
    createPolicyConfigAsync(config: PolicyConfiguration): IPromise<PolicyConfiguration>;
    updatePolicyConfigAsync(config: PolicyConfiguration): IPromise<PolicyConfiguration>;
    deletePolicyConfigAsync(configId: number): IPromise<void>;
}

export class PolicyConfigSource implements IPolicyConfigSource {
    private readonly _tfsContext: TfsContext;
    private readonly _policyClient: PolicyWebApi.PolicyHttpClient3_2;

    constructor(tfsContext: TfsContext) {
        this._tfsContext = tfsContext;

        this._policyClient = VssConnection
            .getConnection(tfsContext.contextData)
            .getHttpClient(PolicyWebApi.PolicyHttpClient3_2);
    }

    public queryPolicyConfigAsync(configId: number): IPromise<PolicyConfiguration> {
        return this._policyClient.getPolicyConfiguration(this._tfsContext.contextData.project.id, configId);
    };

    public queryPolicyConfigsAsync(): IPromise<PolicyConfiguration[]> {
        return this._policyClient.getPolicyConfigurations(this._tfsContext.contextData.project.id);
    };

    public createPolicyConfigAsync(config: PolicyConfiguration): IPromise<PolicyConfiguration> {
        return this._policyClient.createPolicyConfiguration(config, this._tfsContext.contextData.project.id);
    };

    public updatePolicyConfigAsync(config: PolicyConfiguration): IPromise<PolicyConfiguration> {
        return this._policyClient.updatePolicyConfiguration(config, this._tfsContext.contextData.project.id, config.id);
    };

    public deletePolicyConfigAsync(configId: number): IPromise<void> {
        return this._policyClient.deletePolicyConfiguration(this._tfsContext.contextData.project.id, configId);
    };
}
