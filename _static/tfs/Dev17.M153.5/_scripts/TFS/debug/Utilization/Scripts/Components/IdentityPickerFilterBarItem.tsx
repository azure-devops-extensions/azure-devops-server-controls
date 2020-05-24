import * as React from 'react';
import { FilterBarItem, IFilterBarItemState, IFilterBarItemProps } from 'VSSUI/FilterBarItem';
import { IdentityPickerWrapper, IdentityPickerProps } from "Utilization/Scripts/Components/IdentityPicker";

export interface IIdentityPickerFilterBarItemProps extends IdentityPickerProps, IFilterBarItemProps {
}

export interface IIdentityPickerFilterBarItemState extends IFilterBarItemState<string> {
}

export class IdentityPickerFilterBarItem extends FilterBarItem<string, IIdentityPickerFilterBarItemProps, IIdentityPickerFilterBarItemState> {

    public focus() {
    }

    public render(): JSX.Element {
        return <IdentityPickerWrapper cssClass="identity-picker-container"
                initialUserId={this.state.value}
                userIsPCA={true}
                onValueChanged={(id: string) => {
                    this.setFilterValue({ value: id });
                }}
                consumerId={this.props.consumerId}
        />;
    }
}
