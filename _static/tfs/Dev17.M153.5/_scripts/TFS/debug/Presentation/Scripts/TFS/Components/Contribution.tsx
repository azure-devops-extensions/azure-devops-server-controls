import React = require("react");

import * as Contributions_Controls from "VSS/Contributions/Controls";

export interface Props<T> extends React.Props<any> {
    contribution: Contribution;
    cssClass?: string;
    initialConfig?: T;
    webContext?: WebContext;
    instanceId?: string;
    contributionHostBehavior?: Contributions_Controls.IContributionHostBehavior;
}

export class Component<T> extends React.Component<Props<T>, any> {
    private _controlPromise: IPromise<any> = null;

    public render(): JSX.Element {
        var props: any = {
            ref: (element: HTMLElement) => {
                // "ref" is a special attribute for react which is executed right after 
                // the component is mounted (if a callback specified).
                this.onRef(element);
            }
        };

        if (this.props.cssClass) {
            props.className = this.props.cssClass;
        }

        return React.createElement("div", props, null);
    }

    public shouldComponentUpdate(nextProps: Props<T>, nextState: any): boolean {
        return this.props.contribution !== nextProps.contribution
            || this.props.cssClass !== nextProps.cssClass
            || this.props.webContext !== nextProps.webContext
            || this.props.instanceId !== nextProps.instanceId;
    }

    public componentWillUnmount() {
        // dispose contributed control when navigating away from the hub
        // to avoid memory leaks
        this.tryDisposeControl();
    }

    protected onRef(element: HTMLElement): void {
        if (element) {
            this.tryDisposeControl();

            let contributionHostBehavior: Contributions_Controls.IContributionHostBehavior = this.props.contributionHostBehavior || {
                showLoadingIndicator: false,
                showErrorIndicator: false,
                slowWarningDurationMs: 0
            };

            this._controlPromise = Contributions_Controls.createContributedControl<any>(
                $(element),
                this.props.contribution,
                this.props.initialConfig,
                this.props.webContext,
                this.props.instanceId,
                contributionHostBehavior);
        }
    }

    protected tryDisposeControl(): void {
        if (this._controlPromise) {
            this._controlPromise.then((disposable: any) => {
                if (disposable && $.isFunction(disposable.dispose)) {
                    disposable.dispose();
                }
            });
        }
    }
}