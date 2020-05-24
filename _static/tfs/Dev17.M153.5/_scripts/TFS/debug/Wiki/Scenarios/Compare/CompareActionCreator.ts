import { autobind } from "OfficeFabric/Utilities";

import * as VSS_ClientTrace_Contract from "VSS/ClientTrace/Contracts";
import * as VSS_Error from "VSS/Error";

import { ItemModel, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { SharedActionCreator } from "Wiki/Scenarios/Shared/SharedActionCreator";
import { CompareActionsHub, ComparePagePayload } from "Wiki/Scenarios/Compare/CompareActionsHub";
import { WikiCompareSource } from "Wiki/Scenarios/Compare/Sources/WikiCompareSource";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { CompareViews, WikiActionIds } from "Wiki/Scripts/CommonConstants";

export interface Sources {
    wikiCompareSource: WikiCompareSource;
}

export class CompareActionCreator {
    constructor(
        private _sharedActionCreator: SharedActionCreator,
        private _actionsHub: CompareActionsHub,
        private _sources: Sources,
    ) { }

    public renderRevisionDetailsPage = (version: string, pagePath: string, gitItemPath: string, view: string): void => {
        this._sources.wikiCompareSource.fetchComparePagePayload(version, pagePath, gitItemPath).then(
            (payload: ComparePagePayload): void => {
                this._actionsHub.comparePageDataLoaded.invoke(payload);

                if (view === CompareViews.Compare) {
                    switch (payload.itemChangeType) {
                        case VersionControlChangeType.Edit:
                            this.fetchCompareViewData(version, pagePath, gitItemPath);
                            break;
                        case VersionControlChangeType.Add:
                        case VersionControlChangeType.Rename:
                        case VersionControlChangeType.Delete:
                            this.changeComparePageView(CompareViews.Preview, true);
                            break;
                        default:
                            break;
                    }
                } else {
                    const isPageDeleted = payload.itemChangeType === VersionControlChangeType.Delete;
                    this.fetchPreviewViewData(version, pagePath, isPageDeleted);
                }
            },
            (error: Error) => { this.onAnyDataLoadFailed(error, "renderRevisionDetailsPage"); }
        );
    }

    public fetchCompareViewData = (version: string, pagePath: string, gitItemPath: string): void => {
        this._sources.wikiCompareSource.fetchItemDetails(version, pagePath, gitItemPath).then(
            (payload: ItemModel): void => this._actionsHub.itemDetailsLoaded.invoke(payload),
            (error: Error) => { this.onAnyDataLoadFailed(error, "fetchCompareViewData"); }
        );

    }

    public fetchPreviewViewData = (version: string, pagePath: string, isPageDeleted?: boolean): void => {
        this._sources.wikiCompareSource.getPageText(version, pagePath, isPageDeleted).then(
            (payload: string): void => this._actionsHub.fileContentLoaded.invoke(payload),
            (error: Error) => { this.onAnyDataLoadFailed(error, "fetchPreviewViewData"); }
        );
    }

    public changeComparePageView(view: string, replaceHistoryPoint: boolean = false): void {
        const urlParameters = { view: view } as UrlParameters;

        this._sharedActionCreator.updateUrl(urlParameters, replaceHistoryPoint);
    }

    public viewPage(pagePath: string): void {
        const urlParameters: UrlParameters = {
            action: WikiActionIds.View,
            pagePath: pagePath,
            anchor: null,
            latestPagePath: null,
            version: null,
            view: null,
            template: null,
        } as UrlParameters;

        this._sharedActionCreator.updateUrl(urlParameters);
    }

    public viewPageHistory(pagePath: string): void {
        const urlParameters: UrlParameters = {
            action: WikiActionIds.History,
            pagePath: pagePath,
            anchor: null,
            latestPagePath: null,
            version: null,
            view: null,
            template: null,
        } as UrlParameters;

        this._sharedActionCreator.updateUrl(urlParameters);
    }

    public compareDiffDataLoaded(): void {
        this._actionsHub.compareDiffDataLoaded.invoke(void 0);
    }

    public onAnyDataLoadFailed(error: Error, source?: string): void {
        this._actionsHub.dataLoadFailed.invoke(error);
        this._sharedActionCreator.showErrorIfNecessary(error);
        VSS_Error.publishErrorToTelemetry(error, false, VSS_ClientTrace_Contract.Level.Error, {
            "Source": source
        });
    }

    /**
     * Updates URL without navigating. Adds history point for back navigation. Used to update URL for internal anchor links.
     * @param urlParameters - URLParameters
	 * @param replaceHistoryPoint - True to overwrite previous history point, false by default
     * @param suppressViewOptionsChangeEvent - False for not suppressing ViewOptionsChangeEvent, true by default
     */
    @autobind
    public updateUrlSilently(
        urlParameters: UrlParameters,
        replaceHistoryPoint: boolean = false,
        suppressViewOptionsChangeEvent: boolean = true
    ): void {
        this._sharedActionCreator.updateUrl(urlParameters, replaceHistoryPoint, suppressViewOptionsChangeEvent);
    }
}
