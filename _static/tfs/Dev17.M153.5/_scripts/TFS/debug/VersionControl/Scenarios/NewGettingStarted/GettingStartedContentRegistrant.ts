/// <reference types="react-dom" />
import * as ReactDOM from "react-dom";

import * as Contribution_Services from "VSS/Contributions/Services";
import { getService as getEventsService } from "VSS/Events/Services";
import { HubEventNames } from "VSS/Navigation/HubsService";
import { getScenarioManager } from "VSS/Performance";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Service from "VSS/Service";
import { format } from "VSS/Utils/String";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { createGettingStartedViewIn } from "VersionControl/Scenarios/NewGettingStarted/GettingStartedView";
import * as VCConstants from "VersionControl/Scenarios/Shared/Constants";
import { VersionControlViewModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitShortcutGroup } from "VersionControl/Scripts/Views/CommonShortcuts";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/GettingStartedContentRegistrant";

SDK_Shim.registerContent("emptyrepository.initialize", (context: SDK_Shim.InternalContentContextData) => {
    getScenarioManager().split("emptyrepository.initialize.start");

    const emptyRepoContent = new GettingStartedContentRegistrant();
    emptyRepoContent.initialize(context);
});

class GettingStartedContentRegistrant {
    private _element: HTMLElement;
    private _shortcutGroup: GitShortcutGroup;
    private _repositoryContext: GitRepositoryContext;

    public initialize(context: SDK_Shim.InternalContentContextData): void {
        context.$container.addClass("empty-repository-container hub-view");
        this._element = context.$container[0];

        const viewModelData = VSS_Service.getService(Contribution_Services.WebPageDataService)
            .getPageData<VersionControlViewModel>(VCConstants.versionControlDataProviderId) || {} as VersionControlViewModel;
        this._repositoryContext = GitRepositoryContext.create(viewModelData.gitRepository, TfsContext.getDefault());
        this._initializeEmpty(viewModelData, this._element);
        this._shortcutGroup = new GitShortcutGroup(this._repositoryContext);
        this._registerPreXhrNavigate();
    }

    private _dispose(): void {
        if (this._element) {
            ReactDOM.unmountComponentAtNode(this._element);
            this._shortcutGroup.removeShortcutGroup();
            this._element = null;
        }
    }

    private _registerPreXhrNavigate(): void {
        // Subscribe to PreXHRNavigate event in order to clean up the store and action creator on navigating away using xhr.
        const eventService = getEventsService();
        const preXhrNavigateHandler = (): void => {
            this._dispose();
            eventService.detachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
        };
        eventService.attachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
    }

    private _initializeEmpty(viewModel: VersionControlViewModel, element: HTMLElement): void {
        const tfsContext = TfsContext.getDefault();
        createGettingStartedViewIn(
            element,
            {
                tfsContext,
                repositoryContext: this._repositoryContext,
                sshEnabled: viewModel.sshEnabled,
                sshUrl: viewModel.sshUrl,
                cloneUrl: viewModel.cloneUrl,
                heading: format(VCResources.EmptyRepoHeader, viewModel.gitRepository.name),
                headingLevel: 1,
                recordPageLoadScenario: true,
            });
    }
}