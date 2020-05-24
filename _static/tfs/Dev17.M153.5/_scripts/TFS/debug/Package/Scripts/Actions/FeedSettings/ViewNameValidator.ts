import * as Utils_String from "VSS/Utils/String";

import { IValidationResult } from "Package/Scripts/Actions/FeedSettings/ValidationHandler";
import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedSettingsComponents } from "Feed/Common/Constants/Constants";
import { FeedView } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { ValidateName } from "Feed/Common/Utils/Validator";

export class ViewNameValidator {
    /**
     * originalViewName -- null if adding a new view.  If editing a view, the original name of the view being edited.
     */
    public static GetValidationResult(
        state: IFeedSettingsState,
        viewName: string,
        originalViewName: string
    ): IValidationResult {
        const validationResult: IValidationResult = {
            componentKey: FeedSettingsComponents.viewName,
            errorMessage: null
        };

        if (viewName === Utils_String.empty) {
            return validationResult;
        }

        if (originalViewName != null && viewName === originalViewName) {
            return validationResult;
        }

        const isValid: boolean = ValidateName(viewName);
        if (!isValid) {
            validationResult.errorMessage =
                PackageResources.FeedEditDialogReleaseViews_ReleaseViewNameErrorAlphanumeric;
            return validationResult;
        }

        const viewWithSameNameExists: boolean = state.views.some((view: FeedView) => {
            return Utils_String.equals(view.name, viewName, true);
        });

        if (viewWithSameNameExists) {
            validationResult.errorMessage = Utils_String.format(
                PackageResources.Error_FeedSettings_ViewNameAlreadyExists,
                viewName
            );
            return validationResult;
        }
    }
}
