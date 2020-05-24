import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { JobStates } from "DistributedTaskUI/Logs/Logs.Types";

import { SelectionMode } from "OfficeFabric/Selection";
import { autobind, css } from "OfficeFabric/Utilities";

import { ILogsFilterState } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IPickListItem, PickListFilterBarItem } from "VSSUI/PickList";
import { Filter, FILTER_CHANGE_EVENT, IFilterState } from "VSSUI/Utilities/Filter";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabFiltersView";

export interface ILogsTabFiltersProps extends Base.IProps {
    onFilterChanged: (filterState: ILogsFilterState) => void;
    currentFilterState?: ILogsFilterState;
    filter?: Filter; //used for unit testing
}

export class LogsTabFiltersView extends React.Component<ILogsTabFiltersProps, Base.IStateless> {

    constructor(props) {
        super(props);
        if (props.filter) {
            this._filter = props.filter;
        }
        else {
            this._filter = new Filter();
        }

        let filterState: IFilterState = this._filter.getState();
        filterState[this._nameFilterKey] = { value: Utils_String.empty };
        filterState[this._statusFilterKey] = { value: this._getDefaultPickListItems() };
        this._filter.setState(filterState, true);
    }

    public componentDidMount() {
        this._filter.subscribe(this._onFilterUpdated, FILTER_CHANGE_EVENT);
        if (this.props.currentFilterState) {
            this._setFilterStateFromLogsFilterState(this.props.currentFilterState);
        }
    }

    public componentWillUnmount() {
        this._filter.unsubscribe(this._onFilterUpdated, FILTER_CHANGE_EVENT);
    }

    public render() {
        return (
            <div className={css("logs-filter-bar")}>
                <FilterBar
                    filter={this._filter}>

                    <KeywordFilterBarItem
                        filterItemKey={this._nameFilterKey}
                        placeholder={Resources.FilterByKeywordsText}
                        throttleWait={500}
                    />

                    <PickListFilterBarItem
                        placeholder={Resources.StatusFilterText}
                        filterItemKey={this._statusFilterKey}
                        selectionMode={SelectionMode.multiple}
                        getPickListItems={this._getPickListItems}
                        getListItem={this._getStatusPickListItem}
                    />

                </FilterBar>
            </div>
        );
    }

    @autobind
    private _onFilterUpdated(filterState: IFilterState) {
        let logsFilterState: ILogsFilterState = this._mapToFilterState(this._filter.getState());
        this.props.onFilterChanged(logsFilterState);
    }

    private _mapToFilterState(filterState: IFilterState): ILogsFilterState {
        let logsFilterState: ILogsFilterState = { filterText: Utils_String.empty, jobStates: JobStates.Undefined };

        if (filterState.hasOwnProperty(this._nameFilterKey)) {
            const filterItemState = filterState[this._nameFilterKey];
            logsFilterState.filterText = filterItemState.value as string;
        }

        if (filterState.hasOwnProperty(this._statusFilterKey)) {
            const selectedStatus: JobStates[] = filterState[this._statusFilterKey].value;
            let status: JobStates = JobStates.Undefined;
            selectedStatus.forEach(ss => {
                status = status | ss;
            });
            logsFilterState.jobStates = status;
        }

        return logsFilterState;
    }

    private _setFilterStateFromLogsFilterState(logsFilterState: ILogsFilterState) {
        if (logsFilterState) {
            let filterState: IFilterState = {};

            if (logsFilterState.filterText) {
                filterState[this._nameFilterKey] = { value: logsFilterState.filterText };
            }
            else {
                filterState[this._nameFilterKey] = { value: Utils_String.empty };
            }

            let selectedStates: JobStates[] = [];
            this._getPickListItems().forEach((jobState: JobStates) => {
                if ((jobState & logsFilterState.jobStates) === jobState) {
                    selectedStates.push(jobState);
                }
            });
            filterState[this._statusFilterKey] = { value: selectedStates };
            this._filter.setState(filterState);
        }
    }

    @autobind
    private _getPickListItems(): JobStates[] {
        return [JobStates.Pending, JobStates.InProgress, JobStates.Succeeded, JobStates.PartiallySucceeded, JobStates.Failed, JobStates.Cancelled, JobStates.Skipped];
    }

    private _getDefaultPickListItems(): JobStates[] {
        return [];
    }

    @autobind
    private _getStatusPickListItem(status: JobStates): IPickListItem {

        let jobStateString: string = Utils_String.empty;
        switch (status) {
            case JobStates.Pending:
                jobStateString = Resources.NotStartedText;
                break;
            case JobStates.InProgress:
                jobStateString = Resources.InProgressText;
                break;
            case JobStates.Succeeded:
                jobStateString = Resources.SucceededText;
                break;
            case JobStates.PartiallySucceeded:
                jobStateString = Resources.PartiallySucceededText;
                break;
            case JobStates.Failed:
                jobStateString = Resources.FailedText;
                break;
            case JobStates.Cancelled:
                jobStateString = Resources.CanceledText;
                break;
            case JobStates.Skipped:
                jobStateString = Resources.SkippedText;
                break;
            case JobStates.ApprovalPending:
                jobStateString = Resources.JobApprovalPendingStatus;
                break;
            case JobStates.Approved:
                jobStateString = Resources.JobApprovedStatus;
                break;
            case JobStates.AutomatedApproval:
                jobStateString = Resources.JobApprovedAutomaticallyStatus;
                break;
            case JobStates.Cancelling:
                jobStateString = Resources.JobStateCanceling;
                break;
            case JobStates.EvaluatingGates:
                jobStateString = Resources.EvaluatingGatesTooltip;
                break;
            case JobStates.GatesFailed:
                jobStateString = Resources.JobStateGatesFailed;
                break;
            case JobStates.GatesPartiallySucceeded:
                jobStateString = Resources.JobStateGatesPartiallySucceeded;
                break;
            case JobStates.Succeeded:
                jobStateString = Resources.JobStateGatesSucceeded;
                break;
            default:
                jobStateString = Resources.EnvironmentStatusUndefined;
                break;
        }
        return {
            name: jobStateString,
            key: status.toString()
        } as IPickListItem;
    }

    private _filter: Filter;
    private readonly _nameFilterKey: string = "nameFilterKey";
    private readonly _statusFilterKey: string = "statusFilterKey";

}