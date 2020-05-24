import { ActionsHub, ErrorStateEnum } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionsHub";
import PolicyContracts = require("Policy/Scripts/Generated/TFS.Policy.Contracts");
import PolicyService = require("Policy/Scripts/TFS.Policy.ClientServices");
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import SearchPolicyExtension = require("VersionControl/Scripts/Components/SearchBranchPolicy/TFS.Search.PolicyExtensions");
import VCContracts = require("TFS/VersionControl/Contracts");
import Contributions_Services = require("VSS/Contributions/Services");
import Git_Client = require("TFS/VersionControl/GitRestClient");
import Service = require("VSS/Service");

export class ActionCreator {
    private static instance: ActionCreator;

    constructor(private actionsHub: ActionsHub) {
    }

    public static getInstance(): ActionCreator {
        if (!ActionCreator.instance) {
            let actionsHub = ActionsHub.getInstance();
            ActionCreator.instance = new ActionCreator(actionsHub);
        }

        return ActionCreator.instance;
    }

    /**
     * @brief Get's the list of branches configured for search from policy framework.
     */
    public getSearchableBranches(repositoryContext: GitRepositoryContext): void {
        let branchesConfigured: string[] = new Array<string>();
        const re = /-/gi;
        const repositoryScope = repositoryContext.getRepository().id.replace(re, "");
        let policyService = TFS_OM_Common.ProjectCollection.
            getConnection(repositoryContext.getTfsContext()).getService(PolicyService.PolicyClientService);
        policyService.getCodePolicyConfigurationsAsync
            (repositoryContext.getRepository().project.id, repositoryScope).then((configurations: PolicyContracts.PolicyConfiguration[]) => {
                configurations.forEach(configuration => {
                    if (configuration.type.id === SearchPolicyExtension.SearchPolicyTypeIds.SearchBranchPolicy) {
                        let setting: SearchPolicyExtension.SearchGitRepoSettingsForPolicy =
                            configuration.settings as SearchPolicyExtension.SearchGitRepoSettingsForPolicy;

                        if (setting.scope[0].repositoryId === repositoryContext.getRepository().id) {
                            branchesConfigured = setting.searchBranches;
                        }
                    }
                });

                this.actionsHub.searchableBranchesObtained.invoke({
                    branchesConfigured: branchesConfigured,
                    repositoryContext: repositoryContext
                });
            });
    }

    /**
     * @brief Updates the list of branches configured for search in the branch policy for search on include/exclude click.
     */
    public updateSearchableBranches(repositoryContext: GitRepositoryContext,
        searchableBranchesList: string[],
        errorHandler: (errorMessage) => void,
        successHandler: () => void): void {
        let policy: PolicyContracts.PolicyConfiguration = this.getPolicy(repositoryContext, searchableBranchesList);
        let policyAlreadyExist: boolean = false;
        let policyService = TFS_OM_Common.ProjectCollection.getConnection(repositoryContext.getTfsContext()).
            getService(PolicyService.PolicyClientService);
        const re = /-/gi;
        const repositoryScope = repositoryContext.getRepository().id.replace(re, "");
        policyService.getCodePolicyConfigurationsAsync(repositoryContext.getRepository().project.id, repositoryScope).
            then((configurations: PolicyContracts.PolicyConfiguration[]) => {
                configurations.forEach(configuration => {
                    if (configuration.type.id === SearchPolicyExtension.SearchPolicyTypeIds.SearchBranchPolicy) {
                        let setting: SearchPolicyExtension.SearchGitRepoSettingsForPolicy =
                            configuration.settings as SearchPolicyExtension.SearchGitRepoSettingsForPolicy;

                        if (setting.scope[0].repositoryId === repositoryContext.getRepository().id) {
                            policyAlreadyExist = true;
                            policyService.updateCodePolicyConfigurationAsync(repositoryContext.getRepository().project.id,
                                configuration.id, policy).then((updatedPolicy: PolicyContracts.PolicyConfiguration) => {
                                    this.getSearchableBranches(repositoryContext);
                                    successHandler();
                                }, (errorMessage) => {
                                    errorHandler(errorMessage);
                                });
                        }
                    }
                });

                if (!policyAlreadyExist) {
                    policyService.createCodePolicyConfigurationAsync(repositoryContext.getRepository().project.id, policy).
                        then((updatedPolicy: PolicyContracts.PolicyConfiguration) => {
                            this.getSearchableBranches(repositoryContext);
                            successHandler();
                        }, (errorMessage) => {
                            errorHandler(errorMessage);
                        });
                }
            }, (errorMessage) => {
                errorHandler(errorMessage);
            });
    }

    /**
     * @brief Return a policy for a repository with required data.
     */
    private getPolicy(repositoryContext: GitRepositoryContext, searchableBranchesList: string[]): PolicyContracts.PolicyConfiguration {
        let policyScope: SearchPolicyExtension.GitPolicyRepositoryScope =
            new SearchPolicyExtension.GitPolicyRepositoryScope(repositoryContext.getRepositoryId());

        let policySettings = new SearchPolicyExtension.SearchGitRepoSettingsForPolicy(
            new Array<SearchPolicyExtension.GitPolicyRepositoryScope>(policyScope), searchableBranchesList);
        let policy = <PolicyContracts.PolicyConfiguration>{
            isEnabled: false,
            isBlocking: false,
            settings: policySettings,
            type: {
                id: SearchPolicyExtension.SearchPolicyTypeIds.SearchBranchPolicy
            }
        };

        return policy;
    }

    /**
     * @brief Updates the repository context when a repository is switched.
     */
    public updateRepositoryContext(repositoryContext: GitRepositoryContext, isRepoForksEnabled: boolean): void {
        if (repositoryContext == null) {
            this.actionsHub.repositoryContextChanged.invoke({
                repositoryContext: null
            });
        }
        else {

            if (!repositoryContext.getRepository().isFork) {
                // This is not a forked repo
                this.checkExtensionStateAndUpdateRepositoryContext(repositoryContext);
            } else {
                // Hide the UX when a switch happens from normal repo to a forked repo.
                this.actionsHub.repositoryContextChanged.invoke({
                    repositoryContext: null
                });
            }
        }
    }

    private checkExtensionStateAndUpdateRepositoryContext(repositoryContext: GitRepositoryContext): void {
        Service.getService(Contributions_Services.ExtensionService).getContributions(["ms.vss-code-search.code-entity-type"]
            , true, false).
            then((contributions: IExtensionContribution[]) => {

                if (contributions.length > 0) {
                    //Update search branch UX for a new repository                            
                    this.actionsHub.repositoryContextChanged.invoke({
                        repositoryContext: repositoryContext
                    });
                }
            });
    }

    /**
     * @brief Updates the include branch dialog state on whether to keep it open or show some error message
     * in the dialog.
     */
    public updateIncludeBranchDialogState(isOpen: boolean, errorState: ErrorStateEnum) {
        this.actionsHub.includeBranchDialogStateChanged.invoke({
            isOpen: isOpen,
            errorState: errorState
        });
    }

    /**
     * @brief Updates the exclude branch dialog state on whether to keep it open or show some error message
     * in the dialog and which branch to show.
     */
    public updateExcludeBranchDialogState(isOpen: boolean, errorState: ErrorStateEnum, branchToExclude: string) {
        this.actionsHub.excludeBranchDialogStateChanged.invoke({
            isOpen: isOpen,
            errorState: errorState,
            branchToExclude: branchToExclude
        });
    }
}