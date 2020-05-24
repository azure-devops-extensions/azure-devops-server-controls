/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { FilterPanelProps, FilterSearchCriteria } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import { FilterPanel } from "Presentation/Scripts/TFS/Controls/Filters/FilterPanel";
import { DateComponent } from "Presentation/Scripts/TFS/Controls/Filters/Components/DateComponent";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { FilterHelpers } from "Presentation/Scripts/TFS/Controls/Filters/FilterHelpers";

import * as IdentityPicker from "VersionControl/Scripts/Components/PullRequestReview/IdentityPicker";
import { PullRequestIdentityPickerComponent, PullRequestIdentityPickerHelpers } from "VersionControl/Scenarios/PullRequestList/PullRequestIdentityPicker";
import { HistoryModeComponent } from "VersionControl/Scenarios/Shared/Filters/Components/HistoryModeComponent";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_Date from "VSS/Utils/Date";

export interface PullRequestFilterSearchCriteria extends FilterSearchCriteria {
    creator: string;
    creatorAlias: string;
    creatorId: string;
    reviewer: string;
    reviewerAlias: string;
    reviewerId: string;
}

export interface PullRequestFilterCallbackSearchCriteria extends FilterSearchCriteria {
    creatorString: string;
    reviewerString: string;
}

export interface PullRequestFilterProps {
    filterUpdatedCallback(prFilterSearchCriteria: PullRequestFilterSearchCriteria): void;
    repositoryId: string;
    initialSearchCriteria?: PullRequestFilterSearchCriteria;
    mruAuthors?: string[];
    tfsContext: TfsContext;
}

export interface PullRequestFilterState {
    appliedSearchCriteria: PullRequestFilterSearchCriteria;
}

export class PullRequestListFilter extends React.Component<PullRequestFilterProps, PullRequestFilterState> {
    constructor(props: PullRequestFilterProps, context?: any) {
        super(props, context);

        this.state = {
            appliedSearchCriteria: $.extend({} as PullRequestFilterSearchCriteria, props.initialSearchCriteria),
        };
    }

    public componentWillReceiveProps(nextProps?: PullRequestFilterProps): void {
        this.setState({
            appliedSearchCriteria: $.extend({} as PullRequestFilterSearchCriteria, nextProps.initialSearchCriteria),
        });
    }

    public render(): JSX.Element {
        const props: FilterPanelProps = {
            className: "vc-pull-request-list-filter",
            filterUpdated: (updatedCriteria: PullRequestFilterCallbackSearchCriteria) => { this._handleFilterUpdated(updatedCriteria); },
            ariaLabel: VCResources.PullRequestListFilterAriaLabel,
        };
        const creatorString = PullRequestIdentityPickerHelpers.getIdentityStringFromPrIdentity({
            displayName: this.state.appliedSearchCriteria.creator,
            alias: this.state.appliedSearchCriteria.creatorAlias,
            originId: this.state.appliedSearchCriteria.creatorId
        });
        const reviewerString = PullRequestIdentityPickerHelpers.getIdentityStringFromPrIdentity({
            displayName: this.state.appliedSearchCriteria.reviewer,
            alias: this.state.appliedSearchCriteria.reviewerAlias,
            originId: this.state.appliedSearchCriteria.reviewerId
        });

        const consumerId: string = "CCD45B04-D52D-4A09-B188-E93E85479C4A";

        return (
            <FilterPanel { ...props }  >
                <PullRequestIdentityPickerComponent filterKey={"creatorString"} onUserInput={null}
                    filterValue={creatorString}
                    showGroups={false}
                    tfsContext={this.props.tfsContext}
                    placeholderText={VCResources.PullRequestListFilterCreatorPlaceholder}
                    ariaLabel={VCResources.PullRequestListFilterCreatorAriaLabel}
                    identityPickerSearchControlId={"pullrequest-author-identity-picker"}
                    identityPickerSearchControlClass={"vc-author-filter-identity-picker"}
                    repositoryId={this.props.repositoryId}
                    mruAuthors={this.props.mruAuthors}
                    consumerId={consumerId} />
                <PullRequestIdentityPickerComponent filterKey={"reviewerString"} onUserInput={null}
                    filterValue={reviewerString}
                    showGroups={true}
                    tfsContext={this.props.tfsContext}
                    placeholderText={VCResources.PullRequestListFilterReviewerPlaceholder}
                    ariaLabel={VCResources.PullRequestListFilterReviewerAriaLabel}
                    identityPickerSearchControlId={"pullrequest-reviewer-identity-picker"}
                    identityPickerSearchControlClass={"vc-reviewer-filter-identity-picker"}
                    repositoryId={this.props.repositoryId}
                    mruAuthors={this.props.mruAuthors}
                    consumerId={consumerId} />              
            </FilterPanel>
        );
    }

    private _handleFilterUpdated(callbackSearchCriteria: PullRequestFilterCallbackSearchCriteria): void {
        const filterSearchCriteria: PullRequestFilterSearchCriteria = this._getPrFilterSearchCriteria(callbackSearchCriteria);
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

    private _getPrFilterSearchCriteria(callbackSearchCriteria: PullRequestFilterCallbackSearchCriteria): PullRequestFilterSearchCriteria {
        const creatorIdentity = PullRequestIdentityPickerHelpers.parseIdentityString(callbackSearchCriteria.creatorString);
        const reviewerIdentity = PullRequestIdentityPickerHelpers.parseIdentityString(callbackSearchCriteria.reviewerString);
        
        const searchCriteria: PullRequestFilterSearchCriteria = {
            creator: creatorIdentity.displayName,
            creatorAlias: creatorIdentity.alias,
            creatorId: creatorIdentity.originId,
            reviewer: reviewerIdentity.displayName,
            reviewerAlias: reviewerIdentity.alias,
            reviewerId: reviewerIdentity.originId
        };
        return searchCriteria;
    }
}