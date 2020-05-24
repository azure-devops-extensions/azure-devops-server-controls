import * as React from "react";
import * as Service from "VSS/Service";
import { TemplatedComboBox, ITemplatedComboBoxProps } from "Widgets/Scripts/TemplatedComboBox";
import { BuildDefinitionStateAdapter } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/BuildDefinitionStateAdapter";
import { TestVisualConfigActionCreator } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualConfigActionCreator";
import { ConfigState } from "VSSPreview/Config/Framework/ConfigState";
import { ConfigStore } from "VSSPreview/Config/Framework/ConfigStore";
import { ConfigActionCreator } from "VSSPreview/Config/Framework/ConfigActionCreator";
import { ConfigActions } from "VSSPreview/Config/Framework/ConfigActions";
import { BuildDefinition } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition";
import { IComboBoxOption } from "OfficeFabric/ComboBox";
import { TestVisualWidgetSettings, TestVisualWidgetSettingsSerializer } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetSettings";
import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualConfigViewComponent";

export interface IConfigViewProps<SettingsT> {
    settings: SettingsT;
    onChanged: (settings: SettingsT) => void;
    onError: (message: string) => void;
}

/**
 * Describes interface for a config-view centered on TestVisualWidgetSetttings
 */
export interface ITestVisualConfigViewProps extends IConfigViewProps<TestVisualWidgetSettings> { }


export class TestVisualConfigViewComponent extends React.Component<ITestVisualConfigViewProps, ConfigState> {
    private configStore: ConfigStore;
    private actionCreator: TestVisualConfigActionCreator;

    constructor(props: any) {
        super(props);

        const widgetConfigActions = new ConfigActions();
        this.configStore = new ConfigStore(widgetConfigActions);
        const widgetConfigActionCreator = new ConfigActionCreator(widgetConfigActions, this.props.onError);
        this.actionCreator = new TestVisualConfigActionCreator(widgetConfigActionCreator);
        this.state = this.configStore.getState();
        this.onStoreChanged = this.onStoreChanged.bind(this);
    }

    private onStoreChanged() {
        this.setState(this.configStore.getState());
        this.orchestrateLoad();
    }

    public componentDidMount() {
        this.configStore.addChangedListener(this.onStoreChanged);
        this.orchestrateLoad();
    }

    public componentWillUnmount(): void {
        this.configStore.removeChangedListener(this.onStoreChanged);
        super.componentWillUnmount();
    }

    public render() {
        const items = BuildDefinitionStateAdapter.getBuilds(this.state);
        const selectedItem = items != null && items.find((item) => {
            return item.BuildDefinitionId === this.props.settings.definitionId;
        });

        const buildDefinitionComboProps: ITemplatedComboBoxProps<BuildDefinition> = {
            className: "build-definition-picker",
            itemsLoaded: BuildDefinitionStateAdapter.isBuildsLoaded(this.state),
            items: BuildDefinitionStateAdapter.getBuilds(this.state),
            selectedItem: selectedItem,

            /**
             * Describes the items being passed in. 
             */
            itemToComboBoxOption: (item: BuildDefinition) => { return { key: item.BuildDefinitionId, text: item.Name } as IComboBoxOption; },
            onChanged: (buildDefinitionId: string) => {
                const settings: TestVisualWidgetSettings = {
                    contextType: this.props.settings.contextType,
                    definitionId: parseInt(buildDefinitionId)
                };
                this.props.onChanged(settings);
            },
            label: Resources_Widgets.BuildChartConfiguration_Label,
            ariaLabel: Resources_Widgets.BuildChartConfiguration_Label
        };
        return (
            <div className="test-visual-config-view-component">
                <TemplatedComboBox {...buildDefinitionComboProps} />
            </div>
        );
    }

    /**
     * Orchestrates loads for new context.
     */
    private orchestrateLoad() {
        if (!this.state.errorMessage) {
            if (!BuildDefinitionStateAdapter.isBuildsLoaded(this.state)) {
                this.actionCreator.demandBuilds();
            }
        }
    }
}


