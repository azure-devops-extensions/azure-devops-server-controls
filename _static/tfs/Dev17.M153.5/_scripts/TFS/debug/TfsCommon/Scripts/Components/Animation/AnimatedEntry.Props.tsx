export interface IAnimatedEntryProps {
    /**
     * Optional class name to apply to wrapper.
     */
    className?: string;

    /**
     * Duration of animation in ms.
     */
    enterTimeout: number;

    /**
     * Class name for entry animation, follows same patterns as CSSTransitionGroup.
     */
    enterClassName: string;
}
