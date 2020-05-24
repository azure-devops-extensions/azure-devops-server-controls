import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS_Context = require("VSS/Context");
import { RichContentTooltip, IRichContentTooltipOptions } from "VSS/Controls/PopupContent";
import { ColorUtilities } from "Charts/ColorUtilities";
import GridUtils = require("Presentation/Scripts/TFS/TFS.UI.Controls.Grid.Utils");
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

/**************************************************************
 *                              Model Classes
 *************************************************************/

/**
 * Hold values for color in Red, Green and Blue
 */
export class Rgb {
    /**
     * Minimum viable color value for Red or Green or Blue
     */
    public static MinValue = 0;

    /**
     * Maximum viable color value for Red or Green or Blue
     */
    public static MaxValue = 255;

    /**
     * Valid value : 0-255
     */
    private red: number;

    /**
     * Valid value : 0-255
     */
    private green: number;

    /**
     * Valid value : 0-255
     */
    private blue: number;

    constructor(red: number, green: number, blue: number) {
        if (red < 0 || red > 255) {
            throw Error(Utils_String.format("Red value must be between {0} and {1} inclusively.", Rgb.MinValue, Rgb.MaxValue));
        }
        if (green < 0 || green > 255) {
            throw Error(Utils_String.format("Green value must be between {0} and {1} inclusively.", Rgb.MinValue, Rgb.MaxValue));
        }
        if (blue < 0 || blue > 255) {
            throw Error(Utils_String.format("Blue value must be between {0} and {1} inclusively.", Rgb.MinValue, Rgb.MaxValue));
        }
        this.red = red;
        this.green = green;
        this.blue = blue;
    }

    /**
     * Get a number between 0 and 255 that describe the R from RGB
     * @returns {number} : 0 to 255
     */
    public getRed(): number {
        return this.red;
    }

    /**
     * Get a number between 0 and 255 that describe the G from RGB
     * @returns {number} : 0 to 255
     */
    public getGreen(): number {
        return this.green;
    }

    /**
     * Get a number between 0 and 255 that describe the B from RGB
     * @returns {number} : 0 to 255
     */
    public getBlue(): number {
        return this.blue;
    }
}

/**
 * Represents an RGB color, using initial inputs of form #RRGGBB strings, or Rgb typed object.
 *
 * Transparency and other color formats are not supported in this implementation.
 */
export class Color {

    private value: Rgb;

    /**
     * Create a color from a string. At this moment, the string should be a Hex code with the format #XXXXXX
     * @param {string} stringColor : Hex color with # prefix or not
     */
    constructor(color: string | Rgb) {
        if (color == null) {
            throw new Error("color must be defined");
        }

        if (typeof color == "string") {
            this._convertStringColorToRgb(color);
        } else if (color instanceof Rgb) {
            this.value = color;
        } else {
            throw new Error("color not in a known type");
        }
    }

    /**
     * Get from RGB the HEX code
     * @see http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
     * @returns {string} Hex value with the # prefix
     */
    public asHex(): string {
        return "#" + ((1 << 24) + (this.value.getRed() << 16) + (this.value.getGreen() << 8) + this.value.getBlue()).toString(16).slice(1);
    }

    /**
     * Get the color in CSS RGB format
     * @returns {string} Formatted to be used for rgb
     */
    public asRgb(): string {
        return Utils_String.format("rgb({0},{1},{2})", this.value.getRed(), this.value.getGreen(), this.value.getBlue());
    }

    /**
     * Convert HEX (short or full) format to RGB
     * @param {string} colorInString - The hex color. If not in hex an exception is thrown. Can or not start with a hash.
     * @see http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
     * @exception : If the input (colorInString) is not a Hex color
     */
    public _convertStringColorToRgb(colorInString: string): void {
        //The regex check for the format of three different strings that can be A to F and numeric (Hexadecimal possible characters)
        //It also check the optional hash tag at the beginning of the pattern. Since it is the short pattern, we do not require 2 characters
        //for each set of color.
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        colorInString = colorInString.replace(shorthandRegex, (m, r, g, b) => (r + r + g + g + b + b));

        //At that point, we are in the full Hex color which is 6 characters wide. We also check the optional hash but enforce the
        //match of 3 times 2 characters of A-F and numeric.
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorInString);
        if (result != null) {
            this.value = new Rgb(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16));
        } else {
            throw new Error("Color in string only support Hex format");
        }

    }

    /**
     * Compare if a color is the same as the current one
     * @param {color} Color to be compared
     * @returns {boolean} True if the same color; False if a different color
     */
    public equals(color: Color): boolean {
        return color != null && this.asHex() === color.asHex();
    }

    public getRed(): number {
        return this.value.getRed();
    }

    public getGreen(): number {
        return this.value.getGreen();
    }

    public getBlue(): number {
        return this.value.getBlue();
    }

    /**
     * Convert the existing color into a new gray scale color
     * @returns {color} : The converted color in gray scale
     */
    public convertToGrayscale(): Color {
        var sumColor = this.getRed() + this.getGreen() + this.getBlue();
        var gray = Math.floor(sumColor / 3);
        var rgb = new Rgb(gray, gray, gray);
        var newColor = new Color(rgb);
        return newColor;
    }

    /**
     * Invert the color
     * @returns {Color} - Color with all value inverted
     */
    public invert(): Color {
        return new Color(new Rgb(Rgb.MaxValue - this.getRed(), Rgb.MaxValue - this.getGreen(), Rgb.MaxValue - this.getBlue()));
    }

    /**
     * Give the value between black or white the closest to the actual color
     * @returns {Color} : Color White or Black
     */
    public toBlackOrWhite(): Color {
        let accessibleContrastColor: Color = new Color(
            ColorUtilities.getAccessibleContrastColor(
                [
                    this.getRed(),
                    this.getGreen(),
                    this.getBlue()
                ]
            )
        );

        // Return the color with least contrast compared to the actual color.
        return accessibleContrastColor.invert();
    }

    /**
     * Determine if is is a light color. A light color must be above 248,248,248 (by spec)
     * @returns {boolean} : True if a light color; False if not a light color
     */
    public isLightColor(): boolean {
        return this.getRed() > 248 && this.getBlue() > 248 && this.getGreen() > 248;
    }
}

/**
 * Extends the Color contract, with support for user facing display names.
 * In absence of a given name, the parsed RGB hex representation is provided.
 */
export class AccessibilityColor extends Color {
    /**
     * Name that describe the color. This can be null because it is optional.
     */
    private displayName: string;

    /**
     * Create a color that has accessibily feature.
     * @param {string | Rgb}color - Hex or Rgb
     * @param {string} displayName - The name to display
     */
    constructor(color: string | Rgb | Color, displayName?: string) {
        var colorCode: string | Rgb;
        if (color instanceof Color) {
            colorCode = color.asHex();
        } else {
            colorCode = color;
        }
        super(colorCode);
        this.displayName = displayName;
    }

    /**
     * Get the name that describe the color. If the color doesn't have any display name,
     * the Hex color is returned
     * @returns {string} - Text that represent the color. Cannot be empty or null.
     */
    public getDisplayName(): string {
        if (this.displayName == null) {
            return super.asHex();
        }
        return this.displayName;
    }
}

/**************************************************************
 *                              Contracts
 *************************************************************/

export interface IColorPickerControl {

    /**
     * Get the color from the color picker
     * @returns {Color} Color active in the color picker
     */
    getColor(): AccessibilityColor;

    /**
     * Set the color to be associated with the color picker control
     * @param color {Color | string} The color to associate with the color picker in a Color format or Hex format
     */
    setColor(color: AccessibilityColor | string);

    /**
     * Allows the user to have a unique identifier knowns by the implementer for the control.
     * This is optional and not used internaly. This is useful in scenario that you need to associate
     * something unique to the color pickers for example a business logic item to a color.
     */
    id?: string;
}

export interface IPaletteColorPickerControl extends IColorPickerControl {
    /**
     * Toggle the visibility of the palette. Open if closed, close if openned.
     */
    togglePalette(): void;

    /**
     * Set the focus to the control.
     */
    setFocus(): void;
}


export interface IDefinedPaletteColorPickerControl extends IPaletteColorPickerControl {

}


export interface ColorEvents {
    /**
    * The color that is selected by the user.
    * @param {IColorPickerControl} source - The color picker
    * @param {Color} selectedColor - The value returned is the save as the value from GetColor. The reason we return the value here is because
    * of onColorHover that is returns a color. To be consistent with our callbacks, all of them return colors.
    */
    onColorSelected?: (source: IColorPickerControl, selectedColor: AccessibilityColor) => void;

    /**
     * The color picker lets the user move the mouse above a color, when the user does so this callback is called.
     * @param {IColorPickerControl} source - The color picker
     * @param {Color} hoverColor - Color that the user is having his/her cursor above. It's not the selected value until it's clicked.
     */
    onColorHover?: (source: IColorPickerControl, hoverColor: AccessibilityColor) => void;

    /**
     * The color picker got opened. This is trigger when the user clicks the combobox or hit enter in the combo.
     * @param {IColorPickerControl} source - The color picker that got opened
     */
    onOpen?: (source: IColorPickerControl) => void;

    /**
     * The color picker got closed. This is trigger when the user click outside the control, hit escape or select a color.
     * @param {IColorPickerControl} source - The color picker that got closed
     */
    onClose?: (source: IColorPickerControl) => void;
}

export interface ColorPickerOptions {
    /**
     * The first color in the palette is selected if no color is provided.
     */
    defaultColor?: AccessibilityColor;

    /**
     * Force the color picker to show default color even if it's not in the palette
     */
    allowNonPaletteDefaultColor?: boolean;

    /**
     * The width of the color picker (color + drop arrow)
     */
    comboWidth?: number;

    /**
     * The height of the color picker.
     * If specified, remember to adjust the the top padding of the arrow, as appropriate.
     */
    comboHeight?: number;

    /**
     * This is optional. If not set, a combo box is created. If set, instead of creating a combox box as a trigger to show the palette,
     * we use the existing specified element as a trigger.
     */
    triggerElement?: JQuery;

    /**
     * Optional property to specify tooltip container.
     */
    tooltipContainer?: HTMLElement;

    /** Optional property to specify a contextual aria label prefix for the color picker */
    ariaLabelPrefix?: string;
}

export interface ColorPickerControlOptions {

}

export interface PaletteColorPickerControlOptions extends ColorPickerControlOptions, ColorPickerOptions, ColorEvents {


    /**
     * The maximum number of columns. The numbers of rows is dynamically determined by this property and the
     * number of color in the palette
     */
    maximumColumns: number;

    /**
     * All colors that can be selected by the control
     */
    palette: (AccessibilityColor)[];

    /**
     * Optional property to indicate if the contorl should be rendered as disabled.
     */
    isDisabled?: boolean;

    /**
     * Optional property to specify tooltip container.
     */
    tooltipContainer?: HTMLElement;
}

export interface DefinedPaletteColorPickerControlOptions extends ColorPickerOptions, ColorEvents {
    /**
     *  The defined palette. This offer a choice of defined palette for the user to choose on.
     */
    template: PaletteTemplate;

    /**
     * Is control disabled
     */
    disabled?: boolean;
}


/**
 * Official palette to be used in the DefinedPaletteColorPickerControl
 */
export enum PaletteTemplate {
    /**
     * A palette with the maximum number of colors allowed by VSTS
     * @link http://codepen.io/phecdalouie/pen/XXEOYr
     */
    Full = 0,
    /**
     * A palette which is having pale color
     * @link http://codepen.io/phecdalouie/pen/dGmaKO
     */
    Muted = 1,

    /**
     * Palette with high contrast color
     * @link http://codepen.io/phecdalouie/pen/LGdaYW
     */
    Vibrant = 2,
}

/**************************************************************
 *                              Public Controls
 *************************************************************/

/**
 * Color picker at its highest level of abstraction which has common concepts to any kind of color picker would share.
 */
export class ColorPickerControl extends Controls.Control<ColorPickerControlOptions> implements IColorPickerControl {

    /**
     * The color associated as the active selected one on the picker.
     */
    private selectedColor: AccessibilityColor;

    constructor(options: ColorPickerControlOptions) {
        super(options);
        if (options == null) {
            throw new Error("ColorPickerControlOptions is required");
        }
    }

    /**
     * Get the selected color.
     * @returns {Color} Color selected.
     */
    public getColor(): AccessibilityColor {
        return this.selectedColor;
    }

    /**
     * Set the color of the picker
     * @param {Color | string} color in Color format or Hex string format
     */
    public setColor(color: AccessibilityColor | string): void {
        if (color instanceof Color) {
            this.selectedColor = color;
        } else {
            this.selectedColor = new AccessibilityColor(color);
        }
    }

    /**
     * Unique identifier for the control
     */
    public id: string;
}

/**
 * This is the basic implementation of a color picker which limit the choice to a defined palette given in the construction
 * of the control.
 *
 * It has a default color when the user didn't select a color yet. By specs, we determine the number of column
 * and the control handle the number of rows from the number of color that the palette has.
 */
export class PaletteColorPickerControl extends ColorPickerControl implements IPaletteColorPickerControl {

    public static CssColorPickerPaletteControl = "color-picker-control";
    /**
     * Minimum number of columns. It serves the purpose of a gate to have at least 1 column in the palette to be displayed
     */
    public static MinimumNumberColumn: number = 1;

    /**
    * Maximum number of columns in the palette before creating a new row of colors. This limit scope down edge case where a user could set
    * a very high number of maximum column to display which could create overflow problem.
    */
    public static MaximumNumberColumn: number = 12;

    /**
     * The palette color picker control contains a combo to select the color. This one display the selected color
     * and allows the user to select the color in a group (palette).
     */
    public _comboView: ColorComboView;

    /**
     * The group of color in which the user can select a color
     */
    public _paletteView: ColorPaletteView;

    protected options: PaletteColorPickerControlOptions;

    /** Enablement state of this control. As this class didn't derive from combo, it track its own enablement state. */
    private _isEnabled: boolean;

    constructor(options: PaletteColorPickerControlOptions) {
        if (options == null) {
            throw new Error("PaletteColorPickerControlOptions is required");
        }
        super(options);
        this._isEnabled = !options.isDisabled;

        if (options.palette == null || options.palette.length <= 0) {
            throw new Error("Palette must be defined with at least one entry");
        }

        // Convert everything into AccessibilityColor. This way, we have less juggling to do in all subsequent steps
        for (let i = 0; i < options.palette.length; i++) {
            var colorFromArray = options.palette[i];
            if (!(colorFromArray instanceof AccessibilityColor)) {
                if (typeof colorFromArray === "string") {
                    options.palette[i] = new AccessibilityColor(<string>colorFromArray);
                }
                else if (colorFromArray as any instanceof Color) {
                    options.palette[i] = new AccessibilityColor(<Color>colorFromArray);
                }
            }
        }

        // Set the default color to the first one in the palette iff
        // - Default color is not provided (or)
        // - The provided color is not in the palette (and) 'allowNonPaletteDefaultColor' is either false or undefined
        if (options.defaultColor == null ||
            (!options.allowNonPaletteDefaultColor &&
                !PaletteColorPickerControl.isColorPresentInPalette(options.defaultColor, options.palette))) {
            options.defaultColor = options.palette[0];
        }

        if (!this.isInColumnRange(options.maximumColumns)) {
            throw new Error(Utils_String.format("PaletteColorPicker support {0} to {1} columns inclusively",
                PaletteColorPickerControl.MinimumNumberColumn,
                PaletteColorPickerControl.MaximumNumberColumn));
        }

        const setAriaExpanded = (value: boolean) => {
            return () => {
                if (this._comboView != null) {
                    this._comboView.getElement()
                        .attr("aria-expanded", value ? "true" : "false");
                }
            };
        };

        options.onClose = this.wrapColorEventCallback(options.onClose, setAriaExpanded(false));
        options.onOpen = this.wrapColorEventCallback(options.onOpen, setAriaExpanded(true));

        this.options = options;
    }

    public initializeOptions(options: PaletteColorPickerControlOptions) {
        super.initializeOptions($.extend({
            coreCssClass: PaletteColorPickerControl.CssColorPickerPaletteControl,
        },
            options));
    }

    /**
     * Initialize sub control that is used by the PaletteColorPickerControl
     */
    public initialize(): void {
        super.initialize();

        //Handle the two options we have : Default one which is to use the combo to open the palette; custom one which is to have a custom trigger element.
        if (this.options.triggerElement) {
            this.options.triggerElement.click(() => this.togglePalette());
            this.options.triggerElement.keydown((e: JQueryEventObject) => {
                this.handleKeyOnTriggerElement(e);
            });
        } else {
            var ColorComboViewOptions: ColorComboViewOptions = {
                clicked: () => {
                    this.togglePalette();
                },
                keyDown: (e: JQueryEventObject) => {
                    this.handleKeyOnTriggerElement(e);
                },
                comboWidth: this.options.comboWidth,
                comboHeight: this.options.comboHeight,
                ariaLabelPrefix: this.options.ariaLabelPrefix,
                isDisabled: !this.isEnabled()
            };
            this._comboView = Controls.Control.create(ColorComboView, this.getElement(), ColorComboViewOptions);
        }

        this._createPaletteView(this.getElement());
        this.setColor(this.options.defaultColor);

        //Associate the combo control as the owner of the palette grid, assuming both exist.
        if (this._comboView && this._paletteView) {
            this._comboView.getElement().attr("aria-owns", this._paletteView.getId());
        }

        //Event that lets the user click anywhere to close the color picker.
        //This can be optimized because each time we instantiate this control, we attach an event on click
        $('html').click((e) => {
            this.onClickOutsideColorPicker(e);
        });
    }


    /**
     * Creates the color palette view
     */
    protected _createPaletteView($colorPickerDiv: JQuery) {
        this._paletteView = Controls.Control.create(ColorPaletteView, $colorPickerDiv,
            {
                paletteControl: this,
                paletteControlOptions: this.options,
                tooltipContainer: this.options.tooltipContainer
            });
    }

    /**
     * Sets the focus on the dropdown
     */
    public setFocus(): void {
        if (this.options.triggerElement) {
            this.options.triggerElement.focus();
        } else {
            this._comboView.focus();
        }
    }

    /**
     * Toggles enablement state of this control.
     * While disabled, the dropdown indicator is hidden, and click events are ignored.
     */
    public enableElement(enabled: boolean): void {
        super.enableElement(enabled); //Note: Base implementation toggles disabled class in DOM.

        //Hide picker if we are going from enabled to disabled.
        if (enabled == false) {
            this._paletteView.hide();
        }

        this._isEnabled = enabled;
    }

    public isEnabled(): boolean {
        return this._isEnabled;
    }

    /**
     * Handle keyboard events on the trigger/combo "entry point" element
     */
    private handleKeyOnTriggerElement(e: JQueryEventObject): void {

        //Determine updated index, relative to current position.
        if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
            this.togglePalette();
            e.stopPropagation();
            e.preventDefault();
        } else {
            if (e.altKey) {
                if (e.keyCode === Utils_UI.KeyCode.UP) { // Combo hide popup behavior
                    this._paletteView.hide();
                } else if (e.altKey && e.keyCode === Utils_UI.KeyCode.DOWN) { // Combo show popup behavior
                    this._paletteView.show();
                }
            } else {
                //Get index of current color
                let currentColor = this.getColor();
                let currentIndex = this.options.palette.indexOf(currentColor);

                //If the user has an arbitrary color assigned, anchor our move from the first element.
                currentIndex = currentIndex >= 0 ? currentIndex : 0;

                let destinationIndex = GridUtils.interpretGridKeyPress(e, currentIndex, this.options.maximumColumns, this.options.palette.length);

                if (destinationIndex !== null && destinationIndex != currentIndex) {
                    let selectedColor = this.options.palette[destinationIndex];
                    this.setColor(selectedColor);
                    this.options.onColorSelected(this, selectedColor);
                }
            }
        }
    }

    /**
     * Returns a new function to assign as the callback to a given color event.
     * Calls the additional functionality before the original callback.
     * @param callback The original callback that should be wrapped
     * @param additionalCallback The additional functionality to call before the original callback
     */
    private wrapColorEventCallback(colorEventCallback: (source: IColorPickerControl) => void, additionalCallback: (source: IColorPickerControl) => void): (source: IColorPickerControl) => void {
        return function (source: IColorPickerControl) {
            additionalCallback(source);

            if (colorEventCallback != null) {
                colorEventCallback(source);
            }
        }
    }

    /**
     * Clicking outside the color picker close the color picker
     * - This method can be called multiple time per page since it is attached on each Color Picker.
     * - This code can be refactored to call the "hide" method of the control instead of bypassing the control and do it directly into the Html element.
     *    The reason it's done that way, at this moment, is that we do not have knownledge of a list of color picker active for the page.
     * @param {JQueryEventObject} e - Event that contain which html element got clicked
     */
    private onClickOutsideColorPicker(e: JQueryEventObject): void {
        //Only if visible
        if (this._paletteView.isVisible()) {
            var $controlClicked = $(e.target);
            const triggerElementClicked = this.options.triggerElement
                && $controlClicked.closest(this.options.triggerElement).length > 0;
            // Treat trigger element as a part of the control, so proceed only if not clicked on the trigger element.
            if (!triggerElementClicked) {
                //Only if not the control itself (because we handle it somewhere else with more action like selecting color)
                if (!$controlClicked.hasClass(ColorComboView.CssNameCombo)
                    && !$controlClicked.hasClass(ColorPaletteView.CssNamePalette)
                    && $controlClicked.closest('.' + ColorComboView.CssNameCombo).length === 0
                    && $controlClicked.closest('.' + ColorPaletteView.CssNamePalette).length === 0) {
                    this._paletteView.toggle();//Since it is visible, this will turn it off always
                }

                //We want to close other Color Picker
                var paletteControlClicked = $controlClicked.closest('.' + PaletteColorPickerControl.CssColorPickerPaletteControl);
                if (paletteControlClicked.length !== 0) // Not 0 => We clicked a color picker, let's close all of them except this one
                {
                    var clickedColorPickerWebAccessControlId = $(paletteControlClicked.get(0)).parent().attr('id'); // That is the one we want to keep open
                    //Loop all palette and close them except the one clicked
                    $('.' + ColorPaletteView.CssNamePalette).each((index, element) => {
                        var $d = $(element);
                        var $oneColorPicker = $d.closest('.' + PaletteColorPickerControl.CssColorPickerPaletteControl);
                        var oneColorPickerWebAccessControlId = $($oneColorPicker.get(0)).parent().attr('id');
                        if (clickedColorPickerWebAccessControlId !== oneColorPickerWebAccessControlId) {
                            $d.parent().hide(); // Parent because we hide the WebAccess control
                        }
                    });
                }
            }
        }
    }

    /**
     * Verify if a color is inside the palette
     * @param {Color} colorToVerify - Color to verify its presence inside the palette
     * @param {Color[]} colorPalette - The palette to test against
     * @returns {boolean} True if present in the palette; False if not present
     */
    public static isColorPresentInPalette(colorToVerify: Color, colorPalette: Color[]): boolean {
        if (colorToVerify == null || colorPalette == null) {
            return false;
        }
        var isFound: boolean = false;
        colorPalette.forEach(colorInPalette => {
            if (colorToVerify.equals(colorInPalette)) {
                isFound = true;
            }
        });
        return isFound;
    }

    /**
     * Determine if a column is in the allowed supported range.
     * @param {number} column : Number of column
     * @returns {boolean} : True if the column is in range; False is beyond what supported.
     */
    public isInColumnRange(column: number): boolean {
        return column >= PaletteColorPickerControl.MinimumNumberColumn && column <= PaletteColorPickerControl.MaximumNumberColumn;
    }

    /**
     * Open or close the palette (If the control is enabled)
     */
    public togglePalette(): void {
        if (this.isEnabled()) {
            var $triggerElement: JQuery;
            if (this.options.triggerElement) {
                $triggerElement = this.options.triggerElement;
            } else {
                $triggerElement = this._comboView.getElement();
            }
            var $palette: JQuery = $(this.getElement().find('.' + ColorPaletteView.CssNamePalette).get(0));

            this._paletteView.toggle();
            $palette.css('visibility', 'hidden');           // Hide to be able to use size and position without having the palette displayed
            var offset = this.getOffset($palette, $triggerElement);  // Get the offset which will be above the combo if the window doesn't have space underneath
            $palette.css('left', offset.left);
            $palette.css('top', offset.top);
            $palette.css('visibility', 'visible');          // The control is positioned, time to display it
            $palette.focus();
        }
    }

    /**
     * This method in this class is a glue between the Combo and the Palette. This method bridges the palette->color to set the color of the combo
     * but also the method to specify which color to be selected when the control is instantiated.
     * @param {AccessibilityColor} color - The color to change the control
     */
    public setColor(color: AccessibilityColor): void {
        if (color == null) {
            throw new Error("Color must be defined");
        }

        //Color picker implementations can return a different color instance. Map back to the palette instance.
        if (color instanceof AccessibilityColor) {
            this.options.palette.forEach(referenceColor => {
                if (referenceColor.equals(color)) {
                    color = referenceColor;
                }
            });
        }

        super.setColor(color);

        if (!this.options.triggerElement) {
            this._comboView.setColor(color);
        }

        //This is there because we allow to set a color that is not in the palette. So we do not select in that case.
        if (PaletteColorPickerControl.isColorPresentInPalette(color, <AccessibilityColor[]>(this.options).palette)) {
            this._paletteView.selectSingleColor(color);
        }
    }

    /**
    * Give the offset to applied to the palette relatively to the container in which this one is stored
    * I borrowed most of the offset logic from the JQuery Calendar
    * @see https://github.com/jquery/jquery-ui/blob/master/ui/widgets/datepicker.js
    * @param {JQuery} palette - palette control
    * @param {JQuery} comboBox - combob box. Required when we need to put it aboves the combox
    * @returns {JQueryCoordinates} Offset coordinate to be applied to the palette control
    */
    private getOffset(palette: JQuery, comboBox: JQuery): JQueryCoordinates {
        var extraY = 0;
        var paletteWidth = palette.outerWidth();
        var paletteHeight = palette.outerHeight();
        var comboHeight = comboBox.outerHeight();
        var paletteDocument = palette[0].ownerDocument;
        var paletteDocumentElement = paletteDocument.documentElement;
        var viewWidth = paletteDocumentElement.clientWidth + $(paletteDocument).scrollLeft();
        var viewHeight = paletteDocumentElement.clientHeight + $(paletteDocument).scrollTop();
        var offset = comboBox.offset();
        //var offset = this.getPosition(comboBox.get(0));
        offset.top += comboHeight;

        offset.left -= Math.min(offset.left, (offset.left + paletteWidth > viewWidth && viewWidth > paletteWidth) ?
            Math.abs(offset.left + paletteWidth - viewWidth) : 0);

        offset.top -= Math.min(offset.top, ((offset.top + paletteHeight > viewHeight && viewHeight > paletteHeight) ?
            Math.abs(paletteHeight + comboHeight - extraY) : extraY));

        return offset;
    }
}


/**
 * This is the official VSTS color picker. It lets you choose between 3 officials color palette:
 *    1) Full Color Palette Great for use cases where users need to pick from a large set of colors (e.g. Chart Colors, CFD Colors, Customize work item color)
 *    2) Muted Color Palette – Optimized for use cases where black text is displayed on top of a colorized background (e.g Kanban Card Background Colors)
 *    3) Vibrant Color Palette – Optimized for use cases where user only need to pick form a limited set of colors (e.g. Kanban Card Titles, Kanaban Tags, Conditional Query Tile)
 */
export class DefinedPaletteColorPickerControl extends PaletteColorPickerControl implements IDefinedPaletteColorPickerControl {
    public _options: DefinedPaletteColorPickerControlOptions;

    public static FullPaletteColors: AccessibilityColor[] = [
        new AccessibilityColor("#222222", Resources.Black), new AccessibilityColor("#292E6B", Resources.Blue), new AccessibilityColor("#009CCC", Resources.Turquoise), new AccessibilityColor("#00643A", Resources.Teal), new AccessibilityColor("#339947", Resources.Green), new AccessibilityColor("#FBBC3D", Resources.Yellow), new AccessibilityColor("#DB552C", Resources.Orange), new AccessibilityColor("#7F1725", Resources.Red), new AccessibilityColor("#EC008C", Resources.Pink), new AccessibilityColor("#5C197B", Resources.Purple), new AccessibilityColor("#51399F", Resources.Indigo),
        new AccessibilityColor("#444444", Utils_String.format(Resources.TenPercentLighterColor, Resources.Black.toLowerCase())), new AccessibilityColor("#1B478B", Utils_String.format(Resources.TenPercentLighterColor, Resources.Blue.toLowerCase())), new AccessibilityColor("#43B4D5", Utils_String.format(Resources.TenPercentLighterColor, Resources.Turquoise.toLowerCase())), new AccessibilityColor("#207752", Utils_String.format(Resources.TenPercentLighterColor, Resources.Teal.toLowerCase())), new AccessibilityColor("#60AF49", Utils_String.format(Resources.TenPercentLighterColor, Resources.Green.toLowerCase())), new AccessibilityColor("#FBD144", Utils_String.format(Resources.TenPercentLighterColor, Resources.Yellow.toLowerCase())), new AccessibilityColor("#E87025", Utils_String.format(Resources.TenPercentLighterColor, Resources.Orange.toLowerCase())), new AccessibilityColor("#B20B1E", Utils_String.format(Resources.TenPercentLighterColor, Resources.Red.toLowerCase())), new AccessibilityColor("#EF33A3", Utils_String.format(Resources.TenPercentLighterColor, Resources.Pink.toLowerCase())), new AccessibilityColor("#71338D", Utils_String.format(Resources.TenPercentLighterColor, Resources.Purple.toLowerCase())), new AccessibilityColor("#6951AA", Utils_String.format(Resources.TenPercentLighterColor, Resources.Indigo.toLowerCase())),
        new AccessibilityColor("#666666", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Black.toLowerCase())), new AccessibilityColor("#0D60AB", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Blue.toLowerCase())), new AccessibilityColor("#86CDDE", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Turquoise.toLowerCase())), new AccessibilityColor("#56987D", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Teal.toLowerCase())), new AccessibilityColor("#8DC54B", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Green.toLowerCase())), new AccessibilityColor("#FBE74B", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Yellow.toLowerCase())), new AccessibilityColor("#F58B1F", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Orange.toLowerCase())), new AccessibilityColor("#E60017", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Red.toLowerCase())), new AccessibilityColor("#F266BA", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Pink.toLowerCase())), new AccessibilityColor("#9260A1", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Purple.toLowerCase())), new AccessibilityColor("#8874C2", Utils_String.format(Resources.TwentyPercentLighterColor, Resources.Indigo.toLowerCase())),
        new AccessibilityColor("#888888", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Black.toLowerCase())), new AccessibilityColor("#007ACC", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Blue.toLowerCase())), new AccessibilityColor("#C9E7E7", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Turquoise.toLowerCase())), new AccessibilityColor("#7CAF9A", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Teal.toLowerCase())), new AccessibilityColor("#A8CE4B", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Green.toLowerCase())), new AccessibilityColor("#FBFD52", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Yellow.toLowerCase())), new AccessibilityColor("#F7A24B", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Orange.toLowerCase())), new AccessibilityColor("#EB3345", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Red.toLowerCase())), new AccessibilityColor("#F599D1", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Pink.toLowerCase())), new AccessibilityColor("#AE88B9", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Purple.toLowerCase())), new AccessibilityColor("#AA9CDF", Utils_String.format(Resources.FortyPercentLighterColor, Resources.Indigo.toLowerCase())),
        new AccessibilityColor("#AAAAAA", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Black.toLowerCase())), new AccessibilityColor("#3F9BD8", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Blue.toLowerCase())), new AccessibilityColor("#D6EDED", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Turquoise.toLowerCase())), new AccessibilityColor("#9CC3B2", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Teal.toLowerCase())), new AccessibilityColor("#C3D84C", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Green.toLowerCase())), new AccessibilityColor("#FCFD7D", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Yellow.toLowerCase())), new AccessibilityColor("#F9B978", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Orange.toLowerCase())), new AccessibilityColor("#F06673", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Red.toLowerCase())), new AccessibilityColor("#F9CCE8", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Pink.toLowerCase())), new AccessibilityColor("#C7ABD0", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Purple.toLowerCase())), new AccessibilityColor("#C0B6E9", Utils_String.format(Resources.SixtyPercentLighterColor, Resources.Indigo.toLowerCase())),
        new AccessibilityColor("#CCCCCC", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Black.toLowerCase())), new AccessibilityColor("#7FBCE5", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Blue.toLowerCase())), new AccessibilityColor("#E4F3F3", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Turquoise.toLowerCase())), new AccessibilityColor("#BFD8CD", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Teal.toLowerCase())), new AccessibilityColor("#D7E587", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Green.toLowerCase())), new AccessibilityColor("#FCFEA8", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Yellow.toLowerCase())), new AccessibilityColor("#FBD0A5", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Orange.toLowerCase())), new AccessibilityColor("#F599A2", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Red.toLowerCase())), new AccessibilityColor("#FBDDEF", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Pink.toLowerCase())), new AccessibilityColor("#E0CAE7", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Purple.toLowerCase())), new AccessibilityColor("#DAD4F7", Utils_String.format(Resources.EightyPercentLighterColor, Resources.Indigo.toLowerCase()))];

    public static VibrantPaletteColors: AccessibilityColor[] = [
        new AccessibilityColor("#222222"), new AccessibilityColor("#666666"), new AccessibilityColor("#292E6B"), new AccessibilityColor("#009CCC"),
        new AccessibilityColor("#00643A"), new AccessibilityColor("#339947"), new AccessibilityColor("#FBBC3D"), new AccessibilityColor("#DB552C"),
        new AccessibilityColor("#7F1725"), new AccessibilityColor("#EC008C"), new AccessibilityColor("#5C197B"), new AccessibilityColor("#51399F"),
        new AccessibilityColor("#FFFFFF"), new AccessibilityColor("#CCCCCC"), new AccessibilityColor("#007ACC"), new AccessibilityColor("#C9E7E7"),
        new AccessibilityColor("#7CAF9A"), new AccessibilityColor("#A8CE4B"), new AccessibilityColor("#FBFD52"), new AccessibilityColor("#F7A24B"),
        new AccessibilityColor("#E60017"), new AccessibilityColor("#F599D1"), new AccessibilityColor("#AE88B9"), new AccessibilityColor("#AA9CDF")];

    public static MutePaletteColors: AccessibilityColor[] = [
        new AccessibilityColor("#888888"), new AccessibilityColor("#007ACC"), new AccessibilityColor("#C9E7E7"), new AccessibilityColor("#7CAF9A"),
        new AccessibilityColor("#A8CE4B"), new AccessibilityColor("#FBFD52"), new AccessibilityColor("#F7A24B"), new AccessibilityColor("#EB3345"),
        new AccessibilityColor("#F599D1"), new AccessibilityColor("#AE88B9"), new AccessibilityColor("#AA9CDF"), new AccessibilityColor("#AAAAAA"),
        new AccessibilityColor("#3F9BD8"), new AccessibilityColor("#D6EDED"), new AccessibilityColor("#9CC3B2"), new AccessibilityColor("#C3D84C"),
        new AccessibilityColor("#FCFD7D"), new AccessibilityColor("#F9B978"), new AccessibilityColor("#F06673"), new AccessibilityColor("#F9CCE8"),
        new AccessibilityColor("#C7ABD0"), new AccessibilityColor("#C0B6E9"), new AccessibilityColor("#CCCCCC"), new AccessibilityColor("#7FBCE5"),
        new AccessibilityColor("#E4F3F3"), new AccessibilityColor("#BFD8CD"), new AccessibilityColor("#D7E587"), new AccessibilityColor("#FCFEA8"),
        new AccessibilityColor("#FBD0A5"), new AccessibilityColor("#F599A2"), new AccessibilityColor("#FBDDEF"), new AccessibilityColor("#E0CAE7"),
        new AccessibilityColor("#DAD4F7"), new AccessibilityColor("#FFFFFF"), new AccessibilityColor("#BFDDF2"), new AccessibilityColor("#F1F9F9"),
        new AccessibilityColor("#E3F5EE"), new AccessibilityColor("#EBF2C3"), new AccessibilityColor("#FEFED3"), new AccessibilityColor("#FDE7D2"),
        new AccessibilityColor("#FACCD0"), new AccessibilityColor("#FDEEF7"), new AccessibilityColor("#F5E5FB"), new AccessibilityColor("#EDEAFF")];

    constructor(options: DefinedPaletteColorPickerControlOptions) {
        if (options == null) {
            throw new Error("DefinedPaletteColorPickerControlOptions is required");
        }

        let transformedOptions = DefinedPaletteColorPickerControl.getPaletteColorPickerControlOptions(options);
        transformedOptions.onColorSelected = (source, selectedColor) => {
            this.setColor(selectedColor);
            options.onColorSelected(source, selectedColor);
        };
        super(transformedOptions);

        this._options = options;
    }



    /**
     * Get a palette color picker options from the defined one
     * @param {DefinedPaletteColorPickerControlOptions} options - Option that is allowed for defined palette color picker
     * @returns {PaletteColorPickerControlOptions} Palette options
     */
    protected static getPaletteColorPickerControlOptions(options: DefinedPaletteColorPickerControlOptions): PaletteColorPickerControlOptions {
        let paletteFromTemplate: AccessibilityColor[];
        let maximumColumnsForTemplate: number;
        if (options.template === PaletteTemplate.Full) {
            paletteFromTemplate = DefinedPaletteColorPickerControl.FullPaletteColors;
            maximumColumnsForTemplate = 11; //By specs to have a full rectangle of color with 11 colors per row (could be any number)
        }
        else if (options.template === PaletteTemplate.Muted) {
            paletteFromTemplate = DefinedPaletteColorPickerControl.MutePaletteColors;
            maximumColumnsForTemplate = 11; //By specs to have a full rectangle of color with 11 colors per row (could be any number)
        }
        else if (options.template === PaletteTemplate.Vibrant) {
            paletteFromTemplate = DefinedPaletteColorPickerControl.VibrantPaletteColors;
            maximumColumnsForTemplate = 12;  //By specs to have a full rectangle of color with 11 colors per row (could be any number)
        }
        var optionsPalette = <PaletteColorPickerControlOptions>{
            maximumColumns: maximumColumnsForTemplate,
            palette: paletteFromTemplate,
            onColorSelected: options.onColorSelected,
            onColorHover: options.onColorHover,
            defaultColor: options.defaultColor,
            allowNonPaletteDefaultColor: options.allowNonPaletteDefaultColor,
            onOpen: options.onOpen,
            onClose: options.onClose,
            comboWidth: options.comboWidth,
            comboHeight: options.comboHeight,
            triggerElement: options.triggerElement,
            tooltipContainer: options.tooltipContainer,
            ariaLabelPrefix: options.ariaLabelPrefix,
            isDisabled: options.disabled,
        };
        return optionsPalette;
    }
}

/**************************************************************
 *                              Private Controls
 *************************************************************/
export interface ColorPaletteViewOptions {
    paletteControl: IPaletteColorPickerControl;
    paletteControlOptions: PaletteColorPickerControlOptions;
    tooltipContainer?: HTMLElement;
}

/**
 * The color palette is not a table but a list of single color that is breaking into rows
 * depending of the option provided.
 *
 * Export just because of unit test.
 */
export class ColorPaletteView extends Controls.Control<ColorPaletteViewOptions> {
    public static EventClick = "click";
    public static EventHover = "mouseover";
    public static EventKeyDown = "keydown";
    public static CssNamePalette = "color-picker-palette";
    public static CssNameSingleColor = "color-picker-palette-single-color";
    public static CssNameSingleColorSvg = "color-picker-palette-single-color-svg";
    public static CssNameSingleColorLast = "color-picker-palette-single-color-last";
    public static CssNameSingleColorSelected = "color-picker-palette-single-color-selected";
    public static CssNameSingleColorSelectedInnerBorder = "color-picker-palette-single-color-selected-inner";
    public static CssNameSingleColorBorder = "color-picker-palette-single-color-border";

    public static DataColor = "data-hex-color";

    public static PalettePadding: number = 2;
    public static SingleColorSize: number = 20;
    public static SingleColorBorderSize: number = 1;
    public static SingleColorMargin: number = 1;

    protected paletteColorPickerControlOptions: PaletteColorPickerControlOptions;
    private paletteColorPickerControl: IPaletteColorPickerControl;
    private tooltips: Controls.Enhancement<IRichContentTooltipOptions>[];

    constructor(options: ColorPaletteViewOptions) {
        super(options);
        this.paletteColorPickerControl = options.paletteControl;
        this.paletteColorPickerControlOptions = options.paletteControlOptions;
    }

    public initialize(): void {
        super.initialize();
        this.createHtml();
    }

    /**
     * Create the View of the ColorPalette. No events are added at that point and the palette is not visible on creation.
     */
    protected createHtml(): void {
        var $paletteHtml = $('<ul>').addClass(ColorPaletteView.CssNamePalette)
            .attr('tabindex', 0)
            .attr('role', 'grid')
            .attr('aria-label', Resources.ColorPalleteLabel)
            .attr('aria-rowcount', Math.ceil(this.paletteColorPickerControlOptions.palette.length / this.paletteColorPickerControlOptions.maximumColumns))
            .attr('aria-colcount', this.paletteColorPickerControlOptions.maximumColumns);
        var colors = this.paletteColorPickerControlOptions.palette;
        var isHighContrast: boolean = VSS_Context.isHighContrastMode();
        for (var colorIndex = 0; colorIndex < colors.length; colorIndex++) {
            var color = colors[colorIndex];
            var hexColor: string = color.asHex();
            var $singleColor = $('<li>')
                .addClass(ColorPaletteView.CssNameSingleColor)
                .attr('id', `${this.getElement().attr('id')}-color-${colorIndex}`)
                .attr(ColorPaletteView.DataColor, hexColor)
                .css('background-color', hexColor)
                .attr('aria-label', color.getDisplayName())
                .attr('role', 'gridcell');
            if (color.isLightColor()) {
                $singleColor.addClass(ColorPaletteView.CssNameSingleColorBorder);
            }
            this.highContrastSingleColor(isHighContrast, hexColor, $singleColor);
            if (colorIndex % this.paletteColorPickerControlOptions.maximumColumns === 0) {
                $singleColor.addClass(ColorPaletteView.CssNameSingleColorLast);
            }
            $paletteHtml.append($singleColor);
        }

        /*Setting the width is required because if we are in the edge of a container or the Html document, we do not want
        * the palette to be resized.Every color are floating, thus would go to the next row, which is not what we want.By having a fixed
        * width, it allows us to handle the offset and manage to move the palette somewhere else to avoid overflow.*/
        $paletteHtml.css('width', this.getWidth());
        $paletteHtml.appendTo(this.getElement());
        this.hide();
    }

    /**
     * For high-contrast, we need to have the color that will remain visible for the user.
     * This methid -1 all size to have the canvas not being above the Html div
     * @param {boolean} isHighContrast: Indicate if we are or not in high contrast
     * @param {string} hexColor: The color to set in the single color control
     * @param {JQuery} $singleColor: The Color in the palette
     */
    private highContrastSingleColor(isHighContrast: boolean, hexColor: string, $singleColor: JQuery): void {
        if (isHighContrast) {
            var highContrastFallBackElement = $('<canvas>')
                .attr("width", ColorPaletteView.SingleColorSize - 1)
                .attr("height", ColorPaletteView.SingleColorSize - 1)
                .addClass(ColorPaletteView.CssNameSingleColorSvg);
            var context = (<HTMLCanvasElement>highContrastFallBackElement.get(0)).getContext("2d");
            context.beginPath();
            context.rect(0, 0, ColorPaletteView.SingleColorSize - 1, ColorPaletteView.SingleColorSize - 1);
            context.fillStyle = hexColor;
            context.fill();
            $singleColor.append(highContrastFallBackElement);
        }
    }

    /**
     * Get the width of the palette.
     * @returns {number} : Pixel
     */
    private getWidth(): number {
        return this.paletteColorPickerControlOptions.maximumColumns * (ColorPaletteView.SingleColorSize + ColorPaletteView.SingleColorBorderSize + ColorPaletteView.SingleColorMargin)
            + ColorPaletteView.PalettePadding * 2 + 2; //Size widget + border + margin + palette padding + palette border + 2 (?)
    }

    /**
     * Display the control and attach all events for the palette and the parent.
     */
    public show(): void {
        let element = this.getElement();
        element.show();
        this.addEvents();
        this.attachParentEvents();

        let colorPalette = element.find('.' + ColorPaletteView.CssNamePalette).get(0);
        this._setTooltips(colorPalette);
        
        // Stop the combo box tooltip from showing over the color palette.
        element.parent().get(0).blur();
        colorPalette.focus();

        // Show selected color's tooltip if a preselected value is present
        let selectedColor = element.find('.' + ColorPaletteView.CssNameSingleColorSelected);
        if (selectedColor.length) {
            this._setMouseEnterToColor(selectedColor);
        }

        if (this.paletteColorPickerControlOptions.onOpen) {
            this.paletteColorPickerControlOptions.onOpen(this.paletteColorPickerControl);
        }
    }

    /**
     * Add all of the tooltips to the color palette colors.  Use dispalyName if available.
     * Otherwise display the hex code.
     * @param colorPalette
     */
    private _setTooltips(colorPalette: HTMLElement) {

        this.tooltips = [];

        if (colorPalette && this.paletteColorPickerControlOptions && this.paletteColorPickerControlOptions.palette) {
            for (let i = 0; i < colorPalette.children.length; i++) {
                let $target = $(colorPalette.children[i]);
                if (!$target.hasClass(ColorPaletteView.CssNameSingleColor)) {
                    continue;
                }

                const optionsColor = this.paletteColorPickerControlOptions.palette[i];
                const targetColor = this._getColorFromAttribute($target);

                //If available, the tooltip content should be the friendly displayName.  If we cannot correlate this $target value
                //with its original value in paletteColorPickerControlOptions, then display the hex value.  Hex value may also show
                //because there is no friendly displayName.
                const colorTooltip: string = optionsColor.asHex === targetColor.asHex ? optionsColor.getDisplayName() : targetColor.asHex();
                this.tooltips.push(RichContentTooltip.add(colorTooltip, $target, {
                    setAriaDescribedBy: false,
                    menuContainer: this._options.tooltipContainer == null ? null : $(this._options.tooltipContainer),
                    autoWidth: true
                } as IRichContentTooltipOptions));
            }
        }
    }

    /**
     * Keep the Html in the UI but hide it. Also remove all actions attached to the control and the parent.
     */
    public hide(): void {
        this.getElement().hide();
        this.removeEvents();
        this.removeParentEvents();

        //Dispose of all tooltips in this element
        if (this.tooltips) {
            this.tooltips.forEach(tooltip => {
                tooltip.dispose();
            });
        }

        if (this.paletteColorPickerControlOptions.onClose) {
            this.paletteColorPickerControlOptions.onClose(this.paletteColorPickerControl);
        }
    }

    /**
     * Move from visible to not and the other way around
     */
    public toggle(): void {
        if (this.isVisible()) {
            this.hide();
            this._setMouseLeaveToSelectedColor();
        } else {
            this.show();
        }
    }

    /**
     * Attach events on the parent (container) of the color palette view.
     */
    private attachParentEvents(): void {
        this.getElement().parents().on("scroll resize", () => this.onScrollOrMove());
    }

    /**
     * Detach parent events
     */
    private removeParentEvents(): void {
        this.getElement().parents().off("scroll resize", () => this.onScrollOrMove());
    }

    /**
     * When the parent of the palette is getting scroll or move, we hide the palette
     */
    private onScrollOrMove(): void {
        this.hide();
    }

    /**
     * Indicate the visibility state
     * @returns {boolean} True if visible; False if not visible
     */
    public isVisible(): boolean {
        return this.getElement().is(":visible");
    }

    /**
     * When a color is selected, we set the color as the active one, notify if the user is hooked
     * to the selected callback and close the palette.
     * @param {jQueryEventObject} : The event that trigged the selection.
     */
    private onColorSelected(jQueryEventObject: JQueryEventObject): void {
        var $target = this.getColorHtmlFromTarget($(jQueryEventObject.target));
        var color = this._getColorFromAttribute($target);
        this.colorSelected(color);
    }

    /**
     * Get from a JQuery event target the right element that contains the HEX value.
     * This is required because we have custom UI that add a Html element inside the color, when you hover or click
     * a selected element, the target is not the actual color but the inner Html selector element.
     * @param {JQuery} $target - The element that got the event
     * @exception - If the target, or any parent have not color, exception thrown
     * @returns {JQuery} Element with the color
     */
    private getColorHtmlFromTarget($target: JQuery): JQuery {
        if ($target.hasClass(ColorPaletteView.CssNameSingleColor)) {
            return $target;
        }

        var parent = $target.closest("." + ColorPaletteView.CssNameSingleColor);

        if (parent.length !== 1) {
            throw new Error("Cannot find any color on the target");
        }
        return $(parent.get(0));
    }

    /**
     * When a color is selected, we set the color as the active one, notify if the user is hooked
     * to the selected callback and close the palette.
     * @param color
     */
    private colorSelected(color: AccessibilityColor): void {
        this.paletteColorPickerControl.setColor(color);
        this.selectSingleColor(color);
        this.notifyColorSelectionChange(color);

        this.hide();

        //In Chrome, when currently focused element is not displayed anymore, focus goes to body
        this.paletteColorPickerControl.setFocus();
    }

    private notifyColorSelectionChange(color: AccessibilityColor) {
        if (this.paletteColorPickerControlOptions.onColorSelected != null) {
            this.paletteColorPickerControlOptions.onColorSelected(this.paletteColorPickerControl, color);
        }
    }


    /**
     * Moving above a color without selecting (clicking) call the color hover
     * @param {JQueryEventObject} jQueryEventObject - Event of hovering
     */
    private onColorHover(jQueryEventObject: JQueryEventObject): void {
        // Parent control will race the color icon to display tooltip.
        jQueryEventObject.stopPropagation();
        var $target = this.getColorHtmlFromTarget($(jQueryEventObject.target));
        var color = this._getColorFromAttribute($target);
        if (this.paletteColorPickerControlOptions.onColorHover != null) {
            this.paletteColorPickerControlOptions.onColorHover(this.paletteColorPickerControl, color);
        };
    }

    /**
     * Get from DATA- attribute the hex color associated to the Html element
     * @param {JQuery} element : Element to get the attribute from
     * @returns {Color} : The color from the html attribute
     */
    public _getColorFromAttribute(element: JQuery): AccessibilityColor {
        var hexColorCode = element.attr(ColorPaletteView.DataColor);
        return new AccessibilityColor(hexColorCode);
    }

    /**
     * Add event for selecting the color (click) and preview of color (hover)
     */
    private addEvents(): void {
        this.getElement().on(ColorPaletteView.EventClick, "." + ColorPaletteView.CssNameSingleColor, (e) => this.onColorSelected(e));
        this.getElement().on(ColorPaletteView.EventHover, "." + ColorPaletteView.CssNameSingleColor, (e) => this.onColorHover(e));
        this.getElement().on(ColorPaletteView.EventKeyDown, (e) => this.key(e));
    }

    /**
     * Remove all events
     */
    private removeEvents(): void {
        this.getElement().off(ColorPaletteView.EventClick);
        this.getElement().off(ColorPaletteView.EventHover);
        this.getElement().off(ColorPaletteView.EventKeyDown);
    }

    /**
     * Visually select a single color in the palette by its color code
     * @param {Color} color - Color to be selected. Cannot be null.
     */
    public selectSingleColor(color: Color): void {
        if (color == null) {
            throw new Error("Color is required when selecting");
        }
        var $element: JQuery = this.getElement().find(Utils_String.format('[{0}="{1}"]', ColorPaletteView.DataColor, color.asHex()));

        if ($element.length <= 0) {
            throw new Error("Color not found in the palette when selecting");
        }
        this.selectHtmlColorElement($($element.get(0)));
    }

    /**
     * Remove all previous possible selection and select the element passed by parameter
     * @param {jquery} $singleColorElement - Single color in the palette
     */
    private selectHtmlColorElement($singleColorElement: JQuery): void {
        //Style on the color
        this._setMouseLeaveToSelectedColor();
        this.getElement().find('.' + ColorPaletteView.CssNameSingleColorSelected).removeClass(ColorPaletteView.CssNameSingleColorSelected).removeAttr('aria-selected');
        $singleColorElement.addClass(ColorPaletteView.CssNameSingleColorSelected).attr('aria-selected', 'true');

        //Create an inner border by creating a division with transparent background
        this.getElement().find('.' + ColorPaletteView.CssNameSingleColorSelectedInnerBorder).not('canvas').remove(); //Remove completely when not canvas
        this.getElement().find('.' + ColorPaletteView.CssNameSingleColorSelectedInnerBorder).removeClass(ColorPaletteView.CssNameSingleColorSelectedInnerBorder); //Remove in case of canvas

        var $highContrastElement = $singleColorElement.find('canvas');
        if ($highContrastElement.length === 1) {
            //Border directly on the Canvas
            $highContrastElement.addClass(ColorPaletteView.CssNameSingleColorSelectedInnerBorder);
            this._setMouseEnterToColor($highContrastElement); // In order to trigger default rich content tooltip on keyboard move.
        } else {
            //Border inside the DIV
            var $innerBorder = $('<div>').addClass(ColorPaletteView.CssNameSingleColorSelectedInnerBorder);
            $singleColorElement.append($innerBorder);
            this._setMouseEnterToColor($singleColorElement); // In order to trigger default rich content tooltip on keyboard move.
        }

        // Set active descendant
        var $paletteHtml = this.getElement().find(`.${ColorPaletteView.CssNamePalette}`);
        $paletteHtml.attr('aria-activedescendant', $singleColorElement.attr('id'));
    }

    private _setMouseEnterToColor($singleColorElement: JQuery): void {
        var offset = $singleColorElement.offset();
        if (offset.left !== 0 && offset.top !== 0) {
            let event = this._createCustomEvent("mouseover");
            $singleColorElement[0].dispatchEvent(event);
        }
    }

    private _setMouseLeaveToSelectedColor(): void {
        let event = this._createCustomEvent("mouseout");
        var selected = this.getElement().find('.' + ColorPaletteView.CssNameSingleColorSelected);
        if (selected.length) selected[0].dispatchEvent(event);
    }

    private _createCustomEvent(type: string): Event {
        // We create a mouse event for hover functionality.
        // IE11 doesnt support the Event constructor so we poly fill this part.
        let event = null;
        try {
            event = new Event(type);
        } catch(error) {
            event = document.createEvent("Event");
            event.initEvent(type, true, true);
        }
        return event;
    }

    private key(e: JQueryEventObject): void {
        switch (e.which) {
            case Utils_UI.KeyCode.ENTER:
            case Utils_UI.KeyCode.SPACE:
                var $currentSelectedElement = $(this.getElement().find('.' + ColorPaletteView.CssNameSingleColorSelected).get(0));
                var color = this._getColorFromAttribute($currentSelectedElement);
                this.colorSelected(color);
                break;
            case Utils_UI.KeyCode.ESCAPE:
                e.preventDefault(); // prevent the default action (scroll / move caret)
                e.stopPropagation(); //We do not want to close the blade menu
                this.toggle();
                this.paletteColorPickerControl.setFocus();
                break;
            case Utils_UI.KeyCode.TAB:
                e.preventDefault(); // prevent the default action (scroll / move caret)
                e.stopPropagation(); //We do not want to close the blade menu
                this.toggle();
                this.findNextElementToFocus().focus();
                break;
            case Utils_UI.KeyCode.LEFT:
                this._moveSelectedColorRelative(-1, 0);
                break;
            case Utils_UI.KeyCode.RIGHT:
                this._moveSelectedColorRelative(1, 0);
                break;
            case Utils_UI.KeyCode.UP:
                if (e.altKey) { // Combo behavior (we don't know if the trigger element is actually a combo, but we'll treat it as though it is anyway)
                    this.hide();
                    this.paletteColorPickerControl.setFocus();
                } else {
                    this._moveSelectedColorRelative(0, 1);
                }
                break;
            case Utils_UI.KeyCode.DOWN:
                this._moveSelectedColorRelative(0, -1);
                break;
            case Utils_UI.KeyCode.HOME:
                this._goToFirstElement();
                break;
            case Utils_UI.KeyCode.END:
                this._goToLastElement();
                break;

            default: return; // exit this handler for other keys
        }
        e.preventDefault(); // prevent the default action (scroll / move caret)
        e.stopPropagation();
    }

    /**
     * Move relatively to the current selected item. We do not set the color. This need to be done by pressing Enter or Space.
     * This method support just +1 and -1 as value. However, it can be easily extendable to use every value. I do not see any
     * valid use case for the moment since it is only used for keyboard movement.
     * @param {number} x : +1 = right, -1 = left
     * @param {number} y : +1 = up, -1 = down
     */
    public _moveSelectedColorRelative(x: number, y: number): void {

        if (x === 0 && (y !== 1 && y !== -1)) {
            throw new Error("y value supported is -1 or +1");
        }

        if (y === 0 && (x !== 1 && x !== -1)) {
            throw new Error("x value supported is -1 or +1");
        }

        if (x !== 0 && y !== 0) {
            throw new Error("Can only move one direction at a time");
        }

        var $currentSelectedColor: JQuery = $(this.getElement().find('.' + ColorPaletteView.CssNameSingleColorSelected).get(0));
        var $allColorsInPalette: JQuery = $(this.getElement().find('.' + ColorPaletteView.CssNameSingleColor));

        var $itemToMoveTo;
        if (x === 1) {
            $itemToMoveTo = this._getRightSingleColor($currentSelectedColor, $allColorsInPalette);
        }
        if (x === -1) {
            $itemToMoveTo = this._getLeftSingleColor($currentSelectedColor, $allColorsInPalette);
        }
        if (y === -1) {
            $itemToMoveTo = this._getDownSingleColor($currentSelectedColor, $allColorsInPalette);
        }
        if (y === +1) {
            $itemToMoveTo = this._getUpSingleColor($currentSelectedColor, $allColorsInPalette);
        }
        if ($itemToMoveTo != null) {
            this.selectHtmlColorElement($itemToMoveTo);
        }
    }

    /**
     * Get from the palette the JQuery element of the right color from the current selected one
     * @param {JQuery} $currentSelectedColor - Html Element of the selected item. This one is inside the next parameter
     * @param {JQuery[]} $allColorsInPalette - Array of Html Element which represent all colors in the palette.
     * @returns {JQuery} The next available color
     */
    public _getRightSingleColor($currentSelectedColor: JQuery, $allColorsInPalette: JQuery): JQuery {
        var $itemToMoveTo = $currentSelectedColor.next();
        if ($itemToMoveTo.length === 0) { //Nothing is returned, so we reached the last one.
            $itemToMoveTo = $($allColorsInPalette.get(0)); //Get to the first one (we are looping the color)
        }
        return $itemToMoveTo;
    }

    /**
     * Get from the palette the JQuery element of the left color from the current selected one
     * @param {JQuery} $currentSelectedColor - Html Element of the selected item. This one is inside the next parameter
     * @param {JQuery[]} $allColorsInPalette - Array of Html Element which represent all colors in the palette.
     * @returns {JQuery} The previous available color
     */
    public _getLeftSingleColor($currentSelectedColor: JQuery, $allColorsInPalette: JQuery): JQuery {
        var $itemToMoveTo = $currentSelectedColor.prev();
        if ($itemToMoveTo.length === 0) { //Nothing is returned, we reached the first one
            $itemToMoveTo = $($allColorsInPalette.get($allColorsInPalette.length - 1)); //We loop to the last one
        }
        return $itemToMoveTo;
    }

    /**
     * Get from the palette the JQuery element of the color down from the current selected one
     * @param {JQuery} $currentSelectedColor - Html Element of the selected item. This one is inside the next parameter
     * @param {JQuery[]} $allColorsInPalette - Array of Html Element which represent all colors in the palette.
     * @returns {JQuery} The color under the currentSelected
     */
    public _getDownSingleColor($currentSelectedColor: JQuery, $allColorsInPalette: JQuery): JQuery {
        var $itemToMoveTo;
        if ($currentSelectedColor.nextAll().length >= this.paletteColorPickerControlOptions.maximumColumns) {
            $itemToMoveTo = $currentSelectedColor.nextAll().slice(this.paletteColorPickerControlOptions.maximumColumns - 1, this.paletteColorPickerControlOptions.maximumColumns);
        } else {
            //We are at he last row, we need to move back to the first row
            var index = $allColorsInPalette.index($currentSelectedColor);
            var $currentItemColumn = index % this.paletteColorPickerControlOptions.maximumColumns;
            $itemToMoveTo = $($allColorsInPalette.get($currentItemColumn)); // First row
        }
        return $itemToMoveTo;
    }

    /**
     * Get from the palette the JQuery element of the color top from the current selected one
     * @param {JQuery} $currentSelectedColor - Html Element of the selected item. This one is inside the next parameter
     * @param {JQuery[]} $allColorsInPalette - Array of Html Element which represent all colors in the palette.
     * @returns {JQuery} The color above the currentSelected
     */
    public _getUpSingleColor($currentSelectedColor: JQuery, $allColorsInPalette: JQuery): JQuery {
        var $itemToMoveTo;
        if ($currentSelectedColor.prevAll().length >= this.paletteColorPickerControlOptions.maximumColumns) {
            $itemToMoveTo = $currentSelectedColor.prevAll().slice(this.paletteColorPickerControlOptions.maximumColumns - 1, this.paletteColorPickerControlOptions.maximumColumns);
        } else {
            //We are at he first row, we need to move back to the last row
            var index = $allColorsInPalette.index($currentSelectedColor);
            var count = $allColorsInPalette.length;
            var division = count / this.paletteColorPickerControlOptions.maximumColumns;
            var modulo = count % this.paletteColorPickerControlOptions.maximumColumns;
            var rowAdjustment: number = 0; //If we keep it to 0 : Last row (work even if not a full row)
            if (index >= modulo) {
                //Row before Last (to work with table that is not a full table)
                rowAdjustment = -1;
            }
            $itemToMoveTo = $($allColorsInPalette.get(index + (Math.floor(division) + rowAdjustment) * this.paletteColorPickerControlOptions.maximumColumns));
        }
        return $itemToMoveTo;
    }

    /**
     * Move selection to last element in the grid. We do not set the color.
     */
    public _goToLastElement(): JQuery {
        var $allColorsInPalette: JQuery = $(this.getElement().find('.' + ColorPaletteView.CssNameSingleColor));
        var $itemToMoveTo = $allColorsInPalette.eq($allColorsInPalette.length - 1);
        if ($itemToMoveTo != null) {
            this.selectHtmlColorElement($itemToMoveTo);
        }

        return $itemToMoveTo;
    }

    /**
     * Move selection to first element in the grid. We do not set the color.
     */
    public _goToFirstElement(): JQuery {
        var $itemToMoveTo: JQuery = $(this.getElement().find('.' + ColorPaletteView.CssNameSingleColor)).eq(0);
        this.selectHtmlColorElement($itemToMoveTo);
        return $itemToMoveTo;
    }


    private findNextElementToFocus(): JQuery {
        var $canfocus = $(document).find('a, button, :input, [tabindex]');
        var index = $canfocus.index(document.activeElement) + 1;
        if (index >= $canfocus.length) {
            index = 0;
        }
        return $canfocus.eq(index);
    }
}

/**
 * Option for the combo view
 */
export interface ColorComboViewOptions {

    /**
     * When the combo is mouse-clicked, it call this method. The initializer can
     * act. An actual case is to open the palette when the combo is selected.
     */
    clicked(): void;

    /**
     * When a keyboard event occurs, call this method.
     * This acts on navigation as well as treating space/enter as clicks.
     */
    keyDown(e: JQueryEventObject): void;

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

    /** Aria Label prefix for screen reader to report on landing in the combo.*/
    ariaLabelPrefix?: string;

    /** Whether the combo is disabled.*/
    isDisabled?: boolean;
}

/**
 * Color Combo is the colored rectangle with the arrow that open the color picker. The goal
 * of this class is visual only. It represents the control when collapsed (no palette shown).
 *
 * By specs, the combo click events are on the full control not just the arrow of the combo.
 *
 * "Export" just because of unit tests
 */
export class ColorComboView extends Controls.Control<ColorComboViewOptions> {

    /**
     * Height of the combo
     */
    private height: number = 25;

    /**
     * Width of the combo
     */
    private width: number = 100;

    /**
     * This is the size needed to use the sprite.
     */
    private highContrastArrowComboWidth: number = 36;

    private richContentTooltip: RichContentTooltip;

    /**
     * Combo class. This is required to have custom visual appearance.
     */
    public static CssNameCombo = "color-picker-combo";

    constructor(options: ColorComboViewOptions) {
        super(options);
    }
    private canvasHighContrast: JQuery;

    public initializeOptions(options: ColorComboViewOptions) {
        super.initializeOptions($.extend({
            coreCssClass: ColorComboView.CssNameCombo
        },
            options));

    }

    /**
     * Initialize the view by creating the Html elements and attaching events
     */
    public initialize(): void {
        const width = this._options.comboWidth || this.width;
        const height = this._options.comboHeight || this.height;
        this.getElement()
            .css("width", width)
            .css("height", height)
            .css("line-height", height + "px")
            .attr("tabindex", 0)
            .attr("role", "combobox")
            .attr("readonly", "readonly")
            .attr("aria-haspopup", "grid")
            .attr("aria-expanded", "false")
            .attr("aria-label", this._options.ariaLabelPrefix)
            .prop("disabled", this._options.isDisabled);

        this.richContentTooltip = RichContentTooltip.add(this._options.ariaLabelPrefix || "", this.getElement(), {});


        // Add something to the control otherwise when it is rendered inline extra space appears at the bottom of the element when align left is used (below).
        this.getElement().html("&nbsp;");

        if (VSS_Context.isHighContrastMode()) {
            this.canvasHighContrast = $('<canvas>')
                .css("float", "left")
                .attr("width", width - this.highContrastArrowComboWidth)
                .attr("height", height - 1);

            this.getElement().append(this.canvasHighContrast);
        }

        this.getElement().append($("<span>")
            .addClass("bowtie-icon")
            .addClass("bowtie-chevron-down-light")
            .attr("role", "button")
            .css("line-height", height + "px"));
        this.attachEvents();
    }

    /**
     * Set the color visually to the control.
     * @param {Color} color - Color to be set
     */
    public setColor(color: Color): void {
        if (color == null) {
            throw new Error("Color must be defined");
        }
        let activeLabel = Utils_String.format(Resources.ColorPickerLabelFormat, this._options.ariaLabelPrefix, color.asHex());
        this.getElement()
            .css('background-color', color.asHex())
            .attr("aria-label", activeLabel);
        this.richContentTooltip.setTextContent(activeLabel);

        if (VSS_Context.isHighContrastMode()) {
            const width = this._options.comboWidth || this.width;
            const height = this._options.comboHeight || this.height;
            const context = (<HTMLCanvasElement>this.canvasHighContrast.get(0)).getContext("2d");
            context.beginPath();
            context.rect(0, 0, width - this.highContrastArrowComboWidth, height - 2);
            context.fillStyle = color.asHex();
            context.fill();
        }
    }

    /**
     * Attach the click event when the combo is clicked. This is true if the color or the
     * arrow is clicked. This will notify the parent control by option that something has been clicked.
     */
    public attachEvents(): void {
        this.getElement().click(() => {
            this._options.clicked();
        });
        this.getElement().on('keydown', (e) => {
            this._options.keyDown(e);
        });
    }
}
