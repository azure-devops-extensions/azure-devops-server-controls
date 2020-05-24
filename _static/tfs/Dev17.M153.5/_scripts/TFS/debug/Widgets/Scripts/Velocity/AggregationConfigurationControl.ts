import { Selector } from 'Dashboards/Scripts/Selector';
import { ProjectCollection } from 'Presentation/Scripts/TFS/TFS.OM.Common';
import Controls = require('VSS/Controls');
import * as Utils_Array from 'VSS/Utils/Array';
import * as Utils_String from 'VSS/Utils/String';
import { WidgetsCacheableQueryService } from 'Widgets/Scripts/DataServices/WidgetsCacheableQueryService';
import {
    AggregationWorkItemTypeFieldsQuery,
} from 'Widgets/Scripts/DataServices/ConfigurationQueries/AggregationWorkItemTypeFieldsQuery';
import { AggregationMode } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import { ModefulValueSetting } from 'Widgets/Scripts/Shared/ModefulValueSetting';
import { TypedCombo } from 'Widgets/Scripts/Shared/TypedCombo';
import { WorkItemTypeField } from 'Widgets/Scripts/Velocity/VelocityDataContract';

export class AggregationModeCombo extends TypedCombo<AggregationMode> {

}

export class AggregationFieldCombo extends TypedCombo<WorkItemTypeField> {

}

export interface AggregationConfigurationControlOptions {

    /** Raised whenever the mode and field reference ID change */
    onChanged?: (AggregationMode, string) => void;
}

/**
 * A composite of two combo controls:
 *   A mode combo that provides 'Count' and 'Sum' options.
 *   A field combo that provides a list of fields that can be aggregated (via Sum).
 *   The field combo changes based on the mode selection and on the work item types via setContext().
 *   The field combo is always 'work items' when the count mode is selected.
 */
export class AggregationConfigurationControl extends Controls.Control<AggregationConfigurationControlOptions> implements Selector {

    private $loadingSpinner: JQuery;
    private $modeBusyOverlay: JQuery;
    private initializedOverlay: boolean;

    private modeCombo: AggregationModeCombo;
    private fieldCombo: AggregationFieldCombo;

    private modes: AggregationMode[];

    private sumModeFields: WorkItemTypeField[];
    private countModeField: WorkItemTypeField;

    private fields: WorkItemTypeField[];

    constructor(options: AggregationConfigurationControlOptions) {
        super(options);

        this.modes = [AggregationMode.Count, AggregationMode.Sum];
        this.countModeField = { FieldName: WidgetResources.AggregationConfigurationControl_WorkItems, FieldReferenceName: '', FieldType: '', WorkItemType: '' };
    }

    public initializeOptions(options?: AggregationConfigurationControlOptions): void {
        super.initializeOptions(options);
    }

    public initialize(): void {
        super.initialize();

        var container = this.getElement();

        let block = $('<div>').addClass('aggregation-configuration');

        // Mode combo selection updates the list of fields
        this.modeCombo = TypedCombo.create(AggregationModeCombo, block, {
            change: () => {
                this._updateFields();
                this._options.onChanged(this.getSelectedMode(), this.getSelectedFieldReferenceName());
            }
        });

        this.modeCombo.getElement().addClass('mode-combo');

        $('<div>').addClass('of-label').text(WidgetResources.AggregationConfigurationControl_Of_Label).appendTo(block);

        this.fieldCombo = TypedCombo.create(AggregationFieldCombo, block, {
            change: () => {
                this._options.onChanged(this.getSelectedMode(), this.getSelectedFieldReferenceName());
            }
        });

        block.appendTo(container);

        this.fieldCombo.getElement().addClass('field-combo');

        this.modeCombo.setSource(this.modes, this._getAggregationModeDisplayName);
        this.modeCombo.setSelectedIndex(0);
    }

    public setContext(projectId: string, workItemTypes: string | string[]): IPromise<void> {
        let dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
        let query = new AggregationWorkItemTypeFieldsQuery(projectId);

        return dataService.getCacheableQueryResult<WorkItemTypeField[]>(query).then<void>((fields) => {

            if (workItemTypes) {
                if (workItemTypes instanceof Array) {
                    this.sumModeFields = Utils_Array.unique(
                        fields.filter((f) => {
                            return Utils_Array.contains(workItemTypes, f.WorkItemType);
                        }),
                        (f1, f2) => {
                            return Utils_String.ignoreCaseComparer(f1.FieldReferenceName, f2.FieldReferenceName);
                        });
                }
                else {
                    this.sumModeFields = fields.filter((f) => f.WorkItemType === workItemTypes);
                }
            }
            else {
                this.sumModeFields = fields;
            }

            this._updateFields();
        });
    }

    public getSelectedMode(): AggregationMode {
        return this.modeCombo.getValue() as AggregationMode;
    }

    public setSelectedMode(mode: AggregationMode): void {
        if (this.modeCombo.setSelectedByPredicate(m => m === mode)) {
            this._updateFields();
        }
    }

    public getSelectedFieldReferenceName(): string {
        let field = this.fieldCombo.getValue() as WorkItemTypeField;
        return (field != null) ? field.FieldReferenceName : undefined;
    }

    public setSelectedFieldReferenceName(fieldReferenceName?: string): void {
        if (!this.fieldCombo.setSelectedByPredicate(wi => wi.FieldReferenceName === fieldReferenceName)) {
            this.fieldCombo.setSelectedIndex(0);
        }
    }

    public setSelection(mode: AggregationMode, fieldReferenceName?: string): void {
        this.setSelectedMode(mode);
        this.setSelectedFieldReferenceName(fieldReferenceName);
    }

    public validate(): string {
        let errorMessage = null;

        if (this.getSelectedMode() !== AggregationMode.Sum && this.getSelectedMode() !== AggregationMode.Count) {
            errorMessage = WidgetResources.AggregationConfigurationControl_ModeNotFoundError;
        } else if (typeof this.getSelectedFieldReferenceName() === "undefined") {
            errorMessage = WidgetResources.AggregationConfigurationControl_FieldNotFoundError;
        }

        return errorMessage;
    }

    private _updateFields() {
        let mode = this.getSelectedMode();
        if (mode == AggregationMode.Count) {
            this.fields = [this.countModeField];
        }
        else {
            this.fields = this.sumModeFields;
        }

        this.fieldCombo.setSource(this.fields, (d) => d.FieldName);

        // Try to keep selected value before picking the default
        if (this.fieldCombo.getValue() == null) {
            this.fieldCombo.setSelectedIndex(0);
        }
    }

    private _getAggregationModeDisplayName(item: AggregationMode): string {
        switch (item) {
            case AggregationMode.Count:
                return WidgetResources.AggregationConfigurationControl_Count;
            case AggregationMode.Sum:
                return WidgetResources.AggregationConfigurationControl_Sum;
            default:
                return '';
        }
    }

    public getSettings(): ModefulValueSetting<AggregationMode, string> {
        return {
            identifier: this.getSelectedMode(),
            settings: this.getSelectedFieldReferenceName()
        }
    }

    public setEnabled(value: boolean): void {
        this.modeCombo.setEnabled(value);
        this.fieldCombo.setEnabled(value);
    }

    /**
     * Creates overlay that displays on top of picker to prevent user from interacting with the control.
     * Extends the base implementation of showBusyOverlay by resizing the overlay to the size of the picker and
     * positioning it over the picker. Additionally, a spinner image is added to the overlay to indicate loading/busy state.
     * Finally, an extra overlay is added for the mode picker.
     */
    public showBusyOverlay(): JQuery {
        let $overlay = super.showBusyOverlay();

        // Add spinner icon and move overlay only if we haven't previously
        if (!this.initializedOverlay) {
            this.$modeBusyOverlay = $("<div/>").addClass($overlay.attr("class"));
            this.$modeBusyOverlay.appendTo(this.modeCombo.getElement());

            $overlay.append(this.$loadingSpinner);
            $overlay.appendTo(this.fieldCombo.getElement());

            // Set width/height of overlay to the size of the picker
            $overlay.width(this.fieldCombo.getElement().outerWidth());
            $overlay.height(this.fieldCombo.getElement().outerHeight());
            this.$modeBusyOverlay.width(this.modeCombo.getElement().outerWidth());
            this.$modeBusyOverlay.height(this.modeCombo.getElement().outerHeight());

            this.initializedOverlay = true;
        }

        this.$modeBusyOverlay.show();

        return $overlay;
    }

    /**
     * Hides overlay that is displayed on top of picker from a call to showBusyOverlay.
     */
    public hideBusyOverlay(): void {
        super.hideBusyOverlay();

        if (this.initializedOverlay) {
            this.$modeBusyOverlay.hide();
        }
    }
}
