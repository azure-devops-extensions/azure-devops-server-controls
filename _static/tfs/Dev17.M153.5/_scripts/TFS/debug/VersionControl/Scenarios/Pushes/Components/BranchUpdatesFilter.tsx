import * as React from "react";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Identities_Picker_Services from "VSS/Identities/Picker/Services";
import * as UserClaimsService from "VSS/User/Services";

import { DateComponent } from "Presentation/Scripts/TFS/Controls/Filters/Components/DateComponent";
import { IdentityPickerComponent } from "Presentation/Scripts/TFS/Controls/Filters/Components/IdentityPickerComponent";
import { MultiIdentityPickerComponent } from "Presentation/Scripts/TFS/Controls/Filters/Components/MultiIdentityPickerComponent";
import { FilterHelpers } from "Presentation/Scripts/TFS/Controls/Filters/FilterHelpers";
import { NewFilterPanelProps, FilterSearchCriteria } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import { NewFilterPanel } from "Presentation/Scripts/TFS/Controls/Filters/NewFilterPanel";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";

export interface BranchUpdatesFilterSearchCriteria extends FilterSearchCriteria {
    userName: string;
    userId: string;
    fromDate: string;
    toDate: string;
    excludeUsers: string;
}

export interface BranchUpdatesFilterCallbackSearchCriteria extends FilterSearchCriteria {
    userString: string;
    fromDate: string;
    toDate: string;
    excludeUserString: string;
}

export interface BranchUpdatesFilterProps {
    filterUpdatedCallback(branchUpdatesFilterSearchCriteria: BranchUpdatesFilterSearchCriteria): void;
    repositoryId: string;
    initialSearchCriteria?: BranchUpdatesFilterSearchCriteria;
    isFilterPanelVisible: boolean;
}

export interface BranchUpdatesFilterState {
    appliedSearchCriteria: BranchUpdatesFilterSearchCriteria;
}

export class BranchUpdatesFilter extends React.Component<BranchUpdatesFilterProps, BranchUpdatesFilterState> {

    private emptyBranchUpdatesSearchCriteria: BranchUpdatesFilterSearchCriteria;

    constructor(props: BranchUpdatesFilterProps, context?: any) {
        super(props, context);
        this.emptyBranchUpdatesSearchCriteria = {
            userName: null,
            userId: null,
            fromDate: null,
            toDate: null,
            excludeUsers: null,
        };
        this.state = {
            appliedSearchCriteria: $.extend({}, this.emptyBranchUpdatesSearchCriteria, props.initialSearchCriteria),
        };
    }

    public componentWillReceiveProps(nextProps?: BranchUpdatesFilterProps): void {
        this.setState({
            appliedSearchCriteria: $.extend({}, this.emptyBranchUpdatesSearchCriteria, nextProps.initialSearchCriteria),
        });
    }

    public render(): JSX.Element {
        const props: NewFilterPanelProps = {
            className: "vc-git-branch-updates-filter",
            filterUpdated: (updatedCriteria: BranchUpdatesFilterCallbackSearchCriteria) => { this._handleFilterUpdated(updatedCriteria); },
            ariaLabel: VCResources.GitBranchUpdatesFilterAriaLabel,
            isFilterPanelVisible: this.props.isFilterPanelVisible,
        };
        const userString = SearchCriteriaUtil.getAuthorfromTFSIdentity({
            displayName: this.state.appliedSearchCriteria.userName,
            alias: this.state.appliedSearchCriteria.userId,
        });
        let startofDayToDate = this.state.appliedSearchCriteria.toDate;
        startofDayToDate = FilterHelpers.getStartOfDay(startofDayToDate);

        // show exclude filter if excluded pushers are there or no included pushers
        const showExcludePusherFilter = (this.isExcludePushersEnabled() && (!!this.state.appliedSearchCriteria.excludeUsers || !userString));
        // show include if included pushers are there or no excluded pushers
        const showIncludePusherFilter = (UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member)
            && (!this.isExcludePushersEnabled() || !!userString || !this.state.appliedSearchCriteria.excludeUsers));

        return (
            <NewFilterPanel {...props}  >
                {
                    showIncludePusherFilter &&
                    <IdentityPickerComponent
                        filterKey={"userString"}
                        onUserInput={null}
                        filterValue={userString}
                        identityPickerSearchControlId={"branch-author-identity-picker"}
                        identityPickerSearchControlClass={"vc-filter-identity-picker"}
                        consumerId={"D8CE635A-FF23-4E21-B672-D90378CDD732"}
                        placeholderText={VCResources.FilterPushedByText}
                        callbacks={
                            {
                                preDropdownRender: ignoreNonLocalIdentities
                            }
                        }
                    />
                }
                <DateComponent
                    filterKey={"fromDate"}
                    ariaLabel={VCResources.FilterFromDateText}
                    placeholder={VCResources.FilterFromDateText}
                    onUserInput={null}
                    filterValue={this.state.appliedSearchCriteria.fromDate}
                />
                <DateComponent
                    filterKey={"toDate"}
                    ariaLabel={VCResources.FilterToDateText}
                    placeholder={VCResources.FilterToDateText}
                    onUserInput={null}
                    filterValue={startofDayToDate}
                />
                {
                    showExcludePusherFilter &&
                    <MultiIdentityPickerComponent
                        filterKey={"excludeUserString"}
                        onUserInput={null}
                        filterValue={this.state.appliedSearchCriteria.excludeUsers}
                        identityPickerSearchControlId={"branch-exclude-author-identity-picker"}
                        identityPickerSearchControlClass={"vc-filter-identity-picker"}
                        consumerId={"310CE058-BE1C-432B-989D-B5CA5F6277C4"}
                        placeholderText={VCResources.FilterExcludingPushedByText}
                        callbacks={
                            {
                                preDropdownRender: ignoreNonLocalIdentities
                            }
                        }
                    />
                }
            </NewFilterPanel>
        );
    }

    private isExcludePushersEnabled(): boolean {
        return (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlGitPushersExclusionFilter, false));
    }

    private _handleFilterUpdated(callbackSearchCriteria: BranchUpdatesFilterCallbackSearchCriteria): void {
        const filterSearchCriteria: BranchUpdatesFilterSearchCriteria = this._getBranchUpdatesFilterSearchCriteria(callbackSearchCriteria);
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

    private _normalizeDates(searchCriteria: BranchUpdatesFilterSearchCriteria): void {
        FilterHelpers.swapFromAndToDatesIfRequired(searchCriteria);
        searchCriteria.toDate = FilterHelpers.getEndOfDay(searchCriteria.toDate);
    }

    private _getBranchUpdatesFilterSearchCriteria(callbackSearchCriteria: BranchUpdatesFilterCallbackSearchCriteria): BranchUpdatesFilterSearchCriteria {
        const userIdentity = SearchCriteriaUtil.getTFSIdentityfromAuthor(callbackSearchCriteria.userString);
        return {
            userName: userIdentity.displayName,
            userId: userIdentity.alias,
            fromDate: callbackSearchCriteria.fromDate,
            toDate: callbackSearchCriteria.toDate,
            excludeUsers: callbackSearchCriteria.excludeUserString,
        };
    }
}

/**
 * Filter out identities that don't contain VSID.
 */
const ignoreNonLocalIdentities =
    (entityList: Identities_Picker_RestClient.IEntity[]) => entityList && entityList.filter(entity => !!entity.localId);