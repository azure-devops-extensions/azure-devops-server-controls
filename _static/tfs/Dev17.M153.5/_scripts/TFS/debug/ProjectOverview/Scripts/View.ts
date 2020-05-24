/// <reference types="react-dom" />
import * as ReactDOM from "react-dom";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Service from "VSS/Service";
import * as PageEvents from "VSS/Events/Page";
import { getScenarioManager } from "VSS/Performance";
import { ContractSerializer } from "VSS/Serialization";
import { HubEventNames } from "VSS/Navigation/HubsService";
import * as User_Services from "VSS/User/Services";
import { Constants } from "ProjectOverview/Scripts/Constants";
import { ActionsHub } from "ProjectOverview/Scripts/ActionsHub";
import * as Contribution_Services from "VSS/Contributions/Services";
import { getService as getEventsService } from "VSS/Events/Services";
import { StoresHub, AggregatedState } from "ProjectOverview/Scripts/Stores/StoresHub";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ActionCreatorHub } from "ProjectOverview/Scripts/ActionCreatorsHub";
import { ProjectTagSource } from "ProjectOverview/Scripts/Sources/ProjectTagSource";
import { PermissionSource } from "ProjectOverview/Scripts/Sources/PermissionSource";
import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import * as ProjectOverviewContracts from "ProjectOverview/Scripts/Generated/Contracts";
import { AsyncMetricsSource } from "ProjectOverview/Scripts/Sources/AsyncMetricsSource";
import { WikiRepositorySource } from "ProjectOverview/Scripts/Sources/WikiRepositorySource";
import { ProjectMembersSource } from "ProjectOverview/Scripts/Sources/ProjectMembersSource";
import { ReadmeItemModelSource } from "ProjectOverview/Scripts/Shared/Sources/ReadmeItemModelSource";
import * as ProjectOverviewPageContainer from "ProjectOverview/Scripts/Components/ProjectOverviewPageContainer";
import { PageDataSource } from "ProjectOverview/Scripts/Sources/PageDataSource";
import { AsyncProjectInfoSource } from "ProjectOverview/Scripts/Sources/AsyncProjectInfoSource";
import { ProjectLanguagesSource } from "ProjectOverview/Scripts/Sources/ProjectLanguagesSource";
import { ReadmeActionCreator } from "ProjectOverview/Scripts/ActionCreators/ReadmeActionCreator";
import { ReadmeEditorActionCreator, EditorAggregatedState } from "ProjectOverview/Scripts/Shared/ReadmeEditorActionCreator";
import { AsyncReadmeEditingSource } from "ProjectOverview/Scripts/Shared/Sources/AsyncReadmeEditingSource";
import { ReadmeEditorState } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";
import * as TelemetryClient from "ProjectOverview/Scripts/TelemetryClient";
import { toNewReadmeEditorState } from "ProjectOverview/Scripts/Utils";
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/View";

SDK_Shim.registerContent("projectOverview.initialize", (context: SDK_Shim.InternalContentContextData) => {
    const projectHomePageView = new ProjectHomePageView();
    projectHomePageView.initialize(context);

    // Fire a page event to load the survey script
    PageEvents.getService().fire("nps-survey-page-ready");
});

export class ProjectHomePageView {
    private _storesHub: StoresHub;
    private _actionCreator: ActionCreatorHub;
    private _projectOverviewContainer: HTMLElement;
    private _parsedPageData: ProjectOverviewContracts.ProjectOverviewData;

    public initialize(context: SDK_Shim.InternalContentContextData): void {
        getScenarioManager().split("Project.OverviewPage.Start");

        const serializedPageData = VSS_Service.getService(Contribution_Services.WebPageDataService)
            .getPageData(Constants.ProjectOverviewDataProviderId) || {};

        this._parsedPageData = ContractSerializer.deserialize(
            serializedPageData[ProjectOverviewConstants.ProjectOverviewData],
            ProjectOverviewContracts.TypeInfo.ProjectOverviewData,
            false);

        this._initializeFlux();

        // Load stores from page data or retry fetching if data provider failed.
        this._actionCreator.loadProjectOverviewData(this._parsedPageData);

        context.$container.addClass("project-overview-base hub-view");
        this._projectOverviewContainer = context.$container[0];
        ProjectOverviewPageContainer.renderInto(this._projectOverviewContainer, {
            actionCreator: this._actionCreator,
            storesHub: this._storesHub,
        });

        // Subscribe to PreXHRNavigate event in order to clean up the store and action creator on navigating away using xhr.
        const eventService = getEventsService();
        const preXhrNavigateHandler = (): void => {
            this._dispose();
            eventService.detachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
        };
        eventService.attachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
    }

    private _initializeFlux(): void {
        const actionsHub: ActionsHub = new ActionsHub();
        const isAnonymousUser = User_Services.getService().hasClaim(User_Services.UserClaims.Anonymous);
        const isPublicUser = User_Services.getService().hasClaim(User_Services.UserClaims.Public);
        const isPublicAccess = isAnonymousUser || isPublicUser;
        this._storesHub = new StoresHub(actionsHub, isPublicAccess);
        const readmeItemModelSource = new ReadmeItemModelSource();
        const readmeActionCreator = new ReadmeActionCreator(
            actionsHub,
            this._storesHub.getAggregatedState,
            readmeItemModelSource,
            new WikiRepositorySource(),
        );

        const readmeEditorActionCreator = new ReadmeEditorActionCreator(
            actionsHub,
            this._getStateForReadmeEditorActionCreatorState,
            readmeItemModelSource,
            new AsyncReadmeEditingSource(),
            {
                publishCreateReadmeClicked: TelemetryClient.publishCreateReadmeClicked,
                publishEditReadmeClicked: TelemetryClient.publishEditReadmeClicked,
                publishReadmeCommitedToNewBranch: TelemetryClient.publishReadmeCommitedToNewBranch,
            }
        );

        this._actionCreator = new ActionCreatorHub(
            actionsHub,
            this._storesHub,
            new AsyncMetricsSource(),
            new ProjectMembersSource(),
            new AsyncProjectInfoSource(),
            new ProjectTagSource(),
            new PermissionSource(),
            new ProjectLanguagesSource(),
            new PageDataSource(),
            readmeActionCreator,
            readmeEditorActionCreator);
    }

    private _dispose(): void {
        if (this._projectOverviewContainer) {
            ReactDOM.unmountComponentAtNode(this._projectOverviewContainer);
            this._projectOverviewContainer = null;
        }

        this._storesHub = null;
        this._actionCreator = null;
    }

    private _getStateForReadmeEditorActionCreatorState = (): EditorAggregatedState => {
        let aggregatedState = this._storesHub.getAggregatedState();
        return {
            readmeEditorState: toNewReadmeEditorState(aggregatedState.readmeState),
            commitPromptState: aggregatedState.commitPromptState,
        }
    }
}
