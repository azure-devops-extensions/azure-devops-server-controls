import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";

export interface SettingsBase {
    filenamePatterns?: string[];
    ignoreIfSourceIsInScope?: boolean;
    addedFilesOnly?: boolean;

    scope?: any[];
}

// Long ago, some of the settings properties were serialized with their C# names, i.e., a leading capital letter.
// These are still hanging around in the database as JSON objects, and we need to deal with them correctly.
export function normalizeSettings(config: PolicyConfiguration): void {

    coalesceProperty(config.settings, "filenamePatterns", "FilenamePatterns");
    coalesceProperty(config.settings, "ignoreIfSourceIsInScope", "IgnoreIfSourceIsInScope");
    coalesceProperty(config.settings, "addedFilesOnly", "AddedFilesOnly");
    coalesceProperty(config.settings, "scope", "Scope");

    switch (config.type.id) {
        case ApproverCount.Id:
            coalesceProperty(config.settings, "minimumApproverCount", "MinimumApproverCount");
            coalesceProperty(config.settings, "creatorVoteCounts", "CreatorVoteCounts");
            coalesceProperty(config.settings, "allowDownvotes", "AllowDownvotes");
            break;

        case Build.Id:
            coalesceProperty(config.settings, "buildDefinitionId", "BuildDefinitionId");
            coalesceProperty(config.settings, "queueOnSourceUpdateOnly", "QueueOnSourceUpdateOnly");
            coalesceProperty(config.settings, "manualQueueOnly", "ManualQueueOnly");
            coalesceProperty(config.settings, "displayName", "DisplayName");
            coalesceProperty(config.settings, "validDuration", "ValidDuration");
            break;

        case MergeStrategy.Id:
            coalesceProperty(config.settings, "useSquashMerge", "UseSquashMerge");
            break;

        case AutomaticReviewers.Id:
            coalesceProperty(config.settings, "requiredReviewerIds", "RequiredReviewerIds");
            coalesceProperty(config.settings, "message", "Message");
            break;
    }
}

function coalesceProperty(obj: { [name: string]: any }, lowerCaseName: string, upperCaseName: string): void {
    if (obj[lowerCaseName] === undefined && obj[upperCaseName] !== undefined) {
        obj[lowerCaseName] = obj[upperCaseName];
        delete obj[upperCaseName];
    }
}

export namespace ApproverCount {
    export const Id = "fa4e907d-c16b-4a4c-9dfa-4906e5d171dd";

    export interface Settings extends SettingsBase {
        minimumApproverCount: number;
        creatorVoteCounts: boolean;
        allowDownvotes: boolean;
        resetOnSourcePush: boolean;
    }
}

export namespace Build {
    export const Id = "0609b952-1397-4640-95ec-e00a01b2c241";

    export interface Settings extends SettingsBase {
        buildDefinitionId: number;
        queueOnSourceUpdateOnly: boolean;
        manualQueueOnly: boolean;
        displayName: string;
        validDuration: number;
    }

    export interface IBuildDefinitionSummary {
        id: number;
        name: string;
        path: string;
    }
}

export namespace CommentRequirements {
    export const Id = "c6a1889d-b943-4856-b76f-9e46bb6b0df2";

    export interface Settings extends SettingsBase {
    }
}

export namespace MergeStrategy {
    export const Id = "fa4e907d-c16b-4a4c-9dfa-4916e5d171ab";

    export interface Settings extends SettingsBase {
        useSquashMerge: boolean;
    }
}

export namespace AutomaticReviewers {
    export const Id = "fd2167ab-b0be-447a-8ec8-39368250530e";

    export interface Settings extends SettingsBase {
        requiredReviewerIds: string[];
        message: string;
    }
}

export namespace WorkItemLinking {
    export const Id = "40e92b44-2fe1-4dd6-b3d8-74a9c21d0c6e";

    export interface Settings extends SettingsBase {
    }
}

export namespace Status {
    export const Id = "cbdc66da-9728-4af8-aada-9a5a32e4a226";

    export enum PolicyApplicability
    {
        applyByDefault = 0,
        applyWhenStatusExists = 1,
    }

    export interface Settings extends SettingsBase {
        statusName: string;
        statusGenre: string;
        authorId: string;
        invalidateOnSourceUpdate: boolean;
        defaultDisplayName: string;
        policyApplicability?: PolicyApplicability;
    }
}
