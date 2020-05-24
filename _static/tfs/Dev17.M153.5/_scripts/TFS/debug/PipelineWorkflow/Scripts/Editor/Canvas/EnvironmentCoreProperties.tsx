/// <reference types="react" />
import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { Telemetry, Feature } from "DistributedTaskControls/Common/Telemetry";
import { OverlayPanelStore } from "DistributedTaskControls/Stores/OverlayPanelStore";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { IEnvironmentCorePropertiesViewState, EnvironmentCorePropertiesViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentCorePropertiesViewStore";
import { EnvironmentCorePropertiesItem } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentCorePropertiesItem";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { EditorActions } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { EnvironmentTemplateSelectorControllerView } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTemplateSelectorControllerView";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { EnvironmentActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentActionsCreator";
import { EnvironmentListActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListActionsCreator";
import { DeleteEnvironmentPermissionDialog } from "PipelineWorkflow/Scripts/SharedComponents/Security/DeleteEnvironmentPermissionDialog";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { MoveDirection } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentNodeMover";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as NavigationService from "VSS/Navigation/Services";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { css } from "OfficeFabric/Utilities";
import { TooltipDelay, TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentCoreProperties";

export interface IEnvironmentCorePropertiesProps extends Base.IProps {
    onAddEnvironmentComplete?: () => void;
    onEnvironmentSelectorClosed?: () => void;
    releaseDefinitionFolderPath?: string;
    releaseDefinitionId?: number;
    width?: number;
    onMoveEnvironment?: (instanceId: string, moveDirection: MoveDirection, onMoveComplete: () => void) => void;
    isMoveEnvironmentEnabled?: (instanceId: string, moveDirection: MoveDirection) => boolean;
}

export class EnvironmentCoreProperties extends Base.Component<IEnvironmentCorePropertiesProps, IEnvironmentCorePropertiesViewState> {

    public componentWillMount(): void {
        this._store = StoreManager.GetStore<EnvironmentCorePropertiesViewStore>(EnvironmentCorePropertiesViewStore, this.props.instanceId);
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._overlayPanelStore = StoreManager.GetStore<OverlayPanelStore>(OverlayPanelStore, CanvasSelectorConstants.CanvasSelectorInstance);

        this._environmentListActionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentListActionsCreator>(EnvironmentListActionsCreator);
        this._overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator, CanvasSelectorConstants.CanvasSelectorInstance);
        this._store.addChangedListener(this._handleStoreChange);
        this.setState(this._store.getState());
    }

    public componentDidMount() {
        if (this.state.showPanel) {
            this._openEnvironmentTemplateSelectorPanel();
        }
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {

        const style = {
            height: LayoutConstants.corePropertiesHeight,
            width: this.props.width || LayoutConstants.corePropertiesWidth
        };

        const showEnvironmentRank = NavigationStateUtils.showEnvironmentRank();

        const envCorePropContainerClassNames = css("cd-environment-core-properties-container", {
            "cd-environment-core-properties-temporary-container": this.state.isTemporary
        });

        const ariaLabelId = "dtc-id-overlay-panel-description-label-" + DtcUtils.getUniqueInstanceId();
        const label = Utils_String.localeFormat(Resources.EnvironmentDescriptionAriaLabel, this.state.description);

        return (
            <div onKeyDown={this._handleKeyDown} ref={(element) => this._element = element} tabIndex={-1}>

                <OverlayPanelSelectable
                    instanceId={CanvasSelectorConstants.CanvasSelectorInstance}
                    getItem={this._getItem}
                    isValid={this.state.areSettingsValid}
                    cssClass={this.props.cssClass}
                    ariaLabel={Resources.EnvironmentPropertiesAriaLabel}>

                    <div className={envCorePropContainerClassNames} key={this.state.id} >
                        <div className="cd-environment-core-properties dtc-canvas-element-border" style={style} >
                            <div className="content">

                                {showEnvironmentRank && <span className="cd-environment-rank">{this.state.rank}</span>}

                                <div className="name-container" >
                                    {!this.state.areSettingsValid && <i className="cd-environment-name-error bowtie-icon bowtie-status-error-outline left" />}
                                    <TooltipHost
                                        directionalHint={DirectionalHint.bottomCenter}
                                        content={this.state.name}
                                        overflowMode={TooltipOverflowMode.Parent}>
                                        {this.state.name}
                                    </TooltipHost>
                                </div>

                                <TooltipHost
                                    directionalHint={DirectionalHint.bottomCenter}
                                    content={Resources.EnvironmentDescriptionLinkTooltip}
                                    delay={TooltipDelay.medium}>

                                    <div id={ariaLabelId} className="hidden" hidden>{label}</div>

                                    <a
                                        className="description-container"
                                        onClick={this._navigateToTasksTab}
                                        onKeyDown={this._handleKeyDownOnDescriptionLink}
                                        role="button"
                                        data-is-focusable={false}
                                        aria-disabled={false}
                                        aria-labelledby={ariaLabelId}>

                                        {!this.state.isEnvironmentWorkflowValid && <i className="cd-environment-description-error bowtie-icon bowtie-status-error-outline left" />}
                                        {this.state.description}

                                    </a>
                                </TooltipHost>
                            </div>
                        </div>
                    </div>

                </OverlayPanelSelectable>


                <ConfirmationDialog
                    title={Resources.DeleteEnvironmentText}
                    subText={Utils_String.localeFormat(Resources.DeleteEnvironmentWarningMessage, this.state.name)}
                    onConfirm={this._onDeleteEnvironment}
                    showDialog={this.state.showDeleteDialog}
                    onCancel={this._hideDeleteDialog}
                />

                <DeleteEnvironmentPermissionDialog
                    showDialog={this.state.showDeleteEnvironmentPermissionDialog}
                    onClose={this._handleDeleteEnvironmentPermissionDialogClose} />
            </div>
        );
    }

    private _onDeleteEnvironment = () => {
        let environmentActionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentActionsCreator>(EnvironmentActionsCreator, this.props.instanceId);
        environmentActionsCreator.markEnvironmentAsDeleting();
        announce(Resources.EnvironmentDeleted, true);
    }

    private _handleDeleteEnvironmentPermissionDialogClose = () => {
        this.setState({ showDeleteEnvironmentPermissionDialog: false } as IEnvironmentCorePropertiesViewState);
    }

    private _hideDeleteDialog = () => {
        this.setState({ showDeleteDialog: false } as IEnvironmentCorePropertiesViewState);
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.keyCode === KeyCode.DELETE) {
            const state = this._store.getState();
            PermissionHelper.hasDeleteEnvironmentPermission(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, state.id).then((hasPermission) => {
                if (hasPermission) {
                    this.setState({ ...this.state, showDeleteDialog: true });
                }
                else {
                    this.setState({ showDeleteEnvironmentPermissionDialog: true } as IEnvironmentCorePropertiesViewState);
                }
            }, (error) => {
                this.setState({ ...this.state, showDeleteDialog: true });
            });
        }
    }

    private _handleKeyDownOnDescriptionLink = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._navigateToTasksTab(e);
        }
    }

    private _openEnvironmentTemplateSelectorPanel(): void {
        const overlayPanelState = this._overlayPanelStore.getState();
        const panelWidth = overlayPanelState.detailsPaneWidth || 0;
        Utils_Core.delay(this, 0, () => {
            if (this._element) {
                this._environmentTemplateSelectorContainer = document.createElement("div");
                document.body.appendChild(this._environmentTemplateSelectorContainer);
                this._elementInFocusBeforeOpeningSelectorPanel = this._element.ownerDocument.activeElement as HTMLElement;
                let component = React.createElement(
                    EnvironmentTemplateSelectorControllerView,
                    {
                        onClose: this._onCloseEnvironmentSelector,
                        onApplyTemplate: this._onApplyTemplate,
                        hasCloseButton: true,
                        templateSelectorPanelWidth: panelWidth
                    });
                ReactDOM.render(component, this._environmentTemplateSelectorContainer);
                this._overlayPanelActionsCreator.setIsBlockingPanelOpen(true);
            }
        });
    }

    private _onApplyTemplate = (templateId: string): IPromise<void> => {
        let temporaryEnvironment = this._environmentListStore.getTemporaryEnvironment();
        if (temporaryEnvironment && templateId) {
            // apply template on temporary environment
            let instanceId: string = this._environmentListStore.getEnvironmentInstanceId(temporaryEnvironment.id);
            let environmentActionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentActionsCreator>(EnvironmentActionsCreator,
                instanceId);

            return environmentActionsCreator.applyTemplate(templateId, temporaryEnvironment).then(() => {
                this._cleanupEnvironmentTemplateSelector();
                this._environmentListActionsCreator.selectNewlyAddedEnvironment(this.props.onMoveEnvironment, this.props.isMoveEnvironmentEnabled);
                if (this.props.onAddEnvironmentComplete) {
                    this.props.onAddEnvironmentComplete();
                }
            });
        }
    }

    private _onCloseEnvironmentSelector = () => {
        let temporaryEnvironment = this._environmentListStore.getTemporaryEnvironment();
        if (temporaryEnvironment) {
            // delete temporary environment
            this._onDeleteEnvironment();
            this._cleanupEnvironmentTemplateSelector();
            if (this._elementInFocusBeforeOpeningSelectorPanel) {
                this._elementInFocusBeforeOpeningSelectorPanel.focus();
            }
        }
    }

    private _cleanupEnvironmentTemplateSelector(): void {
        if (this.props.onEnvironmentSelectorClosed) {
            this.props.onEnvironmentSelectorClosed();
        }

        if (this._environmentTemplateSelectorContainer) {
            ReactDOM.unmountComponentAtNode(this._environmentTemplateSelectorContainer);
            document.body.removeChild(this._environmentTemplateSelectorContainer);
            this._environmentTemplateSelectorContainer = null;
            this._overlayPanelActionsCreator.setIsBlockingPanelOpen(false);
        }
    }

    private _navigateToTasksTab = (e: React.SyntheticEvent<HTMLElement>) => {
        let state = this._store.getState();
        NavigationService.getHistoryService().addHistoryPoint(EditorActions.ACTION_TASKS_TAB, { environmentId: state.id });
        e.stopPropagation();
        e.preventDefault();

        Telemetry.instance().publishEvent(Feature.EnvironmentNavigationFromCanvas);
    }

    private _getItem = (): EnvironmentCorePropertiesItem => {
        return new EnvironmentCorePropertiesItem(
            this.props.releaseDefinitionFolderPath,
            this.props.releaseDefinitionId,
            this.props.instanceId,
            this.props.onMoveEnvironment,
            this.props.isMoveEnvironmentEnabled);
    }

    private _handleStoreChange = () => {
        let state = this._store.getState();
        let openPanel: boolean = !this.state.showPanel && state.showPanel;
        this.setState(state);
        if (openPanel) {
            this._openEnvironmentTemplateSelectorPanel();
        }
    }

    private _store: EnvironmentCorePropertiesViewStore;
    private _environmentTemplateSelectorContainer: HTMLElement;
    private _environmentListStore: EnvironmentListStore;
    private _environmentListActionsCreator: EnvironmentListActionsCreator;
    private _element: HTMLElement;
    private _overlayPanelStore: OverlayPanelStore;
    private _overlayPanelActionsCreator: OverlayPanelActionsCreator;
    private _elementInFocusBeforeOpeningSelectorPanel: HTMLElement;
}
