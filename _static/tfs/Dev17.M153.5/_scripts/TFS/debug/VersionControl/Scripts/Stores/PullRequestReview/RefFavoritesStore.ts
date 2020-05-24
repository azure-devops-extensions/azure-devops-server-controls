import { Store } from "VSS/Flux/Store";
import { first } from "VSS/Utils/Array";

import { GitRefFavorite } from "TFS/VersionControl/Contracts";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { IBranchStatus } from "VersionControl/Scripts/TFS.VersionControl.PullRequest";

export interface RefFavoritesState {
    refFavorites: GitRefFavorite[];
    canFavorite: boolean;
}

export interface BranchFavoriteStatus {
    refName: string;
    canFavorite: boolean;
    isFavorite: boolean;
    favoriteId: number;
}

/**
 * Details about the favorite status of branches of the PR.
 */
export class RefFavoritesStore extends Store {
    public state = {
        refFavorites: [],
        canFavorite: true,
    } as RefFavoritesState;

    /**
     * Load significant favorites for current user.
     */
    public loadRefFavorites = ({ refFavorites }: Actions.IBranchesFavoriteUpdatedPayload): void => {
        this.setState({ refFavorites });
    }

    public loadCanFavorite = ({ canFavorite }: Actions.IPullRequestDetailPayload): void => {
        this.setState({ canFavorite });
    }

    /**
     * Add this branch favorite.
     */
    public favoriteBranch = ({ newRefFavorite }: Actions.IBranchFavoritedPayload): void => {
        this.loadRefFavorites({
            refFavorites: [
                ...this.state.refFavorites,
                newRefFavorite,
            ],
        });
    }

    /**
     * Remove the branch favorite.
     */
    public unfavoriteBranch = ({ favoriteId }: Actions.IBranchUnfavoritedPayload): void => {
        this.loadRefFavorites({
            refFavorites: this.state.refFavorites.filter(favorite => favorite.id !== favoriteId),
        });
    }

    private setState(newState: Partial<RefFavoritesState>) {
        this.state = {
            ...this.state,
            ...newState,
        };

        this.emitChanged();
    }
}

/**
 * Gets the favorite status of the given branch from the store state.
 */
export function getBranchFavorite(branchStatus: IBranchStatus, state: RefFavoritesState): BranchFavoriteStatus {
    if (!state.canFavorite) {
        return;
    }

    const refFavorite = first(state.refFavorites, favorite => favorite.name === branchStatus.refName);

    return {
        refName: branchStatus && branchStatus.refName,
        canFavorite: branchStatus && !branchStatus.isDeleted && !branchStatus.isDefault && !branchStatus.isUserCreated,
        isFavorite: Boolean(refFavorite),
        favoriteId: refFavorite && refFavorite.id,
    };
}
