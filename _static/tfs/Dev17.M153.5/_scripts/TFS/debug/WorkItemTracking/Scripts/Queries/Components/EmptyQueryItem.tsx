import "VSS/LoaderPlugins/Css!Queries/Components/EmptyQueryItem";
import { QueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import * as React from "react";

export interface IEmptyQueryItemProps {
    queryItem: QueryItem;
    leftIndent: number;
    onRenderEmptyQueryItem?: (queryItem: QueryItem) => JSX.Element;
}

export const EmptyQueryItem: React.StatelessComponent<IEmptyQueryItemProps> =
    (props: IEmptyQueryItemProps): JSX.Element => {
        if (props.onRenderEmptyQueryItem) {
            return props.onRenderEmptyQueryItem(props.queryItem);
        }
        else {
            const emptyContentColumnClassName = "empty-query-item query-name-ellipsis-empty";

            // Display "No items in the folder." message when the folder is empty
            return <div style={{ paddingLeft: props.leftIndent }} className={emptyContentColumnClassName}>
                <span>{props.queryItem.name}</span>
            </div>;
        }
    }