import { ITaskDefinitionItem } from "DistributedTaskControls/Common/Types";

import { TaskDefinition } from "TFS/DistributedTask/Contracts";

export class TaskItemUtils {

    public static mapTaskDefinitionToITaskDefinitionItem(taskDefinition: TaskDefinition): ITaskDefinitionItem {
        let taskDefinitionItem: ITaskDefinitionItem = {
            id: taskDefinition.id,
            friendlyName: taskDefinition.friendlyName,
            name: taskDefinition.name,
            iconUrl: taskDefinition.iconUrl,
            description: taskDefinition.description,
            author: taskDefinition.author,
            category: taskDefinition.category,
            deprecated: taskDefinition.deprecated,
            helpMarkDown: taskDefinition.helpMarkDown,
            definitionType: taskDefinition.definitionType,
            version: taskDefinition.version,
            inputs: taskDefinition.inputs
        };

        return taskDefinitionItem;
    }

    public static readonly tasksIdentifierText: string = "_tasks";
}