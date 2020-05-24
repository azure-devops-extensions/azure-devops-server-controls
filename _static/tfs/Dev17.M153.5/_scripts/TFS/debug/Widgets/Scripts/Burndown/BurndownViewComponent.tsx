import * as Q from "q";
import * as React from "react";
import { ChartAndSubmetricComponentLayouts, ComponentLayoutMapping } from "WidgetComponents/ComponentLayoutEngine";
import { MessageType } from "WidgetComponents/LayoutState";
import { BurndownActionCreator } from "Widgets/Scripts/Burndown/BurndownActionCreator";
import { BurndownConstants } from "Widgets/Scripts/Burndown/BurndownConstants";
import { BurndownDataManager, BurnupDataManager } from "Widgets/Scripts/Burndown/BurndownDataManager";
import { BurndownSettings } from "Widgets/Scripts/Burndown/BurndownSettings";
import { ActionCreatorBase } from "Widgets/Scripts/ModernWidgetTypes/ActionCreatorBase";
import { EmptySettingsManager } from "Widgets/Scripts/ModernWidgetTypes/EmptySettingsManager";
import { SettingsManagerBase } from "Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase";
import { ViewComponentBase, ViewComponentProps } from "Widgets/Scripts/ModernWidgetTypes/ViewComponentBase";
import { WidgetDataManagerBase, WidgetDataManagerOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase";
import { BurnDirection } from 'Widgets/Scripts/Burndown/BurnDirection';
import { MessageOptions, AxFaultInMessageOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetMessageCardFactory";
import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";

export interface BurndownViewComponentProps extends ViewComponentProps {
    burnDirection: BurnDirection;
}

export default class BurndownViewComponent extends ViewComponentBase<BurndownViewComponentProps, BurndownSettings> {

    protected createDataManager(options: WidgetDataManagerOptions): WidgetDataManagerBase {
        if (this.props.burnDirection === BurnDirection.Down) {
            return new BurndownDataManager(options);
        }
        else {
            return new BurnupDataManager(options);
        }
    }

    /** Describes the set of layout mappings supported by this widget. */
    protected getLayoutMappings(): ComponentLayoutMapping[]{
        return ChartAndSubmetricComponentLayouts.getDefaultMappings();
    }

    protected createActionCreator(): ActionCreatorBase {
        return new BurndownActionCreator(this.dataManager, this.store, this.actions, BurndownConstants.featureName);
    }

    protected createSettingsManager(): SettingsManagerBase<BurndownSettings> {
        //Because this widget doesn't have a default state, generate empty settings
        return new EmptySettingsManager(BurndownConstants.featureName);
    }

    protected getMessageOptions(): MessageOptions {
        let options: MessageOptions;

        switch (this.getStoreState().messageType) {
            case MessageType.AxFaultIn:
                options = {
                    actionText: WidgetResources.BurndownWidget_LearnMore,
                    actionAriaLabel: WidgetResources.BurndownWidget_LearnMore,
                    actionOnClickDelegate: () => window.open(WidgetResources.BurndownWidget_LearnMoreLink, "_blank")
                } as AxFaultInMessageOptions;
                break;
            default:
                options = undefined;
                break;
        }

        return options;
    }

    /** Pass custom telemetry about the load event for Standardized Widget Reporting. */
    protected packWidgetLoadedTelemetryData(burndownSettings: BurndownSettings): IDictionaryStringTo<any> {
        if (burndownSettings) {
            return {
                "totalScopeTrendlineEnabled": burndownSettings.totalScopeTrendlineEnabled,
                "completedWorkEnabled": burndownSettings.completedWorkEnabled,
                "stackByWorkItemTypeEnabled": burndownSettings.stackByWorkItemTypeEnabled,
                "includeBugsEnabled": burndownSettings.includeBugsForRequirementCategory,
            }
        } else {
            return {};
        }
    }
}