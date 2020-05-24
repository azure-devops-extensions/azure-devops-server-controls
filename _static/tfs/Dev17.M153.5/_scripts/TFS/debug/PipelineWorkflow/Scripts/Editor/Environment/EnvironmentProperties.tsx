// Copyright (c) Microsoft Corporation.  All rights reserved.
import * as React from "react";
import * as ReactDom from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";

import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { SecurityUtils } from "PipelineWorkflow/Scripts/Editor/Common/SecurityUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import { EnvironmentActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentActionsCreator";
import { EnvironmentName } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentName";
import { EnvironmentOwner } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentOwner";
import { EnvironmentPropertiesViewStore, IEnvironmentPropertiesViewState } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentPropertiesViewStore";
import { SaveAsTemplateDialogActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/SaveAsTemplateDialogActionCreator";
import { MoveDirection } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentNodeMover";
import { SaveAsTemplateDialogComponent as SaveAsTemplateDialog } from "PipelineWorkflow/Scripts/Editor/Environment/SaveAsTemplateDialogComponent";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { DeleteEnvironmentPermissionDialog } from "PipelineWorkflow/Scripts/SharedComponents/Security/DeleteEnvironmentPermissionDialog";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import { announce } from "VSS/Utils/Accessibility";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

import { CommandBar, ICommandBarProps } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentProperties";

export interface IEnvironmentPropertiesProps extends Base.IProps {
    environment: PipelineDefinitionEnvironment;
    releaseDefinitionFolderPath?: string;
    releaseDefinitionId?: number;
    onMoveEnvironment?: (instanceId: string, moveDirection: MoveDirection, onMoveComplete: () => void) => void;
    isMoveEnvironmentEnabled?: (instanceId: string, moveDirection: MoveDirection) => boolean;
}

export interface IEnvironmentPropertiesState extends IEnvironmentPropertiesViewState {
    showDeleteDialog: boolean;
    showDeleteEnvironmentPermissionDialog?: boolean;
    isMoveEnvironmentDownEnabled?: boolean;
    isMoveEnvironmentUpEnabled?: boolean;
}

export class EnvironmentProperties extends Base.Component<IEnvironmentPropertiesProps, IEnvironmentPropertiesState> {

    constructor(props: IEnvironmentPropertiesProps) {
        super(props);
        this._store = StoreManager.GetStore<EnvironmentPropertiesViewStore>(EnvironmentPropertiesViewStore,
            this.props.instanceId);
    }

    public componentWillMount(): void {
        this._releaseDefinitionFolderPath = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore).getState().folderPath;
        this._releaseDefinitionId = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore).getState().id;

        this._store.addChangedListener(this._onChange);
        this.setState({
            isMoveEnvironmentUpEnabled: this.props.isMoveEnvironmentEnabled ? this.props.isMoveEnvironmentEnabled(this.props.instanceId, MoveDirection.up) : false,
            isMoveEnvironmentDownEnabled: this.props.isMoveEnvironmentEnabled ? this.props.isMoveEnvironmentEnabled(this.props.instanceId, MoveDirection.down) : false,
            ...this._store.getState()
        });
    }

    public componentDidMount() {
        this._renderEnvironmentCommandBar();
        this._isMounted = true;
    }

    public componentDidUpdate() {
        this._renderEnvironmentCommandBar();
    }

    public componentWillUnmount(): void {
        //Unmount the command bar
        if (this._environmentCommandBarHeader) {
            ReactDom.unmountComponentAtNode(this._environmentCommandBarHeader);
        }

        this._store.removeChangedListener(this._onChange);
        this._evaluateMoveOperation = null;
        this._isMounted = false;
    }

    /**
     * @brief Renders an Environment Properties view
     */
    public render(): JSX.Element {
        return (
            <div className="cd-environment-properties">
                <div>
                    <OverlayPanelHeading label={Resources.Environment}
                        infoButtonRequired={false}
                        description={this.state.environmentName}>
                    </OverlayPanelHeading>
                    <div className="environment-command-bar-container" ref={this._resolveRef("_environmentCommandBarHeader")} />
                </div>
                <AccordionCustomRenderer
                    label={Resources.Properties}
                    initiallyExpanded={true}
                    headingLevel={2}
                    addSeparator={true}
                    description={Resources.EnvironmentPropertiesSubHeader}
                    descriptionOnCollapse={Utils_String.format(Resources.EnvironmentPropertiesSummary, this.state.environmentOwnerDisplayName)}
                    bowtieIconName="bowtie-environment"
                    showErrorDelegate={this._showErrorOnAccordion}>
                    <div>
                        <EnvironmentName instanceId={this.props.instanceId} />
                        <EnvironmentOwner instanceId={this.props.instanceId} />
                    </div>
                </AccordionCustomRenderer>

                <ConfirmationDialog
                    title={Resources.DeleteEnvironmentText}
                    subText={Utils_String.localeFormat(Resources.DeleteEnvironmentWarningMessage, this.state.environmentName)}
                    onConfirm={this._onDeleteEnvironment}
                    showDialog={this.state.showDeleteDialog}
                    onCancel={this._hideDeleteDialog}
                />

                <DeleteEnvironmentPermissionDialog
                    showDialog={this.state.showDeleteEnvironmentPermissionDialog}
                    onClose={this._handleDeleteEnvironmentPermissionDialogClose} />

                <SaveAsTemplateDialog
                    environment={this.props.environment} />
            </div>);
    }

    private _onDeleteEnvironment = () => {
        let environmentActionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentActionsCreator>(EnvironmentActionsCreator, this.props.instanceId);
        environmentActionsCreator.markEnvironmentAsDeleting();
        announce(Resources.EnvironmentDeleted, true);
    }

    private _showErrorOnAccordion = (): boolean => {
        let showError: boolean = !this._store.isValid();
        return showError;
    }

    private _onChange = () => {
        this.setState(this._store.getState() as IEnvironmentPropertiesState);
    }

    private _handleDeleteEnvironment = (): void => {
        PermissionHelper.hasDeleteEnvironmentPermission(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, this.props.environment.id).then(
            (hasPermission) => {
                if (hasPermission) {
                    this.setState({ showDeleteDialog: true } as IEnvironmentPropertiesState);
                }
                else {
                    this.setState({ showDeleteEnvironmentPermissionDialog: true } as IEnvironmentPropertiesState);
                }
            },
            (error) => {
                this.setState({ showDeleteDialog: true } as IEnvironmentPropertiesState);
            });
    }

    private _hideDeleteDialog = () => {
        this.setState({ showDeleteDialog: false } as IEnvironmentPropertiesState);
    }

    private _handleDeleteEnvironmentPermissionDialogClose = () => {
        this.setState({ showDeleteEnvironmentPermissionDialog: false } as IEnvironmentPropertiesState);
    }

    private _saveAsTemplate = (): void => {
        ActionCreatorManager.GetActionCreator<SaveAsTemplateDialogActionCreator>(SaveAsTemplateDialogActionCreator).showDialog();
    }

    private _openSecurityDialog = (): void => {
        SecurityUtils.showSecurityDialog(this._releaseDefinitionFolderPath, this._releaseDefinitionId, this.props.environment.id, this.props.environment.name);
        Telemetry.instance().publishEvent(Feature.OpenEnvironmentSecurityDialog);
    }

    private _renderEnvironmentCommandBar() {
        //Rendering command bar after EnvironmentControllerView is mounted
        //This is a temp fix same as implemented by aksriv for Artifacts. Actual fix should happen in Overlaypanel
        Utils_Core.delay(this, 0, () => {
            if (this._environmentCommandBarHeader) {
                let commandBar = React.createElement<ICommandBarProps>(CommandBar, {
                    isSearchBoxVisible: false,
                    elipisisAriaLabel: DTCResources.CommandBarEllipsesAriaLabel,
                    items: this._getVisibleButtons(),
                    overflowItems: this._getOverFlowButtons(),
                    className: "edit-command-bar"
                });

                ReactDom.render(commandBar, this._environmentCommandBarHeader);
            }
        });
    }

    private _getOverFlowButtons(): IContextualMenuItem[] {
        let menuItems: IContextualMenuItem[] = [];

        menuItems.push({
            key: EnvironmentProperties._saveAsTemplateKey,
            name: Resources.SaveAsTemplate,
            ariaLabel: Resources.ARIALabelSaveAsTemplate,
            disabled: false,
            onClick: this._saveAsTemplate,
            iconProps: { className: "bowtie-icon bowtie-save-as" },
        });

        menuItems.push({
            key: EnvironmentProperties._securityKey,
            name: Resources.SecurityText,
            ariaLabel: Resources.ARIALabelEnvironmentSecurity,
            disabled: !(this._releaseDefinitionId > 0 && this.props.environment.id > 0),
            onClick: this._openSecurityDialog,
            iconProps: { iconName: "Permissions" },
        });

        return menuItems;
    }

    private _getVisibleButtons(): IContextualMenuItem[] {
        let items: IContextualMenuItem[] = [];
        items.push({
            name: DTCResources.Delete,
            key: EnvironmentProperties._deleteEnvironmentKey,
            ariaLabel: Resources.DeleteEnvironmentText,
            icon: "Delete",
            className: css("delete-environment-button", "fabric-style-overrides"),
            onClick: this._handleDeleteEnvironment
        });
        
        items.push({
            name: Resources.MoveText,
            key: EnvironmentProperties._moveKey,
            ariaLabel: Resources.MoveEnvironmentDescription,
            iconProps: { className: "bowtie-icon bowtie-fold-more" },
            className: css("move-environment-button", "fabric-style-overrides"),
            items: this._getMoveContextualMenuItems()
        });
        

        return items;
    }

    private _getMoveContextualMenuItems(): IContextualMenuItem[] {

        let items: IContextualMenuItem[] = [];
        items.push(
            {
                name: Resources.MoveUpText,
                key: EnvironmentProperties._moveUpButtonKey,
                ariaLabel: Resources.MoveUpText,
                iconProps: { className: "bowtie-icon bowtie-arrow-up" },
                className: "up-environment-button",
                onClick: this._onMoveUpButtonClicked,
                disabled: !this.state.isMoveEnvironmentUpEnabled
            });

        items.push(
            {
                name: Resources.MoveDownText,
                key: EnvironmentProperties._moveDownButtonKey,
                ariaLabel: Resources.MoveDownText,
                iconProps: { className: "bowtie-icon bowtie-arrow-down" },
                className: "down-environment-button",
                onClick: this._onMoveDownButtonClicked,
                disabled: !this.state.isMoveEnvironmentDownEnabled
            });

        return items;
    }

    private _onMoveUpButtonClicked = (event: React.MouseEvent<HTMLButtonElement>): void => {
        if (this.props.onMoveEnvironment) {
            this.props.onMoveEnvironment(this.props.instanceId, MoveDirection.up, this._evaluateMoveOperation);
        }
    }

    private _onMoveDownButtonClicked = (event: React.MouseEvent<HTMLButtonElement>): void => {
        if (this.props.onMoveEnvironment) {
            this.props.onMoveEnvironment(this.props.instanceId, MoveDirection.down, this._evaluateMoveOperation);
        }
    }

    private _evaluateMoveOperation = (): void => {
        if (this._isMounted) {
            this.setState({
                isMoveEnvironmentUpEnabled: this.props.isMoveEnvironmentEnabled ? this.props.isMoveEnvironmentEnabled(this.props.instanceId, MoveDirection.up) : false,
                isMoveEnvironmentDownEnabled: this.props.isMoveEnvironmentEnabled ? this.props.isMoveEnvironmentEnabled(this.props.instanceId, MoveDirection.down) : false
            });
        }
    }

    private _environmentCommandBarHeader: HTMLDivElement;
    private _releaseDefinitionFolderPath: string;
    private _releaseDefinitionId: number;
    private _store: EnvironmentPropertiesViewStore;

    // Need to track mounted because we expose a delegate outside
    // the component.
    private _isMounted: boolean;

    private static readonly _deleteEnvironmentKey: string = "DeleteEnvironment";
    private static readonly _saveAsTemplateKey: string = "SaveAsTemplate";
    private static readonly _securityKey: string = "Security";
    private static readonly _moveUpButtonKey: string = "MoveEnvironmentUp";
    private static readonly _moveDownButtonKey: string = "MoveEnvironmentDown";
    private static readonly _moveKey: string = "MoveEnvironment";
}





