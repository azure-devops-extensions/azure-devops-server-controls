import { PropertyDefinition } from "VSSPreview/Config/Framework/PropertyDefinition";

import { IWorkContext } from "Widgets/Scripts/Work/Framework/WorkContext";

import { WitPickerTranslator } from "Widgets/Scripts/Work/Components/WitPickerTranslator";

/**
 * Implementation of {PropertyDefinition} for {WitPicker}'s {WitPickerConfigProperty}
 */
export class WitPickerPropertyDefinition implements PropertyDefinition {

    constructor(
        public name: string,
        private translator: WitPickerTranslator,
        private workContext: IWorkContext,
    ) {}

    canSave(properties: IDictionaryStringTo<any>): boolean {
        if (!this.workContext.selector.isBacklogConfigurationsLoaded(properties) && !this.workContext.selector.isWitTypesLoaded(properties)) {
            return false;
        }

        let filters = this.translator.getClientWitTypeFilters(properties);
        for (let filter of filters) {
            if (filter.errorMessage) {
                return false;
            }
        }

        return true;
    }

    getDefaultValue() {
        return [];
    }
}