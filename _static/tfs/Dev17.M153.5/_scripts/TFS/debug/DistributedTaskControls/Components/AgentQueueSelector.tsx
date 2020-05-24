import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as SafeLink from "DistributedTaskControls/Components/SafeLink";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { AgentQueueDropdown } from "DistributedTaskControls/SharedControls/InputControls/Components/AgentQueueDropdown";

import { TaskAgentQueue } from "TFS/DistributedTask/Contracts";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/AgentQueueSelector";

export interface IProps extends Base.IProps {
    label?: string;
    selectedAgentQueueId: number;
    agentQueues: TaskAgentQueue[];
    onAgentQueueSelected: (agentQueueId: number) => void;
    required?: boolean;
    ariaLabel?: string;
    disabled?: boolean;
    onExpand?: any;
}

export class AgentQueueSelector extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div>
                <div className="agent-queue-drop-down-area">
                    <AgentQueueDropdown
                        ref={(element) => { this._dropDownInputControl = element; }}
                        className="agent-queue-drop-down"
                        label={this.props.label}
                        queues={this.props.agentQueues}
                        onChanged={this._handleAgentQueueChanged}
                        selectedAgentQueueId={this.props.selectedAgentQueueId}
                        required={this.props.required}
                        ariaLabel={this.props.ariaLabel || this.props.label}
                        disabled={this.props.disabled}
                        onExpand={this.props.onExpand}
                    />
                    {
                        <div className="agent-queue-drop-down-children">
                            {this.props.children}
                        </div>
                    }
                </div>
                {
                    this._isMacQueueSelected() &&
                    <ExternalQueueSelectedWarningLabel />
                }
            </div>
        );
    }

    public setFocus() {
        if (this._dropDownInputControl) {
            this._dropDownInputControl.focus();
        }
    }

    private _isMacQueueSelected(): boolean {
        const queues = this.props.agentQueues;
        const selectedAgentQueueId = this.props.selectedAgentQueueId;
        if (queues) {
            const selectedQueue = queues.filter(q => q.id === selectedAgentQueueId).pop();
            if (selectedQueue && selectedQueue.pool) {
                return selectedQueue.pool.isHosted && (selectedQueue.name.indexOf("macOS") > -1);
            }
        }

        return false;
    }

    private _handleAgentQueueChanged = (agentQueue: TaskAgentQueue | null) => {
        this.props.onAgentQueueSelected(agentQueue ? agentQueue.id : 0);
    }

    private _dropDownInputControl: AgentQueueDropdown;
}

const ExternalQueueSelectedWarningLabel = () => {
    return (<div className="selected-queue-message-area">
        <span className="selected-queue-message">
            {Resources.OptionAffectsDataStorageAndSecurity}
        </span>
        <SafeLink.SafeLink
            href={Resources.DataStorageAndSecurityLearnMoreLink}
            target="_blank" >
            {Resources.LearnMore}
            <span className="bowtie-icon bowtie-navigate-external" />
        </SafeLink.SafeLink>
    </div>);
};