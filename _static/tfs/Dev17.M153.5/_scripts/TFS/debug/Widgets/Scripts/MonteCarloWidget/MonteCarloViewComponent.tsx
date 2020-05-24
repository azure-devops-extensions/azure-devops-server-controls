import { ComponentLayoutMapping, ChartAndSubmetricComponentLayouts } from "WidgetComponents/ComponentLayoutEngine";

import { MonteCarloActionCreator } from "Widgets/Scripts/MonteCarloWidget/MonteCarloActionCreator";
import { MonteCarloDataManager } from "Widgets/Scripts/MonteCarloWidget/MonteCarloDataManager";
import { MonteCarloConstants } from "Widgets/Scripts/MonteCarloWidget/MonteCarloConstants";

import { ActionCreatorBase } from "Widgets/Scripts/ModernWidgetTypes/ActionCreatorBase";
import { EmptySettingsManager } from "Widgets/Scripts/ModernWidgetTypes/EmptySettingsManager";
import { SettingsManagerBase } from "Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase";
import { ViewComponentBase, ViewComponentProps } from "Widgets/Scripts/ModernWidgetTypes/ViewComponentBase";
import { WidgetDataManagerOptions, WidgetDataManagerBase } from "Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase";
import { MessageOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetMessageCardFactory";

export class MonteCarloViewComponent extends ViewComponentBase<ViewComponentProps, {}> {

    protected createDataManager(options: WidgetDataManagerOptions): WidgetDataManagerBase {
        return new MonteCarloDataManager(options);
    }

    protected getLayoutMappings(): ComponentLayoutMapping[]{
        return ChartAndSubmetricComponentLayouts.getDefaultMappings();
    }

    protected createActionCreator(): ActionCreatorBase {
        return new MonteCarloActionCreator(this.dataManager, this.store, this.actions, MonteCarloConstants.featureName);
    }

    protected createSettingsManager(): SettingsManagerBase<{}> {
        return new EmptySettingsManager(MonteCarloConstants.featureName);
    }

    protected getMessageOptions(): MessageOptions {
        let options: MessageOptions;
        return options;
    }
}