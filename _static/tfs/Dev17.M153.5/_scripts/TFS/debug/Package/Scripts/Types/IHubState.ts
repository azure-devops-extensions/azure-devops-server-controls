import { HubActionStrings } from "Feed/Common/Constants/Constants";

/**
 * Represents the well-typed action from the URL.
 */
export enum HubAction {
    Unknown,
    Feed,
    Package,
    CreateFeed,
    Settings,
    RecycleBin,
    RecycleBinPackage,
    PackageDependencySelected
}

/**
 * The state of the hub from all parameters in the URL.
 */
export interface IHubState extends IDictionaryStringTo<string> {
    action: string;
    feed: string;
    package: string;
    version: string;
    upstreamSource: string;
    protocolType: string;
    preferRelease: string; // used when version isn't specified
    view: string; // used by VssHubViewState
}

export class HubStateHelpers {
    public static getHubAction(action: string): HubAction {
        switch (action) {
            case HubActionStrings.ViewFeed:
                return HubAction.Feed;
            case HubActionStrings.RecycleBin:
                return HubAction.RecycleBin;
            case HubActionStrings.RecycleBinPackage:
                return HubAction.RecycleBinPackage;
            case HubActionStrings.ViewPackage:
                return HubAction.Package;
            case HubActionStrings.CreateFeed:
                return HubAction.CreateFeed;
            case HubActionStrings.Settings:
                return HubAction.Settings;
            case HubActionStrings.PackageDependencySelected:
                return HubAction.PackageDependencySelected;
            default:
                return HubAction.Unknown;
        }
    }
}
