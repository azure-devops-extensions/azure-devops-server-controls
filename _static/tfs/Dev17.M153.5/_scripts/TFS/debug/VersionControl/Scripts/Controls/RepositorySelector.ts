import Controls = require("VSS/Controls");
import { HubsService } from "VSS/Navigation/HubsService";
import VSSService = require("VSS/Service");
import Utils_UI = require("VSS/Utils/UI");

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VCContracts = require("TFS/VersionControl/Contracts");

import { CommitsHubRoutes, PushesHubRoutes } from "VersionControl/Scenarios/History/HistoryPushesRoutes";
import {CodeHubContributionIds} from "VersionControl/Scripts/CodeHubContributionIds";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCGitRepositorySelectorMenu = require("VersionControl/Scripts/Controls/GitRepositorySelectorMenu");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");

import domElem = Utils_UI.domElem;

/**
 * Used to create the RepositorySelector singleton in the newer Dev15 VSTS navigation bar.
 * This is also used by and remains compatible with the legacy navigation.
 */
export class RepositorySelector {

    private static _instance: RepositorySelector;

    private _vcViewModel: VCWebAccessContracts.VersionControlViewModel;
    private _repositoryContext: RepositoryContext;
    private _repositorySelector: VCGitRepositorySelectorMenu.GitRepositorySelectorMenu;
    private _supportsTfvc: boolean;
    private _showRepositoryActions: boolean;
    private _tfsContext: TfsContext;

    /**
     *  Create the singleton RepositorySelector instance for the navigation bar.
     */
    public static createInstance(
        vcViewModel: VCWebAccessContracts.VersionControlViewModel,
        $container: JQuery,
        cssClass?: string,
        showRepositoryActions: boolean = true
    ): void {
        RepositorySelector._instance = null;

        const selector = new RepositorySelector();
        selector._vcViewModel = vcViewModel;
        selector._showRepositoryActions = showRepositoryActions;
        selector._tfsContext = TfsContext.getDefault();
        selector._supportsTfvc = (selector._vcViewModel.projectVersionControlInfo.supportsTFVC);

        if (!selector._vcViewModel.gitRepository && selector._supportsTfvc) {
            selector._repositoryContext = TfvcRepositoryContext.create(selector._tfsContext);
        }
        else {
            selector._repositoryContext = GitRepositoryContext.create(vcViewModel.gitRepository, selector._tfsContext);
        }

        selector.setRepositorySelector($container, cssClass);
        this._instance = selector;
    }

    /**
     *  Return the singleton RepositorySelector instance for the navigation bar.
     */
    public static getInstance(): RepositorySelector {
        return this._instance;
    }

    public static disposeInstance(): void {
        if (this._instance) {
            this._instance.dispose();
            this._instance = null;
        }
    }

    /**
     *  Use createInstance() to create the Navigation L2 RepositorySelector singleton.
     */
    constructor() {
        if (RepositorySelector._instance) {
            throw new Error("Error: Use createInstance() to create the Navigation L2 RepositorySelector singleton.");
        }
    }

    public dispose(): void {
        this._repositorySelector.dispose();
    }

    /**
     *  Show the RepositorySelector Selector pop-up, for keyboard accessibility.
     */
    public show() {
        this._repositorySelector._showPopup();
    }

    private setRepositorySelector($container: JQuery, cssClass?: string): void {
        if (this._repositoryContext.getRepositoryType() === RepositoryType.Git || this._supportsTfvc) {
            if ($container.length === 1) {
                const $repositoriesSelectorContainer = $(domElem("div", cssClass)).hide().prependTo($container);
                this._repositorySelector = this._createRepositoriesDropdown($repositoriesSelectorContainer);
                $("div.vc-hub-repositories-placeholder").remove();
                $repositoriesSelectorContainer.show();
            }
        }
    }

    private _createRepositoriesDropdown($container: JQuery): VCGitRepositorySelectorMenu.GitRepositorySelectorMenu {
        const tfsContex: TfsContext = TfsContext.getDefault();
        let tfvcRepository: VCContracts.GitRepository;
        let defaultRepository: VCContracts.GitRepository = (<GitRepositoryContext>this._repositoryContext).getRepository();

        if (this._supportsTfvc) {
            tfvcRepository = <VCContracts.GitRepository>{ name: "$/" + (this._vcViewModel.projectVersionControlInfo.project.name) };
            if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
                defaultRepository = tfvcRepository;
            }
        }

        return <VCGitRepositorySelectorMenu.GitRepositorySelectorMenu>Controls.BaseControl.createIn(VCGitRepositorySelectorMenu.GitRepositorySelectorMenu, $container,
            <VCGitRepositorySelectorMenu.GitRepositorySelectorMenuOptions>{
                tfsContext: tfsContex,
                initialSelectedItem: defaultRepository,
                projectId: this._vcViewModel.projectGuid,
                projectInfo: this._vcViewModel.projectVersionControlInfo,
                showRepositoryActions: this._showRepositoryActions,
                tfvcRepository: tfvcRepository,
                showItemIcons: true,

                // For cases where the selector includes both a Tfvc repository and Git repositories, redirect to the appropriate controller and action.
                onItemChanged: (repository: VCContracts.GitRepository) => {
                    const isTfvc = this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc;
                    let action = (<string>(this._tfsContext.navigation.currentAction || "")).toLowerCase();
                    if (action === "contributedhub") {
                        //Map contributed hubs to their action
                        const hubsService = <HubsService>VSSService.getLocalService(HubsService);
                        const selectedHubGroupId: string = hubsService.getSelectedHubId();
                        action = this._getActionFromHubId(selectedHubGroupId);
                    }
                    else {
                        action = (action === "index" || action === "hub" ) ? "" : action;
                    }

                    const tfsAction: string = isTfvc ? action : this._getActionRedirect(action);
                    const gitAction: string = isTfvc ? this._getActionRedirect(action) : action;

                    window.location.href = (repository.name.indexOf("$/") === 0) ? this._tfsContext.getActionUrl(tfsAction, "versionControl", null) :
                        VersionControlUrls.getGitActionUrl(this._tfsContext, repository.name, gitAction, null, false);
                    // See Bug 508621. Preventing any changes to the location object to handle double click on repository dropdown scenario. 
                    Object.freeze(document.location);
                }
            });
    }

    //This maps hubIds to the old controller actions.  Ideally we would be able to pull this from the HubService
    private _getActionFromHubId(hubId: string){
        switch (hubId) {
            case CodeHubContributionIds.tagsHub:
                return "tags";

            case CodeHubContributionIds.branchesHub:   
                return "branches";

            case CodeHubContributionIds.changesetsHub:
                return "changesets";

            case CodeHubContributionIds.shelvesetsHub:
                return "shelvesets";

            case CodeHubContributionIds.historyHub:
                return CommitsHubRoutes.commitsRoute;

            case CodeHubContributionIds.pullRequestHub:
                return "pullrequests"; 

            case CodeHubContributionIds.pushesHub:
                return PushesHubRoutes.pushesRoute;

            default:
                return "";
        }
    }

    // When switching between one repository type to another (Git to Tfvc or vice versa),
    // The current MVC action should also be changed to something similar.  Example: changesets <-> commits
    private _getActionRedirect(action: string): string {

        switch (action) {

            // Tfvc -> Git
            case "changeset":
            case "changesets":
            case "shelveset":
            case "shelvesets":
                return "history";

            // Git -> Tfvc    
            case "commit":
            case "commits":
            case "push":
            case "pushes":
            case "history":
            case "branches":
                return "changesets";

            // Default any other action to "" (index / Source Explorer)
            default:
                return "";
        }
    }
}
