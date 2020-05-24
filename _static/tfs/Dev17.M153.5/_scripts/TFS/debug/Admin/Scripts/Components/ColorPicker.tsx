import * as TFSColorPicker from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";
import { BaseControl } from "VSS/Controls";
import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";

export interface IColorPickerProps extends ILegacyComponentProps {
    color: string;
    ariaLabelPrefix: string;
    onChanged?: (color: string) => void;
    tooltipContainerClassName?: string;
    disabled?: boolean;
}

export interface IColorPickerState extends ILegacyComponentState {

}

export class ColorPicker extends LegacyComponent<TFSColorPicker.DefinedPaletteColorPickerControl, IColorPickerProps, IColorPickerState>{

    public createControl(element: HTMLElement, props: IColorPickerProps, state: IColorPickerState): TFSColorPicker.DefinedPaletteColorPickerControl {
        const color: string = "#" + props.color;
        const tooltipContainer: HTMLElement = props.tooltipContainerClassName == null ?
            null : window.document.querySelector(`.${props.tooltipContainerClassName}`) as HTMLElement;
        const options = {
            tagName: "div",
            template: TFSColorPicker.PaletteTemplate.Full,
            onColorSelected: (source: TFSColorPicker.IColorPickerControl, color: TFSColorPicker.AccessibilityColor) => {
                if (props.onChanged) {
                    props.onChanged(color.asHex().slice(1));
                }
            },
            defaultColor: new TFSColorPicker.AccessibilityColor(color),
            allowNonPaletteDefaultColor: true,
            ariaLabelPrefix: props.ariaLabelPrefix,
            tooltipContainer: tooltipContainer
        } as TFSColorPicker.DefinedPaletteColorPickerControlOptions;

        const colorPickerControl = BaseControl.createIn(
            TFSColorPicker.DefinedPaletteColorPickerControl, element, options) as TFSColorPicker.DefinedPaletteColorPickerControl;
        colorPickerControl.enableElement(!this.props.disabled);
        this._setColor(props.color);

        return colorPickerControl;
    }

    public updateControl(element: HTMLElement, props: IColorPickerProps, state: IColorPickerState) {
        this._setColor(props.color);
    }

    private _setColor(color: string) {
        if (this._control && color) {
            this._control.setColor(new TFSColorPicker.AccessibilityColor('#' + color));
        }
    }
}