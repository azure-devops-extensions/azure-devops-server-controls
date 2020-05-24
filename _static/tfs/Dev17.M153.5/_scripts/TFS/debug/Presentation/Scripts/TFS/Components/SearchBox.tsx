import * as React from "react";

import { TooltipHost } from "VSSUI/Tooltip";
import { IBaseProps } from "OfficeFabric/Utilities";

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { IProps as ITfsReactProps } from "Presentation/Scripts/TFS/TFS.React";

import { logInfo } from "VSS/Diag";
import { announce } from "VSS/Utils/Accessibility";
import { arrayEquals } from "VSS/Utils/Array";
import { delay, DelayedFunction } from "VSS/Utils/Core";
import { equals } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Presentation/Components/SearchBox";

export interface Props extends IBaseProps {
    className?: string;
    loading?: boolean;
    errorMessage?: string;
    placeholderText?: string;
    title?: string;
    searchResultsAvailableMessage?: string;
    initialValue?: string;

    onChanged?: (text: string) => void;
    onSearch?: (text: string) => void;
    onClear?: () => void;
    onItemClick?: (index: number) => void;
    onItemKeyDown?: (index: number) => void;
}

export interface State {
    value: string;
    isHover: boolean;
    selectedIndex: number;
}

export class SearchBox extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            value: "",
            isHover: false,
            selectedIndex: -1
        };
    }

    public render(): JSX.Element {
        let className = "tfs-react-search-box bowtie"
        if (this.props.className) {
            className += " " + this.props.className;
        }

        let removeIconClass = "remove-search-icon bowtie-icon bowtie-edit-remove";
        let actionIconClass = "search-icon bowtie-icon ";
        let searchResultsElement: JSX.Element = null;
        let hasItems = React.Children.count(this.props.children) > 0;

        if (this.state.value) {
            removeIconClass += " visible";
        }

        if (this.props.loading) {
            if (this.state.isHover) {
                actionIconClass += "bowtie-stop";
            }
            else {
                actionIconClass += "icon status-progress";
            }
        }
        else if (hasItems) {
            actionIconClass += "bowtie-view-list";
        }
        else {
            actionIconClass += "bowtie-search";
        }

        if (hasItems) {
            searchResultsElement = <div className="search-results">
                <ul tabIndex={1} className="items" role="listbox" id="search-results-list">
                    {
                        React.Children.map(this.props.children, (element, index) => {
                            let className = "item";
                            let id = "";
                            let selected = false;
                            if (index === this.state.selectedIndex) {
                                className += " selected";
                                id = "selected_option";
                                selected = true;
                            }

                            return <li key={index} aria-selected={selected} className={className} id={id} role="option" onClick={(e) => this._onSearchItemClick(index)}>
                                {element}
                            </li>;
                        })
                    }
                </ul>
            </div>;
        }

        return <div className={className} role="search" aria-label={this.props.title}>
            <TooltipHost
                content={this.props.title}>
                <input className="search-text" type="text" id="searchbox" aria-describedby="input-error-tip" aria-invalid={!!this.props.errorMessage}
                    aria-label={this.props.title} value={this.state.value} placeholder={this.props.placeholderText} onKeyDown={this._onKeyDown} onChange={this._onChange}
                    { ...(searchResultsElement ? { "aria-owns": "search-results-list", "aria-activedescendant": "selected_option" } : {}) } />
            </TooltipHost>
            <div id="input-error-tip" className={"input-error-tip " + (this.props.errorMessage ? "" : "invisible")} aria-live="assertive">
                <span className="text">{this.props.errorMessage}</span>
            </div>
            <span className={removeIconClass} title={PresentationResources.ClearTextTooltip} onClick={(e) => this._clearText(e)}></span>
            <span className={actionIconClass} onClick={this._onSearchBoxActionClick} onMouseOver={this._onMouseOver} onMouseOut={this._onMouseOut}></span>
            {searchResultsElement}
        </div>;
    }

    public componentDidMount() {
        if (this.props.initialValue) {
            this._onChanged(this.props.initialValue);
        }
    }

    public componentWillReceiveProps(nextProps: Props) {
        if (this.props.initialValue != nextProps.initialValue) {
            this._onChanged(nextProps.initialValue);
        }
    }

    public componentWillUpdate(nextProps: Props, nextState: State) {
        // announce if message didn't change
        if (!equals(this.props.searchResultsAvailableMessage, nextProps.searchResultsAvailableMessage, true)) {
            announce(nextProps.searchResultsAvailableMessage, true);
        }
    }

    private _search(): void {
        if (this.props.loading) {
            // if this is already busy, return
            return;
        }

        if (this.props.onSearch) {
            this.props.onSearch(this.state.value);
        }
    }

    private _onChange = (e: React.FormEvent<HTMLInputElement>): void => {
        let value: string = (e.target as any).value;
        this._onChanged(value);
    }

    private _onChanged(value: string) {
        value = value || "";
        this.setState({
            value: value,
            isHover: this.state.isHover,
            selectedIndex: this.state.selectedIndex
        });

        if (this.props.onChanged) {
            this.props.onChanged(value);
        }
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === "Enter" || event.key === "Space") {
            if (this.state.selectedIndex >= 0) {
                this._onSearchItemClick(this.state.selectedIndex);
            }
            else {
                this._search();
            }
        }

        if (event.key === "Escape") {
            this.setState({
                value: this.state.value,
                isHover: this.state.isHover,
                selectedIndex: -1
            });

            // clear search results
            if (this.props.onClear) {
                this.props.onClear();
            }
        }

        // navigate through result list if any
        if (event.key === "ArrowDown") {
            if (React.Children.count(this.props.children) > 0) {
                this._navigateThroughSearchResults(true);
            }
        }

        if (event.key === "ArrowUp") {
            if (React.Children.count(this.props.children) > 0) {
                this._navigateThroughSearchResults(false);
            }
        }
    };

    private _navigateThroughSearchResults(isDirectionDown: boolean) {
        let nextIndex = getNextSelectedIndex(isDirectionDown, this.state.selectedIndex, React.Children.count(this.props.children));

        if (nextIndex >= 0) {
            if (this.props.onItemKeyDown) {
                this.props.onItemKeyDown(nextIndex);
            }

            this.setState({
                value: this.state.value,
                isHover: this.state.isHover,
                selectedIndex: nextIndex
            });
        }
    }

    private _onMouseOver = (e: React.MouseEvent<HTMLElement>): void => {
        // it's relevant only if search is in busy state
        if (this.props.loading) {
            this.setState({
                value: this.state.value,
                isHover: true,
                selectedIndex: this.state.selectedIndex
            });
        }
    };

    private _onMouseOut = (e: React.MouseEvent<HTMLElement>): void => {
        // it's relevant only if hover is already set
        if (this.state.isHover) {
            this.setState({
                value: this.state.value,
                isHover: false,
                selectedIndex: this.state.selectedIndex
            });
        }
    };

    private _onSearchBoxActionClick = (e: React.MouseEvent<HTMLElement>): void => {
        this._search();
    };

    protected _onSearchItemClick(index: number): void {
        if (this.props.onItemClick) {
            this.props.onItemClick(index);
        }
    }

    private _clearText(e: React.MouseEvent<HTMLElement>) {
        this.setState({
            value: "",
            isHover: this.state.isHover,
            selectedIndex: -1
        });

        if (this.props.onClear) {
            this.props.onClear();
        }
    }
}

export function getNextSelectedIndex(isDirectionDown: boolean, currentIndex: number, length: number): number {
    if (length === 0) {
        return -1;
    }

    if (currentIndex === null || currentIndex === undefined || currentIndex < 0 || currentIndex >= length) {
        logInfo("Current index is not bounded, autocorrecting...");
        return 0;
    }

    let newIndex = isDirectionDown ? (currentIndex + 1) % length : currentIndex - 1;
    if (newIndex < 0) {
        newIndex = length - 1;
    }

    return newIndex;
}
