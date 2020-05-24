import { ComboO, IComboOptions, ComboTypeOptionsConstants } from "VSS/Controls/Combos";


export interface TypedComboOptions<TData> extends IComboOptions {
    /**
     * The initial source for populating the combo.
     */
    source?: TData[];

    /**
     * The initial mapping function to use to transform the combo source (objects of type TData) to how it should be displayed
     * in the control. If this function is not provided, the toString representation of TData is used.
     */
    toDisplayName?: (data: TData) => string;
}

/**
 * A combo that works with typed objects.
 * Uses a transformation function to display its source data objects rather than their toString representations
 * and allows searching through the source objects and retrieval of the selected typed object.
 */
export class TypedComboO<TData, TOptions extends TypedComboOptions<TData>> extends ComboO<TOptions> {
    private sourceData: TData[];
    private displayNameTransform: (data: TData) => string;

    public initializeOptions(options?: TOptions) {
        const parentOptions: IComboOptions = options;

        if (options != null) {
            this.displayNameTransform = options.toDisplayName;
            if (options != null && options.source != null && this.displayNameTransform != null) {
                this.sourceData = options.source;
                parentOptions.source = this.sourceData.map(o => this.displayNameTransform(o));
            }
        }

        super.initializeOptions(parentOptions);
    }

    /**
     * Filters through the source data based upon a predicate and returns the first match.
     * @param predicate The condition by which to filter the source data.
     * @returns The first object that satisfies the predicate. Otherwise null.
     */
    public firstOrDefault(predicate: (value: TData, index: number, array: TData[]) => boolean): TData {
        var value: TData = null;
        if (this.sourceData) {
            var filteredData = this.sourceData.filter(predicate);

            if (filteredData.length > 0) {
                value = filteredData[0];
            }
        }

        return value;
    }

    /**
     * Filters through the source data based upon a predicate and returns all matches
     * @param predicate The condition by which to filter the source data.
     * @returns The all objects that satisfy the predicate. Otherwise empty array
     */
    public findByPredicate(predicate: (value: TData, index: number, array: TData[]) => boolean): TData[] {
        var value: TData[] = [];
        if (this.sourceData) {
            value = this.sourceData.filter(predicate);
        }

        return value;
    }

    /**
     * Sets the data to use/show in the combo.
     * @param data The data to use.
     * @param displayProperty A transform to get the display name for each object in the combo. If omitted, the toString representation is used.
     */
    public setSource(data: TData[], toDisplayName?: (data: TData) => string): void {
        this.sourceData = data;
        this.displayNameTransform = toDisplayName;

        if (this.sourceData != null && this.displayNameTransform) {
            var displayNames = this.sourceData.map(o => this.displayNameTransform(o));
            super.setSource(displayNames);
        } else {
            super.setSource(this.sourceData);
        }
    }

    /**
     * Retrieves the selected object (or array of objects if MultiValueType was specified in the control options).
     * @returns The first object with display name value equal to the selected text in the combo input. Otherwise null or empty array (if MultiValueType is specified in options).
     */
    public getValue(): TData;
    public getValue<TVal2 extends TData[]>(): TData[];
    public getValue<TValue>(): TData | TData[] {
        if (this._options.type === ComboTypeOptionsConstants.MultiValueType) {
            // If combobox is multi-select, take values from text and split them on the separator that it's using
            let selectedValues = this.getText().split(", ");
            var selectedObjects: TData[] = [];

            // Look back into the data and populate result with each item
            for (var i = 0; i < selectedValues.length; i++) {
                let item: TData = null;
                if (this.displayNameTransform) {
                    item = this.firstOrDefault(o => selectedValues[i] === this.displayNameTransform(o));
                } else {
                    item = this.firstOrDefault(o => selectedValues[i] === o.toString());
                }
                if (item != null) {
                    selectedObjects.push(item);
                }
            }

            return selectedObjects;

        } else {
            // If combo box is single value, use getvalue which will contain selected item
            var selectedValue = super.getValue<string>();

            if (this.displayNameTransform) {
                var selectedObject = this.firstOrDefault(o => selectedValue === this.displayNameTransform(o));
            } else {
                var selectedObject = this.firstOrDefault(o => selectedValue === o.toString());
            }

            return selectedObject;
        }
    }

    /**
     * Sets the selected object to the first one that satisfies the predicate
     * (or all that satisfy the predicate if MultiValueType was specified in the control options).
     * If nothing is matched the combo text is set to null.
     * @param predicate The condition by which to match an object in the source data.
     * @param fireEvent Whether or not to fire the onChange event for the combo.
     * @returns True if the predicate was satisfied. False otherwise.
     */
    public setSelectedByPredicate(predicate: (value: TData, index: number, array: TData[]) => boolean, fireEvent?: boolean): boolean {
        if (this._options.type === ComboTypeOptionsConstants.MultiValueType) {
            var values = this.findByPredicate(predicate);
            if (values.length > 0) {
                var text = values.map(value =>
                    (this.displayNameTransform) ? this.displayNameTransform(value) : value.toString()
                ).join(", ");
                super.setText(text, fireEvent);
                return true;
            }
            else {
                super.setText(null, fireEvent);
                return false;
            }
        }
        else {
            var value = this.firstOrDefault(predicate);
            if (value != null) {
                var text = (this.displayNameTransform) ? this.displayNameTransform(value) : value.toString();
                super.setText(text, fireEvent);
                return true;
            } else {
                super.setText(null, fireEvent);
                return false;
            }
        }
    }
}

export class TypedCombo<TData> extends TypedComboO<TData, IComboOptions> { }
