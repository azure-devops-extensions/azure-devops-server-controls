import * as React from "react";
import { ITreeFilterProps, ContentLoadState } from "Search/Scenarios/Shared/Components/TreeFilter/TreeFilter.Props";
import { EditableTreeFilter } from "Search/Scenarios/Shared/Components/TreeFilter/EditableTreeFilter";
import { NonEditableTreeFilter } from "Search/Scenarios/Shared/Components/TreeFilter/NonEditableTreeFilter";
import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/TreeFilter/TreeFilter";

export const TreeFilter: React.StatelessComponent<ITreeFilterProps> = (props: ITreeFilterProps) => {
    const { searchable, contentLoadState } = props;
    const editable = searchable || contentLoadState !== ContentLoadState.LoadSuccess;

    return editable ? (
        <EditableTreeFilter {...props} />)
        : <NonEditableTreeFilter {...props} />;
}