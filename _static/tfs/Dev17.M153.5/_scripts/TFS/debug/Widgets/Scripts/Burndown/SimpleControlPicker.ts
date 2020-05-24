import { TypedCombo, TypedComboO } from "Widgets/Scripts/Shared/TypedCombo";
import * as Combos from "VSS/Controls/Combos";
import { Selector } from "Dashboards/Scripts/Selector";

export interface PickerOptionValue{
    labelText: string;
    identifier: number;
}

export interface PickerOption extends Combos.IComboOptions {
    onChange: () => void;
}

/** A general picker for hard coded localized values */
export class SimpleControlPicker extends TypedComboO<PickerOptionValue, PickerOption> implements Selector {
    
    public static createInstance($container?: JQuery, options?: Combos.IComboOptions): SimpleControlPicker {
        return <SimpleControlPicker>this.createIn<Combos.IComboOptions>(SimpleControlPicker, $container, options);
    }

    public initializeOptions(options: Combos.IComboOptions) {
        super.initializeOptions($.extend(options, {
            cssClass: "simple-picker",
            mode: "drop",
            allowEdit: false
        }));
    }
    
    public getSettings(): PickerOptionValue {
        return this.getValue() as PickerOptionValue;
    }

    public validate(): string { return null; }
}