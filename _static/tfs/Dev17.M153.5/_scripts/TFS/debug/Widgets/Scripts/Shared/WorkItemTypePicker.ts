import "VSS/LoaderPlugins/Css!Widgets/Styles/WorkItemTypePicker";

import * as Q from "q";

import * as Combos from "VSS/Controls/Combos";

import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import { TypedCombo } from "Widgets/Scripts/Shared/TypedCombo";
import * as TFS_AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { KanbanTimeAgileSettingsHelper } from "Widgets/Scripts/KanbanTime/KanbanTimeAgileSettingsHelper";
import { RadioSettingsFieldPickerO, RadioSettingsFieldPickerOptions } from "Widgets/Scripts/Shared/RadioSettingsFieldPicker";
import { SettingsField, SettingsFieldOptions } from "Dashboards/Scripts/SettingsField";
import { SelectorControl } from "Dashboards/Scripts/Selector";
import { BacklogPicker } from "Widgets/Scripts/Shared/AnalyticsPickers";


/**
 * Describes the nature of filtering by work item type to perform. By presence in an agile board level, or directly by board-agnostic work item type.
 */
export enum WorkItemTypeFilterMode {
    /** When using work item type, the settings value is stored as a string. */
    WorkItemType,

    /** When using backlog category, the settings value is stored as a string. */
    BacklogCategory
};

export interface WitSelectorOptions {
    /** Called when the selected radio button changes. Arguments are the selected field and its identifier. */
    onChange: (fieldIdentifier: string, field: SettingsField<SelectorControl>) => void;

    /** Callback for when the backlog picker value is changed */
    onBacklogChange: () => void;

    /** Callback for when the work item type picker value is changed */
    onWorkItemTypeChange: () => void;

    /** (Optional) Text to render as a label for the control. */
    labelText?: string;

    /** (Optional) Determines whether backlogs are restricted to the team's visibility settings */
    includeOnlyVisibleBacklogs?: boolean;

    /** (Optional) collapse the error region, reclaiming its space when no errorMessage needs to be displayed */
    collapseOnHide?: boolean;

    /** (Optional) css layout style classes to use. Each field is mapped by its fieldIdentifier.  */
    layout?: IDictionaryStringTo<string>;
}

export class WITSelector extends RadioSettingsFieldPickerO<WitSelectorOptions, string> {
    private _backlogSettingsField: SettingsField<BacklogPicker>;
    private _workItemTypeSettingsField: SettingsField<WorkItemTypePicker>;

    public get backlogSettingsField() { return this._backlogSettingsField; }
    public get workItemTypeSettingsField() { return this._workItemTypeSettingsField; }

    public initializeOptions(options: WitSelectorOptions) {
        /*
         * The options here are cast as RadioSettingsFieldPickerOptions.
         * Under the hood they're a combination of RadioSettingsFieldPickerOptions and WitSelectorOptions.
         */
        let castOptions = <RadioSettingsFieldPickerOptions>options;
        castOptions.settingsFields = this.createFieldsDictionary(options);
        castOptions.radioButtonGroupName = "wit-selector";

        var defaults = {
            includeOnlyVisibleBacklogs: true,
        };

        super.initializeOptions($.extend(defaults, options));
    }

    /**
     * Enables/disables the WIT Selector control.
     * @param isEnabled
     */
    public setEnabled(isEnabled: boolean): void {
        this.toggleRadioButton(WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory], isEnabled);
        this.toggleRadioButton(WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType], isEnabled);
        this.backlogSettingsField.control.setEnabled(isEnabled);
        this.workItemTypeSettingsField.control.setEnabled(isEnabled);
    }

    private createFieldsDictionary(options: WitSelectorOptions): IDictionaryStringTo<SettingsField<SelectorControl>> {

        options.layout = options.layout || {};

        this._backlogSettingsField = this.createSettingsField({
            control: BacklogPicker.createInstance(null, {
                includeOnlyVisibleBacklogs: options.includeOnlyVisibleBacklogs,
                change: options.onBacklogChange
            }),
            labelText: WidgetResources.WorkItemTypePicker_BacklogLabel,
            collapseOnHide: options.collapseOnHide,
            layout: "single-line-margined " + options.layout[BacklogPicker.getInstanceName()]
        });

        this._workItemTypeSettingsField = this.createSettingsField({
            control: WorkItemTypePicker.createInstance(null, {
                change: options.onWorkItemTypeChange
            }),
            labelText: WidgetResources.KanbanTime_WorkItemTypeLabel,
            collapseOnHide: options.collapseOnHide,
            layout: "single-line-margined " + options.layout[WorkItemTypePicker.getInstanceName()]
        });

        let witSelectorDictionary: IDictionaryStringTo<SettingsField<SelectorControl>> = {};
        witSelectorDictionary[WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]] = this.backlogSettingsField;
        witSelectorDictionary[WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]] = this.workItemTypeSettingsField;

        return witSelectorDictionary;
    }

    private createSettingsField<T extends SelectorControl>(
        options: SettingsFieldOptions<T>,
        $container?: JQuery): SettingsField<T> {
        return SettingsField.createSettingsField(
            <SettingsFieldOptions<T>>$.extend({
                hasErrorField: true,
            }, options),
            $container);
    }
}

export class WorkItemTypePicker extends TypedCombo<string> {
    private $loadingSpinner: JQuery;
    private initializedOverlay: boolean;

    public static createInstance(
        $container?: JQuery,
        options?: Combos.IComboOptions): WorkItemTypePicker {
        return this.create(WorkItemTypePicker, $container, options);
    }

    public initializeOptions(options: Combos.IComboOptions) {
        super.initializeOptions($.extend({
            cssClass: "work-item-type-picker",
            placeholderText: WidgetResources.WorkItemTypePicker_Watermark,
        }, options));
    }

    public static getInstanceName(): string {
        return "WorkItemTypePicker";
    }

    public getName(): string {
        return WorkItemTypePicker.getInstanceName();
    }

    public setContext(projectId: string): IPromise<string[]> {
        return KanbanTimeAgileSettingsHelper.getWorkItemTypes(projectId)
            .then<string[]>((workItemTypes: string[]) => {
                workItemTypes.sort();
                this.setSource(workItemTypes);
                return workItemTypes;
            });
    }

    public setSource(workItemTypes: string[]): void {
        super.setSource(workItemTypes, (workItemType: string) => workItemType);
    }

    public validate(): string {
        let errorMessage = null;
        let hasWitTypesToChooseFrom = this.firstOrDefault(() => true) !== null;

        if (!hasWitTypesToChooseFrom) { // Are there any workItem types?
            errorMessage = WidgetResources.WorkItemTypePicker_NoWorkItemTypesToChooseFromError;
        } else if (!this.getText()) {
            errorMessage = WidgetResources.WorkItemTypePicker_NoWorkItemTypeSelectedError;
        } else {
            if (this.getValue() === null) {
                errorMessage = WidgetResources.WorkItemTypePicker_SelectedWorkItemTypeNotFoundError;
            }
        }

        return errorMessage;
    }

    public getSettings(): string {
        let workItemType = this.getValue() as string;
        if (workItemType !== null) {
            return workItemType;
        } else {
            return null;
        }
    }

    /**
     * Creates overlay that displays on top of picker to prevent user from interacting with the control.
     * Extends the base implementation of showBusyOverlay by resizing the overlay to the size of the picker and
     * positioning it over the picker. Additionally, a spinner image is added to the overlay to indicate loading/busy state.
     * @returns the overlay's JQuery object.
     */
    public showBusyOverlay(): JQuery {
        let overlay = super.showBusyOverlay();

        // Add spinner icon and move overlay only if we haven't previously
        if (!this.initializedOverlay) {
            overlay.append(this.$loadingSpinner);
            overlay.appendTo(this.getElement());

            // Set width/height of overlay to the size of the picker
            overlay.width(this.getElement().outerWidth());
            overlay.height(this.getElement().outerHeight());

            this.initializedOverlay = true;
        }

        return overlay;
    }
}
