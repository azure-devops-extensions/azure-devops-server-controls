/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\service\webaccess\projectoverview\clientgeneratorconfigs\genclient.json
 */

"use strict";

import SourceControl_WebApi_Contracts = require("TFS/VersionControl/Contracts");
import SourceControl_WebApi_Legacy_Contracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

export interface CurrentUserData {
    dismissedUpsells: { [key: number] : boolean; };
    hasManageProjectPropertiesPermission: boolean;
    hasProjectLevelEditPermission: boolean;
    isStakeHolder: boolean;
}

export interface GitCodeMetricsData {
    authorsCount: number;
    commitsPushedCount: number;
    commitsTrend: number[];
    pullRequestsCompletedCount: number;
    pullRequestsCreatedCount: number;
}

export interface GitRepositoryData {
    cloneUrl: string;
    repository: SourceControl_WebApi_Contracts.GitRepository;
    sshEnabled: boolean;
    sshUrl: string;
}

export interface LanguageMetricInfo {
    /**
     * Percentage of the language in the project
     */
    languagePercentage: number;
    /**
     * Name of the language
     */
    name: string;
}

export interface LanguageMetricsData {
    /**
     * List of language tags
     */
    tags: LanguageMetricInfo[];
}

export interface MemberInfo {
    id: string;
    mail: string;
    name: string;
}

export interface MembersData {
    count: number;
    hasMore: boolean;
    isCurrentUserAdmin: boolean;
    members: MemberInfo[];
}

export interface ProjectAboutData {
    description: string;
    id: string;
    isOrganizationActivated: boolean;
    isProjectImageSet: boolean;
    name: string;
    visibility: string;
}

export interface ProjectOverviewData {
    codeMetricsAvailableForDays: number;
    currentRepositoryData: RepositoryData;
    currentUser: CurrentUserData;
    hasBuildConfigured: boolean;
    hasCode: boolean;
    info: ProjectAboutData;
    isProjectEmpty: boolean;
    isRMFaultedIn: boolean;
    supportsGit: boolean;
    supportsTFVC: boolean;
}

export interface RepositoryData {
    displayContent: string;
    gitRepositoryData: GitRepositoryData;
    isDefaultReadmeRepoPresent: boolean;
    readmeFileItemModel: SourceControl_WebApi_Legacy_Contracts.ItemModel;
    sourceRepositoryType: SourceRepositoryTypes;
    wikiPagePath: string;
}

export enum SourceRepositoryTypes {
    Git = 0,
    Tfvc = 1,
    Wiki = 2
}

export interface TagsData {
    /**
     * List of tags
     */
    tags: string[];
}

export interface TfvcCodeMetricsData {
    authors: number;
    changesets: number;
    changesetsTrend: number[];
}

export enum UpsellTypes {
    Build = 0,
    Code = 1,
    Work = 2,
    Release = 3,
    All = 4
}

export interface WitMetricsData {
    workItemsCompleted: number;
    workItemsCreated: number;
}

export var TypeInfo = {
    CurrentUserData: <any>{
    },
    GitRepositoryData: <any>{
    },
    ProjectOverviewData: <any>{
    },
    RepositoryData: <any>{
    },
    SourceRepositoryTypes: {
        enumValues: {
            "git": 0,
            "tfvc": 1,
            "wiki": 2
        }
    },
    UpsellTypes: {
        enumValues: {
            "build": 0,
            "code": 1,
            "work": 2,
            "release": 3,
            "all": 4
        }
    },
};

TypeInfo.CurrentUserData.fields = {
    dismissedUpsells: {
        isDictionary: true,
        dictionaryKeyEnumType: TypeInfo.UpsellTypes,
    }
};

TypeInfo.GitRepositoryData.fields = {
    repository: {
        typeInfo: SourceControl_WebApi_Contracts.TypeInfo.GitRepository
    }
};

TypeInfo.ProjectOverviewData.fields = {
    currentRepositoryData: {
        typeInfo: TypeInfo.RepositoryData
    },
    currentUser: {
        typeInfo: TypeInfo.CurrentUserData
    }
};

TypeInfo.RepositoryData.fields = {
    gitRepositoryData: {
        typeInfo: TypeInfo.GitRepositoryData
    },
    readmeFileItemModel: {
        typeInfo: SourceControl_WebApi_Legacy_Contracts.TypeInfo.ItemModel
    },
    sourceRepositoryType: {
        enumType: TypeInfo.SourceRepositoryTypes
    }
};
