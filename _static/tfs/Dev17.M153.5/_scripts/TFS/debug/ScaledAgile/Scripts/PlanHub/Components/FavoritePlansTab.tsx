/// <reference types="react" />

import * as React from "react";
import * as Locations from "VSS/Locations";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { PlansHubTab, IPlansHubTabProps, IPlansHubTabState } from "ScaledAgile/Scripts/PlanHub/Components/PlansHubTab";
import { TabLoading } from "ScaledAgile/Scripts/PlanHub/Components/TabLoading";
import { PlansList } from "ScaledAgile/Scripts/PlanHub/Components/PlansList";
import { ZeroData, IZeroDataProps } from "ScaledAgile/Scripts/Shared/Components/ZeroData";
import { PlansLoadingState } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";

export class FavoritePlansTab extends PlansHubTab<IPlansHubTabProps, IPlansHubTabState> {
    public render(): JSX.Element {
        // If the store has favorites then load the tab otherwise show the loading page.
        if (this.state.planHubStoreData.favoritesLoadingState !== PlansLoadingState.Ready) {
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
                    ariaLabel={ScaledAgileResources.FavoritesPlansAriaLabelPrefix + " " + ScaledAgileResources.PlanListPageTitle}
                    className={hasPlans ? "favorite-plans" : "favorite-plans hide"}
                    planHubActionsCreator={this.props.planHubActionsCreator}
                    items={plans}
                    sortedColumnKey={columnKey}
                    isSortedDescending={isSortedDescending} />
                {noFilterResults}
            </div>;
        }
        else {
            const secondaryTextString: string[] = ScaledAgileResources.FavoritePlansZeroDataSecondaryMessage.split("{0}");
            const props = {
                primaryMessage: ScaledAgileResources.FavoritePlansZeroDataPrimaryMessage,
                secondaryMessage:
                (
                    <span>
                        {secondaryTextString[0]}
                        <span className="bowtie-icon bowtie-favorite-outline"></span>
                        {secondaryTextString[1]}
                    </span>
                ),
                image: {
                    imageUrl: Locations.urlHelper.getVersionedContentUrl("ScaledAgile/favorites-landing.svg"),
                    altText: ScaledAgileResources.FavoritePlansLandingImageAltText
                },
                infoLink: {
                    href: "https://go.microsoft.com/fwlink/?linkid=830656",
                    linkText: ScaledAgileResources.FavoritePlansZeroDataLearnMore
                }
            } as IZeroDataProps;
            return <ZeroData {...props} />;
        }
    }
}
