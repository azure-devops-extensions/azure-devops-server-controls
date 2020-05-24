import "VSS/LoaderPlugins/Css!Widgets/Styles/ChartTypePicker";

import { TypedComboO, TypedComboOptions } from "Widgets/Scripts/Shared/TypedCombo";
import { IComboOptions } from "VSS/Controls/Combos";
import { ChartTemplateItem, ChartTemplateList } from "Charting/Scripts/TFS.Charting.Editors";
import { urlHelper } from "VSS/Locations";
import * as Diag from "VSS/Diag";

export interface ChartTypePickerOptions extends IComboOptions {
    defaultChartType?: string;
    source?: ChartTemplateItem[];
    change?: () => void;
}

/**
 * Used for selecting one from a set of chart templates/types.
 */
export class ChartTypePicker extends TypedComboO<ChartTemplateItem, ChartTypePickerOptions> {
    private static getItemDisplayName = item => item.labelText;

    private static renderTemplateItem(item: ChartTemplateItem): JQuery {
        const imagePath = urlHelper.getVersionedContentUrl(`Chart/${item.widgetConfigIconFileName}`);
        return $("<span />")
            .append($("<img />").attr("src", imagePath))
            .append($("<span />").text(item.labelText));
    }

    public constructor(options?: ChartTypePickerOptions) {
        super(options);
    }

    public initializeOptions(options: ChartTypePickerOptions & TypedComboOptions<ChartTemplateItem> = { }) {
        options.allowEdit = false;
        options.toDisplayName = ChartTypePicker.getItemDisplayName;
        options.dropOptions = options.dropOptions || { };
        options.dropOptions.getItemContents = (popupItemDisplayName: string) => {
            const matchedItem = this.firstOrDefault(item => popupItemDisplayName === ChartTypePicker.getItemDisplayName(item));
            return ChartTypePicker.renderTemplateItem(matchedItem);
        };

        super.initializeOptions(options);
    }

    public initialize(): void {
        super.initialize();

        if (this._options != null && this._options.defaultChartType) {
            const selection = this.firstOrDefault(item => this._options.defaultChartType === item.chartType);

            Diag.Debug.assertIsNotNull(selection, "Unable to set default chart type");
            if (selection != null) {
                this.setText(ChartTypePicker.getItemDisplayName(selection));
            }
        }
    }

    public setSource(data: ChartTemplateItem[]): void {
        super.setSource(data, ChartTypePicker.getItemDisplayName);
    }
}
