import { CommandBar, ICommandBarProps } from "OfficeFabric/CommandBar";
import { css } from "OfficeFabric/Utilities";
import * as Q from "q";
import * as React from "react";

import { getDefaultWebContext } from "VSS/Context";
import { getBackgroundInstance } from "VSS/Contributions/Controls";
import { ContributionQueryOptions, ExtensionHelper, ExtensionService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { flatten } from "VSS/Utils/Array";
import { IContributionData, IContributableContextualMenuItem } from "VSSPreview/Flux/Components/ContributableContextMenu";

export interface ContributableCommandBarProps extends ICommandBarProps {
    /**
     * optional contribution data
     */
    contributionData?: IContributionData;
}

export interface ContributableCommandBarState {
    /**
     * items that are contributed
     */
    contributedItems: IContributableContextualMenuItem[];
}

/**
 * A Fabric command bar that takes contribution ids to get menu contributions from extensions.
 */
export class ContributableCommandBar extends React.Component<ContributableCommandBarProps, ContributableCommandBarState> {
    private readonly extensionService: ExtensionService;
    private readonly queryOptions = ContributionQueryOptions.IncludeRecursiveTargets;

    constructor(props: ContributableCommandBarProps) {
        super(props);

        this.extensionService = getService(ExtensionService);

        this.state = {
            contributedItems: [],
        };
    }

    public render(): JSX.Element {
        const items = [
            ...this.props.items,
            ...this.state.contributedItems,
        ];

        return <CommandBar
            {...this.props}
            items={[]}
            // farItems used to prevent every single command in the bar to overflow to the ellipsis menu
            // when it's rendered with flex auto in the same line as other elements (Explorer header)
            farItems={items}
            className={css("vssf-commandBar", this.props.className)}
        />;
    }

    public componentDidMount() {
        this.ensureContributedItems();
    }

    private async ensureContributedItems() {
        const menuItems = await this.getMenuItems();
        this.setState({
            contributedItems: menuItems,
        });
    }

    // This is an ad-hoc implementation for CodeHubL2HeaderActionsSource, so it's missing many corner cases.
    // Instead we should reuse ContributableContextualMenu.ContributionProvider, which is tightly coupled with its component.
    private async getMenuItems(): Promise<IContributableContextualMenuItem[]> {
        if (!this.props.contributionData) {
            return Q([]);
        }

        const data = this.props.contributionData;
        const ids = data.contributionIds;
        if (ids && ids.length > 0) {
            const contributions = await this.extensionService.queryContributions(ids, this.queryOptions, "ms.vss-tfs-web.hub-action-provider");
            const sources = await Q.all(contributions.map(this.getSource));
            const menuItemLists = await Q.all(sources.map(source => Q(source.getMenuItems(data.extensionContext))));
            return flatten(menuItemLists).map(this.getContextualMenuItemFromContributedMenuItem);
        } else {
            return Q([]);
        }
    }

    private getContextualMenuItemFromContributedMenuItem = (contributedMenuItem: IContributedMenuItem): IContributableContextualMenuItem => {
        return {
            key: contributedMenuItem.id,
            name: contributedMenuItem.text,
            disabled: contributedMenuItem.disabled,
            iconProps: {
                className: contributedMenuItem.icon.substring("css://".length),
            },
            onClick: () => contributedMenuItem.action(this.props.contributionData.extensionContext),
        };
    }

    private getSource = (contribution: Contribution) => {
        const webContext = getDefaultWebContext();
        return getBackgroundInstance<IContributedMenuSource>(
            contribution,
            contribution.properties["registeredObjectId"] || contribution.id,
            webContext,
            webContext,
            5000,
            "Timed-out waiting for menu source provider for contribution: " + contribution.id);
    }
}
