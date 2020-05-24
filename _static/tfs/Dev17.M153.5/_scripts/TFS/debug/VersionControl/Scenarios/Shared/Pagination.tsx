import * as React from "react";
import { DefaultButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label";

import "VSS/LoaderPlugins/Css!VersionControl/Pagination";

export interface IPaginationProps extends React.Props<void> {
    showMoreButtonTitle: string;
    showMoreButtonTextWhenEnabled: string;
    showMoreButtonTextWhenDisabled: string;
    showMoreMessageText: string;
    disabled: boolean;
    hasMoreResults: boolean;
    onShowMoreClick(event: any): void;
}

/**
 * Pagination control that shows up if not all data/content is loaded yet.
 */
export class Pagination extends React.Component<IPaginationProps, {}> {
    public render(): JSX.Element {
        if (!this.props.hasMoreResults) {
            return null;
        }

        const showMoreButtonId: string = "vc-pagination-show-more-button";
        return (
            <div className="vc-pagination">
                <Label
                    className={"show-more-text"}
                    htmlFor={showMoreButtonId}>
                    {this.props.showMoreMessageText}
                </Label>
                <DefaultButton
                    iconProps={{iconName: "Refresh"}}
                    disabled={this.props.disabled}
                    text={this._buttonMessage()}
                    className={"show-more-button"}
                    id={showMoreButtonId}
                    ariaLabel={this.props.showMoreButtonTitle}
                    onClick={this.props.onShowMoreClick} />
            </div>
        );
    }

    private _buttonMessage(): string {
        return this.props.disabled
            ? this.props.showMoreButtonTextWhenDisabled
            : this.props.showMoreButtonTextWhenEnabled;
    }
}