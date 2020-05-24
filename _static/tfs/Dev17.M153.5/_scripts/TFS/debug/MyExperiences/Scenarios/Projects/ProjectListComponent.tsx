/// <reference types="react" />
/// <reference types="react-dom" />

// React
import * as React from "react";
import * as Q from "q";

import * as VSS from "VSS/VSS";
import * as Performance from "VSS/Performance";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_Core from "VSS/Utils/Core";
import { ProgressAnnouncerOptions, ProgressAnnouncer } from "VSS/Utils/Accessibility";

import * as Errors from "MyExperiences/Scenarios/Shared/Alerts";
import { HubViewComponent } from "MyExperiences/Scenarios/Shared/Components/HubViewComponent";
import { HubData, IOrganizationInfoAndCollectionsPickerSectionProps } from "MyExperiences/Scenarios/Shared/Models";
import { isOrgAccountSelectorEnabled } from "MyExperiences/Scenarios/Shared/OrgAccountSelectorFeatureAvailabilityCheckHelper";
import { OrgInfoAndCollectionsPickerFluxAsync } from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerFluxAsync";

import * as Contracts from "MyExperiences/Scenarios/Projects/Contracts";
import {ProjectsStore} from "MyExperiences/Scenarios/Projects/ProjectsStore";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Projects/ProjectListComponent";

export const ClassName: string = "project-list-component";

export interface ProjectListProps extends ComponentBase.Props {
    onCTAClick: () => void;
    onFilterFocus: () => void;
    projectsStore: ProjectsStore;
    switchToCreateMode: () => void;
}

export interface ProjectsListState extends HubData {
}

export class ProjectListComponent extends ComponentBase.Component<ProjectListProps, ProjectsListState>{
    private _onChangeHandler = Utils_Core.delegate(this, this._onChange);
    private _orgInfoAndCollectionsPickerFluxAsync: OrgInfoAndCollectionsPickerFluxAsync;

    constructor(props: ProjectListProps) {
        super(props);

        this.state = {
            isLoading: true
        } as ProjectsListState;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.props.projectsStore.addChangedListener(this._onChangeHandler);

        this.state = this._getState();
        this.props.projectsStore.loadMruProjects();
        let loadProjectsListPromise = this.props.projectsStore.loadAllProjectsList();

        ProgressAnnouncer.forPromise(loadProjectsListPromise, {
            announceStartMessage: MyExperiencesResources.Projects_AnnounceLoadingProjects,
            announceEndMessage: MyExperiencesResources.Projects_AnnounceProjectsLoaded,
        } as ProgressAnnouncerOptions);

        loadProjectsListPromise
            .then(() => {
                (this.state as ProjectsListState).isLoading = false;
                if (this.state.groups.length === 0) {
                    this.props.switchToCreateMode();
                }
                else {
                    const scenarioManager: Performance.IScenarioManager = Performance.getScenarioManager();
                    if (scenarioManager.isPageLoadScenarioActive()) {
                        scenarioManager.recordPageLoadScenario("Dashboards", "Account.ProjectHub.Load");
                    }
                    // we preload here for users who are new to the account and want to create projects
                    VSS.requireModules(["MyExperiences/Scenarios/CreateProject/View"]);
                }
            });

        if (isOrgAccountSelectorEnabled()) {
            this._orgInfoAndCollectionsPickerFluxAsync = new OrgInfoAndCollectionsPickerFluxAsync({
                onHeaderOrganizationInfoAndCollectionPickerPropsUpdate: this._onHeaderOrganizationInfoAndCollectionPickerPropsUpdate,
                onCollectionNavigationFailed: this._onCollectionNavigationFailed
            });
            this._orgInfoAndCollectionsPickerFluxAsync.initializeOrgInfoAndCollectionsPickerFlux();
            this._orgInfoAndCollectionsPickerFluxAsync.registerStoresChangedListeners();
        }
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this.props.projectsStore.removeChangedListener(this._onChangeHandler);

        if (this._orgInfoAndCollectionsPickerFluxAsync) {
            this._orgInfoAndCollectionsPickerFluxAsync.unregisterStoresChangedListeners();
        }
    }

    public render(): JSX.Element {
        return <div className={ClassName}>
            <HubViewComponent {...this.state} />
        </div>
    };

    private _onHeaderOrganizationInfoAndCollectionPickerPropsUpdate = (props: IOrganizationInfoAndCollectionsPickerSectionProps): void => {
        let state = this._getState();
        state.header.organizationInfoAndCollectionPickerProps = props;

        this.setState(state);
    }

    private _onCollectionNavigationFailed = (): void => {
        let state = this._getState();
        state.alert = Errors.createReloadPromptAlertMessage(MyExperiencesResources.AccountSwitcher_CollectionNavigationError);

        this.setState(state);
    }

    private _onChange(): void {
        this.setState(this._getState());
    }

    private _getState(): ProjectsListState {
        var state = this.props.projectsStore.getData();
        if (state.header.button) {
            state.header.button.onClick = () => { this.props.onCTAClick(); };
        }

        if (state.header.filter) {
            state.header.filter.onFocus = () => { this.props.onFilterFocus(); };
        }

        return state;
    }
}
