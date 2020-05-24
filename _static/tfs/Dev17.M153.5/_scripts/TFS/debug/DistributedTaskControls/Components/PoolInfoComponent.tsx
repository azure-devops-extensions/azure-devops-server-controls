/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Component as MarkdownRenderer } from "DistributedTaskControls/Components/MarkdownRenderer";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { IdentityDisplayComponent } from "DistributedTaskControls/Components/IdentityDisplay";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskAgentPoolActionsCreator } from "DistributedTaskControls/Actions/TaskAgentPoolActionsCreator";
import { TaskAgentPoolStore, ITaskAgentPoolStoreArgs, ITaskAgentPoolData } from "DistributedTaskControls/Stores/TaskAgentPoolStore";

import { TaskAgentPoolReference, TaskAgentPool } from "TFS/DistributedTask/Contracts";

import { MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";

import { Link } from "OfficeFabric/Link";
import { PanelType, IPanelProps } from "OfficeFabric/Panel";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import * as VssContext from "VSS/Context";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/PoolInfoComponent";

export interface IPoolInfoComponentProps extends Base.IProps {
    agentPoolReference: TaskAgentPoolReference;
    displaySeperator?: boolean;
}

export interface IPoolInfoComponentState extends Base.IState {
    showPanel: boolean;
    taskAgentPoolData: ITaskAgentPoolData;
}

export class PoolInfoComponent extends Base.Component<IPoolInfoComponentProps, IPoolInfoComponentState> {

    constructor(props: IPoolInfoComponentProps) {
        super(props);

        this._uniqueTaskInstanceId = DtcUtils.getUniqueInstanceId();
        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskAgentPoolActionsCreator>(TaskAgentPoolActionsCreator, this._uniqueTaskInstanceId);
        this._store = StoreManager.CreateStore<TaskAgentPoolStore, ITaskAgentPoolStoreArgs>(TaskAgentPoolStore, this._uniqueTaskInstanceId, {});

        this.state = {
            showPanel: false,
            taskAgentPoolData: this._store.getTaskAgentPoolData(props.agentPoolReference.id)
        } as IPoolInfoComponentState;
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
        ActionCreatorManager.DeleteActionCreator<TaskAgentPoolActionsCreator>(TaskAgentPoolActionsCreator, this._uniqueTaskInstanceId);
        StoreManager.DeleteStore<TaskAgentPoolStore>(TaskAgentPoolStore, this._uniqueTaskInstanceId);
    }

    public componentWillReceiveProps(newProps: IPoolInfoComponentProps): void {
        if (newProps.agentPoolReference.id !== this.props.agentPoolReference.id) {
            this.setState({
                taskAgentPoolData: null
            } as IPoolInfoComponentState);
        }
    }

    public render() {

        return (
            <span className="pool-info-link" >
                {
                    this.props.displaySeperator &&
                    <span className="seperator">{"|"} </span>
                }
                <Link
                    onClick={this._showPoolInfoPanel}
                    className={css("fabric-style-overrides")}
                    target="_blank" >
                    {Resources.PoolInfoLabel}
                </Link>
                <PanelComponent
                    showPanel={this.state.showPanel}
                    onRenderHeader={this._onRenderPanelHeader}
                    onRenderBody={this._onRenderPanelBody}
                    onClosed={this._onPanelClosed}
                    hasCloseButton={true}
                    isLightDismiss={true}
                    panelType={PanelType.large}>
                </PanelComponent>
            </span>
        );
    }

    private _onRenderPanelHeader = (): JSX.Element => {

        return (
            <div className="pool-details-header">
                { Utils_String.format(Resources.PoolDetailsTitleFormat, this.props.agentPoolReference.name) }
            </div>
        );
    }

    private _onRenderPanelBody = (): JSX.Element => {
        const showLoadingComponent: boolean =
            this.state.taskAgentPoolData.taskAgentPool === null ||
            this.state.taskAgentPoolData.taskAgentPoolMetadata === null;

        if (showLoadingComponent) {
            return <LoadingComponent />;
        }
        else {
            let ownerId: string = null;
            if (!this.props.agentPoolReference.isHosted && this.state.taskAgentPoolData.taskAgentPool.owner) {
                ownerId = this.state.taskAgentPoolData.taskAgentPool.owner.descriptor ?
                    this.state.taskAgentPoolData.taskAgentPool.owner.descriptor : this.state.taskAgentPoolData.taskAgentPool.owner.id;
            }

            let poolMetadata: string = this.state.taskAgentPoolData.taskAgentPoolMetadata;
            if (poolMetadata === "") {
                poolMetadata = Utils_String.format(Resources.PoolMetadataNotFound, this.props.agentPoolReference.name);
            }

            return (
                <div className="pool-details">
                    {
                        ownerId &&
                        <div className="owner-identity-container">
                            <label
                                className="pool-owner-label"
                                aria-label={Resources.PoolOwnerLabel}>
                                {Resources.PoolOwnerLabel}
                            </label>
                            <div className="pool-identity-control">
                                <IdentityDisplayComponent
                                    userId={ownerId}
                                    consumerId={this.c_identityDisplayConsumerId}>
                                </IdentityDisplayComponent>
                            </div>
                        </div>
                    }
                    {
                        poolMetadata &&
                        <div className="pool-metadata-container">
                            <label
                                className="pool-metadata-label"
                                aria-label={Resources.PoolMetadataLabel}>
                                {Resources.PoolMetadataLabel}
                            </label>
                            <div className="pool-metadata-markdown">
                                <MarkdownRenderer
                                    markdown={poolMetadata}
                                    markdownRendererOptions={this._getMarkdownRendererOptions()}>
                                </MarkdownRenderer>
                            </div>
                        </div>
                    }
                </div>
            );
        }
    }

    private _showPoolInfoPanel = () => {
        const taskAgentPoolData: ITaskAgentPoolData = this.state.taskAgentPoolData ?
            this.state.taskAgentPoolData : this._store.getTaskAgentPoolData(this.props.agentPoolReference.id);

        if (taskAgentPoolData.taskAgentPool === null) {
            this._actionCreator.getTaskAgentPool(this.props.agentPoolReference.id);
        }

        if (taskAgentPoolData.taskAgentPoolMetadata === null) {
            this._actionCreator.getTaskAgentPoolMetadata(this.props.agentPoolReference.id);
        }

        this.setState({
            showPanel: true,
            taskAgentPoolData: taskAgentPoolData
        } as IPoolInfoComponentState);
    }

    private _onPanelClosed = () => {
        this.setState({
            showPanel: false
        } as IPoolInfoComponentState);
    }

    private _onChange = () => {
        this.setState({
            taskAgentPoolData: this._store.getTaskAgentPoolData(this.props.agentPoolReference.id)
        } as IPoolInfoComponentState);
    }

    private _getMarkdownRendererOptions(): MarkdownRendererOptions {
        return {
            breaks: true,
            linkify: true,
            typographer: false,
            emoji: true,
            hideExternalImageIcon: true,
            imageSize: true,
            katex: false,
            linkifyTlds: ["biz", "com", "edu", "gov", "net", "org", "pro", "web", "aero", "asia", "coop", "info", "museum", "name", "shop", "рф", "io"]
        };
    }

    private _actionCreator: TaskAgentPoolActionsCreator;
    private _store: TaskAgentPoolStore;
    private _uniqueTaskInstanceId: string;
    private c_identityDisplayConsumerId: string = "6B4F9367-7D3C-484D-99A1-8E0B03DF5216";
}
