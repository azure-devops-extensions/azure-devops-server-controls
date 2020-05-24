import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/FieldErrorTextComponent";

import * as React from "react";

export interface IFieldErrorTextComponentProps {
    errorText: string;
}

export const FieldErrorTextComponent: React.StatelessComponent<IFieldErrorTextComponentProps> = (props: IFieldErrorTextComponentProps) => {
    const { errorText } = props;

    return <div className="work-item-field-error-text">
        {errorText}
    </div>;
};