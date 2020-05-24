import { IQueriesHubProps } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubProps";

export interface IWorkItemEditViewProps extends IQueriesHubProps {
    id?: string;
    templateId?: string;
    witd?: string;
    onWorkItemDeleted?: () => void;
    isNew?: boolean;
    requestParams?: IDictionaryStringTo<string>;
}
