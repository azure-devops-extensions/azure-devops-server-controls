import { DefinitionTriggerType } from "TFS/Build/Contracts";

export interface IRepository {
    id: string;
    name: string;
    url: string;
    data: { [key: string]: string; };
}

export interface IRepositoryWebhook {
    repositoryUrl: string;
    types: DefinitionTriggerType[];
}

export interface IRepositoryItem {
    isContainer: boolean;
    path: string;
}

// TODO many of these don't seem to be represented in the UI - remove those if they aren't needed
export class VersionControlProperties {
    public static checkoutNestedSubmodules: string = "checkoutNestedSubmodules";
    public static checkoutSubmodules: string = "checkoutSubmodules";
    public static cleanOption: string = "cleanOption";
    public static cleanRepository: string = "cleanRepository";
    public static fetchDepth: string = "fetchDepth";
    public static largeFileSupport: string = "largeFileSupport";
    public static reportBuildStatus: string = "reportBuildStatus";
    public static shallowFetchStatus: string = "shallowFetchStatus";
    public static skipSyncSources: string = "skipSyncSources";
    public static showAddConnection: string = "showAddConnection";
    public static sourceLabelFormat: string = "sourceLabelFormat";
    public static sourceLabelOption: string = "sourceLabelOption";
    public static version: string = "version";
}

export class MappingTypes {
    public static tfvc: string = "tfvc";
    public static svn: string = "svn";
}