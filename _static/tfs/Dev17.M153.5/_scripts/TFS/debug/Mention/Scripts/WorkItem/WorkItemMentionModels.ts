import { IColorAndIcon } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

export interface IWorkItem {
    id: number;
    title: string;
    colorAndIcon: IColorAndIcon;
    projectName: string;
    workItemType: string;
}

export interface IWorkItemMention {
    workItemId: number;
}

export interface IWorkItemMentionRenderOptions {
    /**
     * If provided, this click handler is executed when workItem mention link is clicked.
     * @param workItem Corresponding workItem.
     * @param url Url for the provided workItem.
     * @param defaultCallback Default action that would be executed if this handler is not defined. You can use that
     * to fallback to the default behavior if needed.
     */
    onWorkItemClick?: (workItem: IWorkItem,
        url: string,
        defaultCallback: () => void,
    ) => void;
}