import * as React from "react";
import { IDiffSummaryPropsBase } from "VersionControl/Scenarios/ChangeDetails/CommonInterfaces";
import { Filter } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import { ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { filterChangeListByPath } from "VersionControl/Scripts/Utils/DiffSummaryUtils";

export interface FilterableDiffSummaryProps {
    diffProps: IDiffSummaryPropsBase ;
    componentType: React.ComponentClass<IDiffSummaryPropsBase>;
}

/*
 * Component to hide the filtering (above 1k) logic from parent
 */

export class FilterableDiffSummary extends React.Component<FilterableDiffSummaryProps, {}> {
    public render(): JSX.Element {

        const shouldComponentApplyFilters: boolean = this.props.diffProps.changeList &&
            this.props.diffProps.resetSummaryView &&
            this.props.diffProps.maxDiffsToShow &&
            this.props.diffProps.changeList.changes.length > this.props.diffProps.maxDiffsToShow;
        
        let changelist: ChangeList = this.props.diffProps.changeList;
        let filter: Filter = this.props.diffProps.summaryFilter;

        if (shouldComponentApplyFilters) {
            if (!!filter) {
                changelist = filterChangeListByPath(
                    this.props.diffProps.repositoryContext,
                    changelist,
                    filter.path,
                    filter.recursive) ;

                filter = null; // optional - we have already filtered files, this is no more needed
            }
        }

        const Component = this.props.componentType;
        return  <Component
                    {...this.props.diffProps}
                    changeList = {changelist}
                    summaryFilter={filter}
                    />

    }
}
