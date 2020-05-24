import * as React from "react";
import { CSSTransitionGroup } from "react-transition-group";

import { ScrollDependentDisplay } from "Presentation/Scripts/TFS/Components/ScrollDependentDisplay";

import { css } from "OfficeFabric/Utilities";

const AnimationTimeoutMs = 370;

export interface IResponsiveHeaderProps {
    className?: string;

    /** scrollTop threshold in pixels after which the header will appear */
    scrollThresholdPx: number;
}

/**
 * Reponsive header component that becomes visible after the page has been scrolled down a certain amount of pixels
 */
export class ResponsiveHeader extends React.Component<IResponsiveHeaderProps, {}> {
    public render() {
        return <div className={css("responsive-header", this.props.className)}>
            <ScrollDependentDisplay scrollRegions={[
                {
                    scrollTopThreshold: 0,
                    onRender: () => this._render(false)
                },
                {
                    scrollTopThreshold: this.props.scrollThresholdPx,
                    onRender: () => this._render(true)
                }
            ]} />
        </div>;
    }

    private _render(show: boolean) {
        return <CSSTransitionGroup
            component="div"
            transitionName={{
                appear: "ms-slideDownIn20",
                enter: "ms-slideDownIn20",
                leave: "ms-slideUpOut20"
            }}
            transitionAppearTimeout={AnimationTimeoutMs}
            transitionEnterTimeout={AnimationTimeoutMs}
            transitionLeaveTimeout={AnimationTimeoutMs}>
            {show && this._renderHeader()}
        </CSSTransitionGroup>;
    }

    private _renderHeader() {
        return this.props.children;
    }
}