/// <reference types="react" />

import * as React from "react";
import * as Locations from "VSS/Locations";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { Constants } from "ScaledAgile/Scripts/Generated/TFS.ScaledAgile.Constants";
import { PlansHubTab, IPlansHubTabProps, IPlansHubTabState } from "ScaledAgile/Scripts/PlanHub/Components/PlansHubTab";
import { PlansList } from "ScaledAgile/Scripts/PlanHub/Components/PlansList";
import { TabLoading } from "ScaledAgile/Scripts/PlanHub/Components/TabLoading";
import { ZeroData, IZeroDataProps } from "ScaledAgile/Scripts/Shared/Components/ZeroData";
import { PlansLoadingState } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";
import { PrimaryButton } from "OfficeFabric/Button";

export class AllPlansTab extends PlansHubTab<IPlansHubTabProps, IPlansHubTabState> {
    public render(): JSX.Element {
        // If the store has all plans and favorites then load the tab otherwise show the loading page.
        if (this.state.planHubStoreData.allPlansLoadingState !== PlansLoadingState.Ready || this.state.planHubStoreData.favoritesLoadingState !== PlansLoadingState.Ready) {
            return <TabLoading />;
        }

        const plans = this.state.planHubStoreData.displayedPlans;
        if (plans.length > 0 || this.state.planHubStoreData.isFiltering) {
            const columnKey = this.state.planHubStoreData.sortOptions.columnKey;
            const isSortedDescending = this.state.planHubStoreData.sortOptions.isSortedDescending;
            const hasPlans = plans.length > 0;
            const noFilterResults = !hasPlans && this.state.planHubStoreData.isFiltering ? <label className="no-results-label">{ScaledAgileResources.NoResultsFound}</label> : null;

            return <div>
                <PlansList
                    ariaLabel={ScaledAgileResources.AllPlansAriaLabelPrefix + " " + ScaledAgileResources.PlanListPageTitle}
                    className={hasPlans ? "all-plans" : "all-plans hide"}
                    planHubActionsCreator={this.props.planHubActionsCreator}
                    items={plans}
                    sortedColumnKey={columnKey}
                    isSortedDescending={isSortedDescending} />
                {noFilterResults}
            </div>;
        }
        else {
            const props = {
                primaryMessage: ScaledAgileResources.AllPlansZeroDataPrimaryMessage,
                secondaryMessage: ScaledAgileResources.AllPlansZeroDataSecondaryMessage,
                image: {
                    imageUrl: Locations.urlHelper.getVersionedContentUrl("ScaledAgile/plans-landing.svg"),
                    altText: ScaledAgileResources.AllPlansLandingImageAltText
                },
                action: <PrimaryButton role="link" onClick={this._onNewPlanClick}>{ScaledAgileResources.NewPlanCTA}</PrimaryButton>
            } as IZeroDataProps;

            return <ZeroData {...props} />;
        }
    }

    private _onNewPlanClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        this.props.planHubActionsCreator.openPlan(Constants.CreateWizardViewId);
    }
}
