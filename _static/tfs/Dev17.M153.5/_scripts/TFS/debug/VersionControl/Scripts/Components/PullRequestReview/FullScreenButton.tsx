import * as React from "react";

// contracts
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Navigation from "VSS/Controls/Navigation";

export interface IFullScreenButtonProps extends React.Props<void> {
    fullScreenCallback?(isFullScreen: boolean, hasChanged: boolean): void;
}

export interface IFullScreenButtonState {
    isFullScreen: boolean;
}

/**
 * Rendering a fullscreen button using legacy support for key controls, etc.
 */
export class FullScreenButton extends React.PureComponent<IFullScreenButtonProps, IFullScreenButtonState> {
    // create a single event handler we can attach/detach
    private _handler: IEventHandler = () => {
        this._afterFullScreen();
    }

    constructor(props: IFullScreenButtonProps) {
        super(props);

        this.state = {
            isFullScreen: Navigation.FullScreenHelper.getFullScreen() || false
        };
    }

    public render(): JSX.Element {
        return <button
            aria-label={this._fullScreenLabel()}
            title={this._fullScreenLabel()}
            className="fullscreen clear-button link-button"
            onClick={this._toggleFullScreen} >
            <i className={this._fullScreenIcon()} />
        </button>;
    }

    private _fullScreenLabel(): string {
        if (this.state.isFullScreen) {
            return VCResources.ExitFullScreenMode;
        } else {
            return VCResources.EnterFullScreenModeTooltip;
        }
    }

    public componentDidMount(): void {
        // attach full screen event handler
        if (this._handler) {
            Navigation.FullScreenHelper.attachFullScreenUrlUpdateEvent(this._handler);
        }
    }

    public componentWillUnmount(): void {
        // detach full screen event handler
        if (this._handler) {
            Navigation.FullScreenHelper.detachFullScreenUrlUpdateEvent(this._handler);
        }
    }

    public componentDidUpdate(prevProps: IFullScreenButtonProps, prevState: IFullScreenButtonState): void {
        // Toggling full screen may require a redraw/layout of controls such as the virtualized Change Explorer grid and the
        // Monaco editor/diff that typically update on a window resize.  So, we trigger the window.resize event.
        if (prevState.isFullScreen !== this.state.isFullScreen) {
            $(window).trigger("resize");
        }
    }

    private _fullScreenIcon(): string {
        if (this.state.isFullScreen) {
            return "bowtie-icon bowtie-view-full-screen-exit";
        } else {
            return "bowtie-icon bowtie-view-full-screen";
        }
    }

    private _toggleFullScreen = (): void => {
        // call full screen helper to toggle full screen
        Navigation.FullScreenHelper.setFullScreen(!this.state.isFullScreen, true, true, false);
    }

    private _afterFullScreen(): void {
        // figure out what state we are in
        const isFullScreen: boolean = Navigation.FullScreenHelper.getFullScreen();
        const hasChanged: boolean = isFullScreen !== this.state.isFullScreen;

        // call the specified callback
        if (this.props.fullScreenCallback) {
            this.props.fullScreenCallback(isFullScreen, hasChanged);
        }

        if (hasChanged) {
            // reset state
            this.setState({ isFullScreen });
        }
    }
}
