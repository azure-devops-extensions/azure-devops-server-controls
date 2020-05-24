import * as React from "react";
import { ISearchBox, SearchBox as FabricSearchBox } from "OfficeFabric/SearchBox";
import { Async, css } from "OfficeFabric/Utilities";
import { SearchBoxClearAriaLabel } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/Trees/SearchBox";

const searchDelayMs = 500;

export interface SearchBoxProps {
    placeholder: string;
    onChangeValue(newValue: string): void;
    initialText?: string;
    className?: string;
    setFocusOnMount?: boolean;
    underlined?: boolean;
}

export class SearchBox extends React.Component<SearchBoxProps, {}> {
    private _throttledOnChangeValue: (newValue: string) => void;
    private _searchBoxRef: ISearchBox;

    constructor(props: SearchBoxProps) {
        super(props);

        this._throttledOnChangeValue = (new Async()).debounce(this._onChangeValue, searchDelayMs, { trailing: true });
    }

    public render(): JSX.Element {
        return (
            <div className={css("vc-search-box", this.props.className)}>
                <span className="fabric-search-box">
                    <FabricSearchBox
                        className={"shared-search-box"}
                        placeholder={this.props.placeholder}
                        value={this.props.initialText}
                        onChange={this._throttledOnChangeValue}
                        underlined={this.props.underlined}
                        componentRef={this._updateRef}
                        clearButtonProps={{ ariaLabel: SearchBoxClearAriaLabel }}
                    />
                </span>
            </div>
        );
    }

    public componentDidMount(): void {
        this._setFocusIfNeeded();
    }

    public focus(): void {
        if (this._searchBoxRef) {
            this._searchBoxRef.focus();
        }
    }

    private _onChangeValue = (newValue: string): void => {
        this.props.onChangeValue(newValue);
    }

    private _setFocusIfNeeded(): void {
        if (this.props.setFocusOnMount && this._searchBoxRef) {
            this._searchBoxRef.focus();
        }
    }
    private _updateRef = (searchBox: ISearchBox): void => {
        this._searchBoxRef = searchBox;
    }
}

