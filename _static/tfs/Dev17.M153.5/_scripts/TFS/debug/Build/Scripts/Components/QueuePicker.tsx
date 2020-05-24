import * as React from "react";

import { triggerEnterKeyHandler } from "Build/Scripts/ReactHandlers";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { QueuesStore, getQueuesStore } from "Build/Scripts/Stores/Queues";

import { CommandButton } from "OfficeFabric/components/Button/CommandButton/CommandButton";
import { ComboBox, IComboBoxOption, IComboBox } from "OfficeFabric/ComboBox";
import { FontSizes } from "OfficeFabric/Styling";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { TaskAgentQueue, TaskAgentQueueActionFilter } from "TFS/DistributedTask/Contracts";

namespace Keys {
    export const clear = "QueuePicker_Clear";
}

export interface IQueuePickerProps extends IBaseProps {
    onQueueChanged: (queueId: string) => void;
    selectedQueueId?: string;
    queueStore?: QueuesStore;
    className?: string;
}

export interface IQueuePickerState {
    queues: TaskAgentQueue[];
    selectedQueueId?: string;
}

export class QueuePicker extends BaseComponent<IQueuePickerProps, IQueuePickerState> {
    private _queueStore: QueuesStore;
    private _initialized = false;
    private _comboBoxHolder: HTMLElement = null;

    constructor(props: IQueuePickerProps) {
        super(props);
        this._queueStore = (props && props.queueStore) ? props.queueStore : getQueuesStore();

        this.state = {
            queues: [],
            selectedQueueId: props.selectedQueueId
        };
    }

    public render(): JSX.Element {
        const options: IComboBoxOption[] = this.state.queues.map((queue) => {
            return {
                key: queue.id + "",
                data: queue,
                text: queue.name
            };
        });

        if (options.length > 0) {
            options.push({
                key: Keys.clear,
                text: ""
            });
        }

        return <div
            ref={this._resolveRef('_comboBoxHolder')}>
            <ComboBox
                selectedKey={this.state.selectedQueueId + ""}
                options={options}
                onChanged={this._onQueueChanged}
                ariaLabel={BuildResources.QueuePickerAriaLabel}
                allowFreeform={true}
                autoComplete='on'
                onMenuOpen={this._onMenuOpened}
                caretDownButtonStyles={{
                    icon: {
                        fontSize: FontSizes.small
                    }
                }}
                styles={{
                    root: {
                        height: '30px'
                    }
                }}
                className={`build-queue-picker ${this.props.className}`}
                onChange={this._onTextChange}
                onRenderItem={this._onRenderItem}
                useComboBoxAsMenuWidth={true}
            />
        </div>;
    }

    public componentDidMount(): void {
        this._queueStore.addChangedListener(this._onStoresUpdated);

        // HACK ALERT!! See https://github.com/OfficeDev/office-ui-fabric-react/issues/2370, we don't have a way to set placeholder yet through props
        if (this._comboBoxHolder) {
            const inputs = this._comboBoxHolder.getElementsByTagName("input");
            if (inputs && inputs[0]) {
                inputs[0].setAttribute("placeholder", BuildResources.QueuePickerPlaceHolderText);
            }
        }
    }

    public componentWillUnmount(): void {
        this._queueStore.removeChangedListener(this._onStoresUpdated);
    }

    public componentWillReceiveProps(nextProps: IQueuePickerProps) {
        if (this.props.selectedQueueId != nextProps.selectedQueueId) {
            this.setState({
                selectedQueueId: nextProps.selectedQueueId
            });
        }
    }

    private _onRenderItem = (props: IComboBoxOption, defaultRender: (props: IComboBoxOption) => JSX.Element) => {
        if (props.key === Keys.clear) {
            return <CommandButton
                key={props.key}
                className="build-resource-clear-button"
                iconProps={{ iconName: "Clear" }}
                onClick={this._onClear}
                onKeyDown={this._onKeyDown}
                ariaLabel={BuildResources.ClearQueueAriaLabel}>
                {BuildResources.Clear}
            </CommandButton>;
        }

        return defaultRender(props);
    }

    private _onStoresUpdated = () => {
        this.setState(this._getState());
    }

    private _onClear = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        this._clear();
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        triggerEnterKeyHandler(event, this._clear);
    }

    private _onQueueChanged = (option: IComboBoxOption | null, index?: number) => {
        const key = (option && option.key as string) || null;
        this.props.onQueueChanged(key);
        this.setState({
            selectedQueueId: key
        });
    }

    private _clear = () => {
        this._onQueueChanged(null);
    }

    private _onTextChange = (event: React.FormEvent<IComboBox>) => {
        const target = event && event.target;
        if (target && !(target as HTMLInputElement).value) {
            // empty text, clear the queue
            this.props.onQueueChanged(null);
            this.setState({
                selectedQueueId: null
            });
        }
    }

    private _onMenuOpened = () => {
        if (!this._initialized) {
            // trigger fetch queues lazily
            this.setState({
                queues: this._queueStore.getQueues(TaskAgentQueueActionFilter.Use)
            });

            this._initialized = true;
        }
    }

    private _getState(): IQueuePickerState {
        return {
            queues: this._queueStore.getQueues(TaskAgentQueueActionFilter.Use),
        };
    }
}