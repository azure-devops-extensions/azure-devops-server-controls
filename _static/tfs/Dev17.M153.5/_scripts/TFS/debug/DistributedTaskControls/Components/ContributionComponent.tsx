
import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { LoadableComponent } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponent";
import { LoadableComponentActionsCreator } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsCreator";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { createExtensionHost, IContributionHostBehavior } from "VSS/Contributions/Controls";

export interface IContributionComponentProps extends Base.IProps {
    contribution: Contribution | string;
    cssClass?: string;
    initialOptions: any;
    instanceId?: string;
    webContext?: WebContext;
    contributionHostBehavior?: IContributionHostBehavior;
    maxHeight?: number;
    hideLoading?: boolean;
}

export class ContributionComponent extends Base.Component<IContributionComponentProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className={this.props.cssClass} ref={(element) => { this._onRef(element); }}>
                {!this.props.hideLoading && <LoadableComponent
                    instanceId={this.props.instanceId}
                    label={Resources.Loading} />
                }
            </div>
        );
    }

    public componentWillUnmount() {
        this._tryDisposeControl();
    }

    public shouldComponentUpdate(nextProps: IContributionComponentProps): boolean {
        return this.props.contribution !== nextProps.contribution
            || this.props.cssClass !== nextProps.cssClass
            || this.props.webContext !== nextProps.webContext
            || this.props.instanceId !== nextProps.instanceId
            || this.props.initialOptions !== nextProps.initialOptions;
    }

    private _onRef(element: HTMLElement): void {
        if (element) {
            this._tryDisposeControl();

            this._element = element;

            let contributionHostBehavior: IContributionHostBehavior = this.props.contributionHostBehavior || {
                showLoadingIndicator: false,
                showErrorIndicator: false,
                slowWarningDurationMs: 0
            };

            if ((this.props.contribution as Contribution).properties) {
                let contribution: Contribution = this.props.contribution as Contribution;
                if (contribution.properties["height"]) {
                    $(this._element).height(contribution.properties["height"]);
                }

                if (this.props.maxHeight) {
                    $(this._element).css("max-height", this.props.maxHeight);
                }

                if (contribution.properties["width"]) {
                    $(this._element).width(contribution.properties["width"]);
                }
            }

            this._controlPromise = createExtensionHost($(this._element),
                this.props.contribution,
                this.props.initialOptions,
                this.props.webContext,
                null,
                null,
                "uri",
                false,
                contributionHostBehavior);

            if (!this.props.hideLoading) {
                this._controlPromise.then(() => {
                    this._hideLoading();
                }, (error: any) => {
                    this._hideLoading();
                });
            }
        }
    }

    private _tryDisposeControl(): void {
        if (this._controlPromise) {
            this._controlPromise.then((disposable: any) => {
                if (disposable && $.isFunction(disposable.dispose)) {
                    disposable.dispose();
                }
            });
        }
    }

    private _hideLoading(): void {
        let loadableComponentActionsCreator = ActionCreatorManager.GetActionCreator<LoadableComponentActionsCreator>(LoadableComponentActionsCreator, this.props.instanceId);
        loadableComponentActionsCreator.hideLoadingExperience();
    }

    private _controlPromise: IPromise<any> = null;
    private _element: HTMLElement;
}
