import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TelemetryClient } from "VersionControl/Scenarios/NewGettingStarted/TelemetryClient";
import { ActionsHub } from "VersionControl/Scenarios/NewGettingStarted/ActionsHub";
import { Actions } from "VersionControl/Scripts/Controls/SourceEditingDialogs";
import { GitCredentialsActionsCreator } from "VersionControl/Scenarios/NewGettingStarted/ActionsCreators/GitCredentialsActionsCreator";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { IdeSource } from "VersionControl/Scenarios/NewGettingStarted/Sources/IdeSource";
import { SupportedIde, SupportedIdeType, GitTemplate } from "TFS/VersionControl/Contracts";
import * as VCImportDialog_NO_REQUIRE from "VersionControl/Scenarios/Import/ImportDialog/ImportDialog";
import { GitPermissionsSource, GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export class ActionsCreatorHub {
    constructor(
        private _gitRepositoryContext: RepositoryContext,
        private _tfsContext: TfsContext,
        private _actionsHub: ActionsHub,
        private _ideSource: IdeSource,
        private _gitPermissionsSource: GitPermissionsSource,
        private _telemetryClient: TelemetryClient,
        public gitCredentialsActionsCreator: GitCredentialsActionsCreator,
        private _showOnlyCommandLine?: boolean,
    ) {
        if (!this._showOnlyCommandLine) {
            this._fetchSupportedIdes();
        }

        this._fetchPermissionsAndInitialize();
    }

    public openImportRepositoryDialog = (): void => {
        VSS.using(["VersionControl/Scenarios/Import/ImportDialog/ImportDialog"], (VCImportRepository: typeof VCImportDialog_NO_REQUIRE) => {
            let gitRepository = this._gitRepositoryContext.getRepository();
            let options = <VCImportDialog_NO_REQUIRE.ImportDialogOptions>{
                tfsContext: this._tfsContext,
                projectInfo: gitRepository.project,
                repositoryName: gitRepository.name
            };
            VCImportRepository.ImportDialog.show(options);
        });
    }

    public initializeRepository = (createReadMe: boolean, gitignoreTemplate?: GitTemplate) => {
        this._telemetryClient.publishInitRepoEvent({
            addReadme: createReadMe,
            gitignore: gitignoreTemplate ? gitignoreTemplate.name : ""
        });

        Utils_Accessibility.announce(VCResources.GettingStarted_InitializingRepository, false);
        this._actionsHub.createFilesRequested.trigger(null);

        this._createDefaultFiles(createReadMe, gitignoreTemplate)
            .done(() => this._actionsHub.createFilesCompleted.trigger(null))
            .fail((error: Error) => this._actionsHub.createFilesCompleted.trigger(error.message));
    }

    public downloadGitForWindows() {
        this._telemetryClient.publishGitForWindowsDownloadEvent();
    }

    public openInIde(selectedIde: SupportedIde): void {
        if (!selectedIde) {
            return;
        }

        const isSelectedIdeVisualStudio = this._checkIsVisualStudio(selectedIde.ideType);
        this._actionsHub.changeSelectedIde.trigger({
            selectedIde,
            isSelectedIdeVisualStudio,
        });

        if (isSelectedIdeVisualStudio) {
            this._telemetryClient.publishOpenInVisualStudioEvent();
        } else {
            this._telemetryClient.publishOpenInOtherIdeEvent(selectedIde.ideType.toString());
        }

        this._ideSource.setFavoriteIdeType(selectedIde.ideType);

        this._ideSource.openInIde(selectedIde);
    }

    public toggleButtonClicked = (newSelectedText: string): void => {
        this._actionsHub.toggleButtonClicked.trigger(newSelectedText);
    }

    public _fetchSupportedIdes(): void {
        this._ideSource.getSupportedIdes(this._gitRepositoryContext.getRepositoryId())
            .then(ides => {
                if (ides.length === 0) {
                    return;
                }

                // Use the favorite IDE type from the cache if it exists in the IDE list
                let favoriteIdeType = SupportedIdeType.Unknown;
                const favoriteIdeTypeFromCache = this._ideSource.getFavoriteIdeType();
                if (favoriteIdeTypeFromCache && ides.findIndex(ide => ide.ideType === favoriteIdeTypeFromCache) !== -1) {
                    favoriteIdeType = favoriteIdeTypeFromCache;
                } else {
                    // Otherwise, default the favorite IDE type to VS Code.
                    // If VS Code is missing from the IDE list, default to the first item in the list.
                    const defaultIdeTypeIndex = ides.findIndex(ide => ide.ideType === SupportedIdeType.VSCode);
                    favoriteIdeType = defaultIdeTypeIndex == -1 ? ides[0].ideType : ides[defaultIdeTypeIndex].ideType;
                }

                this._actionsHub.setSupportedIdes.trigger({
                    ides,
                    favoriteIdeType,
                    isFavoriteIdeVisualStudio: this._checkIsVisualStudio(favoriteIdeType),
                });
            });
    }

    public showSshKeyManagement() {
        this._telemetryClient.publishManageSshKeysEvent();
    }

    private _fetchPermissionsAndInitialize(): void {
        this._gitPermissionsSource.queryDefaultGitRepositoryPermissionsAsync().then(
            (permissionSet: GitRepositoryPermissionSet) => {
                this._actionsHub.gitContributePermissionUpdated.trigger(permissionSet.repository.GenericContribute);
                this.gitCredentialsActionsCreator.initializeAlternateCredentialsData();
            },
            (error: Error) => { /* no-op */ }
        );
    }

    private _createDefaultFiles(createReadMe: boolean, gitignoreTemplate?: GitTemplate): JQueryPromise<VersionSpec> {
        // Commit the new file.
        return Actions.createDefaultFilesPush(this._gitRepositoryContext, createReadMe, gitignoreTemplate ? gitignoreTemplate.name : undefined)
            .done(() => location.reload());
    }

    private _checkIsVisualStudio(ideType: SupportedIdeType): boolean {
        return ideType && Utils_String.equals(ideType.toString(), SupportedIdeType[SupportedIdeType.VisualStudio], true);
    }
}
