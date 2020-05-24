import * as React from "react";
import * as ReactDOM from "react-dom";

import { ProcessType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { DemandInstances, ErrorMessageParentKeyConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { QueueBuildActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/QueueBuildActionsCreator";
import { IQueueBuildState, QueueBuildStore, IOptions } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/QueueBuildStore";
import { FwLinks } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { BuildDefinitionSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionSource";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";

import { DemandsActions } from "DistributedTaskControls/Actions/DemandsActions";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { AppContext } from "DistributedTaskControls/Common/AppContext";
import { TaskListStoreInstanceId } from "DistributedTaskControls/Common/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { AgentQueueSelector } from "DistributedTaskControls/Components/AgentQueueSelector";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { TaskListDemandsView } from "DistributedTaskControls/ControllerViews/TaskListDemandsView";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { DemandsStore, IDemandsStoreArgs } from "DistributedTaskControls/Stores/DemandsStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskListStore, ITaskListStoreArgs } from "DistributedTaskControls/Stores/TaskListStore";
import { VariableList } from "DistributedTaskControls/Variables/Common/Types";
import { RuntimeVariablesControllerView } from "DistributedTaskControls/Variables/RuntimeVariables/ControllerView";
import { RuntimeVariablesStore, IRuntimeVariablesStoreArgs } from "DistributedTaskControls/Variables/RuntimeVariables/DataStore";

import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { DialogFooter } from "OfficeFabric/components/Dialog/DialogFooter";
import { Fabric } from "OfficeFabric/Fabric";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { Pivot, PivotItem, IPivotItemProps } from "OfficeFabric/Pivot";
import { css, IRenderFunction } from "OfficeFabric/Utilities";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import {
    BuildDefinition,
    BuildRepository,
    BuildDefinitionVariable,
    Build
} from "TFS/Build/Contracts";
import { TaskAgentQueue } from "TFS/DistributedTask/Contracts";

import * as Diag from "VSS/Diag";
import { registerLWPComponent, getLWPModule } from "VSS/LWP";
import * as StringUtils from "VSS/Utils/String";

import { VssIcon } from "VSSUI/Components/VssIcon/VssIcon";
import { VssIconType } from "VSSUI/Components/VssIcon/VssIcon.Props";

import { Dialog as VSSDialog, DialogOptions } from "VSSPreview/Flux/Components/Dialog";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/QueueBuildDialog";

const FPS = getLWPModule("VSS/Platform/FPS");

export enum QueueDialogSource {
    QueueButton = 0,
    SaveAndQueueButton
}

// Note: Tfs\Web\extensions\build\vss-build-web\buildsummary\content\View.tsx uses this and renders QueueBuildDialogLWPComponent
//       If some thing is required, make sure it's changed there as well
export interface IProps extends Base.IProps, IOptions {
    queueDialogSource: QueueDialogSource | string; // used for Telemetry purpose only
    processType: number;
    runTimeVariables?: VariableList;
    serializedDemands?: string[];
    addDefinitionDemands?: boolean;
    onClosed?: () => void;
    onBuildSaved?: (BuildDefinition: BuildDefinition) => void;
    onSuccess?: (link: string, buildNumber: string, build: Build) => void;
}

export interface IQueueBuildDialogOptions extends DialogOptions, IProps {
}

export class QueueBuildDialogLWPComponent extends React.Component<IProps, {}> {
    public static componentType = "ci-queue-build-dialog";

    public render() {
        QueueBuildDialog.open(this.props);
        return null;
    }
}

export class QueueBuildDialogContent extends Base.Component<IProps, IQueueBuildState> {
    private _store: QueueBuildStore;
    private _actionsCreator: QueueBuildActionsCreator;
    private _agentQueueSelector: AgentQueueSelector;
    private _messageHandlerActionsCreator: MessageHandlerActionsCreator;

    public componentWillMount() {
        this._store = StoreManager.GetStore<QueueBuildStore>(QueueBuildStore);
        this.setState(this._store.getState());
        this._actionsCreator = ActionCreatorManager.GetActionCreator<QueueBuildActionsCreator>(QueueBuildActionsCreator);
        this._messageHandlerActionsCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this._store.addChangedListener(this._handleStoreChange);
    }

    public componentDidMount() {
        if (this._agentQueueSelector) {
            this._agentQueueSelector.setFocus();
        }
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        let taskListStoreInstanceId = this._store.getTaskListStoreInstanceId() || TaskListStoreInstanceId;
        let enableSaveBeforeQueue = this._store.shouldSaveBeforeQueue() && !this.state.isSaveCompleted;
        let componentProvider: ScmComponentProvider = SourceProviderUtils.getComponentProvider(this.props.repository && this.props.repository.type);
        return (
            <Fabric>
                <div className="ci-queue-build-dialog-content">
                    {this._renderMessageBars()}
                    {
                        enableSaveBeforeQueue &&
                        <div className="save-section-container">
                            <StringInputComponent
                                label={Resources.SaveCommentLabel}
                                isMultilineExpandable={true}
                                rows={1}
                                value={this.state.saveComment}
                                onValueChanged={this._handleSaveCommentChange}
                            />
                            <div className={css("save-section-line", "section-line")}>
                                <hr />
                            </div>
                        </div>
                    }
                    <div className="agentqueue-repo-container">
                        {
                            this.props.processType !== ProcessType.Yaml && (
                                <AgentQueueSelector
                                    ref={(element) => { this._agentQueueSelector = element; }}
                                    label={Resources.AgentQueue}
                                    agentQueues={this._getAgentQueues()}
                                    onAgentQueueSelected={this._handleAgentChange}
                                    selectedAgentQueueId={this.state.agentQueue ? this.state.agentQueue.id : null}
                                    cssClass="runtime-agent-queue-selector" />
                            )
                        }
                        {
                            this.props.repository ?
                                (componentProvider.getQueueBuildEditor(this.props.repository,
                                    this.state.sourceBranch,
                                    this._handleBranchChange,
                                    this._handleSourceVersionChange))
                                :
                                <div />
                        }
                    </div>

                    <div className="variables-demands-container">
                        <Pivot>
                            <PivotItem onRenderItemLink={this._renderListPivotItem} linkText={DTCResources.VariablesText} ariaLabel={DTCResources.VariablesText}>
                                <div className="variables-container">
                                    <RuntimeVariablesControllerView />
                                </div>
                            </PivotItem>

                            <PivotItem onRenderItemLink={this._renderListPivotItem} linkText={DTCResources.DemandsTitle} ariaLabel={DTCResources.DemandsTitle}>
                                <div className="demands-container">
                                    <TaskListDemandsView instanceId={DemandInstances.RuntimeInstance}
                                        taskListStoreInstanceId={taskListStoreInstanceId}
                                        showHeader={false}
                                        nameMaxWidth={200}
                                        conditionMaxWidth={150}
                                        valueMaxWidth={200} />
                                </div>
                            </PivotItem>
                        </Pivot>
                    </div>

                    {this._renderDialogFooter(enableSaveBeforeQueue)}
                </div>
            </Fabric>
        );
    }

    private _renderListPivotItem = (item: IPivotItemProps, defaultRender: IRenderFunction<IPivotItemProps>): JSX.Element => {
        let iconName: string = "bowtie-status-error-outline";
        if (item.headerText === DTCResources.VariablesText && !this.state.errorInRuntimeVariables) {
            iconName = null;
        }
        if (item.headerText === DTCResources.DemandsTitle && !this.state.errorInDemands) {
            iconName = null;
        }
        return (<span>
            {!!iconName ? <VssIcon className="queue-build-error-pivot-icon" iconName={iconName} iconType={VssIconType.bowtie} /> : null}
            {item.headerText}
        </span>);
    }

    private _renderMessageBars(): JSX.Element {
        let successMessageBar: JSX.Element = null;
        if (this.state.successMessage) {
            successMessageBar = (
                <MessageBarComponent
                    className="queue-build-messagebar"
                    messageBarType={MessageBarType.success}
                    onDismiss={this._handleDismissSuccessMessage}>
                    {this.state.successMessage}
                </MessageBarComponent>);
        }

        let messageBar: JSX.Element = null;
        if (this.state.errorMessage || this.state.warningMessage || this.state.stickyWarningMessage) {
            let messageBarType = this.state.errorMessage ? MessageBarType.error : MessageBarType.warning;
            messageBar = (
                <MessageBarComponent
                    className="queue-build-messagebar"
                    messageBarType={messageBarType}>
                    {this.state.errorMessage + this.state.warningMessage + this.state.stickyWarningMessage}
                </MessageBarComponent>);
        }

        return (
            <div>
                {successMessageBar}
                {messageBar}
            </div>);
    }

    private _renderDialogFooter(enableSaveBeforeQueue: boolean): JSX.Element {
        let defaultButtonText = enableSaveBeforeQueue ? Resources.SaveAndQueueBuild : Resources.QueueButtonText;
        let isQueueBuildDisabled = false;

        if (this.state.isQueueDisabled) {
            isQueueBuildDisabled = true;
        }
        else if (this.state.isSaving) {
            defaultButtonText = Resources.SavingButtonText;
            isQueueBuildDisabled = true;
        }
        else if (this.state.isQueueing) {
            defaultButtonText = Resources.QueuingButtonText;
            isQueueBuildDisabled = true;
        }
        else if (this.state.ignoreWarnings) {
            defaultButtonText = Resources.QueueWithWarningsButtonText;
        }

        return (
            <div className="dialog-footer-container">
                <DialogFooter>

                    <PrimaryButton
                        className={css("fabric-style-overrides", "queue-dialog-action-button-override")}
                        onClick={this._handleQueueBuild}
                        disabled={isQueueBuildDisabled}
                        ariaLabel={defaultButtonText}
                        aria-disabled={isQueueBuildDisabled}>
                        {defaultButtonText}
                    </PrimaryButton>

                    <DefaultButton
                        className={css("fabric-style-overrides", "queue-dialog-action-button-override")}
                        onClick={this._handleClose}
                        ariaLabel={Resources.Cancel}>
                        {Resources.Cancel}
                    </DefaultButton>

                </DialogFooter>
            </div>);
    }

    private _handleBranchChange = (branch: string): void => {
        this._actionsCreator.updateSourceBranch(branch);
    }

    private _handleSourceVersionChange = (sourceVersion: string): void => {
        this._actionsCreator.updateSourceVersion(sourceVersion);
    }

    private _getAgentQueues(): TaskAgentQueue[] {
        return this._store.getTaskAgentQueues();
    }

    private _handleStoreChange = (): void => {
        let state = this._store.getState();
        if (!state.showDialog) {
            this._handleClose();
        }
        else {
            this.setState(this._store.getState());
        }
    }

    private _handleAgentChange = (selectedAgentQueueId: number) => {
        this._actionsCreator.updateTaskAgentQueue(selectedAgentQueueId);
    }

    private _handleSaveCommentChange = (saveComment: string) => {
        this._actionsCreator.updateSaveComment(saveComment);
    }

    private _handleClose = () => {
        if (this.props.onClosed) {
            this.props.onClosed();
        }
    }

    private _handleQueueBuild = () => {
        let parameters: string = this._store.getParameters();
        let demands: string[] = this._store.getSerializedDemands();
        let definitionId: number = this.state.definitionId;

        let enableSaveBeforeQueue = this._store.shouldSaveBeforeQueue() && !this.state.isSaveCompleted;
        let definition: BuildDefinition = this.state.definition;
        if (enableSaveBeforeQueue && definition) {
            definition.comment = this.state.saveComment;
        }

        this._actionsCreator.saveAndQueueBuild({
            definitionId: definitionId,
            enableSaveBeforeQueue: enableSaveBeforeQueue,
            definition: definition,
            cloneId: this._store.getCloneId(),
            cloneRevision: this._store.getCloneRevision(),
            onBuildSaved: this.props.onBuildSaved,
            agentQueueId: this.state.agentQueue.id,
            projectId: this.state.agentQueue.projectId,
            ignoreWarnings: this.state.ignoreWarnings,
            sourceBranch: this.state.sourceBranch,
            sourceVersion: this.state.sourceVersion || StringUtils.empty,
            parameters: parameters,
            demands: demands,
            onSuccess: this._openQueuedBuild
        }).then(() => {
            this._publishQueueBuildTelemetry(definitionId, parameters, demands, this.props.queueDialogSource);
        });
    }

    private _handleDismissSuccessMessage = () => {
        this._actionsCreator.dismissSuccessMessage();
    }

    private _openQueuedBuild = (webLink: string, buildNumber: string, build: Build) => {
        if (this.props.onSuccess) {
            this.props.onSuccess(webLink, buildNumber, build);
        }
        else {
            this._messageHandlerActionsCreator.addMessage(ErrorMessageParentKeyConstants.Main, this._getBuildQueuedMessageBarContent(webLink, buildNumber), MessageBarType.success);
        }

        this._handleClose();
    }

    private _getBuildQueuedMessageBarContent = (webLink: string, buildNumber: string): JSX.Element => {
        const lwpContext = AppContext.instance().PageContext;
        const link = this._getTfsHostUrl() + webLink;
        return (<span>
            {Resources.BuildQueuedTextPrefix}
            <SafeLink
                href={link}
                className="ci-queued-build-link"
                {...lwpContext ? {
                    onClick: (event) => {
                        FPS.onClickFPS(lwpContext, link, true, event);
                    }
                } : {}}>
                {"#" + buildNumber}
            </SafeLink>
            {Resources.BuildQueuedTextSuffix}
        </span>);
    }

    private _getTfsHostUrl(): string {
        let tfsContext = TfsContext.getDefault();
        return tfsContext.getHostUrl();
    }

    private _publishQueueBuildTelemetry(definitionId: number, parameters: string, demands: string[], source: QueueDialogSource | string) {
        let eventProperties: IDictionaryStringTo<any> = {};
        let variableCount = this._getVariableParameterCount(parameters);
        eventProperties[Properties.VariablesCount] = variableCount;
        eventProperties[Properties.CustomDemandsCount] = demands.length;
        eventProperties[Properties.BuildDefinitionId] = definitionId;
        Telemetry.instance().publishEvent(Feature.QueueBuild, eventProperties, source.toString());
    }

    private _getVariableParameterCount(parameters: string) {
        let count: number = 0;
        if (parameters) {
            try {
                let parsedVariableObject = JSON.parse(parameters);
                if (parsedVariableObject) {
                    let keys = Object.keys(parsedVariableObject);
                    if (keys) {
                        count = keys.length;
                    }
                }
            }
            catch (ex) {
                Diag.logError("[QueueBuildDialog._getVariableParameterLength]: Json parsing Error " + ex);
            }
        }

        return count;
    }
}

export class QueueBuildDialog extends VSSDialog<IQueueBuildDialogOptions> {

    private static _dialogOpen: boolean = false;

    public static open(props: IProps): void {
        if (QueueBuildDialog._dialogOpen) {
            return;
        }

        QueueBuildDialog._dialogOpen = true;

        const additionalDemandsPromise = props.addDefinitionDemands ?
            BuildDefinitionSource.instance().get(props.definitionId).then((fullDefinition: BuildDefinition) => {
                return fullDefinition.demands || [];
            })
            : Promise.resolve([]);

        additionalDemandsPromise.then((additionalDemands) => {
            StoreManager.CreateStore<RuntimeVariablesStore, IRuntimeVariablesStoreArgs>(
                RuntimeVariablesStore,
                StringUtils.empty,
                {
                    variables: props.runTimeVariables || []
                });

            StoreManager.CreateStore<DemandsStore, IDemandsStoreArgs>(
                DemandsStore,
                DemandInstances.RuntimeInstance,
                {
                    demands: []
                });

            const allDemands = (props.serializedDemands || []).concat(additionalDemands);
            StoreManager.CreateStore<QueueBuildStore, IOptions>(QueueBuildStore, StringUtils.empty, props);
            let actionsHub = ActionsHubManager.GetActionsHub<DemandsActions>(DemandsActions, DemandInstances.RuntimeInstance);
            actionsHub.createDemands.invoke({ demands: DtcUtils.convertSerializedDemandToDemandData(allDemands) });

            const title = StringUtils.localeFormat(
                props.enableSaveBeforeQueue ? Resources.SaveAndQueueBuildDialogTitle : Resources.QueueBuildDialogTitle,
                props.definitionName);

            VSSDialog.show(QueueBuildDialog,
                JQueryWrapper.extend({
                    title: title,
                    close: () => {
                        QueueBuildDialog.close();
                    },
                    buttons: null,
                    useBowtieStyle: false,
                    bowtieVersion: 0,
                    minWidth: "700",
                    resizable: false,
                    defaultButton: StringUtils.empty
                }, props)
            );
        });
    }

    public static close() {
        StoreManager.DeleteStore<QueueBuildStore>(QueueBuildStore);
        StoreManager.DeleteStore<RuntimeVariablesStore>(RuntimeVariablesStore);
        StoreManager.DeleteStore<DemandsStore>(DemandsStore, DemandInstances.RuntimeInstance);
        QueueBuildDialog._dialogOpen = false;
    }

    public render(): JSX.Element {
        return <QueueBuildDialogContent onClosed={this._handleClose} {...this._options} />;
    }

    private _handleClose = (): void => {
        super.close();
    }
}

export function getRuntimeVariables(variables: IDictionaryStringTo<BuildDefinitionVariable>): VariableList {
    let runtimeVariables: VariableList = [];
    for (let variableName in variables) {
        if (variables.hasOwnProperty(variableName)) {
            let variable = variables[variableName];
            if (variable.allowOverride) {
                runtimeVariables.push({
                    name: variableName,
                    variable: {
                        value: variable.value,
                        isSecret: variable.isSecret,
                        allowOverride: true
                    }
                });
            }
        }
    }

    return runtimeVariables;
}

registerLWPComponent(QueueBuildDialogLWPComponent.componentType, QueueBuildDialogLWPComponent);