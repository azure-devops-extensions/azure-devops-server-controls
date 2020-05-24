/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DefaultBreadcrumbDisplayedItems } from "DistributedTaskControls/Common/Common";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { AggregatorStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { Title } from "DistributedTaskControls/SharedControls/TitleBar/TitleBar";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Component as ErrorMessageBar } from "DistributedTaskControls/Components/InformationBar";
import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";
import { SaveStatusStore } from "DistributedTaskControls/Stores/SaveStatusStore";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { PermissionIndicatorSource } from "DistributedTaskControls/Common/Telemetry";
import { MessageHandlerStore } from "DistributedTaskControls/Stores/MessageHandlerStore";
import { FolderBreadcrumb } from "DistributedTaskControls/Components/FolderBreadcrumb";

import { Fabric } from "OfficeFabric/Fabric";

import { AllDefinitionsContentKeys, DefinitionsHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ErrorMessageParentKeyConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import { DefinitionActionsCreator } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActionsCreator";
import { DefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionStore";
import { DefinitionTabsContainer } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionTabsContainer";
import { DefinitionUtils } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionUtils";
import { Toolbar } from "PipelineWorkflow/Scripts/Editor/ToolBar/ToolBarControllerView";
import { PermissionIndicator } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionIndicator";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ISecurityProps } from "PipelineWorkflow/Scripts/SharedComponents/Security/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { TaskTabActionsCreator } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/TaskTab/TaskTabActionsCreator";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import { ReleaseManagementSecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import * as Utils_String from "VSS/Utils/String";
import { delay } from "VSS/Utils/Core";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/DeployWorkflowContainerView";


export interface IDeployWorkflowViewProps extends Base.IProps {

    path?: string;

    definitionId?: number;

    environmentId?: number;

    action?: string;
}

export interface IDeployWorkflowViewState extends IDeployWorkflowViewProps {

    overridePermissionIndicator?: boolean;

    bodyPositionTop?: number;
}

/**
 * brief Deploy pipeline definition editor view
 */
export class DeployWorkflowView extends Base.Component<IDeployWorkflowViewProps, IDeployWorkflowViewState> {

    constructor(props: IDeployWorkflowViewProps) {
        super(props);
        this._saveStatusStore = StoreManager.GetStore<SaveStatusStore>(SaveStatusStore);
        this._messageHandlerStore = StoreManager.GetStore<MessageHandlerStore>(MessageHandlerStore);
        this.state = {
            overridePermissionIndicator: false,
            bodyPositionTop: DeployWorkflowView.c_bodyPositionTopDefaultValue
        };
    }

    public componentWillMount() {
        this.setState(this.props as IDeployWorkflowViewState);
        this._saveStatusStore.addChangedListener(this._handleSaveStatusChange);
        this._messageHandlerStore.addChangedListener(this._handleMessageHandlerStoreChange);
    }

    public componentWillUnmount() {
        this._saveStatusStore.removeChangedListener(this._handleSaveStatusChange);
        this._messageHandlerStore.removeChangedListener(this._handleMessageHandlerStoreChange);
    }

    /**
     * @brief Renders the view
     */
    public render(): JSX.Element {

        // Workaround-ed folder breadcrumb until the spec is ready
        return (
            <Fabric>
                <div className="definition" role="region" aria-label={Resources.ARIALabelReleaseDefinitionEditorMainView}>
                    <div className="main">

                        <div className="head">
                            <FolderBreadcrumb
                                cssClass={"breadcrumb-fabric-style-overrides"}
                                containerClassName={"cd-title-bar-breadcrumb-container"}
                                folderPath={AllDefinitionsContentKeys.PathSeparator}
                                getBreadcrumbLink={this._getDefaultBreadcrumbUrlForFolder}
                                maxDisplayedItems={DefaultBreadcrumbDisplayedItems}
                                rootFolderName={Resources.AllDefinitionsText} />
                            <Title
                                store={StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore)}
                                editable={true}
                                ariaLabel={Resources.ReleaseDefinitionName}
                                iconName={"bowtie-deploy"}
                                onChanged={this._onReleaseDefinitionNameChanged}
                                nameInvalidMessage={this._getInvalidNameMessage}
                                displayBreadcrumb={false}
                                getBreadcrumbLink={this._getDefaultBreadcrumbUrlForFolder}
                                maxBreadcrumbDisplayedItems={DefaultBreadcrumbDisplayedItems}
                                rootFolderName={Resources.AllDefinitionsText}
                                breadCrumbOverrideClass={"breadcrumb-fabric-style-overrides"}
                            />
                            <Toolbar definitionStore={StoreManager.GetStore<DefinitionStore>(DefinitionStore)} />
                        </div>

                        <div className="cd-error-message-bar-container" ref={this._resolveRef("_errorMessageContainerParent")}>
                            <ErrorMessageBar cssClass="cd-error-message-bar" parentKey={ErrorMessageParentKeyConstants.MainParentKey} onMessageBarDisplayToggle={this._onMessageBarDisplayToggle} />
                        </div>

                        <div className="body"
                            role="region"
                            aria-label={Resources.ARIALabelEditorTabs}
                            style={{
                                top: this.state.bodyPositionTop
                            }}>

                            <PermissionIndicator
                                securityProps={PermissionHelper.createEditReleaseDefinitionSecurityProps(this.state.path, this.state.definitionId)}
                                cssClass="cd-definition-permission-indicator"
                                message={Resources.EditDefinitionPermissionMessage}
                                telemetrySource={PermissionIndicatorSource.releaseDefinition}
                                overridePermissionMessage={this._shouldOverrideDefinitionPermissionMessage()}>

                                <DefinitionTabsContainer {...this.state} onTabChange={this._onTabChange} />

                            </PermissionIndicator>
                        </div>
                    </div>
                </div>
            </Fabric>);
    }

    public update(action: string, definitionId: number, environmentId?: number): void {
        let taskTabActionsCreator = ActionCreatorManager.GetActionCreator<TaskTabActionsCreator>(TaskTabActionsCreator);
        taskTabActionsCreator.selectEnvironment(environmentId);

        this.setState({
            action: action,
            definitionId: definitionId,
            environmentId: environmentId
        });
    }

    private _shouldOverrideDefinitionPermissionMessage(): boolean {
        return this.state.overridePermissionIndicator;
    }

    private _onTabChange = (action: string) => {
        this.setState({
            action: action
        });
    }

    private _getDefaultBreadcrumbUrlForFolder(path: string) {
        // TODO: Handle it properly with Folder path once that feature is enabled
        // for now lets return all release definition path
        if (!FeatureFlagUtils.isNewReleasesHubEnabled()) {
            return DtcUtils.getUrlForExtension(
                PipelineTypes.PipelineExtensionAreas.ReleaseExplorer,
                PipelineTypes.PipelineDefinitionDesignerActions.viewReleasesAction
            );
        }
        else {
            return DtcUtils.getUrlForExtension(
                PipelineTypes.PipelineExtensionAreas.ReleaseExplorer2,
                null,
                { view: DefinitionsHubKeys.AllDefinitionsPivotItemKey },
                true
            );
        }
    }

    private _getInvalidNameMessage = (name: string) => {
        if (!name) {
            return DTCResources.EditDefinitionNameInvalidTitle;
        }
        else {
            return Utils_String.empty;
        }
    }

    private _handleMessageHandlerStoreChange = () => {
        let overridePermissionIndicator = false;

        // If there is an error message, override permission indicator.
        if (this._messageHandlerStore.getMessage(ErrorMessageParentKeyConstants.MainParentKey)) {
            overridePermissionIndicator = true;
        }

        this.setState({ overridePermissionIndicator: overridePermissionIndicator } as IDeployWorkflowViewState);
    }

    private _handleSaveStatusChange = () => {
        // This is done intentionally to ensure that the current view is refreshed only once when the save completes instead
        // of update from each store refreshing the same view again and again. The problem is severe in RM due to deep hierarchical stores.
        if (this._saveStatusStore.hasSaveCompleted()) {
            let action = NavigationStateUtils.getAction();
            let definitionId = NavigationStateUtils.getDefinitionId();
            let environmentId = NavigationStateUtils.getEnvironmentId();

            this.setState({
                action: action,
                definitionId: definitionId,
                environmentId: environmentId
            });
        }
    }

    private _onReleaseDefinitionNameChanged = (name: string) => {
        ActionCreatorManager.GetActionCreator<DefinitionActionsCreator>(DefinitionActionsCreator)
            .changeDefinitionName(name);
    }

    private _onMessageBarDisplayToggle = (isVisible: boolean): void => {
        delay(this, 0, () => {
            if (isVisible && this._errorMessageContainerParent) {
                this.setState({ bodyPositionTop: DeployWorkflowView.c_bodyPositionTopDefaultValue + this._errorMessageContainerParent.clientHeight });
            }
            else {
                this.setState({ bodyPositionTop: DeployWorkflowView.c_bodyPositionTopDefaultValue });
            }
        });
    }

    private _saveStatusStore: SaveStatusStore;
    private _messageHandlerStore: MessageHandlerStore;
    private _errorMessageContainerParent: HTMLElement;
    private static readonly c_bodyPositionTopDefaultValue = 48;
}