import Context = require("VSS/Context");
import Contribution_Services = require("VSS/Contributions/Services");
import CodeHubCloneRepositoryAction_NO_REQUIRE = require("VersionControl/Scripts/CodeHubCloneRepositoryAction");
import Events_Action = require("VSS/Events/Action");
import ForkRepositoryDialog_NO_REQUIRE = require("VersionControl/Scenarios/ForkRepository/ForkRepositoryDialog");
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { ClonePopup } from "VersionControl/Scripts/Controls/ClonePopup";
import Locations = require("VSS/Locations");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import Navigation_HubsProvider = require("VSS/Navigation/HubsProvider");
import Q = require("q");
import Service = require("VSS/Service");
import SDK_Shim = require("VSS/SDK/Shim");
import Utils_Url = require("VSS/Utils/Url");
import VCContracts = require("TFS/VersionControl/Contracts");
import { DefaultRepositoryInformation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import VCNavigationResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl.Navigation");
import * as User_Services from "VSS/User/Services";
import VSS = require("VSS/VSS");

export const navigationDataProviderId = "ms.vss-code-web.navigation-data-provider";

/**
 * This will add Repositories hub under code hub group.
 */
class HubsProvider extends Navigation_HubsProvider.HubsProvider {

    constructor() {
        super(true);
    }

    protected getRootContributedHub(context: IHubsProviderContext): IContributedHub {

        let result: IContributedHub = null;

        // If requested other than L1, don't display anything
        if (Navigation_Common.isLevel1Hubs(context.contributionId)) {

            const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
            const defaultRepoInfo = webPageDataSvc.getPageData<DefaultRepositoryInformation>(navigationDataProviderId);
            if (defaultRepoInfo) {

                // Initialize container and default repo hub
                const defaultRepo = Navigation_Common.getDefaultHub<IContributedHub>();
                defaultRepo.isDefault = true;

                let containerHub = Navigation_Common.getDefaultHub<IContributedHub>();
                containerHub.order = 0.001;
                containerHub.children = [defaultRepo];

                const webContext = Context.getPageContext().webContext;
                if (defaultRepoInfo.defaultRepoIsGit) {
                    defaultRepo.name = defaultRepoInfo.defaultGitRepoName;
                    defaultRepo.uri = defaultRepoInfo.defaultGitRepoUrl;
                    defaultRepo.icon = defaultRepoInfo.defaultRepoIsFork ? "bowtie-icon bowtie-git-fork" : "bowtie-icon bowtie-git";
                } else if (defaultRepoInfo.supportsTfvc && webContext.project) {
                    defaultRepo.name = `$/${webContext.project.name}`;
                    defaultRepo.uri = Locations.urlHelper.getMvcUrl({ controller: "versionControl" });
                    defaultRepo.icon = "bowtie-icon bowtie-tfvc-repo";
                } else {
                    // Unknown provider. Do not display anything
                    containerHub = null;
                }

                result = containerHub;
            }
        }

        return result;
    }
}

const hubsProvider = new HubsProvider();

SDK_Shim.VSS.register("ms.vss-code-web.code-hubs-provider", () => {
    return hubsProvider;
});

class CodeHubGroupActionSource implements IContributedMenuSource {

    public getMenuItems(context: any): IPromise<IContributedMenuItem[]> {

        const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
        const defaultRepoInfo = webPageDataSvc.getPageData<DefaultRepositoryInformation>(navigationDataProviderId);

        if (!defaultRepoInfo) {
            return Q([]);
        }

        const webContext = Context.getPageContext().webContext;

        const gitPermissionsSource = new GitPermissionsSource(webContext.project.id, defaultRepoInfo.defaultRepoId);

        return gitPermissionsSource.queryDefaultGitRepositoryPermissionsAsync()
            .then(permissionSet => {
                let actions: IContributedMenuItem[] = [];

                let disableSettings: boolean = false;

                if (defaultRepoInfo.defaultRepoIsGit) {
                    // New pull request action
                    const disablePrCreate = !permissionSet.repository.PullRequestContribute;
                    const prCreateUrl = disablePrCreate ? undefined : Utils_Url.combineUrl(defaultRepoInfo.defaultGitRepoUrl, "pullrequestcreate");

                    actions.push({
                        id: "new-pull-request-action",
                        text: VCNavigationResources.NewPullRequestActionText,
                        icon: "css://bowtie-icon bowtie-tfvc-pull-request",
                        href: prCreateUrl,
                        disabled: disablePrCreate,
                        title: (disablePrCreate ? VCNavigationResources.NewPullRequestNoPermission : undefined),
                    });

                    disableSettings =
                        !(permissionSet.repository.CreateRepository || permissionSet.repository.RenameRepository || permissionSet.repository.DeleteRepository);
                }

                const settingsUrl = disableSettings ? undefined : Locations.urlHelper.getMvcUrl({ controller: "versionControl", area: "admin" });

                // Add repository settings action
                actions.push({
                    id: "repository-settings-action",
                    text: VCNavigationResources.ManageRepositoriesActionText,
                    icon: "css://bowtie-icon bowtie-settings-gear",
                    href: settingsUrl,
                    disabled: disableSettings,
                    title: (disableSettings ? VCNavigationResources.RepoSettingsNoPermission : undefined),
                });

                if (actions.length > 0) {
                    actions.unshift({ separator: true });
                }

                return actions;
            });
    }
}

const hubGroupActions = new CodeHubGroupActionSource();

SDK_Shim.VSS.register("ms.vss-code-web.code-hub-group-actions", () => {
    return hubGroupActions;
});

class CodeHubL2HeaderActionsSource implements IContributedMenuSource {
    private _clonePopup: ClonePopup;
    private _forkDialogOpening: boolean = false;

    public getMenuItems(context: any): IContributedMenuItem[] {
        const actions: IContributedMenuItem[] = [];

        const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
        const defaultRepoInfo = webPageDataSvc.getPageData<DefaultRepositoryInformation>(navigationDataProviderId);
        if (defaultRepoInfo && defaultRepoInfo.defaultRepoIsGit) {
            if (defaultRepoInfo.defaultRepoCanFork && isUserMember()) {
                actions.push({
                    id: "fork-repository",
                    text: VCNavigationResources.ForkActionText,
                    icon: "css://bowtie-icon bowtie-git-fork",
                    action: (actionContext: any) => {
                        if (!this._forkDialogOpening) {
                            this._forkDialogOpening = true;
                            VSS.using(["VersionControl/Scenarios/ForkRepository/ForkRepositoryDialog"], (ForkRepositoryDialog: typeof ForkRepositoryDialog_NO_REQUIRE) => {
                                ForkRepositoryDialog.ForkRepositoryDialog.show();
                                this._forkDialogOpening = false;
                            });
                        }
                    }
                });
            }

            actions.push({
                id: "clone-repository",
                text: VCNavigationResources.CloneActionText,
                icon: "css://bowtie-icon bowtie-clone-to-desktop",
                action: (actionContext: any) => {
                    VSS.using(["VersionControl/Scripts/CodeHubCloneRepositoryAction"], (CodeHubCloneRepositoryAction: typeof CodeHubCloneRepositoryAction_NO_REQUIRE) => {
                        if (!this._clonePopup || this._clonePopup.isDisposed()) {
                            let $menuItem = $("[command='clone-repository']");
                            if ($menuItem.length === 0) {
                                // If we render in FabricUI, attribute is data-command-key
                                $menuItem = $("[data-command-key='clone-repository']");
                            }

                            this._clonePopup = CodeHubCloneRepositoryAction.createCloneRepositoryPopup($menuItem, null, () => {
                                        const pivots = $(document).find(".bowtie-clone-to-desktop");
                                        if (pivots.length > 0) {
                                            $(pivots[0]).parent().focus();
                                        }
                                });
                        }
                    });
                }
            });
        }
        return actions;
    }
}

function isUserMember() {
    return User_Services.getService().hasClaim(User_Services.UserClaims.Member);
}

const codeHubL2HeaderActions = new CodeHubL2HeaderActionsSource();

SDK_Shim.VSS.register("ms.vss-code-web.code-hub-actions", () => {
    return codeHubL2HeaderActions;
});