import * as Errors from "MyExperiences/Scenarios/Shared/Alerts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";


export class FavoriteAlerts {
    public static get unfavoriteFailed(): JSX.Element {
        return Errors.createReloadPromptAlertMessage(MyExperiencesResources.Favorites_UnfavoritingItemFailedError);
    }

    public static get favoriteFailed(): JSX.Element {
        return Errors.createReloadPromptAlertMessage(MyExperiencesResources.Favorites_FavoritingItemFailedError);
    }

    public static get loadFailed(): JSX.Element {
        return Errors.createReloadPromptAlertMessage(MyExperiencesResources.Favorites_FailedToLoadError);
    }

    public static get writeBlocked(): JSX.Element {
        return Errors.createReloadPromptAlertMessage(MyExperiencesResources.Favorites_WriteBlocked);
    }
}