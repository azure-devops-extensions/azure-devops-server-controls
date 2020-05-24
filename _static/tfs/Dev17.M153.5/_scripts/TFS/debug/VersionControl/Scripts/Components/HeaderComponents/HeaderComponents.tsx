import { Icon, IconType } from "OfficeFabric/Icon";
import { css } from "OfficeFabric/utilities";
import * as React from "react";
import { WebPageDataService } from "VSS/Contributions/Services";
import { registerLWPComponent } from "VSS/LWP";
import { getService } from "VSS/Service";
import * as User_Services from "VSS/User/Services";
import * as VSS from "VSS/VSS";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { ClonePopup } from "VersionControl/Scripts/Controls/ClonePopup";
import { DefaultRepositoryInformation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

import HostTfsContext_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import HostTfsOmCommon_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.OM.Common");
import VCCodeHubCloneRepositoryAction_NO_REQUIRE = require("VersionControl/Scripts/CodeHubCloneRepositoryAction");
import VCForkRepositoryDialog_NO_REQUIRE = require("VersionControl/Scenarios/ForkRepository/ForkRepositoryDialog");
import VCImportDialog_NO_REQUIRE = require("VersionControl/Scenarios/Import/ImportDialog/ImportDialog");
import VCCreateRepoDialog_NO_REQUIRE = require("VersionControl/Scenarios/CreateRepository/CreateRepositoryDialog");
import VCVersionControlUrls_NO_REQUIRE = require("VersionControl/Scripts/VersionControlUrls");
import VCTfvcRepositoryContext_NO_REQUIRE = require("VersionControl/Scripts/TfvcRepositoryContext");
import VCRepositoryContext_NO_REQUIRE = require("VersionControl/Scripts/RepositoryContext");
import VCTfvcClientService_NO_REQUIRE = require("VersionControl/Scripts/TfvcClientService");

export const navigationDataProviderId = "ms.vss-code-web.navigation-data-provider";

interface VersionControlActionProps {
    selected: boolean;
}

/**
 * This Component renders the version control fork action
 */
class ForkHeaderComponent extends React.Component<VersionControlActionProps, {}> {
    public static componentType = "forkHeader";

    private _forkDialogOpening: boolean = false;
    private _canRepositoryFork: boolean;
    private _canUserFork: boolean;

    public componentWillMount() {
        const webPageDataSvc = getService(WebPageDataService);
        const defaultRepoInfo = webPageDataSvc.getPageData<DefaultRepositoryInformation>(navigationDataProviderId);
        if (defaultRepoInfo && defaultRepoInfo.defaultRepoIsGit) {
            this._canRepositoryFork = defaultRepoInfo.defaultRepoCanFork;
        }

        this._canUserFork = User_Services.getService().hasClaim(User_Services.UserClaims.Member);
    }

    public render(): JSX.Element {
        if (!this._canRepositoryFork || !this._canUserFork) {
            return null;
        }

        return (
            <div
                className="command-action"
                onClick={this.onClick}
                onKeyDown={this.onKeyDown}
                tabIndex={this.props.selected ? 0 : -2}
            >
                <Icon iconName="BranchFork2" className="icon-centered action-icon" />
                <span className="caption">{VCResources.ForkAction}</span>
            </div>
        );
    }

    private onClick = (event: React.MouseEvent<HTMLDivElement>): void => {
        this.performAction();
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.which === 13 /* enter */ || event.which === 32 /* space */) {
            this.performAction();
        }
    }

    private performAction() {
        if (!this._forkDialogOpening) {
            this._forkDialogOpening = true;
            VSS.using(["VersionControl/Scenarios/ForkRepository/ForkRepositoryDialog"], (ForkRepositoryDialog: typeof VCForkRepositoryDialog_NO_REQUIRE) => {
                ForkRepositoryDialog.ForkRepositoryDialog.show();
                this._forkDialogOpening = false;
            });
        }
    }

}

/**
 * This Component renders the version control clone action
 */
class CloneHeaderComponent extends React.Component<VersionControlActionProps, {}> {
    public static componentType = "cloneHeader";

    private _clonePopup: ClonePopup;
    public render(): JSX.Element {
        return (
            <div
                className="command-action"
                onClick={this.onClick}
                onKeyDown={this.onKeyDown}
                tabIndex={this.props.selected ? 0 : -2}
            >
                <Icon iconName="CloneToDesktop" className="icon-centered action-icon" />
                <span className="caption">{VCResources.CloneAction}</span>
            </div>
        );
    }

    public componentWillMount() {
        document.body.addEventListener("legacyFpsComplete", this.onLegacyFpsComplete);
    }

    public componentWillUnmount() {
        document.body.removeEventListener("legacyFpsComplete", this.onLegacyFpsComplete);
    }

    private onClick = (event: React.MouseEvent<HTMLDivElement>): void => {
        this.performAction();
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.which === 13 /* enter */ || event.which === 32 /* space */) {
            this.performAction();
        }
    }

    private performAction(): void {
        VSS.using(["VersionControl/Scripts/CodeHubCloneRepositoryAction"], (CodeHubCloneRepositoryAction: typeof VCCodeHubCloneRepositoryAction_NO_REQUIRE) => {
            const menuItemSelector = ".clone-action";
            if (!this._clonePopup || this._clonePopup.isDisposed()) {
                this._clonePopup = CodeHubCloneRepositoryAction.createCloneRepositoryPopup($(menuItemSelector));
            }
        });
    }

    /**
     * A Fast Page Switch might change the repository, so dispose the Clone popup if it had already been created.
     * This is only required for the legacy navigation.  Vertical navigation already disposes and doesn't use this component.
     */
    private onLegacyFpsComplete = (completedEvent: any) => {
        if (this._clonePopup && !this._clonePopup.isDisposed()) {
            this._clonePopup.dispose();
            this._clonePopup = null;
        }
    };
}

interface INewRepositoryDialogProps {
    onClose?: () => void;
    isOverviewHubEnabled?: boolean;
}

class NewRepositoryDialog extends React.Component<INewRepositoryDialogProps, {}> {
    public static componentType = "newRepositoryDialog";

    public render(): null {
        
        VSS.using([
            "VersionControl/Scenarios/CreateRepository/CreateRepositoryDialog",
            "VersionControl/Scripts/VersionControlUrls",
            "VersionControl/Scripts/TfvcRepositoryContext",
            "VersionControl/Scripts/RepositoryContext",
            "VersionControl/Scripts/TfvcClientService",
            "Presentation/Scripts/TFS/TFS.Host.TfsContext",
            "Presentation/Scripts/TFS/TFS.OM.Common"
        ], (
            VCCreateRepoDialog: typeof VCCreateRepoDialog_NO_REQUIRE,
            VCVersionControlUrls: typeof VCVersionControlUrls_NO_REQUIRE,
            VCTfvcRepositoryContext: typeof VCTfvcRepositoryContext_NO_REQUIRE,
            VCRepositoryContext: typeof VCRepositoryContext_NO_REQUIRE,
            VCTfvcClientService: typeof VCTfvcClientService_NO_REQUIRE,
            HostTfsContext: typeof HostTfsContext_NO_REQUIRE,
            HostTfsOmCommon: typeof HostTfsOmCommon_NO_REQUIRE
        ) => {

            const tfsContext = HostTfsContext.TfsContext.getDefault();
            const tfvcService = HostTfsOmCommon.ProjectCollection.getConnection(tfsContext).getService<VCTfvcClientService_NO_REQUIRE.TfvcClientService>(VCTfvcClientService.TfvcClientService);

            tfvcService.beginGetProjectInfo(tfsContext.navigation.projectId, (vcProjectInfo) => {
                VCCreateRepoDialog.CreateRepoDialog.show({
                    projectInfo: vcProjectInfo,
                    tfsContext: tfsContext,
                    elementToFocusOnDismiss: undefined,
                    onCreated: (createdRepository) => {
                        let url: string;
                        if (createdRepository.repoType === VCRepositoryContext.RepositoryType.Git) {
                            url = VCVersionControlUrls.getGitActionUrl(
                                tfsContext,
                                createdRepository.gitRepository.name,
                                this.props.isOverviewHubEnabled ? VCVersionControlUrls.OverviewHubRoute : null,
                                null,
                                false);
                        }
                        else {
                            let repositoryContext = VCTfvcRepositoryContext.TfvcRepositoryContext.create();
                            url = this.props.isOverviewHubEnabled
                                ? VCVersionControlUrls.getTfvcOverviewUrl(repositoryContext)
                                : VCVersionControlUrls.getExplorerUrl(repositoryContext);
                        }

                        window.location.href = url;
                    },
                    onCancelled: this.props.onClose,
                });
            });
        });

        return null;
    }
}

interface IImportRepositoryDialogProps {
    onClose?: () => void;
}

class ImportRepositoryDialog extends React.Component<IImportRepositoryDialogProps, {}> {
    public static componentType = "importRepositoryDialog";

    public render(): null {
        
        VSS.using([
            "VersionControl/Scenarios/Import/ImportDialog/ImportDialog",
            "Presentation/Scripts/TFS/TFS.Host.TfsContext"
        ], (
            VCImportRepository: typeof VCImportDialog_NO_REQUIRE,
            HostTfsContext: typeof HostTfsContext_NO_REQUIRE
        ) => {
            const tfsContext = HostTfsContext.TfsContext.getDefault();
            const options = {
                tfsContext: tfsContext,
                projectInfo: {
                    id: tfsContext.navigation.projectId,
                    name: tfsContext.navigation.project
                },
                repositoryName: null,
                onClose: this.props.onClose
            } as VCImportDialog_NO_REQUIRE.ImportDialogOptions;

            VCImportRepository.ImportDialog.show(options);
        });

        return null;
    }
}

registerLWPComponent(ForkHeaderComponent.componentType, ForkHeaderComponent);
registerLWPComponent(CloneHeaderComponent.componentType, CloneHeaderComponent);
registerLWPComponent(NewRepositoryDialog.componentType, NewRepositoryDialog);
registerLWPComponent(ImportRepositoryDialog.componentType, ImportRepositoryDialog);