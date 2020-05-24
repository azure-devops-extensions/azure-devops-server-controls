import { PropertyDefinition } from "VSSPreview/Config/Framework/PropertyDefinition";

/**
 * Implementation of {PropertyDefinition} for {TimePeriodPicker}
 */
export class TimePeriodPickerPropertyDefinition implements PropertyDefinition {

    constructor(public name: string) {
    }

    canSave(properties: IDictionaryStringTo<any>): boolean {
        return true;
    }

    getDefaultValue() {
        return 7;
    }
}