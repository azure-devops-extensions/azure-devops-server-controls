import * as React from "react";
import * as Controls from "VSS/Controls";
import * as IdentityPickerControls from "VSS/Identities/Picker/Controls";
import * as IdentityPickerRestClient from "VSS/Identities/Picker/RestClient";
import { KeyCodes } from "OfficeFabric/Utilities";
import { FocusZone, IFocusZone } from "OfficeFabric/FocusZone";
import { IFocusable } from "Search/Scenarios/Shared/Components/SearchHelp/SearchHelp.Props";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/IdentityPicker";

export interface IdentityPickerProps {
    onItemSelect: (identity: IdentityPickerRestClient.IEntity) => void;

    filterText: string;

    onDismiss?: () => void;

    componentRef?: (ref: IdentityPicker) => void;
}

/**
 * Render the identity picker drop down control.
 */
export class IdentityPicker extends React.Component<IdentityPickerProps, {}> implements IFocusable {
    private _containerElement: HTMLElement;
    private _identityPickerControl: IdentityPickerControls.IdentityPickerDropdownControl;
    private _focusZone: IFocusZone;

    public render(): JSX.Element {
        return (
            <FocusZone ref={fz => this._focusZone = fz}>
                <div className="search-identity-picker-root"
                    ref={(d) => this._containerElement = d}
                    data-is-focusable={true}
                    onKeyDown={this._onKeyDown} />
            </FocusZone>);
    }

    public componentDidMount() {
        const { componentRef } = this.props;
        this._createIdentityPicker();
        this._refineEntities();
        if (componentRef) {
            componentRef(this);
        }
    }

    public componentWillUnmount() {
        if (this._identityPickerControl) {
            this._identityPickerControl.dispose();
            this._identityPickerControl = null;
        }
    }

    public componentDidUpdate(): void {
        this._refineEntities();
    }

    public focus() {
        if (this._identityPickerControl &&
            this._identityPickerControl.isVisible() &&
            this._focusZone) {
            this._focusZone.focus();
        }
    }

    private _refineEntities(): void {
        const { filterText } = this.props;
        if (!!filterText && filterText !== "") {
            this._identityPickerControl.getIdentities(filterText).then(this._onEntitiesUpdated);
        }
        else {
            this._identityPickerControl.showAllMruIdentities().then(this._onEntitiesUpdated);
        }
    }

    private _onEntitiesUpdated = (): void => {
        this._identityPickerControl.show();
    }

    /**
     * Create the identity search control and bind it to the page.
     */
    private _createIdentityPicker() {
        if (!this._identityPickerControl || this._identityPickerControl.isDisposed()) {
            const $containerElement = $(this._containerElement);
            const { onItemSelect } = this.props;
            const collectionName: string = TfsContext.getDefault().navigation.collection.name;
            const projectName: string = TfsContext.getDefault().navigation.project;

            this._identityPickerControl = Controls.create<IdentityPickerControls.IdentityPickerDropdownControl, IdentityPickerControls.IIdentityPickerDropdownOptions>(
                IdentityPickerControls.IdentityPickerDropdownControl,
                $containerElement,
                {
                    onItemSelect: onItemSelect,
                    consumerId: "E38B79F4-86E0-46E1-AD29-B71C6232D63D",
                    identityType: {
                        User: true,
                        Group: false
                    },
                    operationScope: {
                        IMS: true,
                        Source: true
                    },
                    showContactCard: false,
                    showMru: true,
                    alignment: {
                        positioningElement: $containerElement
                    },
                    extensionData: {
                        extensionId: "5F117E2F-8847-4019-A08E-BD8AF7E732A1",
                        projectScopeName: projectName,
                        collectionScopeName: collectionName,
                        constraints: null,
                    },
                    loadOnCreate: true,
                    onHide: this.props.onDismiss
                });
        }
    }

    private _onKeyDown = (evt?: React.KeyboardEvent<HTMLElement>): void => {
        if (this._identityPickerControl && this._identityPickerControl.isVisible()) {
            if (evt.keyCode !== KeyCodes.tab && evt.keyCode !== KeyCodes.enter) {
                this._identityPickerControl.handleKeyEvent(evt as any);
            }
            else if (this._identityPickerControl.getSelectedItem()) {
                this.props.onItemSelect(this._identityPickerControl.getSelectedItem());
            }
            else {
                this._identityPickerControl.handleKeyEvent(evt as any);
            }
        }
    }
}
