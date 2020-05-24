import * as Telemetry from "VSS/Telemetry/Services";
import * as String_Utils from "VSS/Utils/String";

import { TeamProjectReference } from "TFS/Core/Contracts";
import { ImportSourceType } from "VersionControl/Scenarios/Import/ImportDialog/Store";
import { GitRepository, GitImportRequest, GitImportRequestParameters, ImportRepositoryValidation } from "TFS/VersionControl/Contracts";
import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as ImportResources from "VersionControl/Scripts/Resources/TFS.Resources.ImportDialog"
import { ActionsHub } from "VersionControl/Scenarios/Import/ImportDialog/ActionsHub";
import { ServicesClient } from "VersionControl/Scenarios/Import/ImportDialog/ServicesClient";
import * as Store from "VersionControl/Scenarios/Import/ImportDialog/Store";

export class ActionsCreator {

    constructor(
        private actionsHub: ActionsHub,
        private getState: () => Store.State,
        private projectInfo: TeamProjectReference,
        private servicesClient?: ServicesClient) {
        if (!this.servicesClient) {
            this.servicesClient = new ServicesClient();
        }
    }

    public initialize(): void {
    }

    public importSourceChanged(importSource: Store.ImportSourceType): void {
        this.actionsHub.setImportSourceType.trigger(importSource);
    }

    public gitSourceUrlChanged(gitSourceUrl: string): void {
        this.actionsHub.setGitSourceUrl.trigger(gitSourceUrl);
    }

    public tfvcPathChanged(tfvcPath: string): void {
        this.actionsHub.setTfvcPath.trigger(tfvcPath);
    }

    public tfvcImportHistoryChanged(tfvcimportHistory: boolean): void {
        this.actionsHub.setTfvcImportHistory.trigger(tfvcimportHistory);
    }

    public tfvcImportHistoryDurationChanged(tfvcImportHistory: number): void {
        this.actionsHub.setTfvcImportHisotryDuration.trigger(tfvcImportHistory);
    }

    public isAuthenticationRequiredChanged(isAuthenticationRequired: boolean): void {
        this.actionsHub.setIsAuthenticationRequired.trigger(isAuthenticationRequired);
    }

    public usernameChanged(username: string): void {
        this.actionsHub.setUsername.trigger(username);
    }

    public passwordChanged(password: string): void {
        this.actionsHub.setPassword.trigger(password);
    }

    public repositoryNameChanged(repositoryName: string): void {
        this.actionsHub.setRepositoryName.trigger(repositoryName);
    }

    public clearAllError(): void {
        this.actionsHub.clearAllErrors.trigger(null);
    }

    public startImportProcess(): void {
        this.actionsHub.setImportRequestCreationInProgress.trigger(true);

        const state = this.getState();

        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.IMPORTDIALOG_IMPORT_CLICKED,
                state.EntryPointCiData
            ),
            true
        );

        const validationRequest: ImportRepositoryValidation = {
            gitSource: null,
            tfvcSource: null,
            username: state.Username,
            password: state.Password
        };

        switch (state.ImportSourceType) {
            case (ImportSourceType.Git):
                validationRequest.gitSource = state.GitSource;
                break;
            case (ImportSourceType.Tfvc):
                validationRequest.tfvcSource = state.TfvcSource;
                break;
        }

        this.servicesClient.validateCloneUrl(validationRequest, this.projectInfo.id).then(
            () => {
                this._createRepositoryIfRequiredAndQueueImport();
            },
            (error: Error) => {
                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                        CustomerIntelligenceConstants.IMPORTREQUEST_FAILED_VALIDATION,
                        {}));

                // a 404 response also has error message with 404 so we will have to ignore it (as 404 means generic error)
                if (error.message && !String_Utils.caseInsensitiveContains(error.message, "404")) {
                    this.actionsHub.setImportRequestCreationError.trigger(error.message);
                }
                else {
                    this.actionsHub.setValidationFailed.trigger(null);
                }
            }
        );
    }

    private _createRepositoryIfRequiredAndQueueImport() {
        const state = this.getState();

        if (state.RepositoryNameRequired) {
            const projectId = this.projectInfo.id;
            const projectName = this.projectInfo.name;

            const targetProject: any = {
                name: projectName,
                id: projectId
            };

            const targetRepository: any = {
                name: state.RepositoryName,
                project: targetProject
            };

            this.servicesClient.createGitRepository(targetRepository, projectName).then(
                () => { this._createServiceEndpointIfRequriedAndQueueImport(); },
                (error: Error) => {
                    new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                        CustomerIntelligenceConstants.IMPORTREQUEST_FAILED_REPOSITORY_CREATION,
                        {});
                    this.actionsHub.setImportRequestCreationError.trigger(error.message);
                }
            );
        } else {
            this._createServiceEndpointIfRequriedAndQueueImport();
        }
    }

    private _createServiceEndpointIfRequriedAndQueueImport() {

        const state = this.getState();

        if (state.IsAuthenticationRequired) {
            const username = state.Username;
            const password = state.Password;

            const importUrl = state.GitSource.url;

            this.servicesClient.createServiceEndpoint(username, password, this.projectInfo.id, importUrl).then(
                (serviceEndPoint: ServiceEndpoint) => { this._queueImport(serviceEndPoint.id); },
                (error: Error) => {
                    Telemetry.publishEvent(
                        new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                            CustomerIntelligenceConstants.IMPORTREQUEST_FAILED_SERVICE_ENDPOINT_CREATION,
                            {}));
                    this.actionsHub.setImportRequestCreationError.trigger(error.message);
                }
            );
        }
        else {
            this._queueImport(null);
        }
    }

    private _queueImport(serviceEndpointId: string) {
        const state = this.getState();

        const requestParams: GitImportRequestParameters = {
            deleteServiceEndpointAfterImportIsDone: true,
            gitSource: null,
            tfvcSource: null,
            serviceEndpointId: serviceEndpointId
        };

        switch (state.ImportSourceType) {
            case (ImportSourceType.Git):
                requestParams.gitSource = state.GitSource;
                break;
            case (ImportSourceType.Tfvc):
                requestParams.tfvcSource = state.TfvcSource;
                break;
        }

        this.servicesClient.queueImport(requestParams, this.projectInfo.id, state.RepositoryName).then(
            (createdRequest: GitImportRequest) => {
                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                        CustomerIntelligenceConstants.IMPORTREQUEST_SUCCEED,
                        state.EntryPointCiData
                    ),
                    true
                );
                this._redirectToGitActionUrl(state.RepositoryName);
            },
            (error: Error) => {
                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                        CustomerIntelligenceConstants.IMPORTREQUEST_FAILED,
                        {}));
                this.actionsHub.setImportRequestCreationError.trigger(error.message);
            }
        );
    }

    private _redirectToGitActionUrl(repoName: string) {
        window.location.href = VersionControlUrls.getGitActionUrl(TfsContext.getDefault(), repoName, null, null, false);
    }
}