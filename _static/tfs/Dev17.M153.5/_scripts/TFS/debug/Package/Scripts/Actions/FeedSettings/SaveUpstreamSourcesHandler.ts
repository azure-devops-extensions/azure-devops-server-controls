import * as Service from "VSS/Service";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { Feed as Feed_, UpstreamSource_All } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Feed, UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { CustomSet } from "Feed/Common/Types/CustomSet";

export class SaveUpstreamSourcesHandler {
    public static async deleteAsync(state: IFeedSettingsState): Promise<void> {
        // exclude already deleted upstream sources from which feed has saved packages
        const nonDeletedUpstreamSourceOnServer = this.excludeAlreadyDeletedUpstreamSources(
            state.feed().upstreamSources
        );
        const upstreamSourceToDeleteSet = new CustomSet<string>();
        state.selectedUpstreamSources.forEach((upstreamSource: UpstreamSource) => {
            upstreamSourceToDeleteSet.add(upstreamSource.id);
        });

        const upstreamSourcesToSend = [];
        nonDeletedUpstreamSourceOnServer.forEach((upstreamSource: UpstreamSource) => {
            if (upstreamSourceToDeleteSet.has(upstreamSource.id)) {
                // don't include sources user wants to delete
                return;
            }
            upstreamSourcesToSend.push(upstreamSource);
        });

        await this.saveUpstreamSourcesAsync(state, upstreamSourcesToSend);

        const upstreamNames: string = state.selectedUpstreamSources.map(source => source.name).join(", ");
        announce(Utils_String.format(PackageResources.DeletedAnnouncement, upstreamNames));
        state.selectedUpstreamSources = [];
    }

    public static async addAsync(state: IFeedSettingsState, newUpstreamSources: UpstreamSource[]): Promise<void> {
        const nonDeletedUpstreamSourceOnServer = this.excludeAlreadyDeletedUpstreamSources(
            state.feed().upstreamSources
        );
        const upstreamSourcesToSend = nonDeletedUpstreamSourceOnServer.concat(newUpstreamSources);
        await this.saveUpstreamSourcesAsync(state, upstreamSourcesToSend);
    }

    public static async reorderSourcesAsync(
        state: IFeedSettingsState,
        fromIndexOfUpstreamSource: UpstreamSource,
        toIndexOfUpstreamSource: UpstreamSource
    ): Promise<void> {
        const upstreamSources = state.feed().upstreamSources;
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < upstreamSources.length; i++) {
            if (upstreamSources[i].id === fromIndexOfUpstreamSource.id) {
                upstreamSources[i] = toIndexOfUpstreamSource;
                continue;
            }

            if (upstreamSources[i].id === toIndexOfUpstreamSource.id) {
                upstreamSources[i] = fromIndexOfUpstreamSource;
                break;
            }
        }

        const upstreamSourcesToSend = this.excludeAlreadyDeletedUpstreamSources(state.feed().upstreamSources);

        await this.saveUpstreamSourcesAsync(state, upstreamSourcesToSend);
    }

    private static async saveUpstreamSourcesAsync(
        state: IFeedSettingsState,
        upstreamSources: UpstreamSource[]
    ): Promise<Feed> {
        const feedToUpdate: Feed = {
            id: state.feed().id,
            upstreamEnabled: true /* Keeping this variable around for now */
        } as Feed;

        if (feedToUpdate.upstreamEnabled) {
            feedToUpdate.upstreamSources = upstreamSources;
        }

        const feedDataService = Service.getService(FeedsDataService);
        const feed = await feedDataService.updateFeedAsync(feedToUpdate);
        const updateFeed = feed as Feed_;
        state.feed().upstreamSource = updateFeed.upstreamEnabled ? UpstreamSource_All : null;
        // patch doesn't return deleted upstream sources from which feed has saved packages
        // but that doesn't matter since when going to feed list, getFeed is called with includeDeletedUpstreams query parameter
        // this way 'Source' dropdown will still show deleted upstream sources
        state.feed().upstreamSources = updateFeed.upstreamSources;

        announce(PackageResources.SavedAnnouncement);
        return feed;
    }

    private static excludeAlreadyDeletedUpstreamSources(upstreamSources: UpstreamSource[]): UpstreamSource[] {
        return upstreamSources.filter((upstreamSource: UpstreamSource) => upstreamSource.deletedDate == null);
    }
}
