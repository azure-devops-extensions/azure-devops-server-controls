import * as Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FavoritesDataService } from "Favorites/Controls/FavoritesDataService";
import { FavoritesDataProvider } from "Favorites/Controls/FavoritesDataProvider";
import { Favorite, FavoriteProvider}  from "Favorites/Contracts";


export class FavoritesContributionLoader {
     /**
     * Based on whether favorites are discovered, get contributions
     */
    public getContributions(): IPromise<Contribution[]> {
        let extensionService = Service.getService(Contribution_Services.ExtensionService);
        let favoriteDataService = Service.getService(FavoritesDataService);
        let providers = favoriteDataService.getProviders();
        let contributionIds: string[] = [];
        providers.forEach((provider: FavoriteProvider) => contributionIds.push(provider.contributionId));
        return extensionService.getContributions(contributionIds, true, false, false, "ms.vss-favorites.favorite-provider");
    }
}