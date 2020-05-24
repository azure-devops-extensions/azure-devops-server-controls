/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { CommonConstants, ContributionConstants, OthersSource, PerfScenarios } from "CIWorkflow/Scripts/Common/Constants";
import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { INavigationView, TemplateConstants } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { GettingStartedOverview } from "CIWorkflow/Scripts/Scenarios/Definition/Components/GettingStartedOverview";
import { BuildTemplatesSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildTemplatesSource";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { CreateDefinitionPages } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";
import { YamlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlStore";
import { YamlConstants } from "CIWorkflow/Scripts/Scenarios/Definition/Yaml";

import { TemplateActionsCreator } from "DistributedTaskControls/Actions/TemplateActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { ITemplateDefinition } from "DistributedTaskControls/Common/Types";
import { TemplatesControllerView } from "DistributedTaskControls/ControllerViews/TemplatesControllerView";
import { TemplatesStore } from "DistributedTaskControls/Stores/TemplatesStore";

import { Fabric } from "OfficeFabric/components/Fabric/Fabric";

import * as VssContext from "VSS/Context";
import { BaseControl } from "VSS/Controls";
import { logWarning } from "VSS/Diag";
import * as Events_Document from "VSS/Events/Document";
import * as NavigationService from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/GettingStartedView";

export interface IGettingStartedControllerViewProps extends Base.IProps {
    isPartOfFlow: boolean;
}

export class IGettingStartedControllerViewState {
    showYaml: boolean;
}

export class GettingStartedControllerView extends Base.Component<IGettingStartedControllerViewProps, IGettingStartedControllerViewState> {
    private _templateActionsCreator: TemplateActionsCreator;
    private _templatesStore: TemplatesStore;
    private _yamlStore: YamlStore;

    constructor(props: IGettingStartedControllerViewProps) {
        super(props);
        this._yamlStore = StoreManager.GetStore<YamlStore>(YamlStore);
        this._templateActionsCreator = ActionCreatorManager.GetActionCreator<TemplateActionsCreator>(TemplateActionsCreator);
        this._templatesStore = StoreManager.GetStore<TemplatesStore>(TemplatesStore);
        const buildTemplatesSource = BuildTemplatesSource.instance();
        this._templateActionsCreator.updateTemplateList(buildTemplatesSource, true);
        this.state = this._getState();
    }

    public render(): JSX.Element {
        return (
            <Fabric>
                {/* Fabric handles the application of is-focusVisible class which allows styling for focus on components. 
                    It adds the class if keyboard is being used and removes if mouse is used.*/}
                <div className="ci-getting-started-container">
                    <div className="ci-getting-started">
                        <div className="left-pane" role="region" aria-label={Resources.ARIALabelEditorGettingStarted}>
                            <GettingStartedOverview currentPage={CreateDefinitionPages.SelectTemplate} />
                        </div>
                        <div className="right-pane" role="region" aria-label={Resources.ARIALabelEditorGettingStartedTemplates}>
                            <TemplatesControllerView
                                title={Resources.TemplatesListTitle}
                                onEmptyProcessClick={this._onApplyEmptyProcessTemplate.bind(this)}
                                onApplyTemplate={this._onApplyTemplate}
                                onDeleteTemplate={this._onDeleteTemplate}
                                onApplyYamlTemplate={this.state.showYaml && this._onApplyYamlTemplate}
                            />
                        </div>
                    </div>
                </div>
            </Fabric>
        );
    }

    public componentDidMount() {
        this._yamlStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._yamlStore.removeChangedListener(this._onChange);
    }

    private _onChange = () => {
        this.setState(this._getState());
    }

    private _getState(): IGettingStartedControllerViewState {
        return {
            showYaml: this._yamlStore.getState().isYamlFeatureAvailable && this._doesSourceProviderSupportYaml()
        };
    }

    private _doesSourceProviderSupportYaml(): boolean {
        const sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        const sourceProvider = sourcesSelectionStore.getSelectedSourceProvider();
        return sourceProvider ? sourceProvider.isYamlSupported() : true;
    }

    private _onApplyTemplate = (template: ITemplateDefinition) => {

        Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.CreateNewDefinition);
        let source: string = this._getBuildRepositoryName();
        const repositoryType: string = this._getBuildRepositoryType();
        const connectionId: string = NavigationUtils.getConnectionIdFromUrl();
        const branchName: string = NavigationUtils.getBranchNameFromUrl();

        // update the navigation history to create a build definition with the given template
        NavigationService.getHistoryService().addHistoryPoint(ContributionConstants.ACTION_CREATE_BUILD_DEFINITION, { templateId: template.id, repository: source, branchName: branchName, repositoryType: repositoryType, connectionId: connectionId });
        this._publishBuildTemplateTelemetry(Feature.SelectBuildTemplate, template);
    }

    private _onApplyYamlTemplate = (yamlTemplate) => {
        const source = this._getBuildRepositoryName();
        const repositoryType: string = this._getBuildRepositoryType();
        const connectionId: string = NavigationUtils.getConnectionIdFromUrl();
        const branchName: string = NavigationUtils.getBranchNameFromUrl();

        // update the navigation history to create a build definition with empty template but mention that it's yaml
        let data = { repository: source, branchName: branchName, templateId: TemplateConstants.EmptyTemplateId, repositoryType: repositoryType, connectionId: connectionId };
        data[YamlConstants.isYamlProperty] = true;

        NavigationService.getHistoryService().addHistoryPoint(ContributionConstants.ACTION_CREATE_BUILD_DEFINITION, data);
        Telemetry.instance().publishEvent(Feature.EmptyProcessTemplate);
    }

    private _getBuildRepositoryName(): string {
        const sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        const buildRepository = sourceSelectionStore.getBuildRepository();
        return buildRepository ? buildRepository.name : NavigationUtils.getRepositoryNameFromUrl();
    }

    private _getBuildRepositoryType(): string {
        const sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        const buildRepository = sourceSelectionStore.getBuildRepository();
        return buildRepository ? buildRepository.type : NavigationUtils.getRepositoryTypeFromUrl();
    }

    private _onApplyEmptyProcessTemplate(): void {
        let source: string = this._getBuildRepositoryName();
        const repositoryType: string = this._getBuildRepositoryType();
        const connectionId: string = NavigationUtils.getConnectionIdFromUrl();
        const branchName: string = NavigationUtils.getBranchNameFromUrl();

        // update the navigation history to create a build definition with an empty template
        NavigationService.getHistoryService().addHistoryPoint(ContributionConstants.ACTION_CREATE_BUILD_DEFINITION, { repository: source, branchName: branchName, repositoryType: repositoryType, connectionId: connectionId });
        Telemetry.instance().publishEvent(Feature.EmptyProcessTemplate);
    }

    private _onDeleteTemplate = (templateId: string) => {
        this._templateActionsCreator.deleteTemplate(BuildTemplatesSource.instance(), true, templateId).then(() => {
            Telemetry.instance().publishEvent(Feature.DeleteBuildTemplate);
        });
    }

    private _publishBuildTemplateTelemetry(feature: string, template: ITemplateDefinition) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.TemplateId] = template.id;
        eventProperties[Properties.TemplateName] = template.name;
        eventProperties[Properties.GroupId] = template.groupId;
        if (this._templatesStore) {
            eventProperties[Properties.FilterText] = this._templatesStore.getFilterText();
        }

        Telemetry.instance().publishEvent(feature, eventProperties);
    }
}

export class GettingStartedView extends BaseControl implements INavigationView {
    private _sourceSelectionStore: SourcesSelectionStore;
    constructor(options?: any) {
        super(options);
    }

    public initialize(): void {
        this._createView();
        this._sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        Events_Document.getRunningDocumentsTable().add("BuildDefinitionEditor", this);
    }

    public dispose() {
        if (this.getElement()) {
            ReactDOM.unmountComponentAtNode(this.getElement()[0]);
        }

        super.dispose();
        if (!this._options || !this._options.isPartOfFlow) {
            StoreManager.dispose();
            ActionCreatorManager.dispose();
            ActionsHubManager.dispose();
        }
    }

    public isDirty(): boolean {
        return this._sourceSelectionStore.isDirty();
    }

    public canNavigateAway(action): boolean {
        if (action && action === ContributionConstants.ACTION_BUILD_DEFINITION_GETTING_STARTED && this._sourceSelectionStore.isDirty()) {
            return confirm(Resources.BuildDefinitionNavigateAwayWhenDirtyMessage);
        }
        else {
            return true;
        }
    }

    private _createView(): void {
        ReactDOM.render(React.createElement(GettingStartedControllerView, { isPartOfFlow: this._options ? this._options.isPartOfFlow : false }),
            this.getElement()[0]);
        let titleFormat = VssContext.getPageContext().webAccessConfiguration.isHosted ? VSS_Resources_Platform.PageTitleWithContent_Hosted : VSS_Resources_Platform.PageTitleWithContent;
        document.title = Utils_String.format(titleFormat, Resources.SelectBuildDefinitionTemplateText);
    }
}
