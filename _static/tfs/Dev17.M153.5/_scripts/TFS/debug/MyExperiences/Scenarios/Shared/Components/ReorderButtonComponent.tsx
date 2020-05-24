import * as React from "react";
import { IReorderButtonProps } from "MyExperiences/Scenarios/Shared/Models";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";


export class ReorderButtonComponent extends React.Component<IReorderButtonProps, {}>{
    public render(): JSX.Element {

        const click = (e: React.MouseEvent<HTMLDivElement>) => {
            this.props.handleReorderEvent(this.props.direction);

            // remove focus outline when using mouse
            e.currentTarget.blur();

            e.stopPropagation();
        };

        let classNames: string = "bowtie-icon";
        if (this.props.className) {
            classNames = `${classNames} ${this.props.className}`;
        }

        return (
            <div className={classNames}
                 id={this.props.buttonId}
                 onClick={click}
                 tabIndex={0}
                 aria-label={this.props.ariaLabel}
            >
            </div>
        );
    }
}