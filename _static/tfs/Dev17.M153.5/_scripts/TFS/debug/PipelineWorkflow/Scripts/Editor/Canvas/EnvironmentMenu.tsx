/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { DefaultButton, IButton } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import * as Utils_Core from "VSS/Utils/Core";
import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentMenu";

export enum IOperationType {
    Add,
    Clone
}

export interface IEnvironmentMenuProps extends Base.IProps {
    onClick: (operationType: IOperationType) => void;
    isCloneOperationEnabled?: () => boolean;
}

export interface IEnvironmentMenuState extends Base.IState {
    isCloneEnabled: boolean;
}

export class EnvironmentMenu extends Base.Component<IEnvironmentMenuProps, IEnvironmentMenuState> {

    public componentWillMount(): void {
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, CanvasSelectorConstants.CanvasSelectorInstance);
        this._itemSelectionStore.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount(): void {
        this._itemSelectionStore.removeChangedListener(this._handleStoreChange);
    }

    public shouldComponentUpdate(nextProps, nextState): boolean {
        return !Utils_Core.equals(nextState, this.state);
    }

    public setFocus(): void {
        if (this._addEnvButton) {
            this._addEnvButton.focus();
        }
    }

    public render(): JSX.Element {
        return (
            <div className="cd-canvas-environment-menu-container">
                <DefaultButton
                    componentRef={this._resolveRef("_addEnvButton")}
                    iconProps={{ iconName: "Add" }}
                    text={Resources.Add}
                    className="environment-canvas-environment-menu-button environment-canvas-add-environment-button"
                    menuProps={{
                        items: this._getAddContextualMenuItems()
                    }}
                    ariaLabel={Resources.AddEnvironmentDescription}>
                </DefaultButton>
            </div>
        );
    }

    private _getAddContextualMenuItems(): IContextualMenuItem[] {

        let items: IContextualMenuItem[] = [];
        items.push(
            {
                name: Resources.NewEnvironmentLabel,
                key: this._newEnvironmentButtonKey,
                ariaLabel: Resources.NewEnvironmentLabel,
                iconProps: { className: "bowtie-icon bowtie-math-plus-light" },
                className: "add-new-environment-button",
                onClick: this._onAddNewEnvironmentButtonClicked,
            });

        items.push(
            {
                name: Resources.CloneSelectedEnvironment,
                key: this._cloneEnvironmentButtonKey,
                ariaLabel: Resources.CloneSelectedEnvironment,
                iconProps: { className: "bowtie-icon bowtie-clone" },
                className: "clone-environment-button",
                onClick: this._onCloneEnvironmentButtonClicked,
                disabled: this.props.isCloneOperationEnabled ? !this.props.isCloneOperationEnabled() : false
            });

        return items;
    }

    private _onAddNewEnvironmentButtonClicked = (event: React.MouseEvent<HTMLButtonElement>): void => {
        if (this.props.onClick) {
            this.props.onClick(IOperationType.Add);
        }
    }

    private _onCloneEnvironmentButtonClicked = (event: React.MouseEvent<HTMLButtonElement>): void => {
        if (this.props.onClick) {
            this.props.onClick(IOperationType.Clone);
        }
    }

    private _handleStoreChange = () => {
        this.setState({ isCloneEnabled: this.props.isCloneOperationEnabled() });
    }

    private _addEnvButton: IButton;
    private _itemSelectionStore: ItemSelectionStore;

    private readonly _newEnvironmentButtonKey: string = "new-environment";
    private readonly _cloneEnvironmentButtonKey: string = "clone-environment";
}
