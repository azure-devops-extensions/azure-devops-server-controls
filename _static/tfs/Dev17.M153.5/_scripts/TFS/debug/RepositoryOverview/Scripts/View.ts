/// <reference types="react-dom" />
import * as ReactDOM from "react-dom";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Controls from "VSS/Controls";
import { getService as getEventsService } from "VSS/Events/Services";
import * as PageEvents from "VSS/Events/Page";
import { HubEventNames } from "VSS/Navigation/HubsService";
import { getScenarioManager } from "VSS/Performance";
import * as SDK_Shim from "VSS/SDK/Shim";
import { ContractSerializer } from "VSS/Serialization";
import * as VSS_Service from "VSS/Service";
import { caseInsensitiveContains } from "VSS/Utils/String";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { isGit } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeUtils";
import { ReadmeEditorActionCreator, EditorAggregatedState } from "ProjectOverview/Scripts/Shared/ReadmeEditorActionCreator";
import { AsyncReadmeEditingSource } from "ProjectOverview/Scripts/Shared/Sources/AsyncReadmeEditingSource";
import { ReadmeItemModelSource } from "ProjectOverview/Scripts/Shared/Sources/ReadmeItemModelSource";
import { RepositoryPermissionSource } from "ProjectOverview/Scripts/Shared/Sources/RepositoryPermissionSource";
import { VersionControlViewModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import * as VCConstants from "VersionControl/Scenarios/Shared/Constants";
import { showEmptyRepository } from "VersionControl/Scenarios/Shared/EmptyRepository";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";

import { ActionCreatorHub } from "RepositoryOverview/Scripts/ActionCreatorsHub";
import { ActionsHub } from "RepositoryOverview/Scripts/ActionsHub";
import * as RepositoryOverview from "RepositoryOverview/Scripts/Components/RepositoryOverview";
import { PerfConstants } from "RepositoryOverview/Scripts/Constants";
import { RepositoryOverviewConstants } from "RepositoryOverview/Scripts/Generated/Constants";
import * as RepositoryOverviewContracts from "RepositoryOverview/Scripts/Generated/Contracts";
import { LanguagesSource } from "RepositoryOverview/Scripts/Sources/LanguagesSource";
import { StoresHub } from "RepositoryOverview/Scripts/StoresHub";
import { TelemetrySpy } from "RepositoryOverview/Scripts/TelemetrySpy";

import "VSS/LoaderPlugins/Css!RepositoryOverview/Scripts/View";

SDK_Shim.registerContent("repositoryOverview.initialize", (context: SDK_Shim.InternalContentContextData) => {
    getScenarioManager().split(PerfConstants.PageContentInitializeStart);
    // Workaround for checking if it is TFVC repository.
    // We can remove this once we move to new platform. As there it is supported to query route parameters.
    const isTfvc = caseInsensitiveContains(window.location.pathname, "/_versionControl");
    if (!ValidateRepository.repositoryForPageExists(context.$container, isTfvc)) {
        return;
    }

    const repositoryOverview = new RegisterContentHandler();
    repositoryOverview.initialize(context);
});

class RegisterContentHandler {
    private _gitDataProviderKey = "ms.vss-code-web.git-repository-overview-data-provider";
    private _tfvcDataProviderKey = "ms.vss-code-web.tfvc-repository-overview-data-provider";
    private _repositoryOverviewContainer: HTMLElement;
    private _repositoryContext: RepositoryContext;
    private _actionsHub: ActionsHub;
    private _storesHub: StoresHub;
    private _actionCreatorHub: ActionCreatorHub;

    public initialize(context: SDK_Shim.InternalContentContextData): void {
        const webPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
        this._updateRepositoryContext(webPageDataService);
        context.$container.addClass("repository-overview-base hub-view");
        this._repositoryOverviewContainer = context.$container[0];

        const repositoryData = this._getRepositoryData(webPageDataService);
        this._initializeFlux(repositoryData);
        RepositoryOverview.renderInto(this._repositoryOverviewContainer, {
            actionCreatorHub: this._actionCreatorHub,
            storesHub: this._storesHub,
            repositoryContext: this._repositoryContext,
            repositoryData: repositoryData,
            hasReadmeEditPermissions: this._hasEditPermissions(),
            isEmptyRepository: ValidateRepository.isEmptyRepository(),
            renderEmptyRepositorySection: (element: HTMLElement) => this._initializeEmpty(webPageDataService, element),
        });

        // Subscribe to PreXHRNavigate event in order to clean up the store and action creator on navigating away using xhr.
        const eventService = getEventsService();
        const preXhrNavigateHandler = (): void => {
            this._dispose();
            eventService.detachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
        };
        eventService.attachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
    }

    /**
     * TODOs:
     *    1. First validate repository.
     *    2. Add support for git empty repository.
     */
    private _updateRepositoryContext(webPageDataService: Contribution_Services.WebPageDataService): void {
        const viewModel = webPageDataService.getPageData<VersionControlViewModel>(VCConstants.versionControlDataProviderId) ||
            {} as VersionControlViewModel;
        const tfsContext = TfsContext.getDefault();

        this._repositoryContext = viewModel.gitRepository
            ? GitRepositoryContext.create(viewModel.gitRepository, tfsContext)
            : TfvcRepositoryContext.create(tfsContext);
    }

    private _initializeFlux(repositoryData: RepositoryOverviewContracts.RepositoryOverviewData): void {
        this._actionsHub = new ActionsHub();
        this._storesHub = new StoresHub(this._actionsHub, repositoryData, this._repositoryContext);

        const readmeEditorActionCreator = new ReadmeEditorActionCreator(
            this._actionsHub,
            () => this._storesHub.getAggregatedState(),
            new ReadmeItemModelSource(),
            new AsyncReadmeEditingSource(),
            new TelemetrySpy()
        );

        this._actionCreatorHub = new ActionCreatorHub(
            this._actionsHub,
            this._storesHub,
            new LanguagesSource(this._getDataProviderKey()),
            readmeEditorActionCreator);
    }

    private _getRepositoryData(webPageDataService: Contribution_Services.WebPageDataService): RepositoryOverviewContracts.RepositoryOverviewData {
        const serializedData = webPageDataService.getPageData(this._getDataProviderKey());
        return ContractSerializer.deserialize(
            serializedData[RepositoryOverviewConstants.RepositoryDataKey],
            RepositoryOverviewContracts.TypeInfo.RepositoryOverviewData,
            false) as RepositoryOverviewContracts.RepositoryOverviewData;
    }

    private _getDataProviderKey(): string {
        let repositoryType = this._repositoryContext.getRepositoryType();
        return repositoryType === RepositoryType.Tfvc
            ? this._tfvcDataProviderKey
            : this._gitDataProviderKey;
    }

    private _dispose(): void {
        if (this._repositoryOverviewContainer) {
            ReactDOM.unmountComponentAtNode(this._repositoryOverviewContainer);
            this._repositoryOverviewContainer = null;
        }
    }

    private _hasEditPermissions(): boolean {
        return isGit(this._repositoryContext)
            ? RepositoryPermissionSource.hasGitRepoGenericContributePermission(this._repositoryContext.getProjectId(), this._repositoryContext.getRepositoryId())
            : RepositoryPermissionSource.hasTfvcRepoRootCheckinPermission(this._repositoryContext.getProjectId());
    }

    private _initializeEmpty(webPageDataService: Contribution_Services.WebPageDataService, element: HTMLElement): void {
        const viewModel = webPageDataService.getPageData<VersionControlViewModel>(VCConstants.versionControlDataProviderId) ||
            {} as VersionControlViewModel;

        showEmptyRepository(
            element,
            document,
            viewModel.activeImportRequest,
            this._repositoryContext as GitRepositoryContext,
            TfsContext.getDefault(),
            viewModel.projectVersionControlInfo,
            viewModel.sshEnabled,
            viewModel.sshUrl,
            viewModel.cloneUrl);
    }
}