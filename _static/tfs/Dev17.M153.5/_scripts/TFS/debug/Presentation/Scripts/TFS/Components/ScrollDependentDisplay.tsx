import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";
import { getWindowScrollTop } from "Presentation/Scripts/TFS/TFS.Core.Utils";

export interface IScrollDependentDisplayProps {
    scrollRegions: IScrollRegion[];
}

export interface IScrollDependentDisplayState {
    activeScrollRegion: IScrollRegion | null;
}

export interface IScrollRegion {
    /** scrollTop threshold, if the page is scrolled below this, the region becomes active (if not other regions matches instead) */
    scrollTopThreshold: number;

    /** Content to render when region is active */
    onRender: () => JSX.Element;
}

/**
 * Component to display different content depending on the current scroll position of the page
 */
export class ScrollDependentDisplay extends React.Component<IScrollDependentDisplayProps, IScrollDependentDisplayState> {
    private _sortedRegions: IScrollRegion[];

    constructor(props: IScrollDependentDisplayProps, context?: {}) {
        super(props, context);

        this._sortRegions(props);

        this.state = {
            activeScrollRegion: this._determineActiveRegion(0)
        };
    }

    public componentDidMount() {
        window.addEventListener("scroll", this._onScroll);
    }

    public componentWillUnmount() {
        window.removeEventListener("scroll", this._onScroll);
    }

    public componentWillReceiveProps(newProps: IScrollDependentDisplayProps) {
        if (newProps) {
            this._sortRegions(newProps);
        }
    }

    public render(): JSX.Element {
        const { activeScrollRegion } = this.state;

        if (activeScrollRegion) {
            return activeScrollRegion.onRender();
        }

        return null;
    }

    @autobind
    private _onScroll() {
        const scrollTop = getWindowScrollTop();
        const activeRegion = this._determineActiveRegion(scrollTop)
        if (activeRegion !== this.state.activeScrollRegion) {
            this.setState({
                activeScrollRegion: activeRegion
            });
        }
    }

    private _determineActiveRegion(scrollTop: number): IScrollRegion {
        let activeRegion: IScrollRegion = null;

        for (let scrollRegion of this._sortedRegions) {
            if (scrollTop >= scrollRegion.scrollTopThreshold) {
                activeRegion = scrollRegion;
            }
        }

        return activeRegion;
    }

    private _sortRegions(props: IScrollDependentDisplayProps) {
        this._sortedRegions = this.props.scrollRegions.slice(0).sort((a, b) => a.scrollTopThreshold - b.scrollTopThreshold);
    }
}
