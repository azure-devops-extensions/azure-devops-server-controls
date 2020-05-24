/// <reference types="react" />

import * as React from "react";

import { AgentsActionsCreator } from "DistributedTaskControls/Actions/AgentsActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { AgentQueueSelector } from "DistributedTaskControls/Components/AgentQueueSelector";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { IManageLinkProps, ManageLink, ManageLinkType } from "DistributedTaskControls/Components/ManageLink";
import { IPoolInfoComponentProps, PoolInfoComponent } from "DistributedTaskControls/Components/PoolInfoComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { AgentsStore, IAgentsState } from "DistributedTaskControls/Stores/AgentsStore";

import { TaskAgentQueue } from "TFS/DistributedTask/Contracts";

import { IconButton } from "OfficeFabric/Button";
import { css, autobind } from "OfficeFabric/Utilities";
import { KeyCodes } from "DistributedTaskControls/Common/ShortKeys";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskInput";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/ControllerViews/AgentsView";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IProps extends Base.IProps {
    label: string;
    required?: boolean;
    disabled?: boolean;
}

interface IAgentsViewLabelProps {
    text: string;
    manageLinkProps: IManageLinkProps;
    poolInfoComponentProps: IPoolInfoComponentProps;
    required?: boolean;
}

export class AgentsView extends Base.Component<IProps, IAgentsState> {
    constructor(props: IProps) {
        super(props);
        this._store = StoreManager.GetStore<AgentsStore>(AgentsStore, props.instanceId);
        this.state = this._store.getState();
        this._actionCreator = ActionCreatorManager.GetActionCreator<AgentsActionsCreator>(AgentsActionsCreator, props.instanceId);
        this._store.addChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        const selectedAgentQueueId: number = (this.state.defaultQueueId === undefined) ? null : this.state.defaultQueueId;
        const selectedAgentQueue: TaskAgentQueue = Utils_Array.first(this.state.queues, (queue: TaskAgentQueue) => {
            return queue.id === this.state.defaultQueueId;
        });

        const labelProps: IAgentsViewLabelProps = {
            text: this.props.label,
            manageLinkProps: {
                manageLinkType: ManageLinkType.AgentQueue,
                displaySeperator: true,
                resourceId: this.state.defaultQueueId
            },
            poolInfoComponentProps: {
                agentPoolReference: (selectedAgentQueue !== null) ? selectedAgentQueue.pool : null,
                displaySeperator: true
            },
            required: this.props.required
        };

        return (
            <div className="agents-section">
                <div className="agents-view">
                    <div className="agent-queue">
                        {this.AgentsViewLabel(labelProps)}
                        <AgentQueueSelector
                            agentQueues={this.state.queues}
                            onAgentQueueSelected={this._agentChanged}
                            selectedAgentQueueId={selectedAgentQueueId}
                            required={this.props.required}
                            ariaLabel={this.props.label}
                            disabled={this.props.disabled}
                            onExpand ={this.onExpandHandler}>
                            {
                                !this.props.disabled &&
                                <div className="agent-queue-buttons">
                                    <IconButton
                                        onClick={this._onRefresh}
                                        iconProps={{ iconName: "Refresh" }}
                                        className={css("task-input-icon-button", "fabric-style-overrides", "icon-button-override")}
                                        ariaDescription={Resources.RefreshAgentQueueDescription}
                                        ariaLabel={Resources.Refresh} />
                                </div>
                            }
                        </AgentQueueSelector>
                    </div>
                </div>
            </div>
        );
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    @autobind
    private onExpandHandler(e: React.KeyboardEvent<HTMLElement>) {
        if (e && e.ctrlKey && e.altKey) {
            switch (e.keyCode) {
                case KeyCodes.Help:
                if (this._infoElement) {
                    this._infoElement.toggleInfoCalloutState();
                }
                break;
                }
            }
        }
    
    private _agentChanged = (key: number) => {
        this._actionCreator.updateAgentQueue(key);
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _onRefresh = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._actionCreator.refreshAgentQueue();
    }

    private _store: AgentsStore;
    private _actionCreator: AgentsActionsCreator;
    protected _infoElement: InfoButton;

    
public AgentsViewLabel(props: IAgentsViewLabelProps) {
    return (<div className="agent-queue-label">
        <span
            {...props.required ? { className: "required-indicator" } : {}}>
            {props.text}
        </span>
        <InfoButton
            calloutContent={
                {
                    calloutHeader: Resources.AgentQueuesText,
                    calloutMarkdown: Resources.AgentQueuesInfoMarkdown
                }
            }
            ref={(element) => { this._infoElement = element; }}
        />
        {
            props.poolInfoComponentProps.agentPoolReference != null &&
            <div className="pool-info">
                <PoolInfoComponent {...props.poolInfoComponentProps} />
            </div>
        }
        <div className="manage-agents">
            <ManageLink {...props.manageLinkProps} />
        </div>
    </div>);
}

}

