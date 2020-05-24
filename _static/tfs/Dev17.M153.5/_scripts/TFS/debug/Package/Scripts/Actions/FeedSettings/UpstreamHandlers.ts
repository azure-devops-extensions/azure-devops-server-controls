import * as Utils_String from "VSS/Utils/String";
import { Uri } from "VSS/Utils/Url";

import { IValidationResult } from "Package/Scripts/Actions/FeedSettings/ValidationHandler";
import { UpstreamConstants } from "Package/Scripts/Components/Settings/CommonTypes";
import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedSettingsComponents } from "Feed/Common/Constants/Constants";

import * as PackageResources from "Feed/Common/Resources";
import { IsUrlValid, ValidateName } from "Feed/Common/Utils/Validator";

/**
 * The upstream source name was updated by the user
 */
export class ChangeUpstreamSourceNameHandler {
    public static handle(state: IFeedSettingsState, name: string): IValidationResult {
        const validationResult: IValidationResult = {
            componentKey: FeedSettingsComponents.upstreamSourceName,
            errorMessage: null
        };

        if (name == null || name === "") {
            validationResult.errorMessage = PackageResources.UpstreamHandlers_NoName;
            return validationResult;
        }

        const nameMatch = state
            .feed()
            .upstreamSources.some(
                source => source.deletedDate == null && Utils_String.equals(source.name, name, true /*ignoreCase*/)
            );
        if (nameMatch) {
            validationResult.errorMessage = PackageResources.UpstreamHandlers_NameInUse;
            return validationResult;
        }

        if (!ValidateName(name, UpstreamConstants.MaxUpstreamNameLength, /*allowAtChar: */ true)) {
            validationResult.errorMessage = Utils_String.format(
                PackageResources.UpstreamHandlers_BadName,
                UpstreamConstants.MaxUpstreamNameLength
            );
            return validationResult;
        }

        return validationResult;
    }
}

/**
 * The user requested to open the AddUpstreamPanel
 */
export class OpenAddUpstreamPanelHandler {
    public static handle(state: IFeedSettingsState, emit: () => void): void {
        state.displayAddUpstreamPanel = true;
        // clear any old errors:
        state.error = null;
        emit();
    }
}

/**
 * The user requested to close the AddUpstreamPanel
 */
export class CloseAddUpstreamPanelHandler {
    public static handle(state: IFeedSettingsState, emit: () => void): void {
        state.displayAddUpstreamPanel = false;
        emit();
    }
}

/**
 * The upstream source location was updated by the user
 */
export class ChangeUpstreamSourceLocationHandler {
    public static handle(state: IFeedSettingsState, location: string): IValidationResult {
        const validationResult: IValidationResult = {
            componentKey: FeedSettingsComponents.upstreamSourceLocation,
            errorMessage: null
        };

        if (location == null || location === "") {
            validationResult.errorMessage = PackageResources.UpstreamHandlers_NoLocation;
            return validationResult;
        }

        const locationMatch = state
            .feed()
            .upstreamSources.some(source => this._compareLocations(source.location, location));

        if (locationMatch) {
            validationResult.errorMessage = PackageResources.UpstreamHandlers_LocationInUse;
            return validationResult;
        }

        if (!IsUrlValid(location)) {
            validationResult.errorMessage = Utils_String.format(PackageResources.UpstreamHandlers_InvalidLocation);
            return validationResult;
        }

        return validationResult;
    }

    /**
     * Compare locations without regard for url protocol
     */
    private static _compareLocations(a: string, b: string) {
        var aUri = new Uri(a);
        var bUri = new Uri(b);
        aUri.scheme = "http";
        bUri.scheme = "http";
        return Utils_String.equals(aUri.absoluteUri, bUri.absoluteUri, true /*ignoreCase*/);
    }
}

export class DisplayErrorHandlerAddUpstreamSources {
    // display error as validation error for the upstream source location input field
    public static handle(state: IFeedSettingsState, emitCallback: () => void, reason?: Error): void {
        if (reason == null) {
            state.validationErrorBag[FeedSettingsComponents.upstreamSourceLocation] = null;
        } else {
            state.validationErrorBag[FeedSettingsComponents.upstreamSourceLocation] = reason.message;
        }
        emitCallback();
    }
}
