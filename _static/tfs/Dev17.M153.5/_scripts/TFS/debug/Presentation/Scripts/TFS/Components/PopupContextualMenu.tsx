import * as React from "react";
import * as  Q from "q";
import { errorHandler } from "VSS/VSS";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { BaseComponent, IPoint, autobind, css, IBaseProps } from "OfficeFabric/Utilities";
import { ContributableContextualMenu, IContributionData } from "VSSPreview/Flux/Components/ContributableContextMenu";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

export interface IPopupContextualMenuProps extends IBaseProps {
    iconClassName: string;
    items: IContextualMenuItem[];
    titleText?: string;
    className?: string;
    menuClassName?: string;
    contributionData?: IContributionData;
    onClick?: (e: React.MouseEvent<HTMLElement>) => void;
    onDismiss?: () => void;
    useTargetElement?: boolean;
    target?: IPoint;
    getItems?: () => IContextualMenuItem[] | IPromise<IContextualMenuItem[]>;
    showContextMenu?: boolean;
}

export interface IPopupContextualMenuState {
    targetPoint?: IPoint;
    showContextMenu?: boolean;
    useTargetPoint?: boolean;
    items: IContextualMenuItem[];
}

export class PopupContextualMenu extends BaseComponent<IPopupContextualMenuProps, IPopupContextualMenuState> {

    private static _gapSpaceConstant = 5;
    private _component: HTMLElement;
    private _pendingDismissal: boolean = false;

    constructor(props: IPopupContextualMenuProps) {
        super(props);
        this.state = { items: props.items, showContextMenu: false };
    }

    public render(): JSX.Element {
        const tooltip = this.props.titleText || PresentationResources.MoreActionsText;
        return <div ref={this._resolveRef("_component")} className={css("popup-context-menu-action-icon", this.props.className)} >
            <KeyboardAccesibleComponent ariaLabel={tooltip} className={css("popup-menu-trigger", "icon bowtie-icon", this.props.iconClassName)} onClick={this._onClick} />
            {this.state.showContextMenu ? (
                <ContributableContextualMenu
                    items={this.state.items}
                    onDismiss={this._onDismiss}
                    shouldFocusOnMount={true}
                    gapSpace={this.state.useTargetPoint ? PopupContextualMenu._gapSpaceConstant : 0}
                    { ...this._component ? { target: this._component.firstElementChild as HTMLElement } : {}}
                    targetPoint={this.state.targetPoint}
                    useTargetPoint={this.state.useTargetPoint}
                    className={this.props.menuClassName}
                    ariaLabel={PresentationResources.MoreOptionsText}
                    contributionData={this.props.contributionData}
                />
            ) : null}
        </div>;
    }

    public componentWillReceiveProps(nextProps: IPopupContextualMenuProps) {
        // This is to support scenarios where optional showContextMenu prop isn't used, so this component is responsible to decide when to show or not
        //  we can take the current state value as initial value, but, that's not enough
        //  this componentWillReceiveProps is part of lifecycle where state updates aren't guaranteed to be updated
        //  that is essentially a problem in one and only case - dismissal of the menu, we set the showContextMenu to false when menu is dismissed
        //  but in this method, state updates aren't propogated yet, so this still considers that menu is opened whenever further updates happen
        //  hence let's also react to dismissal with out just depending on the state updates
        let showContextMenu = this.state.showContextMenu;

        if (this._pendingDismissal) {
            showContextMenu = false;
        }

        // honor showContextMenu prop only when sent
        if (nextProps.showContextMenu != null || nextProps.showContextMenu != undefined) {
            showContextMenu = nextProps.showContextMenu;
        }

        // get the items and then display the context menu.
        if (showContextMenu) {
            this._getItemsPromise(nextProps.getItems, nextProps.items).then(
                (menuItems) => {
                    this.setState({
                        items: menuItems,
                        showContextMenu: true,
                        targetPoint: nextProps.target,
                        useTargetPoint: !nextProps.useTargetElement
                    });
                },
                errorHandler.showError);
        }
        // otherwise just clear the items and hide the menu.
        else {
            this.setState({ items: null, showContextMenu: false });
        }
    }

    public componentDidUpdate() {
        this._pendingDismissal = false;
    }

    @autobind
    private _getItemsPromise(getItems: () => IContextualMenuItem[] | IPromise<IContextualMenuItem[]>, items: IContextualMenuItem[]): IPromise<IContextualMenuItem[]> {
        return Q(getItems ? getItems() : items);
    }

    @autobind
    private _onClick(e: React.SyntheticEvent<HTMLElement>): void {
        e.persist();
        const event = e as React.MouseEvent<HTMLElement>;

        if (this.props.onClick) {
            this.props.onClick(event);
        }

        this._getItemsPromise(this.props.getItems, this.props.items).then(
            (itemsPromise) => {
                Q.resolve(itemsPromise).then((items) => {
                    if (event.clientX && !this.props.useTargetElement) {
                        this.setState({ showContextMenu: true, useTargetPoint: true, targetPoint: { x: event.clientX, y: event.clientY }, items: items });
                    }
                    else {
                        // if this is a keydown event, we don't want to use target point we want to use target element
                        this.setState({ showContextMenu: true, useTargetPoint: false, items: items });
                    }
                });
            },
            errorHandler.showError);
    }

    @autobind
    private _onDismiss(): void {
        if (this.props.onDismiss) {
            this.props.onDismiss();
        }

        this._pendingDismissal = true;
        this.setState({ targetPoint: null, showContextMenu: false, useTargetPoint: false, items: null });
        // for some cases where the menu will stay even after dismissal, we loose focus, we can't bring focus to items back
        // but at the very least let's bring focus to the button
        // https://github.com/OfficeDev/office-ui-fabric-react/issues/1324
        const firstChild = this._component && this._component.firstChild as HTMLElement;
        firstChild && firstChild.focus();
    }
}