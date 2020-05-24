import { ICalloutTriggable } from "Search/Scripts/React/Models";

export interface IMenuButtonProps extends ICalloutTriggable {
    /** 
    * Controls the visibility mode of the component whether it's enabled or disabled.
    */
    enabled: boolean,
    /**
    * Display name to be rendered for the menu button.
    */
    displayName: string,
    /** 
    * Display label to be rendered for the menu button.
    */
    displayLabel: string,
    /** 
    * Id of the menu button.
    */
    menuButtonId: string,
    /** 
    * Controls the visibility of help icon.
    */
    showHelp: boolean,
    /** 
    * Optional properties for the display text. For eg. to override the default width etc.
    */
    HTMLInputProps?: IDictionaryStringTo<any>,
    /** 
    * Optional css class passed to the menu button to override any default css.
    */
    cssClass?: string,
    /** 
    * Optional call back to handle click event on menu button.
    */
    onDropdownButtonClick?: () => void,
    /** 
    * Optional call back to handle key down event on menu button.
    */
    onKeyDown?: (evt) => void,
    /** 
    * Aria role for the menu button.
    */
    role: string,
    /** 
    * Controls the value of the attribute, aria-haspopup.
    */
    hasDropdown: boolean,
    /** 
    * Controls the value of aria-owns, aria-controls and aria-expanded attributes.
    */
    dropdownOpen?: boolean,
    /** 
    * Id provided to aria-owns and aria-controls attributes
    */
    dropdownId?: string,
    /** 
    * aria-autocomplete attribute for the menu button based on its functionality.
    */
    ariaAutoComplete?: string
}