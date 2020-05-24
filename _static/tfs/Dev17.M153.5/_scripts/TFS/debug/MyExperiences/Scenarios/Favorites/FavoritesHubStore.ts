import * as VSSStore from "VSS/Flux/Store";
import * as Service from "VSS/Service";

import { FavoritesActions } from "Favorites/Controls/FavoritesActions";
import { FavoritesState } from "Favorites/Controls/FavoritesModels";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";

import { HubItemGroup, IHubItem, HubData, IHubGroupColumn, IHubHeaderProps } from "MyExperiences/Scenarios/Shared/Models";
import { isOrgAccountSelectorEnabled } from "MyExperiences/Scenarios/Shared/OrgAccountSelectorFeatureAvailabilityCheckHelper";
import { BaseFavoriteHubItemContribution } from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import { FavoriteHubItem } from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import { FavoritesSettingsService } from "MyExperiences/Scenarios/Favorites/FavoritesSettingsService";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

export interface FavoritesHubState extends HubData, FavoritesState {
    favoriteItems: FavoriteHubItemData[];
    renderers: Contribution[];
    contributionsByType: IDictionaryStringTo<BaseFavoriteHubItemContribution<FavoriteHubItem>>;
    unfilteredGroups: HubItemGroup<IHubItem>[];
}

export class FavoritesHubStore extends FavoritesStore  {
    private dataService: FavoritesSettingsService;
    protected _state: FavoritesHubState;
    protected _actions: FavoritesActions;
    protected _receivedDataHandler: (data: FavoritesState) => void;

    constructor(actions: FavoritesActions) {
        super(actions);

        this._state.header = _getHeaderProps();
        this._state.allowGroupReordering = true;
        this._receivedDataHandler = (data: FavoritesHubState) => this.receivedHubData(data);
        this._actions.ReceiveData.addListener(this._receivedDataHandler);
    }

    public getState(): FavoritesHubState {
        return this._state;
    }

    public receivedHubData(state: FavoritesHubState) {
        this._state = state;
        this.emitChanged();
    }

    /**
     * Get the hub page title
     */
    public getTitle(): string {
        return MyExperiencesResources.FavoritesHubTitle;
    }

    /**
     * Get the placeholder text for search box
     */
    public getSearchWatermark(): string {
        return MyExperiencesResources.Favorites_SearchWatermark;
    }
}

function _getHeaderProps(): IHubHeaderProps {
    const headerProps: IHubHeaderProps = {
        title: MyExperiencesResources.FavoritesHubTitle,
        filter: {
            watermark: MyExperiencesResources.Favorites_SearchWatermark
        },
        isOrganizationInfoAndCollectionPickerEnabled: isOrgAccountSelectorEnabled(),
    };

    return headerProps;
}
