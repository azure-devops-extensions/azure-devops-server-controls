import * as React from "react";
import { KeyCodes } from "OfficeFabric/Utilities";
import { ITextField, TextField, ITextFieldProps } from "OfficeFabric/TextField";
import { FilterBarItem, IFilterBarItemState, IFilterBarItemProps } from "VSSUI/FilterBarItem";

export interface ITextFilterBarProps extends IFilterBarItemProps {
    /**
     * The maxLength property to be passed to the input in the TextField.
     * Default value is 200 characters.
     */
    maxTextLength?: number;

    /**
     * The throttle wait time to use when updating the filter. The text field
     * will still update on every keystroke, but the updating the filter
     * itself will be throttled by this amount. The default value is 200 ms.
     * Passing a value of 0 here will cause this text field not to be throttled.
     */
    throttleWait?: number;

    /**
     * The error message to be displayed if the passed-in value is invalid.
     * If the value is valid, then this should return an empty string.
     */
    onGetErrorMessage?: (value: string) => string;
}

export interface ITextFilterBarItemState extends IFilterBarItemState<string> {}

const DEFAULT_MAX_TEXT_LENGTH = 200;
const DEFAULT_THROTTLE_WAIT = 200;

export class TextFilterBarItem extends FilterBarItem<string, ITextFilterBarProps, ITextFilterBarItemState> {
    private _textField: ITextField;

    protected static defaultProps = {
        isTextItem: true
    };

    public focus(): void {
        if (this._textField) {
            return this._textField.focus();
        }
    }

    public render(): JSX.Element {
        const { value } = this.state;
        const { placeholder, maxTextLength, onGetErrorMessage } = this.props;

        return (
            <TextField
                componentRef={element => (this._textField = element)}
                className="vss-FilterBar--item-text"
                value={value || ""}
                placeholder={placeholder}
                ariaLabel={placeholder}
                onChanged={this._onTextChanged}
                onKeyDown={this._onKeyDown}
                maxLength={maxTextLength || DEFAULT_MAX_TEXT_LENGTH}
                onGetErrorMessage={onGetErrorMessage}
                {...this.getExtraTextFieldProps()}
            />
        );
    }

    protected getExtraTextFieldProps(): ITextFieldProps {
        return null;
    }

    protected getThrottleWait(): number {
        const { throttleWait } = this.props;
        return throttleWait === undefined ? DEFAULT_THROTTLE_WAIT : throttleWait;
    }

    private _onTextChanged = (text: string) => {
        this.setFilterValue({ value: text });
    };

    private _onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
        switch (ev.which) {
            case KeyCodes.enter:
                this.props.filter.setFilterItemState(this.props.filterItemKey, { value: this.state.value });
                this.props.filter.applyChanges();
                break;

            case KeyCodes.escape:
                this.setFilterValue({ value: "" });
                this.setState({
                    value: ""
                });
                this.props.filter.applyChanges();
                break;

            default:
                return;
        }

        // We only get here if the keypress has been handled.
        ev.preventDefault();
        ev.stopPropagation();
    };
}
