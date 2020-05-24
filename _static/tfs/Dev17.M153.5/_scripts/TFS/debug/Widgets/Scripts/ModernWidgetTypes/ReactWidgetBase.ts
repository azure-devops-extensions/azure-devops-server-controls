import Dashboard_Shared_Contracts = require('Dashboards/Scripts/Contracts');
import * as Q from 'q';
import * as React from 'react';
import ReactDOM = require('react-dom');
import * as WidgetContracts from 'TFS/Dashboards/WidgetContracts';
import { WidgetStatusHelper } from 'TFS/Dashboards/WidgetHelpers';
import { ModernWidgetBase } from 'Widgets/Scripts/ModernWidgetTypes/ModernWidgetBase';
import { ChangeFlags, WidgetConfigChange } from 'Widgets/Scripts/ModernWidgetTypes/ModernWidgetContracts';
import { ErrorParser } from 'Widgets/Scripts/TFS.Widget.Utilities';

/** A specialization of Modern Widget which renders using flux view model with React Stack.
 *  Contains presentional/React-isms and policy for animated resize of widget during config.
*/
export abstract class ReactWidgetBase extends ModernWidgetBase{
    private container: HTMLElement;
    private child: React.Component<any, any>;
    private suppressAnimations: boolean;

    public constructor(container: HTMLElement, widgetOptions: Dashboard_Shared_Contracts.WidgetOptions) {
        super(widgetOptions);
        this.container = container;
        this.suppressAnimations = false;
    }

    /**
     * Handles rendering of the concrete WidgetComponent. All derived widgets must implement this.
     * @param change The complete change description payload
     * @param deferredRenderCompletion - A deferred object to signify completion of rendering, to allow the widget to report outcome to the widget framework
     */
    public abstract renderComponent(change: WidgetConfigChange, container: HTMLElement, deferredRenderCompletion: Q.Deferred<{}>): React.Component<any, any>;

    public isAnimationSuppressed() : boolean{
        return this.suppressAnimations;
    }

    protected render(change: WidgetConfigChange): IPromise<WidgetContracts.WidgetStatus> {
        this.suppressAnimations = (change.detectedChanges === ChangeFlags.all) ? false : true;
        ReactDOM.unmountComponentAtNode(this.container);

        if (change.detectedChanges === ChangeFlags.sizeInPixels) {
            return this.deferRenderUntilProperlySized(change);
        }

        return this.renderViewComponent(change);
    }

    private renderViewComponent(change: WidgetConfigChange): IPromise<WidgetContracts.WidgetStatus> {
        try {
            let renderDeferred: Q.Deferred<{}> = Q.defer();
            this.child = this.renderComponent(change, this. container, renderDeferred);
            return renderDeferred.promise.then((success) => {
                return WidgetStatusHelper.Success();
            }, (error) => {
                return WidgetStatusHelper.Failure(error);
            });
        } catch (e) {
            var error = ErrorParser.stringifyError(e);
            return WidgetStatusHelper.Failure(error);
        }
    }

    // Provides a workaround to handle the preview resizing via animation and needing to wait
    // for the correct size before rendering the content.
    private deferRenderUntilProperlySized(change: WidgetConfigChange): IPromise<WidgetContracts.WidgetStatus> {
        let resizeIntervalMs = 50;
        let maxResizeWaitMs = 1000;

        let deferred = Q.defer<WidgetContracts.WidgetStatus>();

        let $container = $(this.container);

        let intervalCount = 0;
        let interval = window.setInterval(() => {

            if ((intervalCount * resizeIntervalMs) > maxResizeWaitMs ||
                ($container.width() === change.config.sizeInPixels.width &&
                    $container.height() === change.config.sizeInPixels.height)) {

                deferred.resolve(this.renderViewComponent(change));

                window.clearInterval(interval);
            }
            intervalCount++;
        }, resizeIntervalMs);

        return deferred.promise;
    }
}