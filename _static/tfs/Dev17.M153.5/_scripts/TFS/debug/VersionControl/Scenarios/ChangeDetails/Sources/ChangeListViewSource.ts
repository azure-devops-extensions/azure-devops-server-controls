import { TabbedNavigationView } from "VSS/Controls/Navigation";

/**
 * A source of data from the current page view.
 */
export class ChangeListViewSource {
    constructor(private _changeListView: TabbedNavigationView) {
    }

    public getOptions(): any {
        return this._changeListView._options;
    }

    public setFullScreen(isFullScreen: boolean, showLeftPanelInFullScreenMode: boolean): void {
        this._changeListView.setFullScreenMode(isFullScreen, showLeftPanelInFullScreenMode);
    }

    public dispose(): void {
        this._changeListView = null;
    }
}
