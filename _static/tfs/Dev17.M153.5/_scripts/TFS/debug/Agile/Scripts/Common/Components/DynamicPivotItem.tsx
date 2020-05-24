import * as React from "react";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { Cancelable } from "VSS/Utils/Core";
import { handleError } from "VSS/VSS";
import { ComponentWrapper } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { Debug } from "VSS/Diag";

export interface IDynamicPivotItemProps<TPivotItemProps> {
    /** Should we reload the data providers? */
    shouldReloadDataProviders: boolean;

    /** List of contribution ids of data providers to resolve whenever the pivot becomes active */
    dataProviders: string[];

    /** Code files to resolve */
    modules: string[];

    /** Key to retrieve component from registry */
    componentKey: string;

    /* Props passed to the component */
    componentProps?: TPivotItemProps;

    /** Render loading element while data required for the pivot is retrieved */
    onRenderLoading(): JSX.Element;
}

export interface IDynamicPivotItemState {
    /** Indicates whether data for the pivot is still being loaded */
    isLoading: boolean;
}

export class DynamicPivotItem<TPivotItemProps> extends React.Component<IDynamicPivotItemProps<TPivotItemProps>, IDynamicPivotItemState> {
    private _cancelable = new Cancelable(null);

    constructor(props: IDynamicPivotItemProps<TPivotItemProps>, context: any) {
        super(props, context);

        this.state = {
            isLoading: false
        };

        const { shouldReloadDataProviders, dataProviders } = this.props;

        if (shouldReloadDataProviders && dataProviders && dataProviders.length > 0) {
            // If this is a pivot switch, force reload everything
            this.state = {
                isLoading: true
            };

            const contributions: Contribution[] = dataProviders.map(dataProviderId => ({
                id: dataProviderId,
                properties: {
                    serviceInstanceType: ServiceInstanceTypes.TFS
                }
            }) as Contribution);

            // Retrieve/refresh data providers
            getService(WebPageDataService).ensureDataProvidersResolved(contributions, true).then(this._cancelable.wrap(data => {
                this._finishDataRetrieval();
                this._cancelable = null;
            }) as (value: any) => void, handleError);
        } else {
            Debug.assert(dataProviders && dataProviders.every(dataProviderId => getService(WebPageDataService).getPageDataSource(dataProviderId) !== undefined), "All data providers for this pivot were not resolved by the contribution service");
        }
    }

    public componentWillUnmount(): void {
        // Cancel any pending operations
        if (this._cancelable) {
            this._cancelable.cancel();
        }

        const { dataProviders } = this.props;
        if (dataProviders && dataProviders.length > 0) {
            const webPageDataService = getService(WebPageDataService);

            // Invalidate all data providers so that next time we render this pivot we retrieve fresh data
            for (const dataProviderId of dataProviders) {
                webPageDataService.removePageData(dataProviderId);
            }
        }
    }

    public render(): JSX.Element {
        const { onRenderLoading, componentProps, modules, componentKey } = this.props;
        const { isLoading } = this.state;

        if (isLoading) {
            return onRenderLoading();
        }

        return (
            <ComponentWrapper modules={modules} componentProps={componentProps} componentKey={componentKey} />
        );
    }

    private _finishDataRetrieval() {
        this.setState({
            isLoading: false
        });
    }
}