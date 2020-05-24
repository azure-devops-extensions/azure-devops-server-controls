import * as React from "react";

import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";

import { KeyCode } from "VSS/Utils/UI";

import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";

export interface SearchBoxProps {
    value?: string;
    contextLabel?: string;
    onFocus?(event: React.FocusEvent<HTMLDivElement>): void;
    onBlur?(event: React.FocusEvent<HTMLDivElement>): void;
    waterMarkText: string;
    hasDropdown?: boolean;
    inputBoxRef?(ref: HTMLInputElement): void;
    dropDownContainerRef?(ref: HTMLDivElement): void;
    onPerformSearch(value: string, openInNewTab: boolean): void;
    onChange?(value: string): void;
}

export interface SearchBoxState {
    value: string;
    focussed: boolean;
}

export class SearchBox extends React.Component<SearchBoxProps, SearchBoxState> {
    private _searchBox: HTMLElement;

    constructor(props: SearchBoxProps) {
        super (props);
        this.state = {
            value: props.value,
            focussed: false
        };
    }

    public render(): JSX.Element {
        const {
            contextLabel,
            waterMarkText,
            hasDropdown,
            inputBoxRef,
            dropDownContainerRef
        } = this.props;

        const {value, focussed} = this.state;
        const showcloseIcon = value && focussed;

        return(
            <div className={css("main-search-box-v2", {"contextual-navigation-enabled": !!contextLabel})}>
                {
                    contextLabel &&
                    <Label className="search-Context-label">{contextLabel}</Label>
                }
                <div className={css("search-BoxLarge--container")}
                    role="search">
                    <div className={css("search-box-v2")}
                        tabIndex={-1}
                        ref={this.searchBoxRef}
                        onFocus={this.onFocus}
                        onBlur={this.onBlur}>
                        <input
                            type="text"
                            ref={inputBoxRef}
                            aria-label={waterMarkText}
                            aria-autocomplete={hasDropdown ? "list" : undefined}
                            role={hasDropdown ? "combobox" : undefined}
                            className="input-box"
                            spellCheck={false}
                            value={value}
                            placeholder={waterMarkText}
                            onKeyDown={this.onSearch}
                            onChange={this.onChange} />
                        {
                            showcloseIcon &&
                            <span className="bowtie-icon bowtie-edit-remove remove-icon"
                                role="button"
                                tabIndex={0}
                                aria-label={Search_Resources.SearchBoxClearText}
                                onKeyDown={this.onClear}
                                onClick={this.onClear} />
                        }
                    </div>

                    <span className="search-icon bowtie-icon bowtie-search"
                        role="button"
                        tabIndex={0}
                        aria-label={Search_Resources.SearchLabel}
                        onKeyDown={this.onSearch}
                        onClick={this.onSearch} />
                    {
                        hasDropdown &&
                        <div ref={dropDownContainerRef} className="search-entity-dropdown-container" />
                    }
                </div>
            </div>
        );
    }

    public componentWillReceiveProps(newProps: SearchBoxProps) {
        if (newProps.value && (newProps.value !== this.state.value)) {
            this.setState({value: newProps.value});
        }
    }

    private searchBoxRef = (ref: HTMLElement) => {
        this._searchBox = ref;
    }

    private onBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
        // If the focus remains on input text box or remove icon the bowtie-remove icon needs to be shown
        // If focus is some where else other than above then we dont need to show the bowtie-remove icon
        // So on blur event of search div we check where the focus is and decive wheter to show bowtie-icon or not.
        const relatedTarget = event.relatedTarget || document.activeElement;
        if (this._searchBox && !this._searchBox.contains(relatedTarget as Node)) {
            this.setState({focussed: false});
        }
    }

    private onFocus = (): void => {
        this.setState({focussed: true});
    }

    private onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState(
            { value: event.target.value },
            () => {
                if (this.props.onChange) {
                    this.props.onChange(this.state.value);
                }
            });
    }

    private onSearch = (event: React.KeyboardEvent<HTMLSpanElement> | React.MouseEvent<HTMLSpanElement>) => {
        if (!this.state.value.trim()) {
            return;
        }

        if (event.type === "click" || (event as React.KeyboardEvent<HTMLSpanElement>).keyCode === KeyCode.ENTER) {
            this.props.onPerformSearch(this.state.value, event.ctrlKey && !event.altKey);
        }
    }

    private onClear = (event: React.KeyboardEvent<HTMLSpanElement> | React.MouseEvent<HTMLSpanElement>) => {
        if (event.type === "click" ||
            (event as React.KeyboardEvent<HTMLSpanElement>).keyCode === KeyCode.ENTER ||
            (event as React.KeyboardEvent<HTMLSpanElement>).keyCode === KeyCode.SPACE) {
            this.setState({value: ""}, () => this.props.onChange(this.state.value));
        }
    }
}

export const SearchAccountLink = (props: {url: string}) =>
    <div className={css("search-accounlink--container")}>
        {Search_Resources.OrLabel}
        <Link className={css("account-link")} href={props.url}>
            {Search_Resources.SearchThisAccountHyperLinkText}
            <span className={css("bowtie-icon", "bowtie-navigate-forward-circle")} />
        </Link>
    </div>;
