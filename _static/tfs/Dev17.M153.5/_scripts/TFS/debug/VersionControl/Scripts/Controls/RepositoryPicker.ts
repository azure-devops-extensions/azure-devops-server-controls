import "VSS/LoaderPlugins/Css!VersionControl/Controls/RepositorySelector";

import Context = require("VSS/Context");
import Contribution_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Events_Action = require("VSS/Events/Action");
import { INavigatedHubEventArgs } from "VSS/Controls/ExternalHub";
import {HubsService} from "VSS/Navigation/HubsService";
import Q = require("q");
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");
import { caseInsensitiveContains } from "VSS/Utils/String";
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import { TeamProjectReference } from "TFS/Core/Contracts";

import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";
import Navigation = require("VersionControl/Scripts/Navigation");
import GitPermissionsSource_Async = require("VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource");
import RepositorySelector_Async = require("VersionControl/Scripts/Controls/RepositorySelector");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import domElem = Utils_UI.domElem;

/**
 * Aysnchronously creates the RepositorySelector in the newer Dev15 VSTS navigation bar.
 */
SDK_Shim.registerContent("tfs.versioncontrol.repository-picker", (context) => {
    const codeHubGroupId = Service.getLocalService(HubsService).getSelectedHubGroupId();
    const deferred = Q.defer<boolean>();
    const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
    const defaultRepoInfo = webPageDataSvc.getPageData<VCWebAccessContracts.DefaultRepositoryInformation>(Navigation.navigationDataProviderId);
    let versionControlViewModel = webPageDataSvc.getPageData<VCWebAccessContracts.VersionControlViewModel>(Constants.versionControlDataProviderId);
    const webContext = Context.getPageContext().webContext;

    /**
     * If the repository is not found create a basic view model to populate the repository picker and help the user return to safety
     */
    const isTfvc = caseInsensitiveContains(window.location.pathname, "/_versionControl");
    if (!ValidateRepository.repositoryExists(versionControlViewModel, isTfvc)) {

        // Create an empty view model
        versionControlViewModel = <VCWebAccessContracts.VersionControlViewModel>{};

        // Set the repository picker to display None 
        versionControlViewModel.gitRepository = <VCContracts.GitRepository>{
            name: VCResources.Repository_None
        };

        // Populate project information
        const projectReference = <TeamProjectReference>{};
        if (webContext.project) {
            versionControlViewModel.projectGuid = webContext.project.id;
            projectReference.name = webContext.project.name;
            projectReference.id = webContext.project.id;
        }
        versionControlViewModel.projectVersionControlInfo = <VCContracts.VersionControlProjectInfo>{
            project: projectReference, 
            defaultSourceControlType: undefined,
            // We assume true, there is currently a different exception path if a user attempts to access _git from a TFVC project
            supportsGit: true,
            // if defaultRepoInfo is null, we were trying to access tfvc from a git project
            supportsTFVC: defaultRepoInfo ? defaultRepoInfo.supportsTfvc : false
        }
    }

    // Immediately create a placeholder that reserves the correct required space for the repository picker
    // so that the Code hubs don't shift around when the scripts required to create the actual picker are loaded and run.
    if (defaultRepoInfo && versionControlViewModel && versionControlViewModel.projectVersionControlInfo && context.$container) {

        const htmlProvided = context.$container.children().first().length > 0;
        // If there is no html provided by the server, use existing mechanism to preserve compatibility
        if (!htmlProvided) {
            let repositoryName = "";
            if (defaultRepoInfo.defaultRepoIsGit) {
                repositoryName = defaultRepoInfo.defaultGitRepoName;
            }
            else if (defaultRepoInfo.supportsTfvc) {
                if (webContext.project) {
                    repositoryName = `$/${webContext.project.name}`;
                }
            }

            $(Utils_UI.domElem("div", "vc-hub-repositories-placeholder"))
                .text(repositoryName)
                .css("opacity", 0)
                .appendTo(context.$container);
        }

        if (defaultRepoInfo.defaultRepoIsGit) {
            // To fully support 3rd party Code hub contributions, we will need to retrieve the actual GitRepository as part of the dataprovider payload.
            // For now, we'll just have to mock it so that the repository picker is at least showing the correct repository name.
            if (!versionControlViewModel.gitRepository &&
                (TfsContext.getDefault().navigation.currentController || "").toLowerCase() === "apps") {
                versionControlViewModel.gitRepository = <VCContracts.GitRepository>{
                    name: defaultRepoInfo.defaultGitRepoName
                };
            }
        }

        // Create the actual repository selector asynchronously to allow the rest of the Nav rendering to proceed, then drop it in in after.
        VSS.using(
            ["VersionControl/Scripts/Controls/RepositorySelector", "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource"],
            (RepositorySelector: typeof RepositorySelector_Async, GitPermissionsSource: typeof GitPermissionsSource_Async) => {

                if (htmlProvided) {
                    // For now, we just re-create the control which is not noticeable in the UI
                    context.$container.empty();
                }

                const permissionsSource = new GitPermissionsSource.GitPermissionsSource(webContext.project.id, defaultRepoInfo.defaultRepoId);
                permissionsSource.queryDefaultGitRepositoryPermissionsAsync()
                    .then(permissionSet => {
                        let showRepositoryActions: boolean = true;

                        if (defaultRepoInfo.defaultRepoIsGit) {
                            showRepositoryActions = permissionSet.repository.CreateRepository
                                || permissionSet.repository.RenameRepository 
                                || permissionSet.repository.DeleteRepository
                                || permissionSet.repository.ManagePermissions;
                        }

                        RepositorySelector.RepositorySelector.createInstance(versionControlViewModel, context.$container, undefined, showRepositoryActions);

                        // This handler will dispose repo picker, if the navigated hub   group is different than the current hub group
                        // since repo picker is visible for all hubs under code hub group
                        const repositorPickerDisposeHandler = (actionArgs: INavigatedHubEventArgs, next) => {
                            if (actionArgs && actionArgs.navigatedHubGroupId && actionArgs.navigatedHubGroupId !== codeHubGroupId) {
                                // Unregister dispose handler since it is not needed anymore
                                Events_Action.getService().unregisterActionWorker(Events_Action.CommonActions.ACTION_WINDOW_UNLOAD, repositorPickerDisposeHandler);
                                // Dispose repository picker
                                RepositorySelector.RepositorySelector.disposeInstance();
                            }

                            return next(actionArgs);
                        };

                        Events_Action.getService().registerActionWorker(Events_Action.CommonActions.ACTION_WINDOW_UNLOAD, repositorPickerDisposeHandler, 1);
                    })
                    .then(() => {
                        // Notify that control is added
                        deferred.resolve(true);
                    });
            });
    }
    else {
        // Notify that control is not added
        deferred.resolve(false);
    }

    return deferred.promise;
});
