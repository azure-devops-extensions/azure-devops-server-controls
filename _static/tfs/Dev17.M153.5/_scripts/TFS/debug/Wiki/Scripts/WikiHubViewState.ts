import { autobind } from "OfficeFabric/Utilities";
import * as Dialogs from "VSS/Controls/Dialogs";
import * as Events_Action from "VSS/Events/Action";
import * as EventsService from "VSS/Events/Services";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { IVssHubViewStateOptions, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";

import { UrlConstants } from "Wiki/Scripts/Generated/Constants";

export class WikiBaseViewState extends VssHubViewState {
    constructor(options?: IVssHubViewStateOptions) {
        super(options, false);
    }

    public getCurrentUrl(): string {
        const navHistoryService = getNavigationHistoryService();
        return navHistoryService.generateUrl(this.viewOptions.getViewOptions());
    }
}

export const URL_Changed_Event = "wiki-url-changed-event";

export class WikiHubViewState extends WikiBaseViewState {
    private _previousViewOptions: IViewOptionsValues;

    constructor() {

        const options: IVssHubViewStateOptions = {
            defaultPivot: null,
            pivotNavigationParamName: null,
            viewOptionNavigationParameters: [
                // Wiki Id or name present in the route.
                { key: UrlConstants.WikiIdentifierParam, rawString: true, behavior: HistoryBehavior.newEntry },
                // Version of the current wiki.
                { key: UrlConstants.WikiVersionParam, rawString: true, behavior: HistoryBehavior.newEntry },
                // Action on the wiki hub eg. view, edit, etc.
                { key: UrlConstants.ActionParam, navParamName: "_a", rawString: true, behavior: HistoryBehavior.newEntry },
                // Current page path.
                { key: UrlConstants.PagePathParam, rawString: true, behavior: HistoryBehavior.newEntry },
                // Latest page path. Used in cases when the page has renames.
                { key: UrlConstants.LatestPagePathParam, rawString: true, behavior: HistoryBehavior.newEntry },
                // Anchor on that page to scroll to.
                { key: UrlConstants.AnchorParam, rawString: true, behavior: HistoryBehavior.newEntry },
                // Flag to denote print operation.
                { key: UrlConstants.IsPrintParam, rawString: true, behavior: HistoryBehavior.newEntry },
                // Flag to denote adding a sub page operation.
                { key: UrlConstants.IsSubPageParam, rawString: true, behavior: HistoryBehavior.newEntry },
                // Compare version of the wiki page.
                { key: UrlConstants.VersionParam, rawString: true, behavior: HistoryBehavior.newEntry },
                // Compare view, either 'preview' or 'compare'.
                { key: UrlConstants.ViewParam, rawString: true, behavior: HistoryBehavior.newEntry },
                // Template name used for initial content only in case of new page.
                { key: UrlConstants.TemplateParam, rawString: true, behavior: HistoryBehavior.newEntry },
            ],
        };

        super(options);

        this.setupNavigation();
        this._previousViewOptions = null;
        this.viewOptions.subscribe(this._onHubViewStateChanged, VIEW_OPTIONS_CHANGE_EVENT);
    }

    public dispose(): void {
        this.viewOptions.unsubscribe(this._onHubViewStateChanged, VIEW_OPTIONS_CHANGE_EVENT);
        super.dispose();
    }

    @autobind
    private _onHubViewStateChanged(updatedViewOptions: IViewOptionsValues): void {
        const unloadText: string = Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_UNLOAD);

        if (unloadText) {
            Dialogs.showConfirmNavigationDialog(unloadText).
                then(() => {
                    this._completeNavigation(updatedViewOptions);
                }, () => {
                    this._revertToPreviousUrl();
                });
        } else {
            this._completeNavigation(updatedViewOptions);
        }
    }

    private _completeNavigation(updatedViewOptions: IViewOptionsValues): void {
        this._previousViewOptions = this.viewOptions.getViewOptions();
        EventsService.getService().fire(URL_Changed_Event, this, updatedViewOptions);
    }

    private _revertToPreviousUrl(): void {
        /* We are only expecting to hit this scenario for back navigation.
         * So it should always be new entry in history stack.
         * This navigation event should be surpressed, without triggering any re-render of full page.
         */
        this.updateNavigationState(HistoryBehavior.newEntry, () => {
            this.viewOptions.setViewOptions(this._previousViewOptions, true);
        });
    }
}
