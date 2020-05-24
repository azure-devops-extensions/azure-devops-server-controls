import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActions";
import { ActionCreatorKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { IRepository, IRepositoryWebhook, MappingTypes } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { VersionControlSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlSource";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

// TODO remove reference to stores and move mapping items to Actions or Interfaces
import { ISubversionMappingItem } from "../Stores/SubversionStore";
import { ITfvcMappingItem } from "../Stores/TfvcMappingHelper";

import { DefinitionTriggerType } from "TFS/Build/Contracts";

/**
 * @brief Action creator for version control actions
 */
export class VersionControlActionsCreator  extends ActionsBase.ActionCreatorBase {
    private _actions: Actions.VersionControlActions;
    private _source: VersionControlSource;

    public static getKey(): string {
        return ActionCreatorKeys.VersionControl_ActionCreator;
    }

    public initialize(): void {
        this._source = new VersionControlSource();
        this._actions = ActionsHubManager.GetActionsHub<Actions.VersionControlActions>(Actions.VersionControlActions);
    }

    public updateSelectedConnection(connectionId: string): void {
        this._actions.updateSelectedConnection.invoke(connectionId);
    }

    public refreshConnectionStatus(): void {
        this._actions.refreshConnectionStatus.invoke({});
    }

    public requestAllRepositories(repositoryType: string) {
        this._actions.requestAllRepositories.invoke(repositoryType);
    }

    public updateRepositories(provider: SourceProvider, connectionId: string, top: boolean): void {
        this._source.getRepositories(provider, connectionId, top).then(
            (repos: IRepository[]) => {
                this._actions.updateRepositories.invoke({
                    errorMessage: undefined,
                    connectionId: connectionId,
                    repositoryType: provider.getRepositoryType(),
                    repositories: repos,
                    listState: top ? Actions.RepositoryListState.TopRepositories : Actions.RepositoryListState.AllRepositories
                });
            },
            (error) => {
                this._actions.updateRepositories.invoke({
                    errorMessage: error.message || error,
                    connectionId: connectionId,
                    repositoryType: provider.getRepositoryType(),
                    repositories: [],
                    listState: top ? Actions.RepositoryListState.TopRepositories : Actions.RepositoryListState.AllRepositories
                });
            });
    }

    public addRepository(provider: SourceProvider, connectionId: string, repositoryName: string, currentRepositories: IRepository[], top?: boolean): void {
        this._source.getRepository(provider, connectionId, repositoryName).then(
            (repo: IRepository) => {
                if (repo) {
                    // first add the repo to the top of the list and update the list
                    currentRepositories.unshift(repo);
                    this._actions.updateRepositories.invoke({
                        errorMessage: undefined,
                        connectionId: connectionId,
                        repositoryType: provider.getRepositoryType(),
                        repositories: currentRepositories,
                        listState: top ? Actions.RepositoryListState.TopRepositories : Actions.RepositoryListState.AllRepositories
                    });
                    // Next update the selected repository to the one just added
                    this._actions.updateSelectedRepository.invoke({
                        errorMessage: undefined,
                        repository: repo,
                        isComplete: true
                    });
                }
                else {
                    // Send a completion notice
                    this._actions.updateSelectedRepository.invoke({
                        errorMessage: undefined,
                        repository: undefined,
                        isComplete: true
                    });
                }
            },
            (error) => {
                this._actions.updateSelectedRepository.invoke({
                    errorMessage: error.message || error,
                    repository: null,
                    isComplete: true
                });
        });
    }

    public updateBranches(provider: SourceProvider, connectionId: string, repository: IRepository): void {
        this._source.getRepositoryBranches(provider, connectionId, repository).then(
            (branches: string[]) => {
                this._actions.updateBranches.invoke({
                    errorMessage: undefined,
                    connectionId: connectionId,
                    repositoryType: provider.getRepositoryType(),
                    repository: repository,
                    branches: branches
                });
            },
            (error) => {
                this._actions.updateBranches.invoke({
                    errorMessage: error.message || error,
                    connectionId: connectionId,
                    repositoryType: provider.getRepositoryType(),
                    repository: repository,
                    branches: []
                });
            });
    }

    public updateSelectedRepository(repository: IRepository): void {
        this._actions.updateSelectedRepository.invoke({
            errorMessage: undefined,
            repository: repository,
            isComplete: true
        });
    }

    public updateSelectedRepositoryFromName(repositoryName: string, isComplete: boolean): void {
        this._actions.updateSelectedRepository.invoke({
            errorMessage: undefined,
            repository: {
                id: null,
                name: repositoryName,
                url: null,
                data: null
            },
            isComplete: isComplete
        });
    }

    public updateRemoteWebhooks(provider: SourceProvider, connectionId: string, repository: IRepository): void {
        this._source.getRepositoryWebhooks(provider, connectionId, repository).then(
            (webhooks: IRepositoryWebhook[]) => {
                this._actions.updateRemoteWebhooks.invoke({
                    errorMessage: undefined,
                    connectionId: connectionId,
                    repositoryType: provider.getRepositoryType(),
                    repository: repository,
                    webhooks: webhooks
                });
            },
            (error) => {
                this._actions.updateRemoteWebhooks.invoke({
                    errorMessage: error.message || error,
                    connectionId: connectionId,
                    repositoryType: provider.getRepositoryType(),
                    repository: repository,
                    webhooks: []
                });
            });
    }

    public updateSelectedBranch(branch: string): void {
        this._actions.updateSelectedBranch.invoke(branch);
    }

    public restoreWebhooks(repositoryType: string, connectionId: string, repository: IRepository, triggerTypes: DefinitionTriggerType[]): void {
        this._actions.webhooksRestorationStatusChanged.invoke({
            isRestoring: true,
            triggerTypes: triggerTypes,
            connectionId: connectionId,
            repositoryType: repositoryType,
            errorMessage: undefined
        });
        this._source.restoreRepositoryWebhook(repositoryType, connectionId, repository, triggerTypes).then(
            () => {
                this._actions.webhooksRestored.invoke({
                    errorMessage: undefined,
                    connectionId: connectionId,
                    repositoryType: repositoryType,
                    repository: repository,
                    webhooks: [
                        {
                            repositoryUrl: repository.url,
                            types: triggerTypes
                        }
                    ]
                });

                this._actions.webhooksRestorationStatusChanged.invoke({
                    isRestoring: false,
                    triggerTypes: triggerTypes,
                    connectionId: connectionId,
                    repositoryType: repositoryType,
                    errorMessage: undefined
                });
            },
            error => {
                this._actions.webhooksRestored.invoke({
                    errorMessage: error.message || error,
                    webhooks: [],
                    connectionId: connectionId,
                    repositoryType: repositoryType,
                    repository: repository
                });

                this._actions.webhooksRestorationStatusChanged.invoke({
                    isRestoring: false,
                    triggerTypes: triggerTypes,
                    errorMessage: error.message || error,
                    connectionId: connectionId,
                    repositoryType: repositoryType
                });
            }
        );
    }

    public updateProperty(propertyName: string, value: string | ISubversionMappingItem | ITfvcMappingItem) {
        this._actions.updateProperty.invoke({
            propertyName: propertyName,
            value: value
        });
    }

    public updateMappings(type: string, mappings: ITfvcMappingItem[] | ISubversionMappingItem[]) {
        const isTfvc: boolean = type !== MappingTypes.svn;
        this._actions.updateMappings.invoke({
            type: type,
            tfvcMappings: isTfvc ? mappings as ITfvcMappingItem[] : null,
            svnMappings: isTfvc ? null : mappings as ISubversionMappingItem[],
            errorMessage: undefined
        });
    }

    public updateMapping(type: string, mapping: ITfvcMappingItem | ISubversionMappingItem) {
        const isTfvc: boolean = type !== MappingTypes.svn;
        this._actions.updateMapping.invoke({
            type: type,
            tfvcMapping: isTfvc ? mapping as ITfvcMappingItem : null,
            svnMapping: isTfvc ? null : mapping as ISubversionMappingItem,
            errorMessage: undefined
        });
    }

    public addMapping(type: string, mapping: ITfvcMappingItem | ISubversionMappingItem) {
        const isTfvc: boolean = type !== MappingTypes.svn;
        this._actions.addMapping.invoke({
            type: type,
            tfvcMapping: isTfvc ? mapping as ITfvcMappingItem : null,
            svnMapping: isTfvc ? null : mapping as ISubversionMappingItem,
            errorMessage: undefined
        });
    }

    public clearError() {
        this._actions.clearError.invoke({});
    }
}
