/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as TfsContext from "VSS/Context";
import * as UserClaimsService from "VSS/User/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Date from "VSS/Utils/Date";

import { DateComponent } from "Presentation/Scripts/TFS/Controls/Filters/Components/DateComponent";
import { NewFilterPanelProps, FilterSearchCriteria } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import { NewFilterPanel } from "Presentation/Scripts/TFS/Controls/Filters/NewFilterPanel";
import { FilterHelpers } from "Presentation/Scripts/TFS/Controls/Filters/FilterHelpers";

import { GitHistoryMode } from "TFS/VersionControl/Contracts";
import { HistoryListFilterKeys } from "TFS/VersionControl/Controls";

import { AuthorComponent } from "VersionControl/Scenarios/Shared/Filters/Components/AuthorComponent";
import { HistoryModeComponent } from "VersionControl/Scenarios/Shared/Filters/Components/HistoryModeComponent";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";

export interface GitFilterSearchCriteria extends FilterSearchCriteria {
    user: string;
    alias: string;
    fromDate: string;
    toDate: string;
    gitLogHistoryMode: string;
}

export interface GitFilterCallbackSearchCriteria extends FilterSearchCriteria {
    userString: string;
    fromDate: string;
    toDate: string;
    gitLogHistoryMode: string;
}

export interface GitFilterProps {
    filterUpdatedCallback(gitFilterSearchCriteria: GitFilterSearchCriteria): void;
    repositoryId: string;
    initialSearchCriteria?: GitFilterSearchCriteria;
    mruAuthors?: string[];
    isFilterPanelVisible?: boolean;
    visibleFilters?: string[];
}

export interface GitFilterState {
    appliedSearchCriteria: GitFilterSearchCriteria;
}

export function RenderFilter(filterProps: GitFilterProps, container: HTMLElement): GitHistoryFilter {
    return ReactDOM.render(<GitHistoryFilter {...filterProps} />, container) as GitHistoryFilter;
}

export class GitHistoryFilter extends React.Component<GitFilterProps, GitFilterState> {

    private emptyGitSearchCriteria: GitFilterSearchCriteria;
    private timeZoneOffset: number;
    private _visibleFiltersMap: IDictionaryStringTo<boolean> = {};

    constructor(props: GitFilterProps, context?: any) {
        super(props, context);
        this.emptyGitSearchCriteria = {
            user: null,
            alias: null,
            fromDate: null,
            toDate: null,
            gitLogHistoryMode: null,
        };
        this._constructVisibleFiltersMap();
        this.timeZoneOffset = TfsContext.getPageContext().globalization.timezoneOffset;
        this.state = {
            appliedSearchCriteria: $.extend({}, this.emptyGitSearchCriteria, props.initialSearchCriteria),
        };
    }

    public componentWillReceiveProps(nextProps?: GitFilterProps): void {
        this.setState({
            appliedSearchCriteria: $.extend({}, this.emptyGitSearchCriteria, nextProps.initialSearchCriteria),
        });
    }

    public render(): JSX.Element {
        const props: NewFilterPanelProps = {
            className: "vc-git-history-filter",
            filterUpdated: (updatedCriteria: GitFilterCallbackSearchCriteria) => { this._handleFilterUpdated(updatedCriteria); },
            ariaLabel: VCResources.GitHistoryFilterAriaLabel,
            isFilterPanelVisible: this.props.isFilterPanelVisible
        };
        const userString = SearchCriteriaUtil.getAuthorfromTFSIdentity({
            displayName: this.state.appliedSearchCriteria.user,
            alias: this.state.appliedSearchCriteria.alias,
        });
        let startofDayToDate = this.state.appliedSearchCriteria.toDate;
        startofDayToDate = FilterHelpers.getStartOfDay(startofDayToDate);

        return (
            <NewFilterPanel {...props}  >
                {this._showFilter(HistoryListFilterKeys.HistoryMode)
                    &&
                    <HistoryModeComponent filterKey={"gitLogHistoryMode"} onUserInput={null}
                        filterValue={this.state.appliedSearchCriteria.gitLogHistoryMode} />
                }
                {this._showFilter(HistoryListFilterKeys.Author)
                    &&
                    <AuthorComponent filterKey={"userString"} onUserInput={null}
                        filterValue={userString}
                        placeholderText={VCResources.HistoryResultHeaderAuthor}
                        identityPickerSearchControlId={"commit-author-identity-picker"}
                        identityPickerSearchControlClass={"vc-author-filter-identity-picker"}
                        repositoryId={this.props.repositoryId}
                        mruAuthors={this.props.mruAuthors}
                        consumerId={"9A9B4218-2DAA-4ACF-8AA1-D685D447139B"} />
                }
                {this._showFilter(HistoryListFilterKeys.FromDate)
                    &&
                    <DateComponent filterKey={"fromDate"} ariaLabel={VCResources.FilterFromDateText}
                        placeholder={VCResources.FilterFromDateText} onUserInput={null}
                        filterValue={this.state.appliedSearchCriteria.fromDate} />
                }
                {this._showFilter(HistoryListFilterKeys.ToDate)
                    &&
                    <DateComponent filterKey={"toDate"} ariaLabel={VCResources.FilterToDateText}
                        placeholder={VCResources.FilterToDateText} onUserInput={null}
                        filterValue={startofDayToDate} />
                }
            </NewFilterPanel>
        );
    }

    private _constructVisibleFiltersMap(): void {
        if (this.props.visibleFilters) {
            this.props.visibleFilters.forEach((filter: string) => {
                this._visibleFiltersMap[filter] = true;
            });
        }
        this._updateAuthorVisiblity();
    }

    private _updateAuthorVisiblity(): void {
        this._visibleFiltersMap[HistoryListFilterKeys.Author] = UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member) &&
        (!this.props.visibleFilters || this._visibleFiltersMap[HistoryListFilterKeys.Author]);
    }

    private _showFilter(filter: string): boolean {
        if (HistoryListFilterKeys.Author === filter) {
            return this._visibleFiltersMap[filter];
        }
        return (!this.props.visibleFilters || this._visibleFiltersMap[filter]);
    }

    private _handleFilterUpdated(callbackSearchCriteria: GitFilterCallbackSearchCriteria): void {
        const filterSearchCriteria: GitFilterSearchCriteria = this._getGitFilterSearchCriteria(callbackSearchCriteria);
        this._normalizeDates(filterSearchCriteria);
        this.setState(
            {
                appliedSearchCriteria: filterSearchCriteria,
            },
            () => {
                if (this.props.filterUpdatedCallback) {
                    this.props.filterUpdatedCallback(filterSearchCriteria);
                }
            });
    }

    private _normalizeDates(searchCriteria: GitFilterSearchCriteria): void {
        FilterHelpers.swapFromAndToDatesIfRequired(searchCriteria);
        searchCriteria.toDate = FilterHelpers.getEndOfDay(searchCriteria.toDate);
    }

    private _getGitFilterSearchCriteria(callbackSearchCriteria: GitFilterCallbackSearchCriteria): GitFilterSearchCriteria {
        const userIdentity = SearchCriteriaUtil.getTFSIdentityfromAuthor(callbackSearchCriteria.userString);
        const searchCriteria: GitFilterSearchCriteria = {
            user: userIdentity.displayName,
            alias: userIdentity.alias,
            fromDate: callbackSearchCriteria.fromDate,
            toDate: callbackSearchCriteria.toDate,
            gitLogHistoryMode: callbackSearchCriteria.gitLogHistoryMode,
        };
        return searchCriteria;
    }
}
