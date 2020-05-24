/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { BreadcrumbLink } from "Build/Scripts/Components/BreadcrumbLink";
import { DefinitionNameEditor } from "Build/Scripts/Components/DefinitionNameEditor";
import { DefinitionStatus } from "Build/Scripts/Components/DefinitionStatus";
import { IBreadcrumb, FolderBreadcrumb, BreadcrumbSeparator, getBreadcrumbs } from "Build/Scripts/Components/FolderBreadcrumb";
import { IDefinitionSearchPickerOption, DefinitionSearchPicker } from "Build/Scripts/Components/DefinitionSearchPicker";
import { TitleBar as TitleBarSection } from "Build/Scripts/Components/TitleBar";
import { UserActions } from "Build/Scripts/Constants";
import { QueryResult } from "Build/Scripts/QueryResult";

import { BuildReference, BuildDefinitionReference } from "TFS/Build/Contracts";

import { ISearchBoxControlOptions } from "VSS/Controls/Search";
import { getService as getEventService } from "VSS/Events/Services";

import "VSS/LoaderPlugins/Css!Build/Scenarios/Definition/Components/TitleBar";

interface HeadingProps {
    title: string;
    linkTitle: boolean;
    onBreadcrumbClicked: (e: React.MouseEvent<HTMLElement>, path: string) => void;
    getBreadcrumbLink: (path: string) => string;
}

class Heading extends React.Component<HeadingProps, any> {
    public render(): JSX.Element {
        let headingElement: JSX.Element = null;
        if (!this.props.linkTitle) {
            return <div className="title-heading">
                <h1 className="ms-font-l">{this.props.title}</h1>
            </div>;
        }
        else {
            return <div className="title-heading">
                <BreadcrumbLink path={"\\"} title={this.props.title} onBreadcrumbClicked={this.props.onBreadcrumbClicked} getBreadcrumbLink={this.props.getBreadcrumbLink} />
            </div>;
        }
    }

    public shouldComponentUpdate(nextProps: HeadingProps): boolean {
        return this.props.title !== nextProps.title
            || this.props.linkTitle !== nextProps.linkTitle
            || this.props.onBreadcrumbClicked !== nextProps.onBreadcrumbClicked
            || this.props.getBreadcrumbLink !== nextProps.getBreadcrumbLink;
    }
}

interface DefinitionNameProps {
    definitionId: number;
    definitionName: string;
    readonly: boolean;
}

const DefinitionName = (props: DefinitionNameProps): JSX.Element => {
    let definitionNameElement: JSX.Element = null;
    if (props.definitionId && props.definitionName) {
        definitionNameElement = <DefinitionNameEditor id={props.definitionId} name={props.definitionName} readonly={props.readonly} />;
    }
    else if (props.definitionName) {
        definitionNameElement = <span>{props.definitionName}</span>;
    }

    return <div className="definition-name">
        <BreadcrumbSeparator />
        {definitionNameElement}
    </div>;
};

export interface TitleBarProps {
    title: string;
    alwaysLinkTitle?: boolean;
    definitionId: number;
    definitionName: string;
    path: string;
    getBreadcrumbLink: (path: string) => string;
    readonly?: boolean;
    history?: QueryResult<BuildReference[]>;
    definitionPickerOptionChanged?: (option: IDefinitionSearchPickerOption, index: number) => void;
}

export class TitleBar extends React.Component<TitleBarProps, any> {
    public render(): JSX.Element {
        let breadcrumbs = getBreadcrumbs(this.props.path);
        let linkTitle = !!this.props.definitionName || breadcrumbs.length > 0;

        let definitionStatusElement: JSX.Element = null;
        if (this.props.history) {
            definitionStatusElement = <div className="definition-status">
                <DefinitionStatus history={this.props.history} />
            </div>;
        }

        return <TitleBarSection>
            <Heading title={this.props.title} linkTitle={linkTitle} onBreadcrumbClicked={this._onBreadcrumbClicked} getBreadcrumbLink={this.props.getBreadcrumbLink} />
            <FolderBreadcrumb className="truncated" getBreadcrumbLink={this.props.getBreadcrumbLink} onBreadcrumbClicked={this._onBreadcrumbClicked} items={breadcrumbs} shouldLinkCurrentFolder={!!this.props.definitionName} />
            <BreadcrumbSeparator className="picker-separator" />
            <DefinitionSearchPicker selectedDefinitionId={this.props.definitionId} definitionPickerOptionChanged={this.props.definitionPickerOptionChanged} />
            {definitionStatusElement}
            <div className="actions">
                {this.props.children}
            </div>
        </TitleBarSection>;
    }

    private _onBreadcrumbClicked = (e: React.MouseEvent<HTMLElement>, path: string): void => {
        e.preventDefault();
        getEventService().fire(UserActions.FolderClicked, this, path);
    };
}
