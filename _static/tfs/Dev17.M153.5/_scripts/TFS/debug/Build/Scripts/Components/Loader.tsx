/// <reference types="react-dom" />

import * as React from "react";

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import {IState, IProps} from "Presentation/Scripts/TFS/TFS.React";

import "VSS/LoaderPlugins/Css!Build/Loader";

export interface Props extends IProps {
    message?: string;
}

export class LoadingComponent extends React.Component<Props, IState> {
    public render(): JSX.Element {
        let message = this.props.message || BuildResources.Loading;

        return <span className={ loaderClass }>
            <span><span className="icon status-progress"></span> <span className="content">{ message }</span></span>
        </span>;
    }
}

export class ComboControlLoadingComponent extends React.Component<Props, IState> {
    public render(): JSX.Element {
        let message = this.props.message || BuildResources.Loading;
        let loader: JSX.Element = null;

        return <span className={ loaderClass + " mini" }>
            <div className="loader-combo-container">
                <div className="loader-combo-control">
                    <div className="combo input-text-box no-edit list drop">
                        <div className="wrap">
                            <input type="text" autoComplete="off" readOnly placeholder={ message } />
                        </div>
                        <div className="drop bowtie-chevron-down-light bowtie-icon"></div>
                    </div>
                </div>
            </div>
        </span>;
    }
}

export class RepositoryPickerLoadingComponent extends React.Component<Props, IState> {
    public render(): JSX.Element {
        let message = this.props.message || BuildResources.Loading;

        return <span className={ loaderClass + " mini" }>
            <div className="filtered-list-dropdown-menu build-repository-picker-control vc-git-selector-menu">
                <span className="icon bowtie-icon bowtie-square"></span>
                <span className="selected-item-text">{ message }</span>
                <span className="drop-icon bowtie-icon bowtie-chevron-down"></span>
            </div>
        </span>;
    }
}

var loaderClass = "build-data-loading-container";
