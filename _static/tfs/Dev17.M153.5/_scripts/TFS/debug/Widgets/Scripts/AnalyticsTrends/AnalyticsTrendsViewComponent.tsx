import { ComponentLayoutMapping, ChartAndSubmetricComponentLayouts } from "WidgetComponents/ComponentLayoutEngine";

import { AnalyticsTrendsActionCreator } from "Widgets/Scripts/AnalyticsTrends/AnalyticsTrendsActionCreator";
import { AnalyticsTrendsDataManager } from "Widgets/Scripts/AnalyticsTrends/AnalyticsTrendsDataManager";
import { AnalyticsTrendsConstants } from "Widgets/Scripts/AnalyticsTrends/AnalyticsTrendsConstants";

import { ActionCreatorBase } from "Widgets/Scripts/ModernWidgetTypes/ActionCreatorBase";
import { EmptySettingsManager } from "Widgets/Scripts/ModernWidgetTypes/EmptySettingsManager";
import { SettingsManagerBase } from "Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase";
import { ViewComponentBase, ViewComponentProps } from "Widgets/Scripts/ModernWidgetTypes/ViewComponentBase";
import { WidgetDataManagerOptions, WidgetDataManagerBase } from "Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase";
import { MessageOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetMessageCardFactory";

export class AnalyticsTrendsViewComponent extends ViewComponentBase<ViewComponentProps, {}> {

    protected createDataManager(options: WidgetDataManagerOptions): WidgetDataManagerBase {
        return new AnalyticsTrendsDataManager(options);
    }

    protected getLayoutMappings(): ComponentLayoutMapping[]{
        return ChartAndSubmetricComponentLayouts.getDefaultMappings();
    }

    protected createActionCreator(): ActionCreatorBase {
        return new AnalyticsTrendsActionCreator(this.dataManager, this.store, this.actions, AnalyticsTrendsConstants.featureName);
    }

    protected createSettingsManager(): SettingsManagerBase<{}> {
        return new EmptySettingsManager(AnalyticsTrendsConstants.featureName);
    }

    protected getMessageOptions(): MessageOptions {
        let options: MessageOptions;
        return options;
    }
}