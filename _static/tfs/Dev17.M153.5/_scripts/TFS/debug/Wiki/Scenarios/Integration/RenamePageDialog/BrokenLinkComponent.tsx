import * as React from "react";

import {
    DetailsRow,
    IColumn,
    IDetailsRowProps,
    SelectionMode,
} from "OfficeFabric/DetailsList";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";
import { VssDetailsList } from "VSSUI/Components/VssDetailsList/VssDetailsList";

import { IInternalLinkedArtifactDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { OperationStatus } from "Wiki/Scripts/CommonInterfaces";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

export interface BrokenLinkItem {
    link: string;
    updateState: OperationStatus;
    isShowMoreLinkItem?: boolean;
    isSpinnerItem?: boolean;
}

export interface BrokenWorkItemLink extends BrokenLinkItem {
    workItem: IInternalLinkedArtifactDisplayData;
}

export interface BrokenWikiPageLink extends BrokenLinkItem {
    pagePath: string;
}

export interface BrokenLinkComponentProps {
    items: BrokenLinkItem[];
    columns: IColumn[];
    isLoading: boolean;
    spinnerLoadingText: string;
    onShowMoreLinkClick?(): void;
}

export class BrokenLinkComponent extends React.PureComponent<BrokenLinkComponentProps, {}>{
    public render(): JSX.Element {
        let content: JSX.Element;

        if (this.props.isLoading) {
            content =
                <Spinner
                    label={this.props.spinnerLoadingText}
                    key={"brokeLinkSpinner"}
                    className={"broken-link-spinner"}
                />;
        } else if (this.props.items && this.props.items.length > 0) {
            content =
                <VssDetailsList
                    isHeaderVisible={true}
                    selectionMode={SelectionMode.none}
                    columns={this.props.columns}
                    items={this.props.items}
                    onRenderRow={this._onRenderRow}
                    setKey={"broken-links"}
                />;
        } else {
            content =
                <label className={"broken-link-zero-data-message"}>
                    {WikiResources.BrokenLinkZeroDataMessage}
                </label>;
        }

        return (
            <div className={"broken-link-component-container"}>
                {content}
            </div>
        );
    }

    @autobind
    private _onRenderRow(props: IDetailsRowProps): JSX.Element {
        const item: BrokenLinkItem = props.item;

        if (item.isSpinnerItem) {
            return (
                <Spinner key={"Spinner"}
                    className={"broken-link-component-spinner"}
                    label={WikiResources.LoadMoreLabel}
                />)
                ;
        } else if (item.isShowMoreLinkItem) {
            return (
                <Link
                    className="broken-link-component-show-more-link"
                    onClick={this.props.onShowMoreLinkClick}
                    key="ShowMore">
                    {WikiResources.ShowMoreText}
                </Link>
            );
        } else {
            return (<DetailsRow {...props} />);
        }
    }
}
