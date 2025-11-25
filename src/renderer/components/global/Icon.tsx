import React from "react";
import { ReactSVG } from "react-svg";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className,
}) => {
  const iconPath = new URL(`../../Assets/${name}.svg`, import.meta.url).href;

  return (
    <ReactSVG
      src={iconPath}
      className={className}
      beforeInjection={(svg) => {
        svg.setAttribute("width", `${size}`);
        svg.setAttribute("height", `${size}`);
        svg.querySelectorAll("[stroke]").forEach((el) => {
          el.setAttribute("stroke", color);
          el.setAttribute("stroke-width", `${strokeWidth}`);
        });
      }}
      fallback={() => (
        <span
          style={{
            width: size,
            height: size,
            display: "inline-block",
          }}
        />
      )}
    />
  );
};

export default Icon;
