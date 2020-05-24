import { css } from "OfficeFabric/Utilities";
import { ContributionQueryOptions } from "VSS/Contributions/Services";
import { IContributableContextualMenuItem } from "VSSPreview/Flux/Components/ContributableContextMenu";
import { BaseContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider";
import { IPivotBarAction, IVssPivotBarActionProvider, mapItemToActions } from "VSSUI/PivotBar";

/**
 * Class for finding contributed PivotBarActions.
 */
export class PivotBarActionProvider<T> implements IVssPivotBarActionProvider {
    private _itemProvider: BaseContributableMenuItemProvider<T>;

    constructor(
        ids: string[],
        extensionContext: T | ((c: Contribution) => T),
        webContext?: WebContext,
        queryOptions?: ContributionQueryOptions
    ) {
        this._itemProvider = new BaseContributableMenuItemProvider(ids, extensionContext, webContext, queryOptions, {
            overrideMenuItemProps: (item: IContributableContextualMenuItem, contribution: Contribution) => {
                // important view actions do not show text unless explicitly defined.
                if (contribution.properties) {
                    item.name = contribution.properties["name"] || null;
                }
                // force mark the view actions important
                item["important"] = true;
                if (item.iconProps) {
                    item.iconProps.className = css(item.iconProps.className || "", "override-view-actions-padding");
                }
            }
        });
    }

    public loadItems(itemsUpdated: (items: IPivotBarAction[]) => void): void {
        this._itemProvider.loadItems(menuItems => {
            itemsUpdated(menuItems.map(mapItemToActions));
        });
    }

    public refresh() {
        this._itemProvider.refresh();
    }
}
