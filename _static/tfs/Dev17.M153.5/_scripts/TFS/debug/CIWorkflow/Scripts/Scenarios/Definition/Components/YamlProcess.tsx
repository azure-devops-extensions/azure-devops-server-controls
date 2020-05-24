/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { BuildDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { YamlDefinitionStore, IYamlDefinitionStoreState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlDefinitionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { MessagePanel, MessagePanelType } from "DistributedTaskControls/Components/MessagePanel";
import * as DistributedTaskResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IFilePathInputComponentProps, FilePathInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/FilePathInputComponent";

import { CommandButton } from "OfficeFabric/Button";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";

import { empty } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/YamlProcessItemOverview";

export interface IYamlProcessProps extends Base.IProps {
    isReadOnly?: boolean;
    onYamlContentChange?: () => void;
}

export class YamlProcess extends Base.Component<IYamlProcessProps, IYamlDefinitionStoreState> {
    private _actionCreator: BuildDefinitionActionsCreator;
    private _yamlDefinitionStore: YamlDefinitionStore;
    private _sourcesSelectionStore: SourcesSelectionStore;

    constructor(props: IYamlProcessProps) {
        super(props);
        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._yamlDefinitionStore = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);
        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);

        this.state = this._yamlDefinitionStore.getState();
    }

    public render(): JSX.Element {
        const yamlMessageTitle = this.state.warnings ? Resources.YamlErrorsTitle : "";
        const yamlMessages: string[] = this.state.warnings ? this.state.warnings : [ Resources.YamlNoErrorsMessage ];
        const yamlStatus = this.state.warnings ? MessagePanelType.Warning : MessagePanelType.Info;

        return <div className="build-yaml-process">
                    <FilePathInputComponent
                        required={true}
                        disabled={!!this.props.isReadOnly}
                        getErrorMessage={this._getErrorMessage}
                        value={this.state.yamlPath}
                        onValueChanged={this._onYamlPathChanged}
                        isFileSystemBrowsable={this._sourcesSelectionStore.isFileSystemBrowsable.bind(this._sourcesSelectionStore)}
                        filePathProviderDelegate={this._sourcesSelectionStore.showPathDialog.bind(this._sourcesSelectionStore)}
                        label={Resources.YamlPathLabel}
                        infoProps={{
                            calloutContentProps: {
                                calloutMarkdown: Resources.YamlPathCallOutMarkdown
                            }
                        }}
                    />
                    {   this._yamlDefinitionStore.getState().isYamlEditorEnabled && this.state.yamlPath && 
                            <div className="yaml-simplified-editor-container">
                                <MessagePanel
                                    className="build-yaml-file-warnings"
                                    type={yamlStatus}
                                    messages={yamlMessages}
                                    headerText={yamlMessageTitle}
                                />
                                <div className="yaml-process-buttons-container">
                                    <CommandButton
                                        className={css("remove-linkSettings-button", "fabric-style-overrides")}
                                        ariaLabel={Resources.Process_MenuViewAsYaml}
                                        iconProps={{ iconName: "Refresh" }}
                                        disabled={!!this.props.isReadOnly}
                                        ariaDescription={Resources.ViewAsYamlDescription}
                                        onClick={this._onRefreshClicked} >
                                        { Resources.RefreshYamlFileButtonText }
                                    </CommandButton>
                                    |{
                                        (this.state.yamlFileEditLink &&
                                            <Link
                                                className="yaml-file-edit-link"
                                                href={ this.state.yamlFileEditLink}
                                                target='_blank'>
                                            { Resources.EditYamlFileButtonText }
                                        </Link>)
                                    }
                                </div>
                                <div className="build-yaml-file-content">{this.state.yamlFileContent}</div>
                            </div>
                    }
                </div>;
    }

    private _onRefreshClicked = () => {
        const buildDefinitionStore = StoreManager.GetStore<BuildDefinitionStore>(BuildDefinitionStore);
        this._yamlDefinitionStore.updateYamlFileContent(null, null, buildDefinitionStore.getBuildDefinition());
        if (this.props.onYamlContentChange)
        {
            this.props.onYamlContentChange();
        }
    }

    public componentDidMount() {
        this._yamlDefinitionStore.addChangedListener(this._onChange);
        this._sourcesSelectionStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._yamlDefinitionStore.removeChangedListener(this._onChange);
        this._sourcesSelectionStore.removeChangedListener(this._onChange);
    }

    private _onChange = () => {
        this.setState(this._yamlDefinitionStore.getState());
    }

    private _getErrorMessage = (value: string) => {
        if (!value || value.trim() === empty) {
            return DistributedTaskResources.RequiredInputInValidMessage;
        }
    }

    private _onYamlPathChanged = (newValue: string) => {
        this._actionCreator.changeYamlPath(newValue);
        if (this.props.onYamlContentChange)
        {
            this.props.onYamlContentChange();
        }
    }
}