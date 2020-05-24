import * as React from "react";
import * as ReactDOM from "react-dom";

import { FilterHelpers } from "Presentation/Scripts/TFS/Controls/Filters/FilterHelpers";
import { NewFilterPanel } from "Presentation/Scripts/TFS/Controls/Filters/NewFilterPanel";
import { NewFilterPanelProps, FilterSearchCriteria } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import { DateComponent } from "Presentation/Scripts/TFS/Controls/Filters/Components/DateComponent";
import { TextFieldComponent } from "Presentation/Scripts/TFS/Controls/Filters/Components/TextFieldComponent";
import { IdentityPickerComponent } from "Presentation/Scripts/TFS/Controls/Filters/Components/IdentityPickerComponent";

import { TfvcRangeSelectorComponent, TfvcfilterRange } from "VersionControl/Scenarios/Shared/Filters/Components/TfvcRangeSelectorComponent";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";

export function RenderFilter(container: HTMLElement, filterProps: ChangesetsFilterProps): ChangesetsFilter {
    return ReactDOM.render(<ChangesetsFilter {... filterProps} />, container) as ChangesetsFilter;
}

export interface ChangesetsFilterSearchCriteria extends FilterSearchCriteria {
    userName: string;
    userId: string;
    fromDate: string;
    toDate: string;
    fromVersion: string;
    toVersion: string;
}

export interface ChangesetsFilterCallbackSearchCriteria extends FilterSearchCriteria {
    userString: string;
    fromDate: string;
    toDate: string;
    selectedRange: string;
    fromVersion: string;
    toVersion: string;
}

export interface ChangesetsFilterProps {
    filterUpdatedCallback(filterSearchCriteria: ChangesetsFilterSearchCriteria): void;
    initialSearchCriteria?: ChangesetsFilterSearchCriteria;
}

export interface ChangesetsFilterState {
    appliedSearchCriteria: ChangesetsFilterSearchCriteria;
    selectedRange: TfvcfilterRange;
}

export class ChangesetsFilter extends React.Component<ChangesetsFilterProps, ChangesetsFilterState> {

    private _emptyChangesetsFilterSearchCriteria: ChangesetsFilterSearchCriteria;

    constructor(props: ChangesetsFilterProps) {
        super(props);
        this._emptyChangesetsFilterSearchCriteria = {
            userName: null,
            userId: null,
            fromDate: null,
            toDate: null,
            fromVersion: null,
            toVersion: null,
        } as ChangesetsFilterSearchCriteria;

        this.state = {
            appliedSearchCriteria: $.extend({}, this._emptyChangesetsFilterSearchCriteria, props.initialSearchCriteria),
            selectedRange: this._calculateSelectedRange(props.initialSearchCriteria),
        };
    }

    public componentWillReceiveProps(nextProps?: ChangesetsFilterProps): void {
        this.setState({
            appliedSearchCriteria: $.extend({}, this._emptyChangesetsFilterSearchCriteria, nextProps.initialSearchCriteria),
            selectedRange: this._calculateSelectedRange(nextProps.initialSearchCriteria),
        });
    }

    public render(): JSX.Element {
        const props: NewFilterPanelProps = {
            className: "vc-changesets-filter",
            filterUpdated: (updatedCriteria: ChangesetsFilterCallbackSearchCriteria) => { this._handleFilterUpdated(updatedCriteria); },
            ariaLabel: VCResources.TfvcChangesetsFilterAriaLabel,
            isFilterPanelVisible: true,
        };
        const userString = SearchCriteriaUtil.getAuthorfromTFSIdentity({
            displayName: this.state.appliedSearchCriteria.userName,
            alias: this.state.appliedSearchCriteria.userId,
        });
        let startofDayToDate = this.state.appliedSearchCriteria.toDate;
        startofDayToDate = FilterHelpers.getStartOfDay(startofDayToDate);

        const isDateRange = this.state.selectedRange === TfvcfilterRange.DateRange;

        return (
            <NewFilterPanel { ...props }>
                <IdentityPickerComponent
                    filterKey={"userString"}
                    onUserInput={null}
                    filterValue={userString}
                    identityPickerSearchControlId={"changeset-author-identity-picker"}
                    identityPickerSearchControlClass={"vc-filter-identity-picker"}
                    consumerId="4cc01cc6-9dd3-4e55-8c45-f139016e1302"
                    placeholderText={VCResources.HistoryResultHeaderAuthor} />
                <TfvcRangeSelectorComponent
                    filterKey={"selectedRange"}
                    onUserInput={null}
                    filterValue={ isDateRange ? null : this.state.selectedRange.toString()} />
                {
                    isDateRange
                    ? <DateComponent
                        filterKey={"fromDate"}
                        ariaLabel={VCResources.FilterFromDateText}
                        placeholder={VCResources.FilterFromDateText}
                        onUserInput={null}
                        filterValue={this.state.appliedSearchCriteria.fromDate} />
                    : <TextFieldComponent
                        filterKey={"fromVersion"}
                        onUserInput={null}
                        placeholder={VCResources.ChangesetListFrom}
                        filterValue={this.state.appliedSearchCriteria.fromVersion}
                        onGetErrorMessage={this._validateNumber} />
                }
                {
                    isDateRange
                    ? <DateComponent
                        filterKey={"toDate"}
                        ariaLabel={VCResources.FilterToDateText}
                        placeholder={VCResources.FilterToDateText}
                        onUserInput={null}
                        filterValue={startofDayToDate} />
                    : <TextFieldComponent
                        filterKey={"toVersion"}
                        onUserInput={null}
                        placeholder={VCResources.ChangesetListTo}
                        filterValue={this.state.appliedSearchCriteria.toVersion}
                        onGetErrorMessage={this._validateNumber} />
                }
            </NewFilterPanel>
        );
    }

    private _validateNumber = (value: string): string => {
        return isNaN(Number(value))
            ? VCResources.FiltersNumberValidationError
            : "";
    }

    private _handleFilterUpdated(callbackSearchCriteria: ChangesetsFilterCallbackSearchCriteria): void {
        const filterSearchCriteria: ChangesetsFilterSearchCriteria = this._getFilterSearchCriteria(callbackSearchCriteria);
        this._normalizeDates(filterSearchCriteria);
        this._normalizeChangesetNumbers(filterSearchCriteria);

        let selectedRange: TfvcfilterRange = TfvcfilterRange.DateRange;
        if (callbackSearchCriteria.selectedRange){
            const rangeString: string = TfvcfilterRange[callbackSearchCriteria.selectedRange];
            selectedRange = TfvcfilterRange[rangeString];
        }
        if (selectedRange !== this.state.selectedRange) {
            switch (selectedRange) {
                case TfvcfilterRange.DateRange:
                    filterSearchCriteria.fromVersion = null;
                    filterSearchCriteria.toVersion = null;
                    break;
                case TfvcfilterRange.ChangesetNumberRange:
                    filterSearchCriteria.fromDate = null;
                    filterSearchCriteria.toDate = null;
                    break;
            }
        }

        this.setState(
            {
                appliedSearchCriteria: filterSearchCriteria,
                selectedRange: selectedRange,
            },
            () => {
            if (this.props.filterUpdatedCallback) {
                this.props.filterUpdatedCallback(filterSearchCriteria);
            }
        });
    }

    private _normalizeDates(searchCriteria: ChangesetsFilterSearchCriteria): void {
        FilterHelpers.swapFromAndToDatesIfRequired(searchCriteria);
        searchCriteria.toDate = FilterHelpers.getEndOfDay(searchCriteria.toDate);
    }

    private _normalizeChangesetNumbers(searchCriteria: ChangesetsFilterSearchCriteria): void {
        const fromVersion = searchCriteria.fromVersion;
        const toVersion = searchCriteria.toVersion;
        if (fromVersion && toVersion && Number(fromVersion) > Number(toVersion)) {
            searchCriteria.fromVersion = toVersion;
            searchCriteria.toVersion = fromVersion;
        }
    }

    private _getFilterSearchCriteria(callbackSearchCriteria: ChangesetsFilterCallbackSearchCriteria): ChangesetsFilterSearchCriteria {
        const userIdentity = SearchCriteriaUtil.getTFSIdentityfromAuthor(callbackSearchCriteria.userString);
        const searchCriteria: ChangesetsFilterSearchCriteria = {
            userName: userIdentity.displayName,
            userId: userIdentity.alias,
            fromDate: callbackSearchCriteria.fromDate,
            toDate: callbackSearchCriteria.toDate,
            fromVersion: callbackSearchCriteria.fromVersion,
            toVersion: callbackSearchCriteria.toVersion,
        };
        return searchCriteria;
    }

    private _calculateSelectedRange(searchCriteria: ChangesetsFilterSearchCriteria): TfvcfilterRange {
        const isVersionRange = searchCriteria.fromVersion || searchCriteria.toVersion;
        const isDateRange = searchCriteria.fromDate || searchCriteria.toDate;
        let selectedRange = (this.state && this.state.selectedRange) || TfvcfilterRange.DateRange;

        if (isVersionRange && !isDateRange) {
            selectedRange = TfvcfilterRange.ChangesetNumberRange;
        }

        return selectedRange;
    }
}
