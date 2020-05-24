/// <reference types="react" />

import * as React from "react";
import { PaletteTemplate, DefinedPaletteColorPickerControl, DefinedPaletteColorPickerControlOptions, AccessibilityColor, IColorPickerControl } from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";
import { Control } from "VSS/Controls";
import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";

export interface IColorPickerProps extends ILegacyComponentProps {
    color: string;
    id: string;
    allowNonPaletteDefaultColor: boolean,
    template?: PaletteTemplate,
    ariaLabel? : string,
    onChanged?: (color: string) => void;

    /**
     * The number of pixel for the width of the combo. This include the color + the arrow. If
     * not specified, we fall back to 100 pixel wide.
     */
    comboWidth?: number;

    /**
     * The number of pixel for the height of the combo.
     * If not specified, we fall back to 25 pixel height.
     */
    comboHeight?: number;

    /**
     * Control should be disabled
     */
    disabled?: boolean; 
}

export interface IColorPickerState extends ILegacyComponentState {

}

export class DefinedPaletteColorPicker extends LegacyComponent<DefinedPaletteColorPickerControl, IColorPickerProps, IColorPickerState>{

    public createControl(element: HTMLElement, props: IColorPickerProps, state: IColorPickerState): DefinedPaletteColorPickerControl {
        const options = {
            tagName: "div",
            template: props.template || PaletteTemplate.Full,
            onColorSelected: (source: IColorPickerControl, color: AccessibilityColor) => {
                if (props.onChanged) {
                    props.onChanged(color.asHex());
                }
            },
            defaultColor: props.color ? new AccessibilityColor(props.color) : null,
            allowNonPaletteDefaultColor: props.allowNonPaletteDefaultColor,
            ariaLabelPrefix: props.ariaLabel,
            comboWidth: props.comboWidth,
            comboHeight: props.comboHeight, 
            disabled: props.disabled, 
        } as DefinedPaletteColorPickerControlOptions;

        const colorPickerControl = Control.create(DefinedPaletteColorPickerControl, element as any, options);

        this._setColor(props.color);

        return colorPickerControl;
    }

    public updateControl(element: HTMLElement, props: IColorPickerProps, state: IColorPickerState) {
        this._setColor(props.color);
    }

    private _setColor(color: string) {
        if (this._control && color) {
            this._control.setColor(new AccessibilityColor(color));
        }
    }
}