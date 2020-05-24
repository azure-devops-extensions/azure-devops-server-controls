import * as React from 'react';

import { Spinner } from "OfficeFabric/Spinner";
import { Async } from "OfficeFabric/Utilities";
import { LinkedArtifacts_Loading } from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

const spinnerDelay = 750;

export interface ILoadingIndicatorState {
    showLoadingIndicator: boolean;
}

export class LoadingIndicatorComponent extends React.Component<{}, ILoadingIndicatorState> {
    private _timeoutId: number;
    private _async: Async;

    constructor(props: {}) {
        super(props);
        this._async = new Async();
        this.state = {
            showLoadingIndicator: false,
        };
    }

    public render(): JSX.Element {
        if (this.state.showLoadingIndicator) {
            return <Spinner label={LinkedArtifacts_Loading} />;
        }
        return null;
    }

    public componentDidMount(): void {
        this._timeoutId = this._async.setTimeout(this._showSpinner, spinnerDelay);
    }

    public componentWillUnmount(): void {
        if (this._timeoutId) {
            this._async.clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
    }

    private _showSpinner = (): void => {
        this.setState({
            showLoadingIndicator: true,
        });
    }
}
