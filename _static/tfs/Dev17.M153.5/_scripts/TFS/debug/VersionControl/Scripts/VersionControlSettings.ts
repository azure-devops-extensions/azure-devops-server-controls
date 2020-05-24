import * as Q from "q";
import { getClient } from "VSS/Service";
import { SettingsHttpClient } from "VSS/Settings/RestClient";

import { ProjectHttpClient } from "Presentation/Scripts/TFS/TFS.Project.WebApi";
import { WebApiProject } from "TFS/Core/Contracts";

// This file provides methods for getting/setting Version Control settings via the Settings REST client.


namespace KeyParts {
    export const adminOptions = "VersionControl/AdminOptions";
    export const tfvcWebEditEnabled = "Tfvc/WebEditEnabled";
}

export namespace SettingKeys {
    export const tfvcWebEditEnabled = KeyParts.adminOptions + "/" + KeyParts.tfvcWebEditEnabled;
}

interface EditSettingsCacheItem {
    isEditEnabled: boolean;
    expiry: number;
}

const projectNameToId: IDictionaryStringTo<string> = {};
const editSettingsCache: IDictionaryStringTo<EditSettingsCacheItem> = {};
const cacheExpiryMs = 1000 * 60 * 10;    // 10 minute cache of web edit settings

/**
 * Returns true if Tfvc web editing is enabled (admin option at the project level)
 */
export function getTfvcWebEditEnabled(projectId: string): IPromise<boolean> {
    const cachedSetting: EditSettingsCacheItem = editSettingsCache[projectId];
    if (cachedSetting && cachedSetting.expiry > Date.now()) {
        return Q.resolve(cachedSetting.isEditEnabled);
    }
    else {
        return getTfvcRepositorySettings(projectId)
            .then((settings: IDictionaryStringTo<any>) => {
                const isEditEnabled = settings[KeyParts.tfvcWebEditEnabled];
                editSettingsCache[projectId] = {
                    isEditEnabled: isEditEnabled,
                    expiry: Date.now() + cacheExpiryMs
                }
                return isEditEnabled;
            });
    }
}

/**
 * Returns true if Tfvc web editing is enabled (admin option at the project level)
 */
export function getTfvcWebEditEnabledByProjectName(projectName: string): IPromise<boolean> {
    const projectId = projectNameToId[projectName.toLowerCase()];

    if (projectId) {
        return getTfvcWebEditEnabled(projectId);
    }
    else {
        return getClient(ProjectHttpClient).beginGetProject(projectName).then((project: WebApiProject) => {
            projectNameToId[projectName.toLowerCase()] = project.id;
            return getTfvcWebEditEnabled(project.id);
        });
    }
}

/**
 * Sets Tfvc repository settings (admin option at the project level)
 */
export function setTfvcRepositorySettings(entries: IDictionaryStringTo<any>, projectId: string): IPromise<void> {
    if (entries[SettingKeys.tfvcWebEditEnabled] !== undefined && editSettingsCache[projectId]) {
        delete editSettingsCache[projectId];
    }
    return getClient(SettingsHttpClient).setEntriesForScope(entries, "host", "project", projectId);
}

function getTfvcRepositorySettings(projectId: string): IPromise<IDictionaryStringTo<any>> {
    return getClient(SettingsHttpClient).getEntriesForScope("host", "project", projectId, KeyParts.adminOptions)
        .then((entries: IDictionaryStringTo<any>) => {

            // Unwrap settings (required since this is a dictionary and not an array), and set any known defaults.
            const settings: IDictionaryStringTo<any> = entries.value ? entries.value : {};
            setDefaultValue(settings, KeyParts.tfvcWebEditEnabled, true);
            return settings;
        });
}

function setDefaultValue(settings: IDictionaryStringTo<any>, key: string, value: any) {
    if (settings[key] === undefined) {
        settings[key] = value;
    }
}
