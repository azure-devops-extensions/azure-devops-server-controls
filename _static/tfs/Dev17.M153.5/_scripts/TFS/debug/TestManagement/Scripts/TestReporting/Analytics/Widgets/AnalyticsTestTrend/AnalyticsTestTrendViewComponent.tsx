import { ComponentLayoutMapping, ChartAndSubmetricComponentLayouts } from 'WidgetComponents/ComponentLayoutEngine';

import { AnalyticsTestTrendActionCreator } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendActionCreator';
import { AnalyticsTestTrendDataManager } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendDataManager';
import { AnalyticsTestTrendConstants } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendConstants';

import { ActionCreatorBase } from 'Widgets/Scripts/ModernWidgetTypes/ActionCreatorBase';
import { EmptySettingsManager } from 'Widgets/Scripts/ModernWidgetTypes/EmptySettingsManager';
import { SettingsManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import { ViewComponentBase, ViewComponentProps } from 'Widgets/Scripts/ModernWidgetTypes/ViewComponentBase';
import { WidgetDataManagerOptions, WidgetDataManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase';
import { MessageOptions, AxFaultInMessageOptions } from 'Widgets/Scripts/ModernWidgetTypes/WidgetMessageCardFactory';
import { AnalyticsTestTrendSettings } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings';
import { MessageType } from 'WidgetComponents/LayoutState';

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

export class AnalyticsTestTrendViewComponent extends ViewComponentBase<ViewComponentProps, AnalyticsTestTrendSettings> {

    protected createDataManager(options: WidgetDataManagerOptions): WidgetDataManagerBase {
        return new AnalyticsTestTrendDataManager(options);
    }

    protected getLayoutMappings(): ComponentLayoutMapping[] {
        return ChartAndSubmetricComponentLayouts.getDefaultMappings();
    }

    protected createActionCreator(): ActionCreatorBase {
        return new AnalyticsTestTrendActionCreator(this.dataManager, this.store, this.actions, AnalyticsTestTrendConstants.featureName);
    }

    protected createSettingsManager(): SettingsManagerBase<AnalyticsTestTrendSettings> {
        return new EmptySettingsManager(AnalyticsTestTrendConstants.featureName);
    }

    protected getMessageOptions(): MessageOptions {
        if (this.getStoreState().messageType === MessageType.AxFaultIn) {
            let options: AxFaultInMessageOptions = {
                actionText: Resources.AnalyticsTestTrendWidget_LearnMore,
                actionAriaLabel: Resources.AnalyticsTestTrendWidget_LearnMore,
                actionOnClickDelegate: () => window.open(Resources.AnalyticsTestTrendWidget_LearnMoreLink, "_blank")
            };
            return options;
        }
    }

    /** Pass custom telemetry about the load event for Standardized Widget Reporting. */
    protected packWidgetLoadedTelemetryData(settings: AnalyticsTestTrendSettings): IDictionaryStringTo<any> {
        return settings ? settings : {}
    }
}