import * as Service from "VSS/Service";
import { SettingsHttpClient } from "VSS/Settings/RestClient";

import { FeedServiceInstanceId, SettingsConstants } from "Feed/Common/Constants/Constants";

export class SettingsDataService extends Service.VssService {
    public setMruFullyQualifiedFeedId(feedId: string): IPromise<void> {
        const entries: IDictionaryStringTo<any> = {};
        entries[SettingsConstants.MruFeedIdPath] = feedId;
        const settingsHttpClient = Service.getClient(
            SettingsHttpClient,
            null /*use default web context*/,
            FeedServiceInstanceId
        );
        return settingsHttpClient.setEntries(entries, "me");
    }

    public async getPackageSettingsAsync(): Promise<{ [key: string]: any }> {
        const settingsHttpClient = await Service.getClient(
            SettingsHttpClient,
            null /*use default web context*/,
            FeedServiceInstanceId
        );
        const packageSettingEntries = await settingsHttpClient.getEntries(
            "me",
            SettingsConstants.PackagingSettingsPath
        );
        return packageSettingEntries;
    }
}
