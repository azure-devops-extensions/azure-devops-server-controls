export interface IScrollOffset{
    top: number;
    left: number;
}

export class ScrollUtilty {

    constructor(private _horizontalScrollOver: number, private _verticalScrollOver: number) {
    }

    public getScrollOffset(
        element: ClientRect,
        container: ClientRect,
        isHorizontalScrollbarVisible: boolean,
        isVerticalScrollbarVisible: boolean
    ): IScrollOffset {

        let scrollTopBy = 0;
        let scrollLeftBy = 0;

        let elementBottom = element.bottom + (isHorizontalScrollbarVisible ? ScrollUtilty.c_scrollBarWidthAndHeightEstimate : 0);
        let elementRight = element.right + (isVerticalScrollbarVisible ? ScrollUtilty.c_scrollBarWidthAndHeightEstimate : 0);

        if (element.top < container.top) {
            // Element is above the container. Scroll it down.
            scrollTopBy = element.top - container.top;
            if (container.height >= (2 * this._verticalScrollOver)){
                scrollTopBy -= this._verticalScrollOver;
            }
        }
        else if (elementBottom > container.bottom) {
            // Element is below the container. Scroll it up.
            scrollTopBy = elementBottom - container.bottom;
            if (container.height >= (2 * this._verticalScrollOver)) {
                scrollTopBy += this._verticalScrollOver;
            }
        }

        if (elementRight > container.right) {
            // Element is to right of the container. Scroll it left.
            scrollLeftBy = elementRight - container.right;
            if (container.width >= (2 * this._horizontalScrollOver)) {
                scrollLeftBy += this._horizontalScrollOver;
            }
        }
        else if (element.left < container.left) {
            // Element is to the left of the container. Scroll it right
            scrollLeftBy = element.left - container.left;
            if (container.width >= (2 * this._horizontalScrollOver)) {
                scrollLeftBy -= this._horizontalScrollOver;
            }
        }

        return {
            top: scrollTopBy,
            left: scrollLeftBy
        };
    }


    private static readonly c_scrollBarWidthAndHeightEstimate = 30;
}