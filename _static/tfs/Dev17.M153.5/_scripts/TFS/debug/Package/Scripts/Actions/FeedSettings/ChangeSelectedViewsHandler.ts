import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class ChangeSelectedViewsHandler {
    public static handle(state: IFeedSettingsState, views: FeedView[]): void {
        state.selectedViews = views;
    }
}
