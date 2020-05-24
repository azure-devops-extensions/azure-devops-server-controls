import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { getId, css, KeyCodes } from "OfficeFabric/Utilities";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";
import { IComboBoxProps, IComboBox } from "Search/Scenarios/Shared/Components/TreeFilter/TreeFilter.Props";
import { CalloutComponent } from "SearchUI/Callout";
import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/TreeFilter/ComboBox";

export interface IComboBoxState {
    showDisabledInfoCallout: boolean;
}

export class ComboBox extends React.Component<IComboBoxProps, IComboBoxState> implements IComboBox {
    private textBoxRef: HTMLInputElement;

    constructor(props: IComboBoxProps) {
        super(props)
        this.state = { showDisabledInfoCallout: false };
    }

    public render(): JSX.Element {
        const {
            enabled,
            comboBoxLabel,
            comboBoxText,
            dropdownActive,
            editable,
            clearIconAriaLabel,
            onClearText,
            disabledInfoCalloutProps,
            showBusy
        } = this.props;
        const { showDisabledInfoCallout } = this.state;

        const menuComboBoxAttributes = this._getMenuComboBoxAttributes(),
            inputBoxAttributes = this._getInputBoxAttributes(),
            applyItemButtonAttributes = this._getApplyItemButtonAttributes(),
            chevronButtonAttributes = this._getChevronButtonAttributes();

        const showTooltip: boolean = comboBoxText && !dropdownActive,
            showComboBoxLabel: boolean = !enabled || !dropdownActive,
            showInProgressSpinner: boolean = enabled && editable && showBusy,
            showRemoveTextIcon: boolean = comboBoxText && dropdownActive && editable && enabled,
            calloutId = getId("search-Filter--CalloutId"),
            helpIconId = getId("search-DisabledFilter-help");

        return (
            <div>
                <div
                    className={css(
                        "filter-ComboBox--container", {
                            "is-disabled": !enabled
                        })}
                    {...menuComboBoxAttributes}>
                    {
                        // render the label and the input box
                        <div className="filter-ComboBox">
                            {
                                showComboBoxLabel &&
                                <span className={css(
                                    "comboBox-displayLabel", {
                                        "is-disabled": !enabled
                                    })}>
                                    {`${comboBoxLabel}: `}
                                </span>
                            }
                            {
                                showTooltip &&
                                <TooltipHost content={inputBoxAttributes["value"]}
                                    directionalHint={DirectionalHint.bottomCenter}
                                    hostClassName="treeview-input-tooltip">
                                    <input
                                        className={css("comboBox-input", {
                                            "is-disabled": !enabled
                                        })}
                                        {...inputBoxAttributes}>
                                    </input>
                                </TooltipHost>
                            }
                            {
                                !showTooltip &&
                                <input
                                    className={css("comboBox-input", {
                                        "is-disabled": !enabled
                                    })}
                                    {...inputBoxAttributes}>
                                </input>
                            }
                        </div>
                    }
                    {
                        showInProgressSpinner &&
                        <Spinner className="busy-spinner" size={SpinnerSize.small} />
                    }
                    {
                        showRemoveTextIcon &&
                        <div className="comboBox-clearText">
                            <span className="bowtie-icon removeText-icon bowtie-navigate-close"
                                role="button"
                                tabIndex={0}
                                aria-label={clearIconAriaLabel}
                                onKeyDown={this._onClearIconKeyDown}
                                onClick={onClearText} />
                        </div>
                    }
                    {
                        !enabled &&
                        <span
                            id={helpIconId}
                            className="disabled-Info-icon bowtie-status-help-outline is-disabled" />
                    }
                    {
                        showRemoveTextIcon ? (
                            <span
                                className={css("comboBox-GoButton bowtie-icon bowtie-arrow-right", { "is-disabled": !enabled })}
                                {...applyItemButtonAttributes} />)
                            : <span className="comboBox-Chevron bowtie-icon bowtie-chevron-down-light" {...chevronButtonAttributes} />
                    }
                </div>
                {
                    // Render call out component
                    showDisabledInfoCallout &&
                    !!disabledInfoCalloutProps &&
                    <CalloutComponent
                        targetElementSelector={"#" + helpIconId}
                        title={disabledInfoCalloutProps["title"]}
                        content={disabledInfoCalloutProps["content"]}
                        id={calloutId} />
                }
            </div>);
    }

    public componentDidMount(): void {
        const { componentRef } = this.props;
        if (componentRef) {
            componentRef(this);
        }
    }

    public componentWillReceiveProps(newProps: IComboBoxProps): void {
        if (newProps.enabled !== this.props.enabled) {
            this.setState({ showDisabledInfoCallout: false });
        }
    }

    public getInputRef = (): HTMLElement => {
        return this.textBoxRef;
    }

    private _getMenuComboBoxAttributes(): any {
        const { enabled, comboBoxLabel, onComboBoxClick } = this.props;

        let attributes = {
            "aria-label": comboBoxLabel
        };

        if (enabled) {
            attributes["onClick"] = onComboBoxClick;
        }
        else {
            attributes["onFocus"] = () => this._triggerCallout(true);
            attributes["onBlur"] = () => this._triggerCallout(false);
            attributes["role"] = "combobox";
            attributes["tabIndex"] = 0;
            attributes["aria-disabled"] = true;
            attributes["onMouseOver"] = () => this._triggerCallout(true);
            attributes["onMouseLeave"] = () => this._triggerCallout(false);
        }

        return attributes;
    }

    /**
     * This function provides the attributes of the input element of the path control based on its state
     * When the control is enabled, the input box should behave like a combobox and is the first tabbable element
     */
    private _getInputBoxAttributes(): any {
        const {
            comboBoxLabel,
            comboBoxText,
            enabled,
            dropdownActive,
            onComboBoxClick,
            editable,
            onTextChanged,
            onInputFocus,
            placeholder,
            onInputKeyDown
        } = this.props;
        const label = `${comboBoxLabel} ${comboBoxText}`;
        let attributes = {
            "ref": text => this.textBoxRef = text,
            "aria-label": label,
            "spellCheck": false
        };

        if (enabled) {
            attributes["aria-expanded"] = dropdownActive;
            attributes["role"] = "combobox";
            attributes["aria-autocomplete"] = "list";
            attributes["value"] = comboBoxText;
            attributes["onClick"] = onComboBoxClick;

            if (editable) {
                attributes["onChange"] = onTextChanged;
                attributes["onFocus"] = onInputFocus;
                attributes["placeholder"] = placeholder;
                attributes["onKeyDown"] = onInputKeyDown;
            }
            else {
                // Make input readonly not disabled. 
                // If the input is disabled click event is not fired in I.E/Edge.
                attributes["readOnly"] = true;
            }
        }
        else {
            attributes["disabled"] = true;
            attributes["value"] = "";
        }

        return attributes;
    }

    /**
     * This function provides the attributes of the right arrow button of the path filter
     */
    private _getApplyItemButtonAttributes(): any {
        const { enabled, editable, onApplyText, applyButtonAriaLabel } = this.props;
        let attributes = {};
        if (enabled && editable) {
            attributes["tabIndex"] = 0;
            attributes["role"] = "button";
            attributes["onClick"] = onApplyText;
            attributes["onKeyDown"] = this._onApplyIconKeyDown;
            attributes["aria-label"] = applyButtonAriaLabel;
        }

        return attributes;
    }

    /**
     * This function provides the attributes of the right arrow button of the path filter
     */
    private _getChevronButtonAttributes(): any {
        const { enabled, onChevronClick } = this.props;
        let attributes = {};
        if (enabled) {
            attributes["tabIndex"] = 0;
            attributes["role"] = "button";
            attributes["onClick"] = onChevronClick;
            attributes["onKeyDown"] = this._onChevronIconKeyDown;
            attributes["aria-label"] = this.props.comboBoxLabel + " " + Resources.PathDropdownComboBoxAriaLabel;
        }

        return attributes;
    }

    private _onClearIconKeyDown = (evt?: React.KeyboardEvent<HTMLElement>): void => {
        const { onClearText } = this.props;

        if (evt.keyCode === KeyCodes.enter && onClearText) {
            onClearText(evt);
        }
    }

    private _onApplyIconKeyDown = (evt?: React.KeyboardEvent<HTMLElement>): void => {
        const { onApplyText } = this.props;

        if (evt.keyCode === KeyCodes.enter && onApplyText) {
            onApplyText(evt);
        }
    }

    private _onChevronIconKeyDown = (evt?: React.KeyboardEvent<HTMLElement>): void => {
        const { onChevronClick } = this.props;

        if (evt.keyCode === KeyCodes.enter && onChevronClick) {
            onChevronClick(evt);
        }
    }

    /**
     * Trigger callout when hover happens on the search box or when it is under focus.
     * @param showCallout
     */
    private _triggerCallout = (showCallout: boolean): void => {
        this.setState({ showDisabledInfoCallout: showCallout });
    }
}