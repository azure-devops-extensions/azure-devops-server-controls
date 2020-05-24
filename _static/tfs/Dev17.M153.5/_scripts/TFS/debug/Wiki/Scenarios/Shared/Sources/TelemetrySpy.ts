import { getScenarioManager, IScenarioDescriptor } from "VSS/Performance";
import { VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";

import { autobind } from "OfficeFabric/Utilities";
import { WikiType } from "TFS/Wiki/Contracts";
import { SharedActionsHub } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { TelemetryWriter } from "Wiki/Scenarios/Shared/Sources/TelemetryWriter";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { getDefaultUrlParameters } from "Wiki/Scripts/Helpers";
import { WikiHubViewState } from "Wiki/Scripts/WikiHubViewState";
import { Areas, PerformanceConstants, TelemetryConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";

export class TelemetrySpy implements IDisposable {
    private readonly _perfScenarios: PerfScenarios;

    constructor(
        private _telemetryWriter: TelemetryWriter,
        private _sharedActionsHub: SharedActionsHub,
        private _hubViewState: WikiHubViewState,
    ) {
        this._perfScenarios = new PerfScenarios();
        this._registerActionsHubHandlers();
    }

    public dispose(): void {
        this._disposeActionsHubHandlers();
    }

    @autobind
    public publishWikiCreated(wikiType: WikiType): void {
        this._telemetryWriter.publish(
            TelemetryConstants.WikiCreated,
            {
                wikiType: wikiType,
            });
    }

    @autobind
    public publishWikiVersionPublished(): void {
        this._telemetryWriter.publish(
            TelemetryConstants.WikiVersionPublished);
    }

    @autobind
    public unpublishedWiki(): void {
        this._telemetryWriter.publish(TelemetryConstants.WikiUnpublished);
    }

    @autobind
    public unpublishedWikiVersion(): void {
        this._telemetryWriter.publish(TelemetryConstants.WikiVersionUnpublished);
    }

    @autobind
    public publishWikiVersionUnavailableError(): void {
        this._telemetryWriter.publish(TelemetryConstants.WikiVersionUnavailableErrorPage);
    }

    @autobind
    public publishLandedOnWikiHub(): void {
        this._telemetryWriter.publish(TelemetryConstants.LandedOnWikiHub);
    }

    @autobind
    public publishLandingPageCreateWikiScreen(): void {
        this._telemetryWriter.publish(TelemetryConstants.WikiLandingPageCreateWikiScreen);
    }

    @autobind
    public publishLandingPageInsufficientReadPermissionScreen(): void {
        this._telemetryWriter.publish(TelemetryConstants.WikiLandingPageInSufficientReadPermissionScreen);
    }

    @autobind
    public publishLandingPageInsufficientWritePermissionScreen(): void {
        this._telemetryWriter.publish(TelemetryConstants.WikiLandingPageInSufficientWritePermissionScreen);
    }

    public notifyContentRendered(scenario: string, data?: any): void {
        this._perfScenarios.notifyContentRendered(scenario, data);
    }

    public startPerfScenario(action: string): void {
        if (action === WikiActionIds.History) {
            const scenarioName = PerformanceConstants.Revisions;

            var activeScenarios = getScenarioManager().getScenarios(Areas.Wiki, PerformanceConstants.WikiScenarioPrefix + scenarioName);
            if (activeScenarios && activeScenarios.length > 0) {
                activeScenarios.forEach((scenario: IScenarioDescriptor) => {
                    // Abort the previous scenario as it didnt complete
                    scenario.abort();
                })
            }
            getScenarioManager().startScenario(Areas.Wiki, PerformanceConstants.WikiScenarioPrefix + scenarioName);
        }
    }

    private _registerActionsHubHandlers(): void {
        this._sharedActionsHub.wikiCreated.addListener(this.publishWikiCreated);
        this._sharedActionsHub.wikiVersionPublished.addListener(this.publishWikiVersionPublished);
        this._sharedActionsHub.unpublishedWiki.addListener(this.unpublishedWiki);
        this._hubViewState.viewOptions.subscribe(this._onHubViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
    }

    private _disposeActionsHubHandlers(): void {
        this._sharedActionsHub.wikiCreated.removeListener(this.publishWikiCreated);
        this._sharedActionsHub.wikiVersionPublished.removeListener(this.publishWikiVersionPublished);
        this._sharedActionsHub.unpublishedWiki.removeListener(this.unpublishedWiki);
        this._hubViewState.viewOptions.unsubscribe(this._onHubViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
    }

    @autobind
    private _onHubViewOptionsChanged(urlParameters: UrlParameters): void {
        urlParameters = $.extend(getDefaultUrlParameters(), urlParameters);
        let feature: string;
        let extraProperties: Object;

        switch (urlParameters.action) {
            case WikiActionIds.View:
                feature = TelemetryConstants.PageViewed;
                extraProperties = { isInternalLinkVisited: !!urlParameters.anchor };
                break;
            case WikiActionIds.Edit:
                feature = TelemetryConstants.PageEditingStarted;
                extraProperties = {
                    isSubPage: urlParameters.isSubPage,
                    isInternalLinkVisited: !!urlParameters.anchor,
                };
                break;
            case WikiActionIds.History:
                feature = TelemetryConstants.PageHistoryViewed;
                break;
            case WikiActionIds.Compare:
                feature = TelemetryConstants.PageCompared;
                extraProperties = {
                    pivot: urlParameters.view,
                    isInternalLinkVisited: !!urlParameters.anchor,
                };
                break;
            case WikiActionIds.Publish:
                feature = TelemetryConstants.PublishWikiStarted;
                break;
            case WikiActionIds.Update:
                feature = TelemetryConstants.PublishVersionStarted;
                break;
            default:
                throw new Error("Wiki action not covered in telemetry publishing.");
        }

        this._telemetryWriter.publish(feature, extraProperties);
    }
}

class PerfScenarios {

    constructor() {
        getScenarioManager().split("startedInitialization");
    }

    public notifyContentRendered = (scenario: string, data?: any): void => {
        // Records page load scenario if not already recorded (this is the TTI scneario for the page)
        // One of these - Wiki.Overview.Load, Wiki.Revisions.Load, Wiki.Compare.Load
        if (getScenarioManager().isPageLoadScenarioActive()) {
            getScenarioManager().recordPageLoadScenario(Areas.Wiki,
                PerformanceConstants.WikiScenarioPrefix + scenario + PerformanceConstants.PageLoadScenarioSuffix,
                data);
        }

        // Records non TTI scenarios like switching to revisions from page tree - Wiki.Revisions
        // For now we start scenario only for Wiki.Revisions, so only that will be recorded here.
        getScenarioManager().endScenario(Areas.Wiki, PerformanceConstants.WikiScenarioPrefix + scenario);
    }
}
