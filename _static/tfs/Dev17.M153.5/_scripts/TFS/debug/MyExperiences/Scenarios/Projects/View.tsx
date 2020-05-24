/// <reference types="react" />
/// <reference types="react-dom" />

// React
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ComponentBase from "VSS/Flux/Component";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import {autobind} from "OfficeFabric/Utilities";

import * as SDK from "VSS/SDK/Shim";
import * as VSS from "VSS/VSS";
import * as VSSContext from "VSS/Context";
import * as VSS_Url from "VSS/Utils/Url";
import * as Performance from "VSS/Performance";
import * as PageEvents from "VSS/Events/Page";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Service from "VSS/Service";

import {FavoriteItem} from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as HeaderUtilities from "Presentation/Scripts/TFS/TFS.MyExperiences.HeaderHelper";
import { MyExperiencesUrls } from "Presentation/Scripts/TFS/TFS.MyExperiences.UrlHelper";
import { Constants } from "MyExperiences/Scenarios/CreateProject/Constants";
import { HubActions } from "MyExperiences/Scenarios/Shared/Actions";
import * as Account_Settings_Service from "MyExperiences/Scenarios/Shared/SettingsService";
import {ProjectViewMode} from "MyExperiences/Scenarios/Projects/Mode";
import {ProjectListComponent} from "MyExperiences/Scenarios/Projects/ProjectListComponent";
import {ProjectsStore} from "MyExperiences/Scenarios/Projects/ProjectsStore";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import {HubSpinner, Alignment} from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import {MyExperiencesTelemetry} from "MyExperiences/Scripts/Telemetry";
import {ProjectActions} from  "MyExperiences/Scenarios/Projects/Actions";
import { StarViewHelper } from "Favorites/Controls/StarView";
import { ArtifactScope } from "Favorites/Contracts";


import * as ProjectCreationViewComponent_Async from "MyExperiences/Scenarios/CreateProject/View";

const AsyncProjectCreationViewComponentComponent =
    getAsyncLoadedComponent(
        ["MyExperiences/Scenarios/CreateProject/View"],
        (m: typeof ProjectCreationViewComponent_Async) => m.ProjectCreationViewComponent,
        () => <div className="loading-spinner">
            <HubSpinner alignment={Alignment.center} />
        </div>,
        () => {
            Performance.getScenarioManager().split("ProjectCreationViewComponent.AsyncLoad.Start");
        },
        () => {
            Performance.getScenarioManager().split("ProjectCreationViewComponent.AsyncLoad.End");
        });

var pageContext = VSSContext.getPageContext();
var historyService = Navigation_Services.getHistoryService();

export interface IProjectViewComponentProps {
    initialViewMode?: ProjectViewMode;
    projectsStore?: ProjectsStore;
    projectCreationViewAction?: string;
}

export interface IProjectViewComponentState {
    viewMode: ProjectViewMode;
}

export class ProjectViewComponent extends React.Component<IProjectViewComponentProps, IProjectViewComponentState> {
    private _actionChangeDelegate: IFunctionPPR<any, any, void>;
    private _projectCreationViewAction: string;

    constructor(props: IProjectViewComponentProps) {
        super(props);

        this.state = {
            viewMode: this.props.initialViewMode || ProjectViewMode.List
        }

        this._actionChangeDelegate = Utils_Core.delegate(this, this._onActionChange);
        historyService.attachNavigate(this._actionChangeDelegate);

        this._projectCreationViewAction = this.props.projectCreationViewAction || "new";
    }

    public componentWillUnmount() {
        historyService.detachNavigate(this._actionChangeDelegate);
    }

    public render(): JSX.Element {
        return (
            <div className="project-hub-component">
                {this._getView() }
            </div>);
    }

    private _onActionChange(sender: any, state: any): void {
        if (state != undefined && state.action === this._projectCreationViewAction) {
            this.setState({
                viewMode: ProjectViewMode.Create
            });
        } else {
            this.setState({
                viewMode: ProjectViewMode.List
            });
        }
    }

    private _getView(): JSX.Element {
        if (this.state.viewMode === ProjectViewMode.List) {
            return <ProjectListComponent
                projectsStore={this.props.projectsStore}
                onCTAClick={this._onCTAClick}
                onFilterFocus={() => { ProjectActions.PrepSearch.invoke(null); }}
                switchToCreateMode={() => { historyService.addHistoryPoint(this._projectCreationViewAction); }}
            />
        } else if (this.state.viewMode === ProjectViewMode.Create) {
            return <AsyncProjectCreationViewComponentComponent
                onCancel={() => {
                    HubActions.HubFilterAction.invoke("");
                    this.setState({
                        viewMode: ProjectViewMode.List
                    });
                }}
                onScenarioComplete={() => {
                    const scenarioManager: Performance.IScenarioManager = Performance.getScenarioManager();
                    if (scenarioManager.isPageLoadScenarioActive()) {
                        scenarioManager.recordPageLoadScenario(Constants.Area, Constants.Feature);
                    }
                }}
            />
        }
    }

    @autobind
    private _onCTAClick(): void {
        MyExperiencesTelemetry.LogProjectsHubNewProjectButtonClicked();
        historyService.addHistoryPoint(this._projectCreationViewAction);
    }
}

SDK.registerContent("projectsView.initialize", (context: SDK.InternalContentContextData) => {
    HeaderUtilities.updateHeaderState();

    Performance.getScenarioManager().split("account.projectHub.start");

    var sharedData = StarViewHelper.getFilteredData([FavoriteItem.FAVITEM_TYPE_TEAM, FavoriteItem.FAVITEM_TYPE_PROJECT]);
    let projectViewComponentProps: IProjectViewComponentProps = { projectsStore: new ProjectsStore(sharedData.store, sharedData.actionsCreator, sharedData.dataProvider) };

    MyExperiencesUrls.getCreateNewProjectUrl(pageContext.webContext.collection.name, null).then((projectCreationUrl) => {
        let currentUri = VSS_Url.Uri.parse(window.location.href);
        let projectCreationUri = VSS_Url.Uri.parse(projectCreationUrl);

        let currentAction = currentUri.getQueryParam("_a")
        let projectCreationViewAction = projectCreationUri.getQueryParam("_a");

        projectViewComponentProps.projectCreationViewAction = projectCreationViewAction;

        if (currentAction != null && Utils_String.ignoreCaseComparer(currentAction, projectCreationViewAction) === 0) {
            projectViewComponentProps.initialViewMode = ProjectViewMode.Create;
        } else {
            projectViewComponentProps.initialViewMode = ProjectViewMode.List;
        }

        HeaderUtilities.TopLevelReactManager.renderTopLevelReact(React.createElement(ProjectViewComponent, projectViewComponentProps, null), context.container);
    }, (error: Error) => {
        HeaderUtilities.TopLevelReactManager.renderTopLevelReact(React.createElement(ProjectViewComponent, {}, null), context.container);
    });



    HeaderUtilities.TopLevelReactManager.attachCleanUpEvents();

    VSS.globalProgressIndicator.registerProgressElement($(".pageProgressIndicator"));
    Service.getLocalService(Account_Settings_Service.SettingsService).updateHubSelection();
});
