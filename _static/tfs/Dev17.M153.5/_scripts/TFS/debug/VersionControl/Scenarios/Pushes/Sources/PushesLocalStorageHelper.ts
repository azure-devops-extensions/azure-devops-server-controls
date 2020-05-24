export class PushesLocalStorageHelper {
    private static LOCAL_STORAGE_FILTER_VISIBILITY_KEY = 'TFS.VC.Pushes.FilterPanel.Visible.Key';

    public static getFilterPaneVisibility = (): boolean => {
        try {
            return localStorage.getItem(PushesLocalStorageHelper.LOCAL_STORAGE_FILTER_VISIBILITY_KEY) !== "false";
        } catch (e) {
            return true;
        }
    }

    public static setFilterPaneVisibility = (visible: boolean): void => {
        try {
            // This will also handle the case of localStorage being unavailable
            localStorage.setItem(PushesLocalStorageHelper.LOCAL_STORAGE_FILTER_VISIBILITY_KEY, visible ? "true" : "false");
        } catch (error) {
            // no-op
        }
    }
}
