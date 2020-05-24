import * as Q from 'q';

import { AnalyticsExceptionParsing, AnalyticsExceptionType } from "Analytics/Scripts/AnalyticsExceptionUtilities";

import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

import { LayoutState } from "WidgetComponents/LayoutState";

import { WidgetsCacheableQueryService } from "Widgets/Scripts/DataServices/WidgetsCacheableQueryService";
import { ISettingsManager } from "Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase";
import { WidgetDataManagerBase, WidgetDataManagerOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase";
import { ErrorParser } from "Widgets/Scripts/TFS.Widget.Utilities";

export class AnalyticsTrendsDataManager extends WidgetDataManagerBase {
    private dataService: WidgetsCacheableQueryService;

    constructor(options: WidgetDataManagerOptions, settingsManager?: ISettingsManager<{}>) {
        super(options);
        this.dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
    }

    /** Start running any demands which require async behavior. */
    public getData(): IPromise<LayoutState> {
        return Q.resolve(this.currentState);
    }

    /**
    * Verifies widget is properly configured for viewing (This means it has configuration, and  that configuration is accepted for rendering).
    */
    private hasSatisfactoryConfiguration(): boolean {
        return false;
    }
}