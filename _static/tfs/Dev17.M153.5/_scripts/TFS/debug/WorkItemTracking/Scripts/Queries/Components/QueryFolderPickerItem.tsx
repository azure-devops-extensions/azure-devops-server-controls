import * as React from "react";
import { Icon } from "OfficeFabric/Icon";
import { QueryItem, QueryTreeItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { EmptyQueryItem } from "WorkItemTracking/Scripts/Queries/Components/EmptyQueryItem";

export interface IQueryFolderPickerItemProps {
    queryItem: QueryTreeItem;
}

export class QueryFolderPickerItem extends React.Component<IQueryFolderPickerItemProps> {
    constructor(props: IQueryFolderPickerItemProps) {
        super(props);
    }

    public render(): JSX.Element {
        const queryItem: QueryTreeItem = this.props.queryItem;

        const depth = this.props.queryItem.depth || 0;

        const columnClassName = "query-column-cell query-name-ellipsis";

        if (queryItem.item.isEmptyFolderContext) {
            // Display "No items in the folder." message when the folder is empty
            return <EmptyQueryItem queryItem={this.props.queryItem.item as QueryItem} leftIndent={0} />;
        } else {
            return <div>
                {queryItem.item.isFolder &&
                    // Name column for folder item
                    <div className={columnClassName} aria-level={depth} >
                        {depth > 0 && <Icon className={"bowtie-icon bowtie-folder"} />}
                        <span>{queryItem.item.name}</span>
                    </div>
                }
            </div>;
        }
    }
}
