import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { AutomaticReviewers, Build, Status } from "Policy/Scripts/PolicyTypes";
import { isGuid } from "VSS/Utils/String";

export namespace PolicyConfigurationUtils {

    export function getEmptyAutomaticReviewersPolicyConfig(): PolicyConfiguration {
        return {
            type: { id: AutomaticReviewers.Id },
            revision: 1,
            isDeleted: false,
            isBlocking: true,
            isEnabled: true,
            settings: {
                requiredReviewerIds: [],
                filenamePatterns: [],
                addedFilesOnly: false,
                ignoreIfSourceIsInScope: false,
                message: null,
            } as AutomaticReviewers.Settings,
        } as PolicyConfiguration;
    }

    export function getEmptyBuildPolicyConfig(): PolicyConfiguration {
        return {
            type: { id: Build.Id },
            revision: 1,
            isDeleted: false,
            isBlocking: true,
            isEnabled: true,
            settings: {
                buildDefinitionId: null,
                displayName: null,
                queueOnSourceUpdateOnly: true,
                manualQueueOnly: false,
                validDuration: 720,
            } as Build.Settings,
        } as PolicyConfiguration;
    }

    export function getEmptyStatusPolicyConfig(): PolicyConfiguration {
        return {
            type: { id: Status.Id },
            revision: 1,
            isDeleted: false,
            isBlocking: true,
            isEnabled: true,
            settings: {
                authorId: null,
                statusGenre: "",
                statusName: "",
                invalidateOnSourceUpdate: false
            } as Status.Settings,
        } as PolicyConfiguration;
    }

    export function parsePolicyConfiguration(urlState: any): PolicyConfiguration {
        if (!urlState) {
            return null;
        }

        urlState = convertKeysToLowerCase(urlState);

        switch (urlState.policytypeid) {
            case Status.Id:
                return parseStatusPolicy(urlState);
            case Build.Id:
                return parseBuildPolicy(urlState);
            case AutomaticReviewers.Id:
                return parseAutomaticReviewersPolicy(urlState);
            default:
                return null;
        }
    }

    function convertKeysToLowerCase(urlState: any): any {
        const newState = {};
        Object.keys(urlState).forEach(k => {
            newState[k.toLowerCase()] = urlState[k];
        });

        return newState;
    }

    function parseStatusPolicy(urlState: any): PolicyConfiguration {
        const policy = getEmptyStatusPolicyConfig();
        policy.isBlocking = parseBool(urlState.isblocking, policy.isBlocking);

        const settings: Status.Settings = {...policy.settings};
        settings.filenamePatterns = parseStringArray(urlState.path);
        settings.statusName = urlState.name || settings.statusName;
        settings.statusGenre = urlState.genre || settings.statusGenre;
        settings.authorId = parseGuid(urlState.authorid, settings.authorId);
        settings.invalidateOnSourceUpdate = parseBool(urlState.resetonupdate, settings.invalidateOnSourceUpdate);
        settings.defaultDisplayName = urlState.displayname || settings.defaultDisplayName;

        policy.settings = settings;
        return policy;
    }

    function parseBuildPolicy(urlState: any): PolicyConfiguration {
        const policy = getEmptyBuildPolicyConfig();

        policy.isBlocking = parseBool(urlState.isblocking, policy.isBlocking);

        const settings: Build.Settings = {...policy.settings};
        settings.filenamePatterns = parseStringArray(urlState.path);
        settings.buildDefinitionId = Number(urlState.builddefinitionid) || settings.buildDefinitionId;
        settings.queueOnSourceUpdateOnly = parseBool(urlState.queueonsourceupdateonly, settings.queueOnSourceUpdateOnly);
        settings.manualQueueOnly = parseBool(urlState.manualqueueonly, settings.manualQueueOnly);
        settings.validDuration = Number(urlState.validduration) || settings.validDuration;
        settings.displayName = urlState.displayname || settings.displayName;

        policy.settings = settings;
        return policy;
    }

    function parseAutomaticReviewersPolicy(urlState: any): PolicyConfiguration {
        const policy = getEmptyAutomaticReviewersPolicyConfig();

        policy.isBlocking = parseBool(urlState.isblocking, policy.isBlocking);

        const settings: AutomaticReviewers.Settings = {...policy.settings};
        settings.filenamePatterns = parseStringArray(urlState.path);
        settings.requiredReviewerIds = parseGuidArray(urlState.reviewerids);
        settings.message = urlState.message || settings.message;

        policy.settings = settings;
        return policy;
    }

    function parseStringArray(value: string): string[] {
        return value ? value.split(";").filter(v => v && v.length > 0) : [];
    }

    function parseGuidArray(value: string): string[] {
        return value ? value.split(";").filter(v => v && isGuid(v)) : [];
    }

    function parseBool(value: string, defaultValue: boolean): boolean {
        return value ? value.toLowerCase() === "true" : defaultValue;
    }

    function parseGuid(value: string, defaultValue: string): string {
        return (value && isGuid(value)) ? value : defaultValue;
    }

}
