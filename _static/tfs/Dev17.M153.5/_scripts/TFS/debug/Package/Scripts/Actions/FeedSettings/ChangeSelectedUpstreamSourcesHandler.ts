import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class ChangeSelectedUpstreamSourcesHandler {
    public static handle(state: IFeedSettingsState, upstreamSources: UpstreamSource[]): void {
        state.selectedUpstreamSources = upstreamSources;
    }
}
