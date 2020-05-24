import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { KeyCodes } from "OfficeFabric/Utilities";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { Icon } from "OfficeFabric/Icon";
import {
    ISearchFilter,
    ISearchFilterGroup,
    ISearchHelpComponentProps,
    SearchFilterComponentProps,
    SearchFilterGroupComponentProps
} from "./SearchHelp.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/SearchHelp/SearchHelp";

/**
 * This implements a search help UI that interacts with the ISearchInputComponent.
 * It allows the caller to show custom help.
 */
export class SearchHelpComponent extends React.Component<ISearchHelpComponentProps, {}> {
    private helpElement: HTMLDivElement;

    public render(): JSX.Element {
        return (
            <div
                ref={helpElement => { this.helpElement = helpElement }}
                className="search-help"
                onMouseDown={this.onMouseDown}
                onKeyDown={this.onKeyDown}>
                {
                    this.props
                        .filterGroups.map((filterGroup, index) => {
                            return <SearchFilterGroupComponent
                                key={index}
                                filterGroup={filterGroup}
                                searchInput={this.props.searchInput}
                                onItemActivated={this.props.onItemActivated}
                                onRenderFilterText={this.props.onRenderFilterText}
                                filterText={this.props.filterText} />
                        })
                }
                {
                    this.props.helpLink ? (
                        <div className="search-help-footer">
                            <FormatComponent format={Resources.SearchHelpLinkFormat}>
                                <a className="search-help-link" href={this.props.helpLink} tabIndex={-1} target="_blank">{Resources.SearchHelpPage}</a>
                            </FormatComponent>
                        </div>
                    ) : null
                }
            </div>
        );
    }

    public focus(): void {
        const firstElement = this.helpElement !== null ? (this.helpElement.querySelector("[tabIndex='-1']") as HTMLElement | null) : null;
        if (firstElement) {
            firstElement.focus();
        }
    }

    public componentDidMount(): void {
        const { componentRef } = this.props;
        if (componentRef) {
            componentRef(this);
        }
    }

    private onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.keyCode === KeyCodes.up || event.keyCode === KeyCodes.down ) {
            if (this.helpElement !== null) {
                const focusedElement = document.activeElement;
                const allElements = this.helpElement.querySelectorAll("[tabIndex='-1']");
                let currentIndex = 0;

                // Figure out which element is currently selected.
                for (currentIndex = 0; currentIndex < allElements.length; currentIndex++) {
                    if (focusedElement === allElements[currentIndex]) {
                        break;
                    }
                }

                // If some undetermined element has focus we will start from the beginnging.
                if (currentIndex === allElements.length) {
                    currentIndex = -1;
                }

                // Compute the element that should retrieve focus.
                if (event.keyCode === KeyCodes.up) {
                    if (--currentIndex < 0) {
                        currentIndex = allElements.length - 1;
                    }
                }
                else {
                    if (++currentIndex === allElements.length) {
                        currentIndex = 0;
                    }
                }

                // Set focus to the next element in the sequence.
                if (currentIndex >= 0 && currentIndex < allElements.length) {
                    (allElements[currentIndex] as HTMLElement).focus();
                }

                // We dont want any default behavior, like scrolling the cointainer.
                event.preventDefault();
            }
        }
    }
}


interface SearchFilterGroupComponentState {
    expanded: boolean;

    visibleCount: number;
}

class SearchFilterGroupComponent extends React.Component<SearchFilterGroupComponentProps, SearchFilterGroupComponentState> {
    constructor(props: SearchFilterGroupComponentProps) {
        super(props);
        this.state = { expanded: false, visibleCount: 10 };
    }

    public render(): JSX.Element {
        const { caption, example, filters, footer, singleLine } = this.props.filterGroup;
        return (
            <div>
                <div className="group-header">
                    {
                        caption ? (
                            <span className="search-filter-group-caption">{caption}</span>
                        ) : null
                    }
                    {
                        example ? (
                            <span className="search-filter-group-example">{example}</span>
                        ) : null
                    }
                </div>
                <ul className={("search-filter-group-list " + (singleLine ? "compact" : "detailed"))}>
                    {
                        filters.map((filter, index) => {
                            if (index >= this.state.visibleCount) {
                                return null;
                            }

                            return <SearchFilterComponent
                                key={index}
                                filter={filter}
                                searchInput={this.props.searchInput}
                                onItemActivated={this.props.onItemActivated}
                                onRenderFilterText={this.props.onRenderFilterText}
                                filterText={this.props.filterText} />;
                        })
                    }
                    {
                        filters.length >= 10 ? (
                            <li className="search-filter-group-item search-filter-group-expander" onClick={this.toggleExpander} onKeyDown={this.onKeyDown} data-is-focusable={true} tabIndex={-1}>
                                <Icon className="search-filter-group-expander-icon" iconName={(this.state.expanded ? "ChevronUpSmall" : "ChevronDownSmall")} />
                                <span>{this.state.expanded ? Resources.ShowLessLabel : Resources.ShowMoreLabel}</span>
                            </li>
                        ) : null
                    }
                    {
                        footer ? (
                            <li className="search-filter-group-item search-filter-group-footer">{footer}</li>
                        ) : null
                    }
                    {
                        filters.length <= 0 ? (
                            <li className="help-no-suggestion">{Resources.HelpNoSuggestions}</li>
                        ) : null
                    }
                </ul>
            </div>
        );
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLLIElement>) => {
        if (event.which === 13 /* KeyCode.Return */) {
            this.toggleExpander();
        }
    }

    private toggleExpander = () => {
        if (this.state.expanded) {
            this.setState({ expanded: false, visibleCount: 10 });
        }
        else {
            this.setState({ expanded: true, visibleCount: Number.MAX_SAFE_INTEGER });
        }
    }
}

class SearchFilterComponent extends React.Component<SearchFilterComponentProps, {}> {
    public render(): JSX.Element {
        const { onRenderFilterText, filter, filterText } = this.props;
        return (
            <li className="search-filter-group-item" onClick={this.onActivate} onKeyDown={this.onKeyDown} data-is-focusable={true} tabIndex={-1}>
                <div className="search-filter-group-item-text">
                    {
                        onRenderFilterText ? onRenderFilterText(filter, filterText) : filter.text
                    }
                </div>
                {
                    filter.hint ? (
                        <div className="search-filter-group-item-hint">
                            {filter.hint}
                        </div>
                    ) : null
                }
            </li>
        );
    }

    private onActivate = () => {
        const { searchInput, filter, onItemActivated } = this.props;
        if (searchInput) {
            const filterString = filter.shortcutText || filter.text;
            const suggestedString =
                filter.getSuggestedText
                    ? filter.getSuggestedText(searchInput.getText(), filterString)
                    : filterString;
            searchInput.updateText(suggestedString, filter.replaceText);
        }

        if (onItemActivated) {
            onItemActivated(filter);
        }
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLLIElement>) => {
        if (event.which === 13 /* KeyCode.Return */) {
            this.onActivate();
        }
    }
}
