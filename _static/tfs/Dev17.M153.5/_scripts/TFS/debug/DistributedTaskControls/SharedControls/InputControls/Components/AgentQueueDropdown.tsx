import * as React from "react";

import { ManageLink, ManageLinkType } from "DistributedTaskControls/Components/ManageLink";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { BowtieImageListItem } from "DistributedTaskControls/SharedControls/ImageListItem/BowtieImageListItem";
import { ImageSize } from "DistributedTaskControls/SharedControls/ImageListItem/ImageListItemCommon";
import { AgentQueueDropdownUtils, IAgentQueueOption } from "DistributedTaskControls/SharedControls/InputControls/AgentQueueDropdown";

import { ComboBox, IComboBox, IComboBoxProps, SelectableOptionMenuItemType } from "OfficeFabric/ComboBox";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { TaskAgentQueue } from "TFS/DistributedTask/Contracts";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/AgentQueueDropdown";
import { TaskAgentPoolReference } from "TFS/Build/Contracts";

export interface IAgentQueueDropdownProps extends IBaseProps {
    queues: TaskAgentQueue[];
    onChanged: (agentQueue: TaskAgentQueue | null) => void;
    selectedAgentQueueId?: number;
    className?: string;
    label?: string;
    required?: boolean;
    ariaLabel?: string;
    disabled?: boolean;
    onExpand?: any;
}

export interface IAgentQueueDropdownState {
    hostedQueues: TaskAgentQueue[];
    privateQueues: TaskAgentQueue[];
    selectedKey: string;
    errorMessage?: string;
}

export class AgentQueueDropdown extends BaseComponent<IAgentQueueDropdownProps, IAgentQueueDropdownState> {
    constructor(props: IAgentQueueDropdownProps) {
        super(props);

        const selectedKey = AgentQueueDropdownUtils.getSelectedKey(props.selectedAgentQueueId);
        const queueData = AgentQueueDropdownUtils.getQueueData(props.queues);

        this.state = {
            hostedQueues: queueData.hostedQueues,
            privateQueues: queueData.privateQueues,
            selectedKey: selectedKey,
            errorMessage: AgentQueueDropdownUtils.getErrorMessage(selectedKey, props.queues)
        };
    }

    public render(): JSX.Element {
        const options = this._getOptions();
        const comboProps: IComboBoxProps = {
            options: options,
            className: this.props.className,
            label: this.props.label,
            onChanged: this._onChanged,
            onChange: this._onChange,
            required: this.props.required,
            errorMessage: this.state.errorMessage,
            ariaLabel: this.props.ariaLabel,
            allowFreeform: true,
            selectedKey: this.state.selectedKey,
            autoComplete: "on",
            onRenderOption: AgentQueueOption,
            useComboBoxAsMenuWidth: true,
            disabled: this.props.disabled,
            onKeyDown: this.props.onExpand
        };

        if (options.length === 0) {
            comboProps.onRenderList = EmptyQueueDropdownItem;
        }

        return <ComboBox
            componentRef={this._resolveRef("_comboBox")}
            className="dt-agent-queue-dropdown"
            {...comboProps}
        />;
    }

    public focus() {
        if (this._comboBox) {
            this._comboBox.focus();
        }
    }

    public componentWillReceiveProps(nextProps: IAgentQueueDropdownProps) {
        if (this.props.selectedAgentQueueId !== nextProps.selectedAgentQueueId
            || !AgentQueueDropdownUtils.areQueuesEqual(this.props.queues, nextProps.queues)) {
            const selectedKey = AgentQueueDropdownUtils.getSelectedKey(nextProps.selectedAgentQueueId);
            const queueData = AgentQueueDropdownUtils.getQueueData(nextProps.queues);
            this.setState({
                selectedKey: selectedKey,
                errorMessage: AgentQueueDropdownUtils.getErrorMessage(selectedKey, nextProps.queues),
                hostedQueues: queueData.hostedQueues,
                privateQueues: queueData.privateQueues
            });
        }
    }

    private _getOptions(): IAgentQueueOption[] {
        let options: IAgentQueueOption[] = [];
        if (this.state.hostedQueues.length > 0) {
            options.push(AgentQueueDropdownUtils.getHeaderOption(AgentQueueDropdownUtils.Hosted, Resources.HostedText));
            options = options.concat(AgentQueueDropdownUtils.getOptions(this.state.hostedQueues));
        }

        if (this.state.privateQueues.length > 0) {
            if (this.state.hostedQueues.length > 0) {
                // add header only if there are some hosted queues
                options.push(AgentQueueDropdownUtils.getHeaderOption(AgentQueueDropdownUtils.Private, Resources.PrivateText));
            }

            options = options.concat(AgentQueueDropdownUtils.getOptions(this.state.privateQueues));
        }

        return options;
    }

    private _onChanged = (option: IAgentQueueOption | null, index?: number, value?: string) => {
        // Note: In Free form mode: When auto-fill happens, we don't immediately get called, things that usually calls this are - onblur, enter or tab etc.,
        const allQueues = this.state.hostedQueues.concat(this.state.privateQueues);
        let selectedKey = "";
        let agentQueue: TaskAgentQueue = null;
        if (option) {
            selectedKey = option.key;
            agentQueue = option.data;
        }
        else {
            // free form
            agentQueue = AgentQueueDropdownUtils.getSelectedQueueFromValue(value, allQueues);
            selectedKey = agentQueue ? agentQueue.id.toString() : AgentQueueDropdownUtils.InvalidKeyString;
        }

        this.setState({
            selectedKey: selectedKey,
            errorMessage: AgentQueueDropdownUtils.getErrorMessage(selectedKey, allQueues)
        });

        this.props.onChanged(agentQueue);
    }

    private _onChange = (event: React.FormEvent<IComboBox>) => {
        // To handle emptying the input, _onChanged doesn't get called in freeform if input is empty
        const input = event.target as HTMLInputElement;
        if (this.props.required && !input.value) {
            this.setState({
                selectedKey: AgentQueueDropdownUtils.InvalidKeyString,
                errorMessage: Resources.RequiredInputErrorMessage
            });

            this.props.onChanged(null);
        }
    }

    private _comboBox: ComboBox = null;
}

const AgentQueueOption = (option: IAgentQueueOption): JSX.Element => {
    const getBowtieImageClassName = (pool: TaskAgentPoolReference) => {
        // TODO: We should fetch meta data about OS for showing different icons instead of depending on name
        //        for now this works since, hosted queues will have "Linux" in there for linux os, and is not localized
        let imageClassName = "bowtie-build-queue";

        if (pool && pool.isHosted) {
            if (pool.name && (pool.name.indexOf("Linux") >= 0 || pool.name.indexOf("Ubuntu") >= 0)) {
                imageClassName = "bowtie-brand-linux";
            }
            else if (pool.name.indexOf("macOS") >= 0 || pool.name.indexOf("Mac") >= 0) {
                imageClassName = "bowtie-brand-apple";
            }
            else {
                imageClassName = "bowtie-brand-visualstudio brand-icon";
            }
        }

        return imageClassName;
    };

    if (option.itemType !== SelectableOptionMenuItemType.Header) {
        const pool = option.data ? option.data.pool : null;
        const bowtieImageClassName = getBowtieImageClassName(pool);
        const agentInformation = AgentQueueDropdownUtils.getAgentInformation(option.data);
        let queueHintsElement: JSX.Element = null;
        if (agentInformation.hasNoAgents) {
            queueHintsElement = <div className="dt-agent-queue-subtle-text">{Resources.AgentQueueDropdownNoRegisteredAgents}</div>;
        }

        return <BowtieImageListItem
            bowtieImageClassName={bowtieImageClassName}
            imageSize={ImageSize.Small}
            primaryText={option.text}>
            {queueHintsElement}
        </BowtieImageListItem>;
    }
    else {
        return <span>
            {option.text}
        </span>;
    }
};

const EmptyQueueDropdownItem = (): JSX.Element => {
    return <div className="dt-agent-queue-empty-dropdown">
        <span className="text">
            {Resources.QueueDropdownEmptyMessage}
        </span>
        <ManageLink displaySeperator={true} manageLinkType={ManageLinkType.AgentQueue} />
    </div>;
};