import * as React from "react";
import * as ReactDOM from "react-dom";

import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { showMessageDialog } from "VSS/Controls/Dialogs";
import { registerContent } from "VSS/SDK/Shim";
import { ContributablePivotBarActionProvider } from "VSSPreview/Providers/ContributablePivotBarActionProvider";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { IPivotBarAction, PivotBarViewActionType, IPivotBarViewActionProps } from "VSSUI/PivotBar";
import { ContributedItemArray } from "VSSUI/Utilities/ItemContribution";
import { IViewOptions, IViewOptionsValues } from "VSSUI/Utilities/ViewOptions";

/**
 * Defines the object that is passed to the contributed pivots.
 */
export interface IPivotContext {
    selectedPivot: string;
    viewOptions: IViewOptions;
}

/**
 * Defines the object that is passed to contributed actions.
 */
export interface IHubActionContext {
    viewOptions: IViewOptionsValues;
}

/**
 * Example hub where all pivots and commands and view actions are contributed.
 */
class AllTheContributionsHub extends BaseComponent<IBaseProps, {}> {
    private _hubViewState: IVssHubViewState;
    private _contributedCommands: ContributedItemArray<IPivotBarAction, IPivotBarAction>;
    private _pivotProvider: ContributablePivotItemProvider<IPivotContext>;

    public constructor(props: IBaseProps) {
        super(props);

        this.state = {
            index: 0,
            minIndex: 0,
            maxIndex: 5,
        };

        this._hubViewState = new VssHubViewState({
            viewOptions: {
                initialState: {
                    displayFavorite: "none",
                },
            },
            defaultRouteId: "ms.vss-tfs-web.hub-contributions-sample-hub:route",
            preventDirtyPivotNavigation: true,
            mruPivotKey: "ms.vss-tfs-web.hub-contributions-sample-hub",
        });

        const commandProvider = new ContributablePivotBarActionProvider<IHubActionContext>(
            ["ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:commands"],
            c => ({ viewOptions: this._hubViewState.viewOptions.getViewOptions() })
        );
        this._contributedCommands = new ContributedItemArray(commandProvider, x => x);

        this._pivotProvider = new ContributablePivotItemProvider<IPivotContext>(
            ["ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar"],
            this._getPivotContext,
            {
                hubViewState: this._hubViewState,
                routeValueKey: "view",
            }
        );
    }

    public render(): JSX.Element {
        const actionProps = {
            options: [
                { key: "none", text: "None" },
                { key: "color", text: "Color" },
                { key: "breakfast", text: "Breakfast" },
            ]
        } as IPivotBarViewActionProps;

        return (
            <Hub
                commands={this._contributedCommands}
                viewActions={[
                    {
                        key: "displayFavorite",
                        name: "Favorite",
                        important: true,
                        actionType: PivotBarViewActionType.ChoiceGroup,
                        actionProps,
                    },
                ]}
                hubViewState={this._hubViewState}
                pivotProviders={[this._pivotProvider]}
            >
                <HubHeader
                    title="All the Contributions"
                />
            </Hub>
        );
    }

    /**
     * Callback function that gets the context object for the contributed pivots.
     *
     * This method is called every time we render the contributed pivot, which is most often
     * triggered by a render of the parent PivotBar/Hub.
     */
    private _getPivotContext = (): IPivotContext => {
        return {
            // we don't have to include selectedPivot in the context, this is just for example
            selectedPivot: this._hubViewState.selectedPivot.value,
            viewOptions: this._hubViewState.viewOptions,
        };
    }

    private _viewHubViewState = (): void => {
        showMessageDialog("Context: " + JSON.stringify(this._hubViewState.viewOptions.getViewOptions(), null, 4), { title: "Contributed Action Context" });
    }
}

registerContent("hub.hub-contributions-sample", context => {
    ReactDOM.render(<AllTheContributionsHub />, context.$container[0]);
});
