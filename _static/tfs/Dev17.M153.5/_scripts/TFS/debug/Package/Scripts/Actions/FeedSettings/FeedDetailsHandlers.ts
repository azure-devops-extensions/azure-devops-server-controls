import * as Utils_String from "VSS/Utils/String";

import { IValidationResult } from "Package/Scripts/Actions/FeedSettings/ValidationHandler";
import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedSettingsComponents } from "Feed/Common/Constants/Constants";

import * as PackageResources from "Feed/Common/Resources";
import { ValidateName, ValidateRetentionPolicyMaxVersions } from "Feed/Common/Utils/Validator";

/**
 * The user modified the feed name field
 */
export class ChangeFeedNameHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, name: string): IValidationResult {
        if (name === state.feed().name) {
            state.feedName = null;
        } else {
            state.feedName = name;
        }

        const errorMessage = ValidateName(name)
            ? Utils_String.empty
            : PackageResources.FeedCreationDialogContent_FeedNameError;
        const validation: IValidationResult = {
            componentKey: FeedSettingsComponents.feedName,
            errorMessage
        };

        emit();
        return validation;
    }
}

/**
 * The user modified the feed's 'maximum versions' retention policy field
 */
export class ChangeFeedRetentionMaxVersionsHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, maximumVersions: string): IValidationResult {
        const createValidationResult = message => {
            return {
                errorMessage: message,
                componentKey: FeedSettingsComponents.feedRetentionPolicyMaxVersions
            } as IValidationResult;
        };

        if (state.retentionPolicySettings.retentionPolicyLoading === true) {
            return createValidationResult(PackageResources.Error_RetentionPoliciesNotLoaded);
        }

        let maxVersions = null;
        if (maximumVersions === "") {
            // Clearing the UI text box indicates that the user does not want any constraints on the version count
            maxVersions = null;
        } else {
            maxVersions = Number(maximumVersions);
            const errorMessage = ValidateRetentionPolicyMaxVersions(
                maxVersions,
                state.retentionPolicySettings.retentionPolicyMinCountLimit,
                state.retentionPolicySettings.retentionPolicyMaxCountLimit
            )
                ? Utils_String.empty
                : Utils_String.format(
                      PackageResources.Error_InvalidPackageRetentionVersionCountLimit,
                      maximumVersions,
                      state.retentionPolicySettings.retentionPolicyMinCountLimit,
                      state.retentionPolicySettings.retentionPolicyMaxCountLimit
                  );

            if (errorMessage) {
                state.retentionPolicySettings.retentionPolicyToApply = {
                    countLimit: maxVersions,
                    ageLimitInDays: 0
                };
                return createValidationResult(errorMessage);
            }
        }

        if (
            state.retentionPolicySettings.retentionPolicy != null &&
            maxVersions === state.retentionPolicySettings.retentionPolicy.countLimit
        ) {
            state.retentionPolicySettings.retentionPolicyToApply = null;
        } else {
            state.retentionPolicySettings.retentionPolicyToApply = {
                countLimit: maxVersions === null ? null : Number(maximumVersions),
                ageLimitInDays: 0
            };
        }

        emit();
        return createValidationResult("");
    }
}

/**
 * The user modified the feed description field
 */
export class ChangeFeedDescriptionHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, description: string): void {
        if (description === state.feed().description) {
            state.feedDescription = null;
        } else {
            state.feedDescription = description || Utils_String.empty;
        }
        emit();
    }
}

/**
 * The user modified the hideDeletedPackageVersions box state
 */
export class ChangeHideDeletedPackageVersionsHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, hideDeletedPackageVersions: boolean): void {
        if (hideDeletedPackageVersions === state.feed().hideDeletedPackageVersions) {
            state.hideDeletedPackageVersions = null;
        } else {
            state.hideDeletedPackageVersions = hideDeletedPackageVersions;
        }
        emit();
    }
}

/**
 * The user modified the hideDeletedPackageVersions box state
 */
export class ChangeBadgesEnabledHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, badgesEnabled: boolean): void {
        if (badgesEnabled === state.feed().badgesEnabled) {
            state.badgesEnabled = null;
        } else {
            state.badgesEnabled = badgesEnabled;
        }
        emit();
    }
}
