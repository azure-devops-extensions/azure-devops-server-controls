/// <reference types="react" />

import * as React from "react";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { YamlDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/YamlDefinitionActionsCreator";
import { BuildDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import { IState as SourcesSelectionStoreState, SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { TaskListStoreInstanceId } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { Component as AdvancedSettingsHeader } from "DistributedTaskControls/Components/AdvancedSettingsHeader";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";

import { DefaultButton, CompoundButton } from "OfficeFabric/Button";
import { IChoiceGroupOption } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup.types";
import { IconType } from "OfficeFabric/components/Icon/Icon.types";
import { Link } from "OfficeFabric/Link";
import { MessageBar } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ProjectVisibility } from "TFS/Core/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GetSourcesControllerView";

export interface ISourceTabItemProps extends Base.IProps {
    key: string;
    id: string;
    showAdvancedSettings: boolean;
    isReadOnly: boolean;
}

export interface IGetSourcesControllerViewProps extends Base.IProps {
    showAdvancedSettings?: boolean;
    onContinueClicked?: (yamlFilename?: string) => void;
    sourcesPanelLabel?: string;
}

export interface IGetSourcesControllerViewState {
    sourcesSelectionStoreState: SourcesSelectionStoreState;
    isReadOnly: boolean;
}

export class GetSourcesControllerView extends Base.Component<IGetSourcesControllerViewProps, IGetSourcesControllerViewState> {
    private iconSize: number = 30;
    private _store: SourcesSelectionStore;
    private _processManagementStore: ProcessManagementStore;
    private _sourceProvidersStore: SourceProvidersStore;
    private _coreDefinitionStore: CoreDefinitionStore;
    private _actionCreator: SourcesSelectionActionsCreator;
    private _yamlDefinitionActionsCreator: YamlDefinitionActionsCreator;

    constructor(props: Base.IProps) {
        super(props);
        this._yamlDefinitionActionsCreator = ActionCreatorManager.GetActionCreator<YamlDefinitionActionsCreator>(YamlDefinitionActionsCreator);
        this._actionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._store = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);

        this._processManagementStore = StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, TaskListStoreInstanceId);
        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);

        this.state = this._getState();
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
        this._sourceProvidersStore.addChangedListener(this._onChange);

        // The control should try to discover Yaml definitions if the "Continue" button is shown,
        // i.e. the control is in the "getting started" flow.
        const shouldDiscoverYamlDefinitions = !!this.props.onContinueClicked;
        if (shouldDiscoverYamlDefinitions) {
            this._yamlDefinitionActionsCreator.setListUnusedYamlFilesEnabled(true);
        }
    }

    public componentWillUnmount() {
        this._sourceProvidersStore.removeChangedListener(this._onChange);
        this._store.removeChangedListener(this._onChange);
        this._yamlDefinitionActionsCreator.setListUnusedYamlFilesEnabled(false);
    }

    public render(): JSX.Element {
        return (
            <div className="source-selection constrained-width">
                <div className="source-selection-tab-panel">
                    <div id="source-selection-tab-title" className="source-selection-tab-title">{this.props.sourcesPanelLabel}</div>
                    <RadioInputComponent
                        ariaLabelledBy="source-selection-tab-title"
                        noCustomFabricOverrides={true}
                        options={this._getSourceTabOptions()}
                        onValueChanged={(newOption: IChoiceGroupOption) => { this._onSourceOptionChange(newOption); }}
                        disabled={!!this.state.isReadOnly}
                    />

                    <div className="source-selection-tab-content">
                        <div className="source-selection-details">
                            {
                                Utils_Array.first(this._getTabItems(), (child: React.ReactElement<ISourceTabItemProps>) => {
                                    return child.key === this.state.sourcesSelectionStoreState.selectedTabItemKey;
                                })
                            }
                            {
                                this.props.onContinueClicked && this._getContinueElements()
                            }
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    private _onChange = () => {
        this.setState(this._getState());
    }

    private _showProvider(provider: SourceProvider): boolean {
        if (!provider.isYamlSupported() && this.state.sourcesSelectionStoreState.isYaml) {
            // We are editing a Yaml definition, so don't had providers that don't support yaml
            return false;
        }

        // We are using a public repository while the source provider does not support public repositories
        if (this._isProviderDisabled(provider))
        {
            // If the current build does not use this source provider then no need to show it
            if (this._store.getSelectedSourceProvider() !== provider)
            {
                return false;
            }

            else
            {
                // else if the current build uses this provider and it is already saved then show it (it will be disabled)
                const buildDefinitionStore = StoreManager.GetStore<BuildDefinitionStore>(BuildDefinitionStore);
                const buildDefinition = buildDefinitionStore.getBuildDefinition();
                if (!buildDefinition || !buildDefinition.id)
                {
                    return false;
                }
            }
        }

        return true;
    }

    private _getSourceTabOptions(): IChoiceGroupOption[] {
        const sourceTabOptions: IChoiceGroupOption[] = [];
        // Build the list of tabs options from the list of source providers
        const sourceProviders: SourceProvider[] = this._sourceProvidersStore.getProviders() || [];
        for (let i = 0; i < sourceProviders.length; i++) {
            const provider: SourceProvider = sourceProviders[i];
            if (provider.getTabOrder() > 0 && this._showProvider(provider)) {
                const key: string = provider.getRepositoryType();
                const iconClass: string = css("bowtie-icon", provider.getIconClass(true), "source-selection-icon");
                sourceTabOptions.push(this._getSourceTabOption(provider, key, provider.getTitle(), iconClass));
            }
        }

        return sourceTabOptions;
    }

    private _areThereAnyGitProjects(): boolean {
        const projects = DefaultRepositorySource.instance().getProjectInfos();
        const gitProjects = projects ? projects.filter(p => p.supportsGit) : [];
        if (gitProjects && gitProjects.length > 0)
        {
            return true;
        }

        return false;
    }

    private _getTabItems(): JSX.Element[] {
        const tabItems: JSX.Element[] = [];
        // Build the list of tabs from the list of source providers
        const sourceProviders: SourceProvider[] = this._sourceProvidersStore.getProviders() || [];
        for (let i = 0; i < sourceProviders.length; i++) {
            const provider: SourceProvider = sourceProviders[i];
            if (provider.getTabOrder() > 0 && this._showProvider(provider)) {
                // We have to use the TfSources key for the first item to make sure it is selected
                const key: string = provider.getRepositoryType();
                tabItems.push(provider.getComponentProvider().getTabItem(key, this.props.showAdvancedSettings, this.state.isReadOnly));
            }
        }
        return tabItems;
    }

    private _onSourceOptionChange = (option?: IChoiceGroupOption) => {
        this._actionCreator.selectSourceTab({
            selectedTabItemKey: option.key,
            selectedStoreKey: option.key
        });
    }

    private _getSourceTabOption(provider: SourceProvider, key: string, title: string, iconClassName: string): IChoiceGroupOption {
        const imageSize: number = 64;
        return {
            key: key,
            text: title,
            iconProps: { iconType: IconType.image, imageProps: { className: iconClassName, width: this.iconSize, height: this.iconSize, alt: Utils_String.empty } },
            checked: key === this.state.sourcesSelectionStoreState.selectedTabItemKey,
            disabled: this._isProviderDisabled(provider),
            imageSize: { width: imageSize }
        } as IChoiceGroupOption;
    }

    private _isProviderDisabled(provider: SourceProvider): boolean {
        return !provider.usableInPublicProjects() && DefaultRepositorySource.instance().getProjectVisibility(TfsContext.getDefault().contextData.project.id) === ProjectVisibility.Public
    }

    protected getClassName(): string {
        return "ci-sources-tabs";
    }

    private _getState(): IGetSourcesControllerViewState {
        return {
            sourcesSelectionStoreState: this._store.getState(),
            isReadOnly: !this._processManagementStore.canEditProcess()
        };
    }

    private _getContinueElements(): JSX.Element {

        if (this.state.sourcesSelectionStoreState.discoveredYamlFilename && !this.state.sourcesSelectionStoreState.isDiscoveringYaml) {
            return (
                <div>
                    <div className="ci-getting-started-continue-button-container">
                        <CompoundButton
                            className="ci-getting-started-continue-button"
                            onClick={() => this.props.onContinueClicked(this.state.sourcesSelectionStoreState.discoveredYamlFilename)}
                            disabled={!this._store.isValid()}
                            description={this.state.sourcesSelectionStoreState.discoveredYamlFilename}>
                            {Resources.YamlDiscoveryUseConfigAsCode}
                        </CompoundButton>
                    </div>
                    <div>
                        <Link onClick={() => this.props.onContinueClicked()}>{Resources.YamlDiscoveryUseDesigner}</Link>
                    </div>
                </div>
            );
        }
        else {
            const text = this.state.sourcesSelectionStoreState.isDiscoveringYaml ? Resources.YamlDiscoveryScanning : Resources.ContinueButtonText;

            return (
                <div>
                    <div className="ci-getting-started-continue-button-container">
                        <DefaultButton
                            className="ci-getting-started-continue-button"
                            onClick={() => this.props.onContinueClicked()}
                            disabled={!this._store.isValid()}
                            text={text}
                        />
                    </div>
                </div>
            );
        }
    }

    private _getBuildFromText(): any {
        return { __html: Utils_String.format(Resources.YamlDiscoveryUseConfigAsCode, this.state.sourcesSelectionStoreState.discoveredYamlFilename) };
    }

    private _onContinueClicked = () => {
        // - If a file was discovered, this is invoked to create a definition from that file
        // - If a file was not discovered, this is invoked to go the template, and the filename will be empty
        this.props.onContinueClicked(this.state.sourcesSelectionStoreState.discoveredYamlFilename);
    }
}
