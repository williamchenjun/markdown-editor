import React, { useEffect } from "react";

const Container = React.forwardRef(function Container ({children, className, valign, border, height, width, rowgap, colgap, style, ...rest}, ref) {
    const tagStyle = {
        display: "flex",
        columnGap: colgap  || "5px",
        rowGap: rowgap || "5px",
        flexDirection: `${valign? "column" : ""}`,
        border: `${border? "1px solid lightgray" : ""}`,
        height: height || "",
        width: width || "",
        ...style
    }

    return <div ref={ref} className={className} style={tagStyle} {...rest}>{children}</div>;
});

export default Container;