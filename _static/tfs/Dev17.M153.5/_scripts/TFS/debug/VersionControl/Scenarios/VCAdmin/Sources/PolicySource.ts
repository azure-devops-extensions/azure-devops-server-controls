/// Copyright (c) Microsoft Corporation. All rights reserved.

import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { VssConnection } from "VSS/Service";

import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import * as PolicyWebApi from "Policy/Scripts/Generated/TFS.Policy.WebApi";

export interface IPolicySource {
    fetchPolicy(
        policyType: string,
        repoContext: RepositoryContext,
        scope: string): IPromise<PolicyConfiguration[]>;

    updatePolicy(
        config: PolicyConfiguration,
        repoContext: RepositoryContext): IPromise<PolicyConfiguration>;

    createPolicy(
        policyType: string,
        settings: any): IPromise<PolicyConfiguration>;
}

export class PolicySource implements IPolicySource {
    private _policyClient: PolicyWebApi.PolicyHttpClient3_2;
    private _tfsContext: TfsContext;

    constructor(tfsContext: TfsContext) {
        this._tfsContext = tfsContext;

        this._policyClient = VssConnection
            .getConnection(tfsContext.contextData)
            .getHttpClient(PolicyWebApi.PolicyHttpClient3_2);
    }

    public fetchPolicy(policyType: string, repoContext: RepositoryContext, scope: string)
    : IPromise<PolicyConfiguration[]> {
        return this._policyClient.getPolicyConfigurations(
            this._tfsContext.contextData.project.id,
            scope,
            policyType);
    }

    public updatePolicy(config: PolicyConfiguration, repoContext: RepositoryContext): IPromise<PolicyConfiguration> {
        return this._policyClient.updatePolicyConfiguration(
            config,
            this._tfsContext.contextData.project.id,
            config.id
        );
    }

    public createPolicy(policyType: string, settings: any): IPromise<PolicyConfiguration> {
        const config = {
            type: { id: policyType },
            revision: 1,
            isDeleted: false,
            isBlocking: true,
            isEnabled: true,
            settings: settings
        } as PolicyConfiguration;

        return this._policyClient.createPolicyConfiguration(config, this._tfsContext.contextData.project.id);
    }
}
