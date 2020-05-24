import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Filters = require("VSS/Controls/Filters");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TreeView = require("VSS/Controls/TreeView");
import VSS = require("VSS/VSS");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

/**
 * Creates a value control of a given control type for use with FieldFilterControl
 */
export class FieldsFilterValueControl extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.fieldsFilterValueControl";
    private _selectedControl: any;
    private _containerClass: string;

    constructor(options?) {
        super(options);
    }

    /**
     * Initialize options
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    /**
     * Initialize control and add related class
     */
    public initialize() {
        super.initialize();
        this._selectedControl = null;
        this._element.addClass("field-filter-value-control");
    }

    /**
     * On change behavior, fires change option if passed in
     */
    public fireChange() {
        if ($.isFunction(this._options.change)) {
            this._options.change();
        }
    }

    /**
     * Creates a control of the given type with the given options. 
     * @param controlType
     * @param options
     */
    public setControl(controlType: any, options?: any) {
        if (this._selectedControl) {
            this._element.empty();
            this._selectedControl.dispose();
        }
        if (this._containerClass) {
            this._element.removeClass(this._containerClass);
        }

        if (options && options.containerCssClass) {
            this._element.addClass(options.containerCssClass);
            this._containerClass = options.containerCssClass;
        }
        else {
            this._containerClass = "";
        }

        let tempOptions: any = null; // Respect the options passed through setControl call when overriding this._options
        this._selectedControl = Controls.BaseControl.createIn(controlType, this._element, $.extend(tempOptions, this._options, options));
    }

    /**
     * Returns the control
     */
    public getControl(): any {
        return this._selectedControl;
    }

    /**
     * Sets type of the control if control supports setType
     * @param type
     */
    public setType(type: string) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setType)) {
            this._selectedControl.setType(type);
        }
    }

    /**
     * Sets the mode of the control if control supports setMode
     * @param mode
     */
    public setMode(mode: string) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setMode)) {
            this._selectedControl.setMode(mode);
        }
    }

    /**
     * Sets the value of the control if control supports setValue
     * @param value
     */
    public setValue(value: any) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setValue)) {
            this._selectedControl.setValue(value);
        }
    }

    /**
     * Gets value of the control if control supports getValue, otherwise returns ""
     */
    public getValue(): any {
        if (this._selectedControl && $.isFunction(this._selectedControl.getValue)) {
            return this._selectedControl.getValue();
        }

        return "";
    }

    /**
     * Sets the text of the control if control supports setText
     * @param text
     */
    public setText(text: string) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setText)) {
            this._selectedControl.setText(text);
        }
    }

    /**
     * Returns the text of the control if control supports getText, otherwise returns ""
     */
    public getText(): string {
        if (this._selectedControl && $.isFunction(this._selectedControl.getText)) {
            return this._selectedControl.getText();
        }

        return "";
    }

    /**
     * Sets enabled state of control if control supports setEnabled
     * @param enabled
     */
    public setEnabled(enabled: boolean) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setEnabled)) {
            this._selectedControl.setEnabled(enabled);
        }
    }

    /**
     * Sets invalid state of control if control supports setInvalid
     * @param invalid
     */
    public setInvalid(invalid: boolean) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setInvalid)) {
            this._selectedControl.setInvalid(invalid);
        }
    }

    /**
     * Sets source of control if control supports setSource
     * @param source
     */
    public setSource(source: any[]) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setSource)) {
            this._selectedControl.setSource(source);
        }
    }
}

/**
 * Options for the FieldsFilterControl
 */
export interface FieldsFilterControlOptions extends Filters.IFilterControlOptions {
    supportedFieldsDefinitions?: any[];
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

/**
 * Options-Type aware implementation of FieldsFilterControl
 */
export class FieldsFilterControlO<T extends FieldsFilterControlOptions> extends Filters.FilterControlO<T> {
    public static enhancementTypeName: string = "tfs.wit.fieldsFilterBase";
    private static POPUP_MAX_WIDTH = 300;

    /**
     * Translates given node into a tree node
     * @param values
     */
    private static _generateTreeNodes(values): TreeView.TreeNode[] {
        function populateUINodes(node, uiNode) {
            var i, l, nodes = node.children, newUINode;

            if (uiNode) {
                newUINode = TreeView.TreeNode.create(node.name);
                uiNode.add(newUINode);
                uiNode = newUINode;
            }
            else {
                uiNode = TreeView.TreeNode.create(node.name);
            }

            if (nodes) {
                for (i = 0, l = nodes.length; i < l; i++) {
                    node = nodes[i];
                    populateUINodes(node, uiNode);
                }
            }

            return uiNode;
        }

        return $.map(values, function (node) {
            return populateUINodes(node, null);
        });
    }

    constructor(options?) {
        super(options);
    }

    /**
     * Override
     * Creates clause value control in given container with given options
     * @param container
     * @param options
     */
    public createClauseValueControl(container: JQuery, options?: any): FieldsFilterValueControl {
        var valueControl = <FieldsFilterValueControl>Controls.BaseControl.createIn(FieldsFilterValueControl, container, $.extend({
            maxAutoExpandDropWidth: FieldsFilterControlO.POPUP_MAX_WIDTH
        }, options));
        valueControl.setControl(Combos.Combo);
        return valueControl;
    }

    /**
     * Override
     * Updates the value control for a filtered work item field.
     * @param valueControl The value control.
     * @param fieldType The type of the field.
     * @param values The values to be populated in the value control.
     * @param useReactClassificationPicker A boolean value that denotes if new react picker should be used for tree path fields.
     */
    public _updateFieldValues(valueControl: any, fieldType: WITConstants.FieldType, values: any[], useReactClassificationPicker?: boolean) {
        Diag.Debug.assertParamIsObject(valueControl, "valueControl");
        Diag.Debug.assertParamIsNumber(fieldType, "fieldType");
        Diag.Debug.assertParamIsArray(values, "values");

        if (fieldType === WITConstants.FieldType.TreePath) {
            if (!useReactClassificationPicker) {
                valueControl.setType("treeSearch");
                valueControl.setMode("drop");
                valueControl.setSource(FieldsFilterControlO._generateTreeNodes(values));
            } else {
                valueControl.setSource(values);
            }
        } else {
            if (values && values.length > 0) {
                valueControl.setType("list");
                valueControl.setMode("drop");
                valueControl.setSource(values);
            } else {
                valueControl.setType("list");
                valueControl.setMode("text");
                valueControl.setSource([]);
            }
        }
    }
}

VSS.classExtend(FieldsFilterControlO, TFS_Host_TfsContext.TfsContext.ControlExtensions);

/**
 * Filter control for fields. Creates smart value controls based on field selected
 */
export class FieldsFilterControl extends FieldsFilterControlO<FieldsFilterControlOptions> {}