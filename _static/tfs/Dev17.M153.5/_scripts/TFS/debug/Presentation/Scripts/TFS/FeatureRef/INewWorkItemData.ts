import { WorkItemTypeColorAndIcon } from "TFS/WorkItemTracking/Contracts";

export interface INewWorkItemData {
    workItemTypes?: string[];
    workItemTypeTexts?: { [name: string]: string };
    colorAndIcons?: { [name: string]: WorkItemTypeColorAndIcon };
    defaultMenuItem?: string;
    hasNewWorkItemPermission?: boolean;
}
