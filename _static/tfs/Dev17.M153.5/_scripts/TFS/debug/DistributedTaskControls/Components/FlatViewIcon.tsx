/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { Icon, IIconProps } from "OfficeFabric/Icon";
import { css, autobind } from "OfficeFabric/Utilities";

import { announce } from "VSS/Utils/Accessibility";
import * as UtilsString from "VSS/Utils/String";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FlatViewIcon";

export interface IFlatViewIconProps extends IIconProps {
    rowSelected: boolean;
    ariaLiveRegionMessage: string;
}

export interface IFlatViewIconState extends Base.IState {
    isSelected: boolean;
}

export class FlatViewIcon extends Base.Component<IFlatViewIconProps, IFlatViewIconState> {

    public componentWillMount() {
        this._flatViewIconDescribedById = UtilsString.generateUID();
        this._announceLiveRegion(this.props.ariaLiveRegionMessage);
    }

    public componentWillReceiveProps(nextProps: IFlatViewIconProps) {
        if (UtilsString.defaultComparer(nextProps.ariaLiveRegionMessage, this.props.ariaLiveRegionMessage) !== 0) {
            this._announceLiveRegion(nextProps.ariaLiveRegionMessage);
        }
    }

    public render(): JSX.Element {
        let className: string = "flat-view-icon";

        return (
            <div
                ref={this._resolveRef("_flatViewIconContainer")}
                data-is-focusable={true}
                role="presentation"
                className={css("flat-view-icon-container", this.props.className)}
                aria-describedby={this._getDescriptionUniqueId()}
                onFocus={this._onFocus}
                onBlur={this._onBlur} >

                <div className="hidden" id={this._getDescriptionUniqueId()}>
                    {this.props.ariaLiveRegionMessage}
                </div>

                <Icon
                    className={className}
                    {...this.props} />
            </div>
        );
    }

    @autobind
    private _onFocus(): void {
        this.setState({
            isSelected: true
        } as IFlatViewIconState);
    }

    @autobind
    private _onBlur(ev: React.FocusEvent<HTMLDivElement>): void {
        if (!this._flatViewIconContainer.contains(ev.relatedTarget as HTMLElement || document.activeElement)) {
            this.setState({
                isSelected: false
            } as IFlatViewIconState);
        }
    }

    private _announceLiveRegion(ariaLiveRegionMessage: string, assertive: boolean = true) {
        if (ariaLiveRegionMessage) {
            announce(ariaLiveRegionMessage, assertive);
        }
    }

    private _getDescriptionUniqueId() {
        return this._flatViewIconDescribedById;
    }

    private _flatViewIconDescribedById: string;
    private _flatViewIconContainer: HTMLDivElement;
}