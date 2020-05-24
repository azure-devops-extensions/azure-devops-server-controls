/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { CommonConstants, ContributionConstants, PerfScenarios } from "CIWorkflow/Scripts/Common/Constants";
import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { PullRequestTriggerActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/PullRequestTriggerActionsCreator";
import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { TriggersActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { INavigationView } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { GettingStartedOverview } from "CIWorkflow/Scripts/Scenarios/Definition/Components/GettingStartedOverview";
import { GetSourcesControllerView } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GetSourcesControllerView";
import { BuildDefinitionStore, CreateDefinitionPages } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { Fabric } from "OfficeFabric/components/Fabric/Fabric";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as VssContext from "VSS/Context";
import { BaseControl } from "VSS/Controls";
import * as Events_Document from "VSS/Events/Document";
import * as NavigationService from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/GettingStartedView";

export class GettingStartedGetSourcesControllerView extends Base.Component<Base.IProps, Base.IState> {
    private _buildDefinitionStore: BuildDefinitionStore;
    private _sourceSelectionStore: SourcesSelectionStore;

    constructor(props: Base.IProps) {
        super(props);
        this._buildDefinitionStore = StoreManager.GetStore<BuildDefinitionStore>(BuildDefinitionStore);
        this._sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
    }

    public render(): JSX.Element {
        return (
            <Fabric>
                {/* Fabric handles the application of is-focusVisible class which allows styling for focus on components.
                    It adds the class if keyboard is being used and removes if mouse is used.*/}
                <div className="ci-getting-started-container">
                    <div className="ci-getting-started">
                        <div className="left-pane" role="region" aria-label={Resources.ARIALabelEditorGettingStarted}>
                            <GettingStartedOverview currentPage={CreateDefinitionPages.GetSources}/>
                        </div>
                        <div className="right-pane ci-getsources-container" role="region" aria-label={Resources.ARIALabelEditorGettingStartedTemplates}>
                            <GetSourcesControllerView sourcesPanelLabel={Resources.GetSoucesPagePanelLabel} onContinueClicked={this._onContinueClicked} />
                        </div>
                    </div>;
                </div>
            </Fabric>
        );
    }

    public componentDidMount() {
        // initialize all source provider stores
        this._sourceSelectionStore.initializeStores();
        Performance.getScenarioManager().recordPageLoadScenario(CommonConstants.FeatureArea, PerfScenarios.GettingStarted);
    }

    private _onContinueClicked = (yamlFilename?: string) => {
        const buildRepository = this._sourceSelectionStore.getBuildRepository();
        const repositoryName = buildRepository ? buildRepository.name : null;
        const repositoryType = buildRepository ? buildRepository.type : null;
        const versionControlStore =  StoreManager.GetStore<VersionControlStore>(VersionControlStore);
        const connectionId = this._sourceSelectionStore.getSelectedConnectionId();
        const branchName = this._sourceSelectionStore.getState().selectedBranchName;

        if (yamlFilename) {
            // Create a build definition from the file and navigate to it
            const actionCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
            actionCreator.createYamlBuildDefinitionFromRepositoryFile(buildRepository, yamlFilename);
        }
        else {
            // Go to the template selection
            const data = { repository: repositoryName, branchName: branchName, repositoryType: repositoryType, connectionId: connectionId };
            NavigationService.getHistoryService().addHistoryPoint(ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED_TEMPLATE, data);
        }
    }
}

export class GettingStartedGetSourcesView extends BaseControl implements INavigationView {
    private _sourceSelectionStore: SourcesSelectionStore;

    public initialize(): void {
        const tfsContext: TfsContext = TfsContext.getDefault();
        const projectId = tfsContext.contextData.project.id;
        const actionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        actionCreator.refreshProjectInfo(projectId);
        this._sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._createView();
        Events_Document.getRunningDocumentsTable().add("BuildDefinitionEditor", this);
    }

    public dispose() {
        ReactDOM.unmountComponentAtNode(this.getElement()[0]);
        super.dispose();
    }

    public isDirty(): boolean {
        return this._sourceSelectionStore.isDirty();
    }

    public canNavigateAway(action?: string): boolean {
        if (action && action !== ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED_TEMPLATE && this._sourceSelectionStore.isDirty()) {
            return confirm(Resources.BuildDefinitionNavigateAwayWhenDirtyMessage);
        }
        else {
            return true;
        }
    }

    private _createView(): void {
        ReactDOM.render(React.createElement(GettingStartedGetSourcesControllerView),
            this.getElement()[0]);
        const titleFormat = VssContext.getPageContext().webAccessConfiguration.isHosted ? VSS_Resources_Platform.PageTitleWithContent_Hosted : VSS_Resources_Platform.PageTitleWithContent;
        document.title = Utils_String.format(titleFormat, Resources.SelectBuildDefinitionTemplateText);
    }
}
