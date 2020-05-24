import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import {
    IComboBoxOption,
    SelectableOptionMenuItemType
} from "OfficeFabric/ComboBox";
import { getId } from "OfficeFabric/Utilities";

import { TaskAgentQueue, TaskAgentPoolReference } from "TFS/DistributedTask/Contracts";

import { logInfo } from "VSS/Diag";
import { arrayEquals } from "VSS/Utils/Array";
import { empty } from "VSS/Utils/String";

export interface IAgentQueueOption extends IComboBoxOption {
    key: string;
    data: TaskAgentQueue | null;
}

export interface IAgentQueueData {
    hostedQueues: TaskAgentQueue[];
    privateQueues: TaskAgentQueue[];
}

export interface IAgentInformation {
    hasNoAgents: boolean;
}

export class AgentQueueDropdownUtils {
    public static InvalidKey = -1;
    public static InvalidKeyString = AgentQueueDropdownUtils.InvalidKey.toString();
    public static Hosted = getId("Hosted");
    public static Private = getId("Private");

    public static areQueuesEqual(source: TaskAgentQueue[], target: TaskAgentQueue[]): boolean {
        if (!source && !target) {
            return true;
        }

        if ((source && !target)
            || (target && !source)
            || ((source && target) && (source.length !== target.length))) {
            return false;
        }

        return arrayEquals(source, target, (sourceQueue, targetQueue) => {
            return sourceQueue.id === targetQueue.id
                && AgentQueueDropdownUtils.arePoolReferencesEqual(sourceQueue.pool, targetQueue.pool);
        });
    }

    public static arePoolReferencesEqual(source: TaskAgentPoolReference, target: TaskAgentPoolReference) {
        if (!source && !target) {
            return true;
        }

        if ((source && !target)
            || (target && !source)) {
            return false;
        }

        if (source.size !== target.size) {
            return false;
        }

        return true;
    }

    public static getErrorMessage(selectedKey: string, queues: TaskAgentQueue[]) {
        const selectedKeyId = parseInt(selectedKey);
        const possibleAgentId = isNaN(selectedKeyId) ? -1 : selectedKeyId;
        let isSelectedQueueAvailable = false;
        if (possibleAgentId !== AgentQueueDropdownUtils.InvalidKey) {
            isSelectedQueueAvailable = queues.some((queue) => {
                return queue.id === possibleAgentId;
            });
        }

        return !isSelectedQueueAvailable ? Resources.RequiredInputErrorMessage : empty;
    }

    public static getQueueData(queues: TaskAgentQueue[]): IAgentQueueData {
        logInfo(`Splitting queues ${JSON.stringify(queues)} into hosted and private...`);

        let hostedQueues: TaskAgentQueue[] = [];
        let privateQueues: TaskAgentQueue[] = [];

        (queues || []).forEach((queue) => {
            if (queue.pool && queue.pool.isHosted) {
                hostedQueues.push(queue);
            }
            else {
                privateQueues.push(queue);
            }
        });

        return {
            hostedQueues: hostedQueues,
            privateQueues: privateQueues
        };
    }

    public static getSelectedQueueFromValue(value: string, queues: TaskAgentQueue[]): TaskAgentQueue {
        logInfo(`Searching for value ${value} in queues ${JSON.stringify(queues)} ...`);

        let agentQueue = null;
        if (!!value) {
            const matchingQueues = queues.filter((queue) => {
                return queue.name.toLocaleLowerCase() === value.toLocaleLowerCase();
            });
            if (matchingQueues && matchingQueues[0]) {
                agentQueue = matchingQueues[0];
            }
        }

        return agentQueue;
    }

    public static getSelectedKey(selectedAgentQueueId: number): string {
        // 0 is valid in this case, so we are not doing !!selectedAgentQueueId
        if (selectedAgentQueueId !== null && selectedAgentQueueId !== undefined && selectedAgentQueueId >= 0) {
            return selectedAgentQueueId + "";
        }

        return AgentQueueDropdownUtils.InvalidKeyString;
    }

    public static getHeaderOption(key: string, displayValue: string): IAgentQueueOption {
        return {
            key: getId(key),
            text: displayValue,
            itemType: SelectableOptionMenuItemType.Header,
            data: null
        };
    }

    public static getOptions(queues: TaskAgentQueue[]): IAgentQueueOption[] {
        return queues.map((queue) => {
            return {
                key: queue.id.toString(),
                text: queue.name,
                data: queue
            } as IAgentQueueOption;
        });
    }

    public static getAgentInformation(queue: TaskAgentQueue): IAgentInformation {
        let agentInformation = {} as IAgentInformation;
        if (queue && queue.pool && queue.pool.size === 0) {
            agentInformation.hasNoAgents = true;
        }

        return agentInformation;
    }
}