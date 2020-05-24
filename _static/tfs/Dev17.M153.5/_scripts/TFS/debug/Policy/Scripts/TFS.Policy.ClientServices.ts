import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import TFS_Policy_WebApi = require("Policy/Scripts/Generated/TFS.Policy.WebApi");
import TFS_Policy_Contracts = require("Policy/Scripts/Generated/TFS.Policy.Contracts");

export class PolicyClientService extends Service.VssService {
    private _httpClient: TFS_Policy_WebApi.PolicyHttpClient;

    /**
     * Initializes the TFS service with a connection
     * @param tfsConnection The connection
     */
    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);
        this._httpClient = tfsConnection.getHttpClient(TFS_Policy_WebApi.PolicyHttpClient);
    }

    public beginGetArtifactPolicyEvaluation(
        projectId: string,
        evaluationId: string,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {

        this._httpClient.getPolicyEvaluation(projectId, evaluationId).then(
            (policyEvaluation: TFS_Policy_Contracts.PolicyEvaluationRecord) => {
                if ($.isFunction(callback)) {
                    callback(policyEvaluation);
                }
            },
            errorCallback || VSS.handleError);
    }

    public getArtifactPolicyEvaluationAsync(projectId: string, evaluationId: string): IPromise<TFS_Policy_Contracts.PolicyEvaluationRecord> {
        return this._httpClient.getPolicyEvaluation(projectId, evaluationId);
    }

    public beginGetArtifactPolicyEvaluations(
        projectId: string,
        artifactId: string,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {

        this._httpClient.getPolicyEvaluations(projectId, artifactId).then(
            (policyEvaluations: TFS_Policy_Contracts.PolicyEvaluationRecord[]) => {
                if ($.isFunction(callback)) {
                    callback(policyEvaluations);
                }
            },
            errorCallback || VSS.handleError);
    }

    public getArtifactPolicyEvaluationsAsync(projectId: string, artifactId: string): IPromise<TFS_Policy_Contracts.PolicyEvaluationRecord[]> {
        return this._httpClient.getPolicyEvaluations(projectId, artifactId);
    }

    public beginRequeuePolicyEvaluation(
        projectId: string,
        evaluationId: string,
        context: any,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {

        this._httpClient.requeuePolicyEvaluation(projectId, evaluationId).then(
            (policyEvaluation: TFS_Policy_Contracts.PolicyEvaluationRecord) => {
                if ($.isFunction(callback)) {
                    callback(context, policyEvaluation);
                }
            },
            errorCallback || VSS.handleError);
    }

    public requeuePolicyEvaluationAsync(projectId: string, evaluationId: string): IPromise<TFS_Policy_Contracts.PolicyEvaluationRecord> {
        return this._httpClient.requeuePolicyEvaluation(projectId, evaluationId);
    }

    public beginGetCodePolicyConfigurations(
        projectId: string,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {

        this._httpClient.getPolicyConfigurations(projectId).then(
            (policies: TFS_Policy_Contracts.PolicyConfiguration[]) => {
                if ($.isFunction(callback)) {
                    callback(policies);
                }
            },
            errorCallback || VSS.handleError);
    }

    public getCodePolicyConfigurationsAsync(projectId: string, repositoryScope: string): IPromise<TFS_Policy_Contracts.PolicyConfiguration[]> {
        return this._httpClient.getPolicyConfigurations(projectId, repositoryScope);
    }

    public beginGetCodePolicyConfiguration(
        projectId: string,
        configurationId: number,
        revisionId: number,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {

        this._httpClient.getPolicyConfigurationRevision(projectId, configurationId, revisionId).then(
            (policy: TFS_Policy_Contracts.PolicyConfiguration) => {
                if ($.isFunction(callback)) {
                    callback(policy);
                }
            },
            errorCallback || VSS.handleError);
    }

    public getCodePolicyConfigurationAsync(projectId: string, configurationId: number, revisionId: number)
        : IPromise<TFS_Policy_Contracts.PolicyConfiguration> {
        return this._httpClient.getPolicyConfigurationRevision(projectId, configurationId, revisionId);
    }

    public beginCreateCodePolicyConfiguration(
        projectId: string,
        policyToCreate: TFS_Policy_Contracts.PolicyConfiguration,
        callback?: (policy: TFS_Policy_Contracts.PolicyConfiguration) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.createPolicyConfiguration(policyToCreate, projectId).then(
            (policyCreate: TFS_Policy_Contracts.PolicyConfiguration) => {
                if ($.isFunction(callback)) {
                    callback(policyCreate);
                }
            },
            errorCallback || VSS.handleError);
    }

    public createCodePolicyConfigurationAsync(projectId: string, policyToCreate: TFS_Policy_Contracts.PolicyConfiguration)
        : IPromise<TFS_Policy_Contracts.PolicyConfiguration> {
        return this._httpClient.createPolicyConfiguration(policyToCreate, projectId);
    }

    public beginUpdateCodePolicyConfiguration(
        projectId: string,
        configId: number,
        policyToUpdate: TFS_Policy_Contracts.PolicyConfiguration,
        callback?: (policy: TFS_Policy_Contracts.PolicyConfiguration) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.updatePolicyConfiguration(policyToUpdate, projectId, configId).then(
            (policyCreate: TFS_Policy_Contracts.PolicyConfiguration) => {
                if ($.isFunction(callback)) {
                    callback(policyCreate);
                }
            },
            errorCallback || VSS.handleError);
    }

    public updateCodePolicyConfigurationAsync(projectId: string, configId: number, policyToUpdate: TFS_Policy_Contracts.PolicyConfiguration)
        : IPromise<TFS_Policy_Contracts.PolicyConfiguration> {
        return this._httpClient.updatePolicyConfiguration(policyToUpdate, projectId, configId);
    }

    public beginDeleteCodePolicyConfiguration(
        projectId: string,
        configId: number,
        callback: () => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.deletePolicyConfiguration(projectId, configId).then(
            () => {
                if ($.isFunction(callback)) {
                    callback();
                }
            },
            errorCallback || VSS.handleError);
    }

    public deleteCodePolicyConfigurationAsync(projectId: string, configId: number): IPromise<void> {
        return this._httpClient.deletePolicyConfiguration(projectId, configId);
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Policy.ClientServices", exports);
