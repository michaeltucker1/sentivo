import React from "react";
import { ReactSVG } from "react-svg";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = "currentColor",
  className,
}) => {
  const iconPath = `../../Assets/${name}.svg`;

  return (
    <ReactSVG
      src={iconPath}
      className={className}
      beforeInjection={(svg) => {
        svg.setAttribute("width", `${size}`);
        svg.setAttribute("height", `${size}`);
        svg.querySelectorAll("[stroke]").forEach((el) => {
          el.setAttribute("stroke", color);
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
